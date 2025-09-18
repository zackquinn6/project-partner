import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { parseToolListExcel, importToolsToDatabase } from '@/utils/toolParser';

interface ToolsImportManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ParsedCSVItem {
  item: string;
  description?: string;
  example_models?: string;
  errors?: string[];
}

interface ParsedExcelTool {
  name: string;
  description?: string;
  category?: string;
  variations: Array<{
    brand: string;
    model: string;
    attributes: Record<string, string>;
  }>;
}

export function ToolsImportManager({ open, onOpenChange, onSuccess }: ToolsImportManagerProps) {
  // CSV-related state
  const [csvData, setCsvData] = useState('');
  const [csvFileInput, setCsvFileInput] = useState<File | null>(null);
  const [parsedCSVItems, setParsedCSVItems] = useState<ParsedCSVItem[]>([]);
  const [csvLoading, setCsvLoading] = useState(false);
  const [showCSVPreview, setShowCSVPreview] = useState(false);

  // Excel-related state
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [parsedExcelTools, setParsedExcelTools] = useState<ParsedExcelTool[]>([]);
  const [excelImporting, setExcelImporting] = useState(false);
  const [excelParsing, setExcelParsing] = useState(false);
  const [excelProgress, setExcelProgress] = useState(0);
  const [excelImportResults, setExcelImportResults] = useState<{
    success: number;
    errors: string[];
  } | null>(null);

  const sampleCSV = `item,description,example_models
Hammer,Basic claw hammer for general use,Stanley 16oz
Drill,Cordless drill for holes and screws,DeWalt 20V MAX
Saw,Hand saw for cutting wood,Irwin Universal`;

  // CSV Functions
  const parseCSV = (csvText: string): ParsedCSVItem[] => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const requiredHeaders = ['item'];
    const optionalHeaders = ['description', 'example_models'];

    const hasRequiredHeaders = requiredHeaders.every(header => headers.includes(header));
    if (!hasRequiredHeaders) {
      throw new Error(`CSV must include required headers: ${requiredHeaders.join(', ')}`);
    }

    const items: ParsedCSVItem[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const item: ParsedCSVItem = { item: '', errors: [] };
      
      headers.forEach((header, index) => {
        const value = values[index] || '';
        if (header === 'item') {
          item.item = value;
          if (!value) {
            item.errors?.push('Item name is required');
          }
        } else if (optionalHeaders.includes(header) && value) {
          (item as any)[header] = value;
        }
      });

      if (item.item) {
        items.push(item);
      }
    }

    return items;
  };

  const handleCSVFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCsvFileInput(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setCsvData(text);
      };
      reader.readAsText(file);
    }
  };

  const handleCSVPreview = () => {
    try {
      const items = parseCSV(csvData);
      setParsedCSVItems(items);
      setShowCSVPreview(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid CSV format');
    }
  };

  const handleCSVUpload = async () => {
    if (parsedCSVItems.length === 0) return;

    setCsvLoading(true);
    try {
      const validItems = parsedCSVItems.filter(item => !item.errors?.length);
      
      const { error } = await supabase
        .from('tools')
        .insert(validItems.map(item => ({
          item: item.item,
          description: item.description || null,
          example_models: item.example_models || null
        })));

      if (error) throw error;

      toast.success(`Successfully uploaded ${validItems.length} tools`);
      onSuccess();
      resetCSV();
    } catch (error) {
      console.error('Error uploading tools:', error);
      toast.error('Failed to upload tools');
    } finally {
      setCsvLoading(false);
    }
  };

  // Excel Functions
  const handleExcelFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setExcelFile(selectedFile);
      setParsedExcelTools([]);
      setExcelImportResults(null);
    }
  };

  const handleExcelParseFile = async () => {
    if (!excelFile) return;

    setExcelParsing(true);
    try {
      const tools = await parseToolListExcel(excelFile);
      setParsedExcelTools(tools);
      toast.success(`Parsed ${tools.length} tools from Excel file`);
    } catch (error) {
      console.error('Error parsing file:', error);
      toast.error('Failed to parse Excel file. Please check the format.');
    } finally {
      setExcelParsing(false);
    }
  };

  const handleExcelImportTools = async () => {
    if (parsedExcelTools.length === 0) return;

    setExcelImporting(true);
    setExcelProgress(0);

    try {
      const results = await importToolsToDatabase(parsedExcelTools, (current, total) => {
        setExcelProgress((current / total) * 100);
      });

      setExcelImportResults(results);
      
      if (results.success > 0) {
        toast.success(`Successfully imported ${results.success} tools`);
        onSuccess();
      }

      if (results.errors.length > 0) {
        toast.error(`${results.errors.length} tools failed to import`);
      }
    } catch (error) {
      console.error('Error importing tools:', error);
      toast.error('Failed to import tools');
    } finally {
      setExcelImporting(false);
      setExcelProgress(0);
    }
  };

  // Reset functions
  const resetCSV = () => {
    setCsvData('');
    setCsvFileInput(null);
    setParsedCSVItems([]);
    setShowCSVPreview(false);
  };

  const resetExcel = () => {
    setExcelFile(null);
    setParsedExcelTools([]);
    setExcelImportResults(null);
    setExcelProgress(0);
  };

  const resetAll = () => {
    resetCSV();
    resetExcel();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Import Tools</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="csv" className="w-full overflow-y-auto">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="csv">CSV Import</TabsTrigger>
            <TabsTrigger value="excel">Excel Import</TabsTrigger>
          </TabsList>
          
          {/* CSV Import Tab */}
          <TabsContent value="csv" className="space-y-4 overflow-y-auto max-h-[70vh]">
            <Tabs defaultValue="paste" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="paste">Paste CSV</TabsTrigger>
                <TabsTrigger value="upload">Upload CSV File</TabsTrigger>
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
                      onChange={handleCSVFileUpload}
                      className="hidden"
                      id="csv-file-upload"
                    />
                    <label htmlFor="csv-file-upload" className="cursor-pointer">
                      <Button variant="outline" asChild>
                        <span>Choose CSV File</span>
                      </Button>
                    </label>
                    {csvFileInput && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Selected: {csvFileInput.name}
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
                    <strong>Optional Columns:</strong> description, example_models
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

            {showCSVPreview && parsedCSVItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Preview ({parsedCSVItems.length} items)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {parsedCSVItems.map((item, index) => (
                      <div 
                        key={index} 
                        className={`flex items-center justify-between p-3 rounded border ${
                          item.errors?.length ? 'border-destructive bg-destructive/5' : 'border-border'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="font-medium">{item.item}</div>
                          {item.description && (
                            <div className="text-sm text-muted-foreground">{item.description}</div>
                          )}
                          {item.example_models && (
                            <div className="text-xs text-muted-foreground">Models: {item.example_models}</div>
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
                      {parsedCSVItems.filter(item => !item.errors?.length).length} valid items, {' '}
                      {parsedCSVItems.filter(item => item.errors?.length).length} with errors
                    </div>
                    <div className="space-x-2">
                      <Button variant="outline" onClick={() => setShowCSVPreview(false)}>
                        Edit Data
                      </Button>
                      <Button 
                        onClick={handleCSVUpload} 
                        disabled={csvLoading || parsedCSVItems.filter(item => !item.errors?.length).length === 0}
                      >
                        {csvLoading ? 'Uploading...' : `Upload Valid Items`}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {csvData && !showCSVPreview && (
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={resetCSV}>
                  Reset
                </Button>
                <Button onClick={handleCSVPreview}>
                  Preview Import
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Excel Import Tab */}
          <TabsContent value="excel" className="space-y-4 overflow-y-auto max-h-[70vh]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Select Excel File
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleExcelFileSelect}
                    className="w-full p-2 border rounded-md"
                  />
                  
                  {excelFile && (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm font-medium">{excelFile.name}</span>
                      <Badge variant="secondary">{(excelFile.size / 1024).toFixed(1)} KB</Badge>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={handleExcelParseFile}
                      disabled={!excelFile || excelParsing}
                      className="flex-1"
                    >
                      {excelParsing ? 'Parsing...' : 'Parse File'}
                    </Button>
                    <Button variant="outline" onClick={resetExcel}>
                      Reset
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {parsedExcelTools.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Parsed Tools ({parsedExcelTools.length})</span>
                    <Button
                      onClick={handleExcelImportTools}
                      disabled={excelImporting}
                      className="flex items-center gap-2"
                    >
                      {excelImporting ? (
                        <>
                          <Progress value={excelProgress} className="w-16 h-2" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Import All Tools
                        </>
                      )}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {parsedExcelTools.slice(0, 10).map((tool, index) => (
                      <div key={index} className="p-3 border rounded-md space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{tool.name}</h4>
                          <Badge variant="outline">
                            {tool.variations.length} variations
                          </Badge>
                        </div>
                        {tool.description && (
                          <p className="text-sm text-muted-foreground">
                            {tool.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {tool.variations.slice(0, 3).map((variation, vIndex) => (
                            <Badge key={vIndex} variant="secondary" className="text-xs">
                              {variation.brand} {variation.model}
                            </Badge>
                          ))}
                          {tool.variations.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{tool.variations.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    {parsedExcelTools.length > 10 && (
                      <div className="text-center text-sm text-muted-foreground">
                        ... and {parsedExcelTools.length - 10} more tools
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {excelImportResults && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {excelImportResults.success > 0 ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    )}
                    Import Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-md">
                      <span className="text-green-800">Successfully Imported</span>
                      <Badge variant="default" className="bg-green-600">
                        {excelImportResults.success} tools
                      </Badge>
                    </div>

                    {excelImportResults.errors.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 bg-red-50 rounded-md">
                          <span className="text-red-800">Failed to Import</span>
                          <Badge variant="destructive">
                            {excelImportResults.errors.length} tools
                          </Badge>
                        </div>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {excelImportResults.errors.map((error, index) => (
                            <div key={index} className="text-xs text-red-600 p-2 bg-red-50 rounded">
                              {error}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Expected Excel Format</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>Your Excel file should have columns: Tool Name, Description, Brand, Model, and any attribute columns (Size, Power, etc.)</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={resetAll}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}