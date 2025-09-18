import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, CheckCircle, AlertCircle, Zap, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { EnhancedToolParser, importEnhancedToolsToDatabase, type EnhancedParsedTool } from '@/utils/enhancedToolParser';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';

interface EnhancedToolImporterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EnhancedToolImporter({ open, onOpenChange, onSuccess }: EnhancedToolImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedTools, setParsedTools] = useState<EnhancedParsedTool[]>([]);
  const [importing, setImporting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scrapingPrices, setScrapingPrices] = useState(false);
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
      const tools = await EnhancedToolParser.parseEnhancedToolListExcel(file);
      setParsedTools(tools);
      toast.success(`Parsed ${tools.length} tool groups with ${tools.reduce((acc, t) => acc + t.variants.length, 0)} variants`);
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
      const results = await importEnhancedToolsToDatabase(parsedTools, (current, total) => {
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

  const handleScrapeAllPricing = async () => {
    if (parsedTools.length === 0) return;

    setScrapingPrices(true);
    setProgress(0);
    
    try {
      let processed = 0;
      const totalModels = parsedTools.reduce((acc, tool) => 
        acc + tool.variants.reduce((vAcc, variant) => vAcc + variant.models.length, 0), 0
      );

      for (const tool of parsedTools) {
        for (const variant of tool.variants) {
          for (const model of variant.models) {
            try {
              // Get the model ID from database first
              const { data: dbModel } = await supabase
                .from('tool_models')
                .select('id')
                .eq('model_name', model.modelName)
                .eq('manufacturer', model.manufacturer || '')
                .maybeSingle();

              if (dbModel) {
                // Trigger pricing scrape
                const searchTerm = `${model.manufacturer || ''} ${model.modelName}`.trim();
                await supabase.functions.invoke('scrape-tool-pricing', {
                  body: { 
                    modelId: dbModel.id, 
                    searchTerm,
                    includeEstimates: true
                  }
                });
                
                // Small delay to avoid overwhelming servers
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            } catch (error) {
              console.error(`Error scraping pricing for ${model.modelName}:`, error);
            }
            
            processed++;
            setProgress((processed / totalModels) * 100);
          }
        }
      }

      toast.success(`Completed pricing scrape for ${totalModels} models`);
    } catch (error) {
      console.error('Error scraping pricing:', error);
      toast.error('Failed to scrape pricing data');
    } finally {
      setScrapingPrices(false);
      setProgress(0);
    }
  };

  const resetImporter = () => {
    setFile(null);
    setParsedTools([]);
    setImportResults(null);
    setProgress(0);
  };

  const updateVariantWarningFlag = (toolIndex: number, variantIndex: number, flag: string, checked: boolean) => {
    const updatedTools = [...parsedTools];
    const variant = updatedTools[toolIndex].variants[variantIndex];
    
    if (checked) {
      if (!variant.warningFlags.includes(flag)) {
        variant.warningFlags.push(flag);
      }
    } else {
      variant.warningFlags = variant.warningFlags.filter(f => f !== flag);
    }
    
    setParsedTools(updatedTools);
  };

  const updateVariantEstimate = (
    toolIndex: number, 
    variantIndex: number, 
    field: 'estimatedRentalLifespanDays' | 'estimatedWeightLbs', 
    value: number
  ) => {
    const updatedTools = [...parsedTools];
    updatedTools[toolIndex].variants[variantIndex][field] = value;
    setParsedTools(updatedTools);
  };

  const warningFlagOptions = [
    { id: 'sharp', label: 'Sharp', color: 'text-red-500' },
    { id: 'chemical', label: 'Chemical', color: 'text-orange-500' },
    { id: 'hot', label: 'Hot', color: 'text-red-600' },
    { id: 'heavy', label: 'Heavy', color: 'text-blue-500' },
    { id: 'battery', label: 'Battery', color: 'text-green-500' },
    { id: 'powered', label: 'Powered', color: 'text-yellow-500' }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Enhanced Tool Import System</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto">
          {/* File Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Enhanced Tool List
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
                    {parsing ? 'Parsing...' : 'Parse & Analyze'}
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
                  <span>Parsed Tools ({parsedTools.length} tools, {parsedTools.reduce((acc, t) => acc + t.variants.length, 0)} variants)</span>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleScrapeAllPricing}
                      disabled={scrapingPrices || importing}
                      variant="outline"
                      size="sm"
                    >
                      {scrapingPrices ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Scraping Pricing...
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 mr-2" />
                          Scrape All Pricing
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleImportTools}
                      disabled={importing || scrapingPrices}
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
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {parsedTools.slice(0, 5).map((tool, toolIndex) => (
                    <div key={toolIndex} className="border rounded-md p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{tool.name}</h4>
                        <Badge variant="outline">{tool.category}</Badge>
                      </div>
                      
                      <div className="space-y-2">
                        {tool.variants.map((variant, variantIndex) => (
                          <div key={variantIndex} className="bg-muted p-3 rounded space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{variant.name}</span>
                              <Badge variant="secondary" className="text-xs">
                                {variant.models.length} models
                              </Badge>
                            </div>
                            
                            {/* Attributes */}
                            {Object.keys(variant.attributes).length > 0 && (
                              <div className="text-xs text-muted-foreground">
                                Attributes: {Object.entries(variant.attributes).map(([k, v]) => `${k}: ${v}`).join(', ')}
                              </div>
                            )}
                            
                            {/* Models */}
                            <div className="flex flex-wrap gap-1">
                              {variant.models.map((model, mIndex) => (
                                <Badge key={mIndex} variant="outline" className="text-xs">
                                  {model.manufacturer} {model.modelName}
                                </Badge>
                              ))}
                            </div>
                            
                            {/* Warning Flags */}
                            <div className="space-y-2">
                              <Label className="text-xs font-medium">Warning Flags:</Label>
                              <div className="flex flex-wrap gap-2">
                                {warningFlagOptions.map((flag) => (
                                  <div key={flag.id} className="flex items-center space-x-1">
                                    <Checkbox
                                      id={`${toolIndex}-${variantIndex}-${flag.id}`}
                                      checked={variant.warningFlags.includes(flag.id)}
                                      onCheckedChange={(checked) => 
                                        updateVariantWarningFlag(toolIndex, variantIndex, flag.id, checked as boolean)
                                      }
                                    />
                                    <label
                                      htmlFor={`${toolIndex}-${variantIndex}-${flag.id}`}
                                      className={`text-xs ${flag.color}`}
                                    >
                                      {flag.label}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            {/* Estimates */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">Rental Lifespan (days)</Label>
                                <Input
                                  type="number"
                                  value={variant.estimatedRentalLifespanDays || ''}
                                  onChange={(e) => updateVariantEstimate(
                                    toolIndex, 
                                    variantIndex, 
                                    'estimatedRentalLifespanDays', 
                                    parseInt(e.target.value) || 0
                                  )}
                                  className="h-8 text-xs"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Weight (lbs)</Label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={variant.estimatedWeightLbs || ''}
                                  onChange={(e) => updateVariantEstimate(
                                    toolIndex, 
                                    variantIndex, 
                                    'estimatedWeightLbs', 
                                    parseFloat(e.target.value) || 0
                                  )}
                                  className="h-8 text-xs"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {parsedTools.length > 5 && (
                    <div className="text-center text-sm text-muted-foreground">
                      ... and {parsedTools.length - 5} more tools
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

          {/* Progress Bar */}
          {(importing || scrapingPrices) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{importing ? 'Importing tools...' : 'Scraping pricing data...'}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* Expected Format Help */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Enhanced Excel Format</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>Your Excel file should have columns: <strong>Item</strong>, <strong>Model 1</strong></p>
              <p>Use hyphens (-) in tool names to indicate variants:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><code>Circular saw - 7-1/4"</code> → Size variant</li>
                <li><code>Angle grinder - 4-1/2" - Battery</code> → Size + Power source variants</li>
                <li><code>Circular saw blade - 7-1/4" - 40 tooth - Plywood</code> → Size + Tooth count + Application variants</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}