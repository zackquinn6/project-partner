import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogPortal,
  DialogOverlay,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/** Nested above parent dialogs that use z-[100] (e.g. VariationViewer); align with VariationManager. */
const NESTED_EDITOR_OVERLAY_CLASS = 'z-[260] bg-black/80';
const NESTED_EDITOR_CONTENT_Z = 'z-[270]';

export interface MaterialVariationRow {
  id: string;
  material_id: string;
  name: string;
  description?: string | null;
  sku?: string | null;
  photo_url?: string | null;
  attributes: Record<string, string>;
}

interface MaterialVariationEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variation: MaterialVariationRow;
  onSave: () => void;
}

export function MaterialVariationEditor({
  open,
  onOpenChange,
  variation,
  onSave,
}: MaterialVariationEditorProps) {
  const [edited, setEdited] = useState<MaterialVariationRow>(variation);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (variation) {
      setEdited({
        ...variation,
        name: variation.name || '',
        attributes: variation.attributes || {},
      });
    }
  }, [variation]);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${variation.id}-${Date.now()}.${fileExt}`;
      const filePath = `material-variations/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('library-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('library-photos').getPublicUrl(filePath);

      setEdited({ ...edited, photo_url: publicUrl });
          } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo');
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!edited.name?.trim()) {
      toast.error('Variation name is required');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('materials_variants')
        .update({
          name: edited.name.trim(),
          description: edited.description ?? null,
          sku: edited.sku ?? null,
          photo_url: edited.photo_url ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', variation.id);

      if (error) throw error;

            onSave();
    } catch (error) {
      console.error('Error saving material variant:', error);
      toast.error('Failed to save material variant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className={NESTED_EDITOR_OVERLAY_CLASS} />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={`fixed left-[50%] top-[50%] ${NESTED_EDITOR_CONTENT_Z} max-h-[85vh] w-[90vw] max-w-lg translate-x-[-50%] translate-y-[-50%] overflow-y-auto rounded-lg border bg-background p-6 shadow-lg`}
        >
          <DialogHeader>
            <DialogTitle>Edit material variant: {variation.name}</DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="mv-name">Name</Label>
              <Input
                id="mv-name"
                value={edited.name}
                onChange={(e) => setEdited({ ...edited, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="mv-sku">SKU / part #</Label>
              <Input
                id="mv-sku"
                value={edited.sku || ''}
                onChange={(e) => setEdited({ ...edited, sku: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="mv-desc">Description</Label>
              <Textarea
                id="mv-desc"
                value={edited.description || ''}
                onChange={(e) => setEdited({ ...edited, description: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="mv-photo">Photo</Label>
              <Input
                id="mv-photo"
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={loading}
              />
              {edited.photo_url && (
                <div className="mt-2 flex items-center gap-2">
                  <img
                    src={edited.photo_url}
                    alt=""
                    className="h-16 w-16 rounded-md object-cover"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEdited({ ...edited, photo_url: null })}
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={save} disabled={loading}>
                {loading ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
