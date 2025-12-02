import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, FileText, Image, Video, ExternalLink, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ContentSection {
  id: string;
  type: 'text' | 'image' | 'video' | 'link' | 'button' | 'safety-warning';
  content: string;
  title?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  width?: 'full' | 'half' | 'third' | 'two-thirds';
  alignment?: 'left' | 'center' | 'right';
  // Button-specific properties
  buttonAction?: 'project-customizer' | 'project-scheduler' | 'shopping-checklist' | 'materials-selection' | 'project-budgeting' | 'project-performance';
  buttonLabel?: string;
  buttonIcon?: string;
  buttonVariant?: 'default' | 'outline' | 'secondary';
}

interface MultiContentEditorProps {
  sections: ContentSection[];
  onChange: (sections: ContentSection[]) => void;
}

export function MultiContentEditor({ sections, onChange }: MultiContentEditorProps) {
  const addSection = (type: ContentSection['type']) => {
    const newSection: ContentSection = {
      id: `section-${Date.now()}`,
      type,
      content: '',
      title: type === 'text' ? 'New Text Section' : ''
    };
    onChange([...sections, newSection]);
  };

  const updateSection = (id: string, updates: Partial<ContentSection>) => {
    const updated = sections.map(section => 
      section.id === id ? { ...section, ...updates } : section
    );
    onChange(updated);
  };

  const removeSection = (id: string) => {
    onChange(sections.filter(section => section.id !== id));
  };

  const moveSection = (id: string, direction: 'up' | 'down') => {
    const index = sections.findIndex(s => s.id === id);
    if (
      (direction === 'up' && index > 0) ||
      (direction === 'down' && index < sections.length - 1)
    ) {
      const newSections = [...sections];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
      onChange(newSections);
    }
  };

  const getIcon = (type: ContentSection['type']) => {
    switch (type) {
      case 'text': return <FileText className="w-4 h-4" />;
      case 'image': return <Image className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'link': return <ExternalLink className="w-4 h-4" />;
      case 'safety-warning': return <AlertTriangle className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Step Content</h3>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            onClick={() => addSection('text')} 
            variant="outline"
            type="button"
          >
            <FileText className="w-4 h-4 mr-2" />
            Add Text
          </Button>
          <Button 
            size="sm" 
            onClick={() => addSection('image')} 
            variant="outline"
            type="button"
          >
            <Image className="w-4 h-4 mr-2" />
            Add Image
          </Button>
          <Button 
            size="sm" 
            onClick={() => addSection('video')} 
            variant="outline"
            type="button"
          >
            <Video className="w-4 h-4 mr-2" />
            Add Video
          </Button>
          <Button 
            size="sm" 
            onClick={() => addSection('link')} 
            variant="outline"
            type="button"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Add Link
          </Button>
          <Button 
            size="sm" 
            onClick={() => addSection('safety-warning')} 
            variant="outline"
            type="button"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Safety Warning
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {sections.map((section, index) => (
          <Card key={section.id} className="border-2">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getIcon(section.type)}
                  <CardTitle className="text-sm capitalize">{section.type} Section {index + 1}</CardTitle>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => moveSection(section.id, 'up')}
                    disabled={index === 0}
                  >
                    ↑
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => moveSection(section.id, 'down')}
                    disabled={index === sections.length - 1}
                  >
                    ↓
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={() => removeSection(section.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Layout Controls */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label>Width</Label>
                  <Select 
                    value={section.width || 'full'} 
                    onValueChange={(value) => updateSection(section.id, { width: value as ContentSection['width'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full Width</SelectItem>
                      <SelectItem value="two-thirds">Two Thirds</SelectItem>
                      <SelectItem value="half">Half Width</SelectItem>
                      <SelectItem value="third">One Third</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Alignment</Label>
                  <Select 
                    value={section.alignment || 'left'} 
                    onValueChange={(value) => updateSection(section.id, { alignment: value as ContentSection['alignment'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {section.type === 'text' && (
                <>
                  <div>
                    <Label>Section Title (Optional)</Label>
                    <Input
                      value={section.title || ''}
                      onChange={(e) => updateSection(section.id, { title: e.target.value })}
                      placeholder="Enter section title..."
                    />
                  </div>
                  <div>
                    <Label>Text Content</Label>
                    <Textarea
                      value={section.content}
                      onChange={(e) => updateSection(section.id, { content: e.target.value })}
                      placeholder="Enter text content..."
                      className="min-h-[100px]"
                    />
                  </div>
                </>
              )}

              {section.type === 'image' && (
                <>
                  <div>
                    <Label>Image Title (Optional)</Label>
                    <Input
                      value={section.title || ''}
                      onChange={(e) => updateSection(section.id, { title: e.target.value })}
                      placeholder="Enter image title..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Image URL or Upload</Label>
                    <Input
                      value={section.content}
                      onChange={(e) => updateSection(section.id, { content: e.target.value })}
                      placeholder="Enter image URL or upload below..."
                    />
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          // Validate file size (5MB)
                          if (file.size > 5 * 1024 * 1024) {
                            alert('Image must be smaller than 5MB');
                            return;
                          }
                          
                          try {
                            const fileExt = file.name.split('.').pop();
                            const fileName = `content-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
                            
                            const { error: uploadError } = await supabase.storage
                              .from('library-photos')
                              .upload(fileName, file);
                            
                            if (uploadError) throw uploadError;
                            
                            const { data: { publicUrl } } = supabase.storage
                              .from('library-photos')
                              .getPublicUrl(fileName);
                            
                            updateSection(section.id, { content: publicUrl });
                          } catch (error) {
                            console.error('Upload error:', error);
                            alert('Failed to upload image');
                          }
                        }}
                        className="text-xs"
                      />
                    </div>
                  </div>
                  {section.content && (
                    <div className="mt-2">
                      <img 
                        src={section.content} 
                        alt={section.title || 'Preview'} 
                        className="max-w-full h-auto rounded border"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </>
              )}

              {section.type === 'video' && (
                <>
                  <div>
                    <Label>Video Title (Optional)</Label>
                    <Input
                      value={section.title || ''}
                      onChange={(e) => updateSection(section.id, { title: e.target.value })}
                      placeholder="Enter video title..."
                    />
                  </div>
                  <div>
                    <Label>Video Embed URL</Label>
                    <Input
                      value={section.content}
                      onChange={(e) => updateSection(section.id, { content: e.target.value })}
                      placeholder="Enter video embed URL (YouTube, Vimeo, etc.)..."
                    />
                  </div>
                  {section.content && (
                    <div className="mt-2">
                      <div className="aspect-video rounded-lg overflow-hidden border">
                        <iframe 
                          src={section.content} 
                          className="w-full h-full" 
                          allowFullScreen 
                          title={section.title || 'Video content'}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {section.type === 'link' && (
                <>
                  <div>
                    <Label>Link Title</Label>
                    <Input
                      value={section.title || ''}
                      onChange={(e) => updateSection(section.id, { title: e.target.value })}
                      placeholder="Enter link title..."
                    />
                  </div>
                  <div>
                    <Label>URL</Label>
                    <Input
                      value={section.content}
                      onChange={(e) => updateSection(section.id, { content: e.target.value })}
                      placeholder="Enter URL..."
                    />
                  </div>
                  {section.content && section.title && (
                    <div className="mt-2">
                      <a 
                        href={section.content} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        {section.title}
                      </a>
                    </div>
                  )}
                </>
              )}

              {section.type === 'safety-warning' && (
                <>
                  <div>
                    <Label>Warning Title</Label>
                    <Input
                      value={section.title || ''}
                      onChange={(e) => updateSection(section.id, { title: e.target.value })}
                      placeholder="Enter warning title..."
                    />
                  </div>
                  <div>
                    <Label>Severity Level</Label>
                    <Select 
                      value={section.severity || 'medium'} 
                      onValueChange={(value) => updateSection(section.id, { severity: value as ContentSection['severity'] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low - Minor injury or comfort</SelectItem>
                        <SelectItem value="medium">Medium - Minor injury potential</SelectItem>
                        <SelectItem value="high">High - Serious injury potential</SelectItem>
                        <SelectItem value="critical">Critical - Life-threatening hazard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Warning Message</Label>
                    <Textarea
                      value={section.content}
                      onChange={(e) => updateSection(section.id, { content: e.target.value })}
                      placeholder="Enter safety warning details..."
                      className="min-h-[80px]"
                    />
                  </div>
                  {section.content && (
                    <div className="mt-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                        <div>
                          {section.title && <div className="font-semibold text-destructive mb-1">{section.title}</div>}
                          <div className="text-sm text-muted-foreground">{section.content}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {sections.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">No content sections added yet.</p>
            <Button onClick={() => addSection('text')}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Section
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}