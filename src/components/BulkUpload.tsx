import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface BulkUploadProps {
  type: 'tools' | 'materials';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ParsedItem {
  name: string;
  description?: string;
  example_models?: string;
  unit?: string;
  errors?: string[];
}

export function BulkUpload({ type, open, onOpenChange, onSuccess }: BulkUploadProps) {
  const [csvData, setCsvData] = useState('');
  const [fileInput, setFileInput] = useState<File | null>(null);
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const sampleCSV = type === 'tools' 
    ? `item,description,example_models
Hammer,Basic claw hammer for general use,Stanley 16oz
Drill,Cordless drill for holes and screws,DeWalt 20V MAX
Saw,Hand saw for cutting wood,Irwin Universal`
    : `item,description,unit_size
Paint,Interior wall paint,1 gallon
Screws,Wood screws for construction,Box of 100
Sandpaper,Fine grit sandpaper,Pack of 10 sheets`;

  const parseCSV = (csvText: string): ParsedItem[] => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const requiredHeaders = ['item'];
    const optionalHeaders = type === 'tools' 
      ? ['description', 'example_models']
      : ['description', 'unit_size'];

    // Validate headers
    const hasRequiredHeaders = requiredHeaders.every(header => headers.includes(header));
    if (!hasRequiredHeaders) {
      throw new Error(`CSV must include required headers: ${requiredHeaders.join(', ')}`);
    }

    const items: ParsedItem[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const item: ParsedItem = { name: '', errors: [] };
      
      headers.forEach((header, index) => {
        const value = values[index] || '';
        if (header === 'name' || header === 'item') {
          item.name = value;
          if (!value) {
            item.errors?.push('Item name is required');
          }
        } else if (optionalHeaders.includes(header) && value) {
          (item as any)[header] = value;
        }
      });

      if (item.name) {
        items.push(item);
      }
    }

    return items;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileInput(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setCsvData(text);
      };
      reader.readAsText(file);
    }
  };

  const handlePreview = () => {
    try {
      const items = parseCSV(csvData);
      setParsedItems(items);
      setShowPreview(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid CSV format');
    }
  };

  const handleUpload = async () => {
    if (parsedItems.length === 0) return;

    setLoading(true);
    try {
      const validItems = parsedItems.filter(item => !item.errors?.length);
      
      const { error } = await supabase
        .from(type)
        .insert(validItems.map(item => ({
          name: item.name,
          description: item.description || null,
          ...(type === 'tools' 
            ? { example_models: item.example_models || null }
            : { unit: item.unit || null }
          )
        })));

      if (error) throw error;

      toast.success(`Successfully uploaded ${validItems.length} ${type}`);
      onSuccess();
      onOpenChange(false);
      setCsvData('');
      setFileInput(null);
      setParsedItems([]);
      setShowPreview(false);
    } catch (error) {
      console.error('Error uploading items:', error);
      toast.error('Failed to upload items');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Upload {type === 'tools' ? 'Tools' : 'Materials'}</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="paste" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="paste">Paste CSV</TabsTrigger>
            <TabsTrigger value="upload">Upload File</TabsTrigger>
          </TabsList>
          
          <TabsContent value="paste" className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Paste CSV Data</h3>
              <Textarea
                placeholder={`Paste your CSV data here...\n\nExample:\n${sampleCSV}`}
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
              />
            </div>
          </TabsContent>
          
          <TabsContent value="upload" className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Upload CSV File</h3>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Button variant="outline" asChild>
                    <span>Choose CSV File</span>
                  </Button>
                </label>
                {fileInput && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Selected: {fileInput.name}
                  </p>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              CSV Format Requirements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div>
                <strong>Required Column:</strong> item
              </div>
              <div>
                <strong>Optional Columns:</strong> {' '}
                {type === 'tools' 
                  ? 'description, example_models'
                  : 'description, unit_size'
                }
              </div>
              <div>
                <strong>Sample CSV:</strong>
                <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-x-auto">
{sampleCSV}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>

        {showPreview && parsedItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Preview ({parsedItems.length} items)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {parsedItems.map((item, index) => (
                  <div 
                    key={index} 
                    className={`flex items-center justify-between p-3 rounded border ${
                      item.errors?.length ? 'border-destructive bg-destructive/5' : 'border-border'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      {item.description && (
                        <div className="text-sm text-muted-foreground">{item.description}</div>
                      )}
                      {type === 'tools' && item.example_models && (
                        <div className="text-xs text-muted-foreground">Models: {item.example_models}</div>
                      )}
                      {type === 'materials' && item.unit && (
                        <div className="text-xs text-muted-foreground">Unit: {item.unit}</div>
                      )}
                      {item.errors?.length && (
                        <div className="text-xs text-destructive mt-1">
                          {item.errors.join(', ')}
                        </div>
                      )}
                    </div>
                    <div>
                      {item.errors?.length ? (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-between">
                <div className="text-sm text-muted-foreground">
                  {parsedItems.filter(item => !item.errors?.length).length} valid items, {' '}
                  {parsedItems.filter(item => item.errors?.length).length} with errors
                </div>
                <div className="space-x-2">
                  <Button variant="outline" onClick={() => setShowPreview(false)}>
                    Edit Data
                  </Button>
                  <Button 
                    onClick={handleUpload} 
                    disabled={loading || parsedItems.filter(item => !item.errors?.length).length === 0}
                  >
                    {loading ? 'Uploading...' : `Upload Valid Items`}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {csvData && !showPreview && (
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handlePreview}>
              Preview Import
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}