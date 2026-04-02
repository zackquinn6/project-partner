import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { VariationManager } from './VariationManager';
import { MaterialVariationManager } from './MaterialVariationManager';
import { AlternatesEditor } from './AlternatesEditor';
import { MultiContentEditor } from './MultiContentEditor';
import type { ContentSection } from '@/interfaces/Project';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import {
  PLANNING_TOOL_SAVE_CLOSE_CLASSNAME,
} from '@/components/PlanningWizardSteps/PlanningToolWindowHeaderActions';
import { TOOLS_LIBRARY_CATEGORIES } from '@/utils/toolCatalogCategory';
import { MATERIALS_LIBRARY_CATEGORIES, isMaterialsLibraryCategory } from '@/utils/materialCatalogCategory';
import { filterToolVariationsForDisplay } from '@/utils/variationAttributeDefinitions';

interface LibraryItemFormProps {
  type: 'tools' | 'materials';
  item?: any;
  onSave: () => void;
  onCancel: () => void;
  formId?: string;
  hideFooterActions?: boolean;
  /** When the form is saving (tools/materials submit in progress). */
  onSubmittingChange?: (submitting: boolean) => void;
}

function parseInstructions(value: unknown): ContentSection[] {
  if (Array.isArray(value)) return value as ContentSection[];
  if (typeof value === 'string') {
    try { return (JSON.parse(value || '[]') as ContentSection[]); } catch { return []; }
  }
  return [];
}

/** Persisted on `tools.specialty_scale`; labels are admin-only. */
const TOOL_SPECIALTY_SCALE_DB_VALUES = [1, 2, 3] as const;

function specialtyScaleFormValueFromItem(item: { specialty_scale?: number } | undefined): string {
  if (typeof item?.specialty_scale !== 'number') return '';
  return TOOL_SPECIALTY_SCALE_DB_VALUES.includes(item.specialty_scale as (typeof TOOL_SPECIALTY_SCALE_DB_VALUES)[number])
    ? String(item.specialty_scale)
    : '';
}

