import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, FileText, Image, Video, ExternalLink } from "lucide-react";

interface ContentSection {
  id: string;
  type: 'text' | 'image' | 'video' | 'link';
  content: string;
  title?: string;
  width?: 'full' | 'half' | 'third' | 'two-thirds';
  alignment?: 'left' | 'center' | 'right';
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
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Step Content</h3>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => addSection('text')} variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            Add Text
          </Button>
          <Button size="sm" onClick={() => addSection('image')} variant="outline">
            <Image className="w-4 h-4 mr-2" />
            Add Image
          </Button>
          <Button size="sm" onClick={() => addSection('video')} variant="outline">
            <Video className="w-4 h-4 mr-2" />
            Add Video
          </Button>
          <Button size="sm" onClick={() => addSection('link')} variant="outline">
            <ExternalLink className="w-4 h-4 mr-2" />
            Add Link
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
                  <div>
                    <Label>Image URL</Label>
                    <Input
                      value={section.content}
                      onChange={(e) => updateSection(section.id, { content: e.target.value })}
                      placeholder="Enter image URL..."
                    />
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