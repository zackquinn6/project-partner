import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MultiContentRenderer } from "@/components/MultiContentRenderer";
import { supabase } from "@/integrations/supabase/client";
import type { ContentSection } from "@/interfaces/Project";

interface ToolInstructionsPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toolId: string;
  toolName: string;
}

export function ToolInstructionsPopup({
  open,
  onOpenChange,
  toolId,
  toolName,
}: ToolInstructionsPopupProps) {
  const [sections, setSections] = useState<ContentSection[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !toolId) return;

    const fetchInstructions = async () => {
      setLoading(true);
      try {
        const { data: variation, error: varError } = await supabase
          .from("tool_variations")
          .select("instructions, core_item_id")
          .eq("id", toolId)
          .eq("item_type", "tools")
          .maybeSingle();

        if (!varError && variation?.instructions) {
          const parsed = Array.isArray(variation.instructions)
            ? variation.instructions
            : typeof variation.instructions === "string"
              ? (JSON.parse(variation.instructions || "[]") as ContentSection[])
              : [];
          if (parsed.length > 0) {
            setSections(parsed);
            setLoading(false);
            return;
          }
        }

        const coreId = variation?.core_item_id ?? toolId;
        const { data: tool, error: toolError } = await supabase
          .from("tools")
          .select("instructions")
          .eq("id", coreId)
          .maybeSingle();

        if (!toolError && tool?.instructions) {
          const parsed = Array.isArray(tool.instructions)
            ? tool.instructions
            : typeof tool.instructions === "string"
              ? (JSON.parse(tool.instructions || "[]") as ContentSection[])
              : [];
          setSections(parsed);
        } else {
          setSections([]);
        }
      } catch {
        setSections([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInstructions();
  }, [open, toolId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Instructions: {toolName}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : sections.length > 0 ? (
          <MultiContentRenderer sections={sections} />
        ) : (
          <p className="text-muted-foreground text-sm">
            No instructions set for this tool.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
