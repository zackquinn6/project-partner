import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollableDialog } from './ScrollableDialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import {
  Loader2,
  Send,
  ImagePlus,
  MessageSquare,
  Sparkles,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMembership } from '@/contexts/MembershipContext';
import { toast } from 'sonner';
import { resolveTemplateFamily } from '@/utils/templateFamilies';
import {
  detectSafetyCategories,
  safetyBannerFor,
  HELP_MESSAGE_CAP,
  EMPTY_HELP_USAGE,
  HelpUsageStatus,
} from '@/utils/helpChatSafety';
import {
  createHelpThread,
  fetchHelpUsageStatus,
  listHelpMessages,
  listHelpThreadsForUser,
  sendHelpChatMessage,
  signedHelpPhotoUrl,
  uploadHelpChatPhoto,
  HelpMessage,
  HelpThread,
} from '@/utils/helpChatApi';
import { cn } from '@/lib/utils';

export interface ProjectHelpChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
  projectRunId?: string | null;
  templateProjectId?: string | null;
  templateName?: string | null;
  templateCategories?: string[] | null;
  stepId?: string | null;
  stepTitle?: string | null;
  phaseId?: string | null;
  phaseName?: string | null;
  instructionLevel?: string | null;
  initialMessage?: string | null;
  onEscalateToPro?: (context: {
    threadId: string | null;
    stepTitle?: string | null;
    recentMessages: Array<{ role: string; content: string }>;
  }) => void;
}

