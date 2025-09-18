import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { parseToolListExcel, importToolsToDatabase } from '@/utils/toolParser';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ToolImporterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ParsedTool {
  name: string;
  description?: string;
  category?: string;
  variations: Array<{
    brand: string;
    model: string;
    attributes: Record<string, string>;
  }>;
}

export function ToolImporter({ open, onOpenChange, onSuccess }: ToolImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedTools, setParsedTools] = useState<ParsedTool[]>([]);
  const [importing, setImporting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResults, setImportResults] = useState<{
    success: number;
    errors: string[];
  } | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setParsedTools([]);
      setImportResults(null);
    }
  };

  const handleParseFile = async () => {
    if (!file) return;

    setParsing(true);
    try {
      const tools = await parseToolListExcel(file);
      setParsedTools(tools);
      toast.success(`Parsed ${tools.length} tools from Excel file`);
    } catch (error) {
      console.error('Error parsing file:', error);
      toast.error('Failed to parse Excel file. Please check the format.');
    } finally {
      setParsing(false);
    }
  };

  const handleImportTools = async () => {
    if (parsedTools.length === 0) return;

    setImporting(true);
    setProgress(0);

    try {
      const results = await importToolsToDatabase(parsedTools, (current, total) => {
        setProgress((current / total) * 100);
      });

      setImportResults(results);
      
      if (results.success > 0) {
        toast.success(`Successfully imported ${results.success} tools`);
        onSuccess?.();
      }

      if (results.errors.length > 0) {
        toast.error(`${results.errors.length} tools failed to import`);
      }
    } catch (error) {
      console.error('Error importing tools:', error);
      toast.error('Failed to import tools');
    } finally {
      setImporting(false);
      setProgress(0);
    }
  };

  const resetImporter = () => {
    setFile(null);
    setParsedTools([]);
    setImportResults(null);
    setProgress(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Import Tools from Excel</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto">
          {/* File Upload Section */}
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
                  onChange={handleFileSelect}
                  className="w-full p-2 border rounded-md"
                />
                
                {file && (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm font-medium">{file.name}</span>
                    <Badge variant="secondary">{(file.size / 1024).toFixed(1)} KB</Badge>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleParseFile}
                    disabled={!file || parsing}
                    className="flex-1"
                  >
                    {parsing ? 'Parsing...' : 'Parse File'}
                  </Button>
                  <Button variant="outline" onClick={resetImporter}>
                    Reset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Parsed Tools Preview */}
          {parsedTools.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Parsed Tools ({parsedTools.length})</span>
                  <Button
                    onClick={handleImportTools}
                    disabled={importing}
                    className="flex items-center gap-2"
                  >
                    {importing ? (
                      <>
                        <Progress value={progress} className="w-16 h-2" />
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
                  {parsedTools.slice(0, 10).map((tool, index) => (
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
                  {parsedTools.length > 10 && (
                    <div className="text-center text-sm text-muted-foreground">
                      ... and {parsedTools.length - 10} more tools
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Import Results */}
          {importResults && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {importResults.success > 0 ? (
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
                      {importResults.success} tools
                    </Badge>
                  </div>

                  {importResults.errors.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-red-50 rounded-md">
                        <span className="text-red-800">Failed to Import</span>
                        <Badge variant="destructive">
                          {importResults.errors.length} tools
                        </Badge>
                      </div>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {importResults.errors.map((error, index) => (
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

          {/* Expected Format Help */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Expected Excel Format</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>Your Excel file should have columns: Tool Name, Description, Brand, Model, and any attribute columns (Size, Power, etc.)</p>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}