export function LibraryItemForm({
  type,
  item,
  onSave,
  onCancel,
  formId,
  hideFooterActions = false,
  onSubmittingChange,
}: LibraryItemFormProps) {
  const { user } = useAuth();
  const effectiveFormId = formId ?? `${type}-library-item-form`;
  const [formData, setFormData] = useState({
    name: item?.name || item?.item || '',
    description: item?.description || '',
    unit: item?.unit || item?.unit_size || '', // for materials
    alternates: item?.alternates || '', // JSON string of alternates
    category: typeof item?.category === 'string' ? item.category : '',
    specialty_scale: type === 'tools' ? specialtyScaleFormValueFromItem(item) : '',
  });
  /** Keys: `core` for the tools row; otherwise tool_variations.id */
  const [toolInstructionMap, setToolInstructionMap] = useState<Record<string, ContentSection[]>>(() => ({
    core: parseInstructions(item?.instructions),
  }));
  const [instructionEditorKey, setInstructionEditorKey] = useState<string>('core');
  const [toolVariationsList, setToolVariationsList] = useState<{ id: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    onSubmittingChange?.(uploading);
  }, [uploading, onSubmittingChange]);
  const [photoUrl, setPhotoUrl] = useState(item?.photo_url || '');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toolCategoryOptions = ['PPE', 'Hand Tool', 'Power Tool', 'Other'];

  useEffect(() => {
    if (type !== 'tools') return;
    setToolInstructionMap((prev) => ({
      ...prev,
      core: parseInstructions(item?.instructions),
    }));
  }, [type, item?.instructions]);

  const refreshToolVariationsForInstructions = useCallback(async () => {
    if (type !== 'tools' || !item?.id) return;
    const { data, error } = await supabase
      .from('tool_variations')
      .select('id, name, instructions')
      .eq('core_item_id', item.id)
      .order('name');

    if (error) {
      toast.error('Failed to load variants for instructions');
      return;
    }
    const rows = data ?? [];
    const visible = filterToolVariationsForDisplay(rows);
    setToolVariationsList(visible.map((r) => ({ id: r.id, name: r.name })));
    setToolInstructionMap((prev) => {
      const next: Record<string, ContentSection[]> = {
        core: prev.core,
      };
      for (const r of visible) {
        const id = r.id as string;
        next[id] = id in prev ? prev[id]! : parseInstructions(r.instructions);
      }
      return next;
    });
  }, [type, item?.id]);

  useEffect(() => {
    if (type !== 'tools') return;
    if (!item?.id) {
      setToolVariationsList([]);
      setInstructionEditorKey('core');
      return;
    }
    void refreshToolVariationsForInstructions();
  }, [type, item?.id, refreshToolVariationsForInstructions]);

  useEffect(() => {
    if (instructionEditorKey === 'core') return;
    if (!toolVariationsList.some((v) => v.id === instructionEditorKey)) {
      setInstructionEditorKey('core');
    }
  }, [toolVariationsList, instructionEditorKey]);

  useEffect(() => {
    setFormData({
      name: item?.name || item?.item || '',
      description: item?.description || '',
      unit: item?.unit || item?.unit_size || '',
      alternates: item?.alternates || '',
      category: typeof item?.category === 'string' ? item.category : '',
      specialty_scale: type === 'tools' ? specialtyScaleFormValueFromItem(item) : '',
    });
    setPhotoUrl(item?.photo_url || '');
    setPhotoFile(null);
  }, [item, type]);

  const allowedImageTypes = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
  ]);

  const extensionForImageFile = (file: File): string => {
    const t = file.type.toLowerCase();
    if (t === 'image/png') return 'png';
    if (t === 'image/webp') return 'webp';
    if (t === 'image/gif') return 'gif';
    if (t === 'image/jpeg' || t === 'image/jpg') return 'jpg';
    const fromName = file.name.split('.').pop()?.toLowerCase();
    if (fromName && ['png', 'webp', 'gif', 'jpg', 'jpeg'].includes(fromName)) {
      return fromName === 'jpeg' ? 'jpg' : fromName;
    }
    return 'jpg';
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const type = file.type.toLowerCase();
    const extFromName = file.name.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
    const typeOk =
      allowedImageTypes.has(type) ||
      (type === '' &&
        extFromName != null &&
        ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(extFromName));
    if (!typeOk) {
      toast.error('Please select an image (JPEG, PNG, WebP, or GIF)');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB');
      return;
    }

    setPhotoFile(file);
    setPhotoUrl(URL.createObjectURL(file));
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    try {
      if (!user?.id) {
        toast.error('You must be logged in to upload photos');
        return null;
      }
      const ext = extensionForImageFile(file);
      const kindPrefix = type === 'tools' ? 'core-tool' : 'core-material';
      const idPart = item?.id != null ? String(item.id) : 'new';
      // Same depth as user library (`uid/filename`) but filename must use core-tool- / core-material-
      // prefix so storage RLS can allow catalog IDs (not user_tools / user_materials row ids).
      const uniq = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const filePath = `${user.id}/${kindPrefix}-${idPart}_${uniq}.${ext}`;

      const { error: uploadError } = await supabase.storage.from('library-photos').upload(filePath, file, {
        upsert: true,
        contentType: file.type || (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg'),
        cacheControl: '3600',
      });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('library-photos').getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String((error as any).message)
          : 'Failed to upload photo';
      toast.error(message);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formData.name.trim();
    
    if (!trimmedName) {
      toast.error('Item name is required');
      return;
    }
    if (!formData.category.trim()) {
      toast.error('Category is required');
      return;
    }

    let specialtyScaleValue: number | undefined;
    if (type === 'tools') {
      const raw = formData.specialty_scale.trim();
      if (raw !== '1' && raw !== '2' && raw !== '3') {
        toast.error('Select specialty scale: Common, Typical, or Specialized');
        return;
      }
      specialtyScaleValue = Number(raw);
    }

    setUploading(true);

    try {
      const duplicateNameQuery = supabase
        .from(type)
        .select('id, name')
        .ilike('name', trimmedName);

      const { data: duplicateRows, error: duplicateError } = item
        ? await duplicateNameQuery.neq('id', item.id)
        : await duplicateNameQuery;

      if (duplicateError) throw duplicateError;
      if (duplicateRows.length > 0) {
        toast.error(
          `A ${type === 'tools' ? 'tool' : 'material'} named "${trimmedName}" already exists. Use the existing item or choose a different name.`
        );
        return;
      }

      // Never persist browser blob preview URLs to the database.
      let finalPhotoUrl =
        typeof photoUrl === 'string' && photoUrl.startsWith('blob:')
          ? (item?.photo_url || '')
          : photoUrl;
      
      // Upload new photo if one was selected
      if (photoFile) {
        const uploadedUrl = await uploadPhoto(photoFile);
        if (!uploadedUrl) {
          toast.error('Photo upload failed. Tool was not updated.');
          return;
        }
        finalPhotoUrl = uploadedUrl;
      }

      const dataToSave = {
        name: trimmedName,
        description: formData.description.trim() || null,
        photo_url: finalPhotoUrl || null,
        alternates: formData.alternates || null,
        /** DB `tools_category_required_chk` / materials constraints — never persist null after validation. */
        category: formData.category.trim(),
        ...(type === 'materials' && {
          unit: formData.unit.trim() || null
        }),
        ...(type === 'tools' && {
          instructions: (toolInstructionMap.core ?? []).length > 0 ? toolInstructionMap.core : [],
          specialty_scale: specialtyScaleValue as number,
        }),
      };

      if (item) {
        // Update existing item
        const { error } = await supabase
          .from(type)
          .update(dataToSave)
          .eq('id', item.id);
        
        if (error) throw error;

        if (type === 'tools') {
          for (const v of toolVariationsList) {
            const secs = toolInstructionMap[v.id];
            if (secs === undefined) continue;
            const payload = secs.length > 0 ? secs : [];
            const { error: variationInstructionError } = await supabase
              .from('tool_variations')
              .update({ instructions: payload })
              .eq('id', v.id);
            if (variationInstructionError) throw variationInstructionError;
          }
        }
      } else {
        if (!user?.id) {
          toast.error('You must be logged in to create library items');
          return;
        }
        // Create new item
        console.log(`💾 Creating new ${type} item:`, dataToSave);
        const { error } = await supabase
          .from(type)
          .insert({
            ...dataToSave,
            created_by: user.id
          });
        
        if (error) {
          console.error(`❌ Error creating ${type}:`, error);
          if (error.code === '23505') { // Unique constraint violation
            toast.error(`A ${type === 'tools' ? 'tool' : 'material'} with the name "${formData.name}" already exists in the library. Please use a different name or edit the existing item.`);
            return;
          }
          throw error;
        }
        console.log(`✅ Successfully created new ${type} item`);
      }

      onSave();
    } catch (error) {
      console.error('Error saving item:', error);
      const message = error instanceof Error ? error.message : 'Failed to save item';
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Tabs defaultValue="basic" className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      {type === 'tools' && !hideFooterActions && (
        <div className="flex justify-end gap-2 pb-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-9 px-3 text-xs md:min-h-8 md:text-sm"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form={effectiveFormId}
            size="sm"
            disabled={uploading}
            className={`min-h-9 px-3 text-xs md:min-h-8 md:text-sm ${PLANNING_TOOL_SAVE_CLOSE_CLASSNAME}`}
          >
            {uploading ? 'Saving...' : item ? 'Save & Close' : 'Add Tool'}
          </Button>
        </div>
      )}
      <TabsList
        className={`grid w-full shrink-0 gap-1 ${
          type === 'tools' ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'
        }`}
      >
        <TabsTrigger value="basic">{type === 'tools' ? 'Core Tool' : 'Core Material'}</TabsTrigger>
        <TabsTrigger value="variations" disabled={!item?.id}>
          Variations {!item?.id && '(Save item first)'}
        </TabsTrigger>
        {type === 'tools' && <TabsTrigger value="alternates">Alternates</TabsTrigger>}
        {type === 'tools' && <TabsTrigger value="instructions">Instructions</TabsTrigger>}
      </TabsList>
      
      <TabsContent
        value="basic"
        forceMount
        className="mt-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden"
      >
        <div className="h-full overflow-y-auto p-6">
        <form id={effectiveFormId} onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
          <div>
            <Label htmlFor="name">
              {type === 'tools' ? 'Tool' : 'Material'} Name *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={`Enter ${type === 'tools' ? 'tool' : 'material'} name`}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={`Describe the ${type === 'tools' ? 'tool' : 'material'}...`}
              rows={3}
            />
          </div>

          {type === 'materials' && (
            <div>
              <Label htmlFor="unit">Unit Size</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="e.g., 2x4x8ft, 1 gallon, per sq ft"
              />
            </div>
          )}

          <div>
            <Label>Category / Type</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category..." />
              </SelectTrigger>
              <SelectContent className="z-[1000]">
                {(type === 'tools' ? TOOLS_LIBRARY_CATEGORIES : MATERIALS_LIBRARY_CATEGORIES).map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === 'tools' && (
            <div>
              <Label htmlFor="specialty-scale">Specialty scale *</Label>
              <Select
                value={formData.specialty_scale || undefined}
                onValueChange={(value) =>
                  setFormData({ ...formData, specialty_scale: value })
                }
              >
                <SelectTrigger id="specialty-scale" className="max-w-md">
                  <SelectValue placeholder="Select Common, Typical, or Specialized" />
                </SelectTrigger>
                <SelectContent className="z-[1000]">
                  <SelectItem value="1">Common</SelectItem>
                  <SelectItem value="2">Typical</SelectItem>
                  <SelectItem value="3">Specialized</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Photo</Label>
            <div className="space-y-2">
              {photoUrl && (
                <div className="relative inline-block">
                  <img
                    src={photoUrl}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded-md border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                    onClick={() => {
                      setPhotoUrl('');
                      setPhotoFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {photoUrl ? 'Change Photo' : 'Upload Photo'}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  JPEG, PNG, WebP, or GIF, max 5MB
                </p>
              </div>
            </div>
          </div>

          {type === 'materials' && (
            <div>
              <AlternatesEditor
                value={formData.alternates}
                onChange={(value) => setFormData({ ...formData, alternates: value })}
                itemType="material"
              />
            </div>
          )}

          {!hideFooterActions && (
            type === 'tools' ? null : (
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={uploading} className="flex-1">
                  {uploading ? 'Saving...' : (item ? 'Update' : 'Add')} {type === 'tools' ? 'Tool' : 'Material'}
                </Button>
                <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                  Cancel
                </Button>
              </div>
            )
          )}
        </form>
        </div>
      </TabsContent>

      <TabsContent value="variations" className="mt-0 min-h-0 flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
        {item?.id && type === 'tools' && (
          <VariationManager
            coreItemId={item.id}
            coreItemName={item.name}
            onVariationUpdate={() => {
              void refreshToolVariationsForInstructions();
            }}
          />
        )}
        {item?.id && type === 'materials' && (
          <MaterialVariationManager
            materialId={item.id}
            materialName={item.name}
            onVariationUpdate={() => {
              // Optionally refresh or notify parent component
            }}
          />
        )}
        </div>
      </TabsContent>

      {type === 'tools' && (
        <TabsContent value="alternates" className="mt-0 min-h-0 flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
              <AlternatesEditor
                value={formData.alternates}
                onChange={(value) => setFormData({ ...formData, alternates: value })}
                itemType="tool"
                libraryToolPicker={{ excludeCoreToolId: item?.id }}
              />
            </div>
          </div>
        </TabsContent>
      )}

      {type === 'tools' && (
        <TabsContent value="instructions" className="mt-0 min-h-0 flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto p-6">
            <Card className="max-w-4xl mx-auto">
              <CardHeader>
                <CardTitle>Tool instructions</CardTitle>
                <CardDescription>
                  Choose whether these blocks apply to the core tool (default for all variants) or to one
                  variant. Variant-specific instructions can override or extend what users see for that SKU in
                  the workflow.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="instruction-target">Instructions for</Label>
                  <Select
                    value={instructionEditorKey}
                    onValueChange={setInstructionEditorKey}
                  >
                    <SelectTrigger id="instruction-target" className="max-w-md">
                      <SelectValue placeholder="Select target" />
                    </SelectTrigger>
                    <SelectContent className="z-[1000]">
                      <SelectItem value="core">Core tool (default)</SelectItem>
                      {toolVariationsList.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          Variant: {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!item?.id ? (
                    <p className="text-xs text-muted-foreground">
                      Save the tool first to load variants. Until then, only core tool instructions are available.
                    </p>
                  ) : toolVariationsList.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No variants yet. Add variants on the Variations tab to assign per-variant instructions.
                    </p>
                  ) : null}
                </div>
                <MultiContentEditor
                  sections={toolInstructionMap[instructionEditorKey] ?? []}
                  onChange={(sections) =>
                    setToolInstructionMap((prev) => ({
                      ...prev,
                      [instructionEditorKey]: sections,
                    }))
                  }
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      )}
    </Tabs>
  );
}