export function ProjectHelpChatWindow({
  isOpen,
  onClose,
  projectRunId,
  templateProjectId,
  templateName,
  templateCategories,
  stepId,
  stepTitle,
  phaseId,
  phaseName,
  instructionLevel,
  initialMessage,
  onEscalateToPro,
}: ProjectHelpChatWindowProps) {
  const { user } = useAuth();
  const { hasProjectsTier, loading: membershipLoading } = useMembership();
  const family = useMemo(
    () => resolveTemplateFamily(templateName, templateCategories),
    [templateName, templateCategories]
  );

  const [threads, setThreads] = useState<HelpThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<HelpMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [usage, setUsage] = useState<HelpUsageStatus>(EMPTY_HELP_USAGE);
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [localCodeAck, setLocalCodeAck] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const seededInitial = useRef(false);

  const safetyPreview = useMemo(
    () => detectSafetyCategories(`${draft} ${stepTitle || ''}`),
    [draft, stepTitle]
  );
  const banner = safetyBannerFor(safetyPreview);

  const refreshUsage = useCallback(async () => {
    const status = await fetchHelpUsageStatus();
    setUsage(status);
  }, []);

  const loadThreads = useCallback(async () => {
    if (!user?.id) return;
    const list = await listHelpThreadsForUser({
      userId: user.id,
      templateFamily: family,
    });
    setThreads(list);
  }, [user?.id, family]);

  const loadMessages = useCallback(async (threadId: string) => {
    setLoadingHistory(true);
    try {
      const msgs = await listHelpMessages(threadId);
      setMessages(msgs);
      const paths = msgs.flatMap((m) => m.photo_paths || []);
      const urlMap: Record<string, string> = {};
      await Promise.all(
        paths.map(async (p) => {
          const url = await signedHelpPhotoUrl(p);
          if (url) urlMap[p] = url;
        })
      );
      setSignedUrls((prev) => ({ ...prev, ...urlMap }));
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen || !user?.id) return;
    seededInitial.current = false;
    void refreshUsage();
    void loadThreads();
    setActiveThreadId(null);
    setMessages([]);
    if (initialMessage && !seededInitial.current) {
      setDraft(initialMessage);
      seededInitial.current = true;
    }
  }, [isOpen, user?.id, refreshUsage, loadThreads, initialMessage]);

  useEffect(() => {
    if (activeThreadId) void loadMessages(activeThreadId);
  }, [activeThreadId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const canChat = Boolean(user) && hasProjectsTier && !membershipLoading;
  const atCap = usage.capped || usage.remaining <= 0;

  const onPickFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const next = [...pendingPhotos, ...Array.from(files)].slice(0, 3);
    setPendingPhotos(next);
    setPhotoPreviews(next.map((f) => URL.createObjectURL(f)));
  };

  const clearPhotos = () => {
    photoPreviews.forEach((u) => URL.revokeObjectURL(u));
    setPendingPhotos([]);
    setPhotoPreviews([]);
  };

  const startNewThread = async () => {
    if (!user?.id) return;
    const thread = await createHelpThread({
      userId: user.id,
      projectRunId,
      templateProjectId,
      templateFamily: family,
      stepId,
      stepTitle,
      phaseId,
      phaseName,
      title: stepTitle || 'Project help',
    });
    if (!thread) {
      toast.error('Could not start a help thread. Apply the help-chat SQL migration.');
      return;
    }
    setActiveThreadId(thread.id);
    setMessages([]);
    await loadThreads();
  };

  const handleSend = async () => {
    if (!user?.id || !draft.trim()) return;
    if (!canChat) {
      toast.error('AI help requires Projects membership or an active trial.');
      return;
    }
    if (atCap) {
      toast.error('Message cap reached. Escalate to a live pro or wait for the 7-day window to reset.');
      return;
    }

    setSending(true);
    try {
      const uploaded: string[] = [];
      for (const file of pendingPhotos) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error('Each photo must be under 5MB.');
          setSending(false);
          return;
        }
        const path = await uploadHelpChatPhoto(user.id, file);
        if (!path) {
          toast.error('Photo upload failed.');
          setSending(false);
          return;
        }
        uploaded.push(path);
      }

      const { data, error } = await sendHelpChatMessage({
        threadId: activeThreadId,
        projectRunId,
        templateProjectId,
        templateFamily: family,
        stepId,
        stepTitle,
        phaseId,
        phaseName,
        message: draft.trim(),
        photoPaths: uploaded,
        localCodeAck,
        instructionLevel,
      });

      if (error || !data) {
        toast.error(error || 'Help chat failed');
        if (error?.toLowerCase().includes('cap')) {
          await refreshUsage();
        }
        return;
      }

      setActiveThreadId(data.threadId);
      setDraft('');
      clearPhotos();
      if (data.usage) {
        setUsage({
          messageCount: data.usage.messageCount,
          messageCap: data.usage.messageCap,
          remaining: data.usage.remaining,
          capped: data.usage.capped,
          periodStart: null,
          periodEnd: null,
        });
      } else {
        await refreshUsage();
      }
      await loadMessages(data.threadId);
      await loadThreads();
    } finally {
      setSending(false);
    }
  };

  const thisRunThreads = threads.filter((t) => t.project_run_id === projectRunId);
  const earlierThreads = threads.filter((t) => t.project_run_id !== projectRunId);

  return (
    <div className={`fixed inset-0 z-[60] ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      {isOpen && (
        <div className="absolute inset-0 bg-background/60 backdrop-blur-md" onClick={onClose} />
      )}
      <ScrollableDialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        title="Ask AI — Project Help"
        description={`Scoped to ${family} · ${usage.remaining}/${usage.messageCap || HELP_MESSAGE_CAP} messages left (7-day window)`}
        planningToolHeader
        className="relative z-[61] h-[100dvh] max-h-[100dvh] w-full max-w-full md:h-[90vh] md:max-h-[90vh] md:w-[min(960px,90vw)]"
      >
        <div className="flex flex-col gap-4 min-h-[60vh]">
          {!canChat && !membershipLoading ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                AI help is included with Projects membership (and trial). Upgrade to chat, or use Something Wrong? for recovery plans.
              </AlertDescription>
            </Alert>
          ) : null}

          {banner ? (
            <Alert variant={safetyPreview.includes('gas') || safetyPreview.includes('injury') ? 'destructive' : 'default'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{banner}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid md:grid-cols-[220px_1fr] gap-4 flex-1 min-h-0">
            <aside className="space-y-3 border rounded-lg p-3 bg-muted/30 max-h-[50vh] md:max-h-none overflow-y-auto">
              <Button size="sm" className="w-full" variant="secondary" onClick={() => void startNewThread()} disabled={!canChat}>
                <MessageSquare className="h-4 w-4 mr-2" />
                New chat
              </Button>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">This project</p>
                <div className="space-y-1">
                  {thisRunThreads.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No threads yet</p>
                  ) : (
                    thisRunThreads.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setActiveThreadId(t.id)}
                        className={cn(
                          'w-full text-left text-xs rounded px-2 py-1.5 hover:bg-muted',
                          activeThreadId === t.id && 'bg-primary/10 text-foreground'
                        )}
                      >
                        {t.title || t.step_title || 'Help'}
                      </button>
                    ))
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Earlier ({family})</p>
                <div className="space-y-1">
                  {earlierThreads.length === 0 ? (
                    <p className="text-xs text-muted-foreground">None</p>
                  ) : (
                    earlierThreads.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setActiveThreadId(t.id)}
                        className={cn(
                          'w-full text-left text-xs rounded px-2 py-1.5 hover:bg-muted',
                          activeThreadId === t.id && 'bg-primary/10'
                        )}
                      >
                        {t.title || t.step_title || 'Help'}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </aside>

            <div className="flex flex-col border rounded-lg min-h-[420px]">
              <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
                <div className="text-sm">
                  <span className="font-medium">{stepTitle || 'General'}</span>
                  {phaseName ? (
                    <span className="text-muted-foreground text-xs ml-2">{phaseName}</span>
                  ) : null}
                </div>
                <Badge variant="outline" className="text-[10px]">
                  <Sparkles className="h-3 w-3 mr-1" />
                  {usage.remaining} left
                </Badge>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {loadingHistory ? (
                  <div className="flex justify-center py-8 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Ask about this step — answers stay inside the {family} playbook.
                  </p>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        'rounded-lg px-3 py-2 text-sm max-w-[90%] whitespace-pre-wrap',
                        m.role === 'user'
                          ? 'ml-auto bg-primary text-primary-foreground'
                          : 'mr-auto bg-muted'
                      )}
                    >
                      {m.content}
                      {(m.photo_paths || []).length > 0 ? (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {m.photo_paths.map((p) =>
                            signedUrls[p] ? (
                              <img
                                key={p}
                                src={signedUrls[p]}
                                alt="Help attachment"
                                className="h-16 w-16 object-cover rounded"
                              />
                            ) : null
                          )}
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              <div className="border-t p-3 space-y-2">
                {safetyPreview.includes('electrical') ? (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="local-code-ack"
                      checked={localCodeAck}
                      onCheckedChange={(c) => setLocalCodeAck(!!c)}
                    />
                    <Label htmlFor="local-code-ack" className="text-xs font-normal">
                      I confirm local rules allow DIY outlets / switches / fixtures
                    </Label>
                  </div>
                ) : null}

                {photoPreviews.length > 0 ? (
                  <div className="flex gap-2 items-center">
                    {photoPreviews.map((src) => (
                      <img key={src} src={src} alt="" className="h-12 w-12 object-cover rounded" />
                    ))}
                    <Button type="button" size="icon" variant="ghost" onClick={clearPhotos}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : null}

                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="What’s going wrong on this step?"
                  rows={3}
                  disabled={!canChat || sending || atCap}
                />

                <div className="flex flex-wrap gap-2 justify-between">
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      multiple
                      onChange={(e) => onPickFiles(e.target.files)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!canChat || sending || atCap}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImagePlus className="h-4 w-4 mr-1" />
                      Photo
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        onEscalateToPro?.({
                          threadId: activeThreadId,
                          stepTitle,
                          recentMessages: messages.slice(-6).map((m) => ({
                            role: m.role,
                            content: m.content,
                          })),
                        })
                      }
                    >
                      Escalate to pro
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => void handleSend()}
                    disabled={!canChat || sending || atCap || !draft.trim()}
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-1" />
                    )}
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollableDialog>
    </div>
  );
}
