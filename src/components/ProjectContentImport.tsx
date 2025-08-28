import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileText, AlertCircle, CheckCircle, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Phase, Operation, WorkflowStep, Output, Material, Tool } from '@/interfaces/Project';

interface ProjectContentImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (phases: Phase[]) => void;
}

interface ParsedProjectContent {
  phases: Phase[];
  errors: string[];
}

export function ProjectContentImport({ open, onOpenChange, onImport }: ProjectContentImportProps) {
  const [csvData, setCsvData] = useState('');
  const [fileInput, setFileInput] = useState<File | null>(null);
  const [parsedContent, setParsedContent] = useState<ParsedProjectContent>({ phases: [], errors: [] });
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const sampleCSV = `phase,operation,step,step_description,output_name,output_description,output_type,tool_name,tool_description,material_name,material_description
Planning,Project Setup,Define Requirements,Gather all project requirements,Requirements Document,Complete project requirements,none,Pen,Writing instrument,Paper,Note-taking paper
Planning,Project Setup,Create Timeline,Establish project milestones,Project Timeline,Detailed project schedule,none,Computer,For scheduling software,,,
Preparation,Site Prep,Clear Area,Remove debris and obstacles,Clean Work Area,Area ready for work,safety,Shovel,For moving debris,Trash Bags,For debris collection
Preparation,Site Prep,Mark Utilities,Identify underground utilities,Utility Markings,All utilities clearly marked,safety,Spray Paint,For marking locations,,,
Execution,Installation,Measure Space,Take accurate measurements,Measurements,Precise dimensions recorded,performance-durability,Tape Measure,25ft measuring tape,,,
Execution,Installation,Cut Materials,Cut materials to size,Cut Materials,Materials ready for installation,major-aesthetics,Saw,Hand saw for cutting,Wood,Construction lumber`;

  const parseCsvLine = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"' && !inQuotes) {
        inQuotes = true;
      } else if (char === '"' && inQuotes) {
        if (nextChar === '"') {
          current += '"';
          i++; // Skip the next quote
        } else {
          inQuotes = false;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current.trim());
    return values;
  };

  const parseCSV = (csvText: string): ParsedProjectContent => {
    const lines = csvText.trim().split('\n').filter(line => line.trim()); // Filter out empty lines
    if (lines.length < 2) return { phases: [], errors: ['CSV must have at least a header and one data row'] };

    const headers = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase());
    const requiredHeaders = ['phase', 'operation', 'step'];
    const errors: string[] = [];

    // Validate headers
    const hasRequiredHeaders = requiredHeaders.every(header => headers.includes(header));
    if (!hasRequiredHeaders) {
      errors.push(`CSV must include required headers: ${requiredHeaders.join(', ')}`);
      return { phases: [], errors };
    }

    const phasesMap = new Map<string, Phase>();
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines
      
      let values: string[];
      let rowData: any = {};
      
      try {
        values = parseCsvLine(line);
        
        headers.forEach((header, index) => {
          rowData[header] = (values[index] || '').trim();
        });
      } catch (parseError) {
        errors.push(`Row ${i + 1}: Malformed CSV data`);
        continue;
      }

      if (!rowData.phase || !rowData.operation || !rowData.step) {
        errors.push(`Row ${i + 1}: Missing required fields (phase, operation, step)`);
        continue;
      }

      // Get or create phase
      let phase = phasesMap.get(rowData.phase);
      if (!phase) {
        phase = {
          id: `phase-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: rowData.phase,
          description: '',
          operations: []
        };
        phasesMap.set(rowData.phase, phase);
      }

      // Get or create operation
      let operation = phase.operations.find(op => op.name === rowData.operation);
      if (!operation) {
        operation = {
          id: `operation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: rowData.operation,
          description: '',
          steps: []
        };
        phase.operations.push(operation);
      }

      // Get or create step
      let step = operation.steps.find(s => s.step === rowData.step);
      if (!step) {
        step = {
          id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          step: rowData.step,
          description: rowData.step_description || '',
          contentType: 'text' as const,
          content: '',
          materials: [],
          tools: [],
          outputs: []
        };
        operation.steps.push(step);
      }

      // Add output if provided
      if (rowData.output_name) {
        const output: Output = {
          id: `output-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: rowData.output_name,
          description: rowData.output_description || '',
          type: (rowData.output_type as Output['type']) || 'none'
        };
        
        // Allow multiple outputs with same name from different rows
        step.outputs.push(output);
      }

      // Add tool if provided
      if (rowData.tool_name) {
        const tool: Tool = {
          id: `tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: rowData.tool_name,
          description: rowData.tool_description || '',
          category: 'Other' as const,
          required: true
        };
        
        // Allow multiple tools with same name from different rows
        step.tools.push(tool);
      }

      // Add material if provided
      if (rowData.material_name) {
        const material: Material = {
          id: `material-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: rowData.material_name,
          description: rowData.material_description || '',
          category: 'Other' as const,
          required: true
        };
        
        // Allow multiple materials with same name from different rows
        step.materials.push(material);
      }
    }

    return {
      phases: Array.from(phasesMap.values()),
      errors
    };
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
      const result = parseCSV(csvData);
      setParsedContent(result);
      setShowPreview(true);
      
      if (result.errors.length > 0) {
        toast.error(`Found ${result.errors.length} errors. Please review.`);
      } else {
        toast.success(`Successfully parsed ${result.phases.length} phases`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid CSV format');
    }
  };

  const handleImport = async () => {
    if (parsedContent.phases.length === 0) return;

    setLoading(true);
    try {
      onImport(parsedContent.phases);
      toast.success(`Successfully imported ${parsedContent.phases.length} phases with their operations and steps`);
      onOpenChange(false);
      setCsvData('');
      setFileInput(null);
      setParsedContent({ phases: [], errors: [] });
      setShowPreview(false);
    } catch (error) {
      console.error('Error importing project content:', error);
      toast.error('Failed to import project content');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([sampleCSV], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project-content-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Project Content</DialogTitle>
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
                placeholder={`Paste your CSV data here...\n\nExample:\n${sampleCSV.split('\n').slice(0, 3).join('\n')}...`}
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
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Button variant="outline" asChild>
                    <span>Choose CSV/Excel File</span>
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
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                CSV Format Requirements
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div>
                <strong>Required Columns:</strong> phase, operation, step
              </div>
              <div>
                <strong>Optional Columns:</strong> step_description, output_name, output_description, output_type, tool_name, tool_description, material_name, material_description
              </div>
              <div>
                <strong>Output Types:</strong> none, major-aesthetics, performance-durability, safety
              </div>
              <div>
                <strong>Note:</strong> Multiple rows can have the same phase/operation to add different steps, outputs, tools, or materials
              </div>
            </div>
          </CardContent>
        </Card>

        {showPreview && (
          <Card>
            <CardHeader>
              <CardTitle>
                Preview: {parsedContent.phases.length} Phases
                {parsedContent.errors.length > 0 && (
                  <span className="text-destructive ml-2">({parsedContent.errors.length} errors)</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-96">
                {parsedContent.errors.length > 0 && (
                  <div className="mb-4 p-3 bg-destructive/10 border border-destructive rounded">
                    <h4 className="font-medium text-destructive mb-2">Errors Found:</h4>
                    <ul className="text-sm text-destructive space-y-1">
                      {parsedContent.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="space-y-4">
                  {parsedContent.phases.map((phase, phaseIndex) => (
                    <div key={phase.id} className="border rounded-lg p-4">
                      <h3 className="font-bold text-lg text-primary mb-2">{phase.name}</h3>
                      
                      {phase.operations.map((operation, opIndex) => (
                        <div key={operation.id} className="ml-4 mb-3 border-l-2 border-blue-200 pl-4">
                          <h4 className="font-medium text-blue-600 mb-2">{operation.name}</h4>
                          
                          {operation.steps.map((step, stepIndex) => (
                            <div key={step.id} className="ml-4 mb-2 p-2 bg-muted rounded">
                              <div className="font-medium">{step.step}</div>
                              {step.description && (
                                <div className="text-sm text-muted-foreground">{step.description}</div>
                              )}
                              
                              <div className="flex gap-4 mt-2 text-xs">
                                {step.outputs.length > 0 && (
                                  <div>
                                    <span className="font-medium">Outputs:</span> {step.outputs.map(o => o.name).join(', ')}
                                  </div>
                                )}
                                {step.tools.length > 0 && (
                                  <div>
                                    <span className="font-medium">Tools:</span> {step.tools.map(t => t.name).join(', ')}
                                  </div>
                                )}
                                {step.materials.length > 0 && (
                                  <div>
                                    <span className="font-medium">Materials:</span> {step.materials.map(m => m.name).join(', ')}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              <div className="mt-4 flex justify-between">
                <div className="text-sm text-muted-foreground">
                  Total: {parsedContent.phases.length} phases, {' '}
                  {parsedContent.phases.reduce((sum, p) => sum + p.operations.length, 0)} operations, {' '}
                  {parsedContent.phases.reduce((sum, p) => sum + p.operations.reduce((opSum, op) => opSum + op.steps.length, 0), 0)} steps
                </div>
                <div className="space-x-2">
                  <Button variant="outline" onClick={() => setShowPreview(false)}>
                    Edit Data
                  </Button>
                  <Button 
                    onClick={handleImport} 
                    disabled={loading || parsedContent.phases.length === 0 || parsedContent.errors.length > 0}
                  >
                    {loading ? 'Importing...' : 'Import Project Content'}
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