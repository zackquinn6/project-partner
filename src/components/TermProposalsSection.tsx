import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TOOLS_LIBRARY_CATEGORIES } from '@/utils/toolCatalogCategory';
import { SHARED_ITEM_TYPE_LABEL } from '@/components/RemovalRequestsWindow';
import { toast } from 'sonner';

type Proposal = {
  id: string;
  entity: 'tool' | 'material' | 'project';
  proposed_key: string;
  proposed_name: string;
  description: string | null;
  requested_by: string;
  toolio_item_kind: 'inventory_core' | 'project';
  status: string;
  created_at: string;
};

type TermOption = { public_key: string; name: string };

const SPECIALTY_LABEL: Record<string, string> = { '1': 'Common', '2': 'Typical', '3': 'Specialized' };

/** Materials categories in use today; materials have no fixed list in the database. */
async function loadMaterialCategories(): Promise<string[]> {
  const { data, error } = await (supabase.from('materials' as any) as any).select('category');
  if (error) throw error;
  return [...new Set(((data ?? []) as { category: string | null }[]).map((r) => r.category).filter((c): c is string => !!c))].sort();
}

async function loadExistingTerms(kind: Proposal['toolio_item_kind']): Promise<TermOption[]> {
  const queries =
    kind === 'inventory_core'
      ? [supabase.from('tools' as any).select('public_key, name'), supabase.from('materials' as any).select('public_key, name')]
      : [
          supabase.from('projects' as any).select('public_key, name').is('parent_project_id', null),
          supabase.from('project_categories' as any).select('public_key, name'),
        ];
  const results = await Promise.all(queries.map((query) => query as any));
  const rows: TermOption[] = [];
  for (const { data, error } of results) {
    if (error) throw error;
    rows.push(...((data ?? []) as TermOption[]));
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Items Toolio adds that match no shared item by name. Each one is added as a new item or pointed to
 * an existing item; Toolio links its product or project either way.
 */
export function TermProposalsSection() {
  const { user } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [active, setActive] = useState<Proposal | null>(null);
  const [mode, setMode] = useState<'approve' | 'map'>('approve');
  const [entity, setEntity] = useState<'tool' | 'material'>('tool');
  const [category, setCategory] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [existingKey, setExistingKey] = useState('');
  const [existingTerms, setExistingTerms] = useState<TermOption[]>([]);
  const [materialCategories, setMaterialCategories] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await (supabase.from('vocab_term_proposals' as any) as any)
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: true });
    if (error) {
      toast.error(`Could not load new items: ${error.message}`);
      return;
    }
    setProposals((data ?? []) as Proposal[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const open = async (proposal: Proposal) => {
    setActive(proposal);
    setMode('approve');
    setEntity(proposal.entity === 'material' ? 'material' : 'tool');
    setCategory('');
    setSpecialty('');
    setExistingKey('');
    try {
      const [terms, materials] = await Promise.all([loadExistingTerms(proposal.toolio_item_kind), loadMaterialCategories()]);
      setExistingTerms(terms);
      setMaterialCategories(materials);
    } catch (error) {
      toast.error(`Could not load items: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const decide = async () => {
    if (!active || !user?.email) return;
    const isProduct = active.toolio_item_kind === 'inventory_core';
    if (mode === 'map' && !existingKey) return toast.error('Choose an existing item');
    if (mode === 'approve' && isProduct && !category) return toast.error('Choose a category');
    if (mode === 'approve' && isProduct && entity === 'tool' && !specialty) return toast.error('Choose a specialty scale');
    setBusy(true);
    const { error } = await supabase.rpc('vocab_decide_proposal' as any, {
      p_proposal_id: active.id,
      p_decision: mode,
      p_existing_key: mode === 'map' ? existingKey : null,
      p_entity: mode === 'approve' && isProduct ? entity : null,
      p_category: mode === 'approve' && isProduct ? category : null,
      p_specialty_scale: mode === 'approve' && isProduct && entity === 'tool' ? Number(specialty) : null,
      p_email: user.email,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(mode === 'approve' ? `Added "${active.proposed_name}"` : `Linked "${active.proposed_name}" to an existing item`);
    setActive(null);
    void load();
  };

  const isProduct = active?.toolio_item_kind === 'inventory_core';
  const categories = entity === 'tool' ? [...TOOLS_LIBRARY_CATEGORIES] : materialCategories;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">New items from Toolio</h3>
      {proposals.length === 0 ? (
        <p className="text-sm text-muted-foreground">None waiting.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {proposals.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <div className="font-medium">{p.proposed_name}</div>
                <div className="text-xs text-muted-foreground">
                  {SHARED_ITEM_TYPE_LABEL[p.entity]} · {p.requested_by}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => open(p)}>
                Review
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{active?.proposed_name}</DialogTitle>
            <DialogDescription>
              Toolio added this {isProduct ? 'product' : 'project'} and found no shared item with the same name.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button size="sm" variant={mode === 'approve' ? 'default' : 'outline'} onClick={() => setMode('approve')}>
                Add as new item
              </Button>
              <Button size="sm" variant={mode === 'map' ? 'default' : 'outline'} onClick={() => setMode('map')}>
                Use existing item
              </Button>
            </div>
            {mode === 'approve' && isProduct ? (
              <>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={entity} onValueChange={(v) => { setEntity(v as 'tool' | 'material'); setCategory(''); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="z-[240]">
                      <SelectItem value="tool">Tool</SelectItem>
                      <SelectItem value="material">Material</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue placeholder="Choose..." /></SelectTrigger>
                    <SelectContent className="z-[240]">
                      {categories.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {entity === 'tool' ? (
                  <div className="space-y-2">
                    <Label>Specialty scale</Label>
                    <Select value={specialty} onValueChange={setSpecialty}>
                      <SelectTrigger><SelectValue placeholder="Choose..." /></SelectTrigger>
                      <SelectContent className="z-[240]">
                        {Object.entries(SPECIALTY_LABEL).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </>
            ) : null}
            {mode === 'map' ? (
              <div className="space-y-2">
                <Label>Existing item</Label>
                <Select value={existingKey} onValueChange={setExistingKey}>
                  <SelectTrigger><SelectValue placeholder="Choose..." /></SelectTrigger>
                  <SelectContent className="z-[240] max-h-72">
                    {existingTerms.map((t) => (
                      <SelectItem key={t.public_key} value={t.public_key}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {active?.description ? <p className="text-xs text-muted-foreground">{active.description}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActive(null)} disabled={busy}>Cancel</Button>
            <Button onClick={decide} disabled={busy}>{mode === 'approve' ? 'Add item' : 'Use this item'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
