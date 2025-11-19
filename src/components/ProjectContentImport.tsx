import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileText, AlertCircle, CheckCircle, Download, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Phase, Operation, WorkflowStep, Output, Material, Tool, StepInput } from '@/interfaces/Project';
import * as XLSX from 'xlsx';

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

  const resetImportState = () => {
    setCsvData('');
    setFileInput(null);
    setParsedContent({ phases: [], errors: [] });
    setLoading(false);
    setShowPreview(false);
    // Reset file input
    const fileInputElement = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInputElement) {
      fileInputElement.value = '';
    }
  };

  const sampleCSV = `phase,operation,step,step_description,process_variables,inputs,output_name,output_description,output_type,tool_name,tool_description,material_name,material_description
Planning,Project Setup,Define Requirements,Gather all project requirements,Budget*Project Type*Timeline,Budget Amount*Project Type*Timeline Preference,Requirements Document,Complete project requirements,none,Pen,Writing instrument,Paper,Note-taking paper
Planning,Project Setup,Create Timeline,Establish project milestones,Start Date*End Date,Start Date*End Date,Project Timeline,Detailed project schedule,none,Computer,For scheduling software,,,
Preparation,Site Prep,Clear Area,Remove debris and obstacles,Area Size*Debris Type,Area Size*Debris Type,Clean Work Area,Area ready for work,safety,Shovel,For moving debris,Trash Bags,For debris collection
Preparation,Site Prep,Mark Utilities,Identify underground utilities,,,Utility Markings,All utilities clearly marked,safety,Spray Paint,For marking locations,,,
Execution,Installation,Measure Space,Take accurate measurements,Length*Width*Height,Length*Width*Height,Measurements,Precise dimensions recorded,performance-durability,Tape Measure,25ft measuring tape,,,
Execution,Installation,Cut Materials,Cut materials to size,Cut Length*Angle,Cut Length*Angle,Cut Materials,Materials ready for installation,major-aesthetics,Saw,Hand saw for cutting,Wood,Construction lumber

IMPORTANT FORMAT NOTES:
- Each field must be in its own column - do NOT put multiple comma-separated values in a single field
- Required columns: phase, operation, step
- Optional columns: step_description, process_variables, inputs, output_name, output_description, output_type, tool_name, tool_description, material_name, material_description
- Process variables: Use asterisks (*) to separate multiple variables in the process_variables column (e.g., "Budget*Project Type*Timeline")
- Process variables are only read from the FIRST row of each step - if a step appears multiple times, only the first row's process_variables are used
- Inputs: Use asterisks (*) to separate multiple inputs (e.g., "Budget Amount*Project Type*Timeline Preference")
- Output types: none, major-aesthetics, performance-durability, safety
- Multiple rows can have the same phase/operation/step to add different outputs, tools, or materials`;

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

  const preprocessCsvData = (csvText: string): string => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return csvText;
    
    // Get the header line to count expected columns
    const headerLine = lines[0];
    const expectedColumns = parseCsvLine(headerLine).length;
    
    console.log('Expected columns:', expectedColumns);
    console.log('Headers:', parseCsvLine(headerLine));
    
    const processedLines = lines.map((line, index) => {
      if (index === 0) return line; // Keep header as is
      
      const values = parseCsvLine(line);
      console.log(`Line ${index + 1} original values (${values.length}):`, values);
      
      // If we have fewer values than expected columns, pad with empty strings
      while (values.length < expectedColumns) {
        values.push('');
      }
      
      // If the first value looks like it contains multiple fields (multiple commas)
      // and we have fewer parsed values than expected, this suggests malformed CSV
      if (values.length < expectedColumns && values[0] && values[0].includes(',')) {
        // Try to split the first field and redistribute
        const firstFieldParts = values[0].split(',');
        
        // Replace the first value with just the first part
        values[0] = firstFieldParts[0].trim();
        
        // Try to fill in other empty values with remaining parts
        for (let i = 1; i < Math.min(firstFieldParts.length, expectedColumns); i++) {
          if (i < values.length && !values[i]) {
            values[i] = firstFieldParts[i].trim();
          }
        }
        
        console.log(`Line ${index + 1} after redistribution:`, values.slice(0, expectedColumns));
      }
      
      // Ensure we don't exceed expected columns
      values.length = expectedColumns;
      
      // Rebuild the CSV line with proper quoting
      return values.map(value => {
        const cleanValue = (value || '').toString().trim();
        // If value contains commas, quotes, or newlines, wrap in quotes
        if (cleanValue.includes(',') || cleanValue.includes('"') || cleanValue.includes('\n')) {
          return `"${cleanValue.replace(/"/g, '""')}"`;
        }
        return cleanValue;
      }).join(',');
    });
    
    const result = processedLines.join('\n');
    console.log('Preprocessed CSV sample:', result.split('\n').slice(0, 5).join('\n'));
    return result;
  };

  const parseCSV = (csvText: string): ParsedProjectContent => {
    // Preprocess the CSV to handle malformed data
    const processedCsv = preprocessCsvData(csvText);
    const lines = processedCsv.trim().split('\n').filter(line => line.trim()); // Filter out empty lines
    if (lines.length < 2) return { phases: [], errors: ['CSV must have at least a header and one data row'] };

    const headers = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase());
    const requiredHeaders = ['phase', 'operation', 'step'];
    const errors: string[] = [];

    // Debug: Log header information
    console.log('CSV Headers found:', headers);
    console.log('Expected headers:', requiredHeaders);

    // Validate headers
    const hasRequiredHeaders = requiredHeaders.every(header => headers.includes(header));
    if (!hasRequiredHeaders) {
      const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
      errors.push(`CSV must include required headers: ${missingHeaders.join(', ')}. Found headers: ${headers.join(', ')}`);
      return { phases: [], errors };
    }

    const phasesMap = new Map<string, Phase>();
    // Track which steps have had their process variables set (only first row per step)
    const stepProcessVariablesSet = new Set<string>();
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines
      
      let values: string[];
      let rowData: any = {};
      
      try {
        values = parseCsvLine(line);
        
        // Debug: Log raw parsing results
        console.log(`Row ${i + 1} raw values:`, values);
        console.log(`Row ${i + 1} values count:`, values.length, 'vs headers count:', headers.length);
        
        headers.forEach((header, index) => {
          rowData[header] = (values[index] || '').trim();
        });
      } catch (parseError) {
        errors.push(`Row ${i + 1}: Malformed CSV data - ${parseError}`);
        continue;
      }

      // Debug logging for field validation
      console.log(`Row ${i + 1} parsed data:`, {
        phase: rowData.phase,
        operation: rowData.operation,
        step: rowData.step,
        allFields: rowData
      });

      // Skip rows that appear to be empty or contain only commas/asterisks
      if (!rowData.phase || rowData.phase.match(/^[,*\s]*$/) || 
          (!rowData.operation && !rowData.step && Object.values(rowData).every(val => !val || typeof val === 'string' && val.match(/^[,*\s]*$/)))) {
        console.log(`Row ${i + 1}: Skipping empty or malformed row`);
        continue;
      }

      // Enhanced validation for malformed data
      if (!rowData.phase || !rowData.operation || !rowData.step) {
        const missingFields = [];
        if (!rowData.phase) missingFields.push('phase');
        if (!rowData.operation) missingFields.push('operation');
        if (!rowData.step) missingFields.push('step');
        
        // Check if the phase field contains what looks like multiple fields
        if (rowData.phase && rowData.phase.includes(',')) {
          errors.push(`Row ${i + 1}: Phase field appears to contain multiple comma-separated values: "${rowData.phase}". This suggests the CSV format is incorrect. Please ensure each field is properly separated into its own column.`);
        } else {
          errors.push(`Row ${i + 1}: Missing required fields (${missingFields.join(', ')}). Found: phase="${rowData.phase}", operation="${rowData.operation}", step="${rowData.step}"`);
        }
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

      // Create a unique key for this step (phase + operation + step name)
      const stepKey = `${rowData.phase}::${rowData.operation}::${rowData.step}`;
      
      // Get or create step
      let step = operation.steps.find(s => s.step === rowData.step);
      const isFirstRowForStep = !step;
      
      if (!step) {
        step = {
          id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          step: rowData.step,
          description: rowData.step_description || '',
          contentType: 'text' as const,
          content: '',
          materials: [],
          tools: [],
          outputs: [],
          inputs: []
        };
        operation.steps.push(step);
      }
      
      // Process variables: Only read from the first row of each step
      if (isFirstRowForStep && rowData.process_variables && rowData.process_variables.trim()) {
        const processVariableNames = rowData.process_variables
          .split('*')
          .map((name: string) => name.trim())
          .filter(Boolean);
        
        console.log(`Row ${i + 1} - Process variables for step "${rowData.step}":`, processVariableNames);
        
        // Create StepInput entries for each process variable
        processVariableNames.forEach((varName: string) => {
          if (varName && !step!.inputs?.some(input => input.name === varName)) {
            const input: StepInput = {
              id: `input-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: varName,
              type: 'text' as const,
              required: true,
              description: `Process variable: ${varName}`
            };
            step!.inputs = step!.inputs || [];
            step!.inputs.push(input);
          }
        });
        
        stepProcessVariablesSet.add(stepKey);
      }

      // Parse and add inputs if provided
      if (rowData.inputs && rowData.inputs.trim()) {
        // Handle different input formats:
        // 1. HTML line breaks with escaped asterisks: \* Input 1<br/>\* Input 2
        // 2. Simple asterisk separation: Input 1*Input 2
        let inputText = rowData.inputs.trim();
        
        // Replace HTML line breaks with asterisks for consistent parsing
        inputText = inputText.replace(/<br\s*\/?>/gi, '*');
        
        // Remove leading/trailing asterisks and clean up escaped asterisks
        inputText = inputText.replace(/^[\*\\]+\s*/, '').replace(/[\*\\]+\s*$/, '');
        
        // Split by asterisks and clean each input
        const inputNames = inputText.split(/[\*\\]+/).map((name: string) => {
          return name.trim().replace(/^[\*\\]+\s*/, '').replace(/[\*\\]+\s*$/, '');
        }).filter(Boolean);
        
        console.log(`Row ${i + 1} - Raw inputs:`, rowData.inputs);
        console.log(`Row ${i + 1} - Parsed inputs:`, inputNames);
        
        inputNames.forEach((inputName: string) => {
          if (inputName && !step!.inputs?.some(input => input.name === inputName)) {
            const input: StepInput = {
              id: `input-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: inputName,
              type: 'text' as const,
              required: true,
              description: `Input for ${inputName.toLowerCase()}`
            };
            step!.inputs = step!.inputs || [];
            step!.inputs.push(input);
          }
        });
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
          alternates: []
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
          alternates: []
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
      
      // Check if it's an Excel file and handle it with xlsx library
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // Convert to CSV format for consistent processing
            const csvText = XLSX.utils.sheet_to_csv(worksheet);
            console.log('Excel converted to CSV (first 500 chars):', csvText.substring(0, 500));
            setCsvData(csvText);
          } catch (error) {
            console.error('Error reading Excel file:', error);
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        // Handle CSV files
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          console.log('Raw CSV content (first 500 chars):', text.substring(0, 500));
          setCsvData(text);
        };
        reader.readAsText(file);
      }
    }
  };

  const handlePreview = () => {
    try {
      const result = parseCSV(csvData);
      setParsedContent(result);
      setShowPreview(true);
    } catch (error) {
      // Silently handle parsing errors
    }
  };

  const handleImport = async () => {
    if (parsedContent.phases.length === 0) return;

    setLoading(true);
    try {
      onImport(parsedContent.phases);
      onOpenChange(false);
      setCsvData('');
      setFileInput(null);
      setParsedContent({ phases: [], errors: [] });
      setShowPreview(false);
    } catch (error) {
      console.error('Error importing project content:', error);
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
          <DialogTitle className="flex items-center justify-between">
            Import Project Content
            <Button variant="outline" size="sm" onClick={resetImportState}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="upload">Upload File</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Upload CSV or Excel File</h3>
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
                <div className="mt-3 text-xs text-muted-foreground">
                  <p>✅ Excel files (.xlsx, .xls) are automatically converted</p>
                  <p>✅ CSV files are processed directly</p>
                </div>
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
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <strong className="text-yellow-800">⚠️ Common CSV Issues:</strong>
                <ul className="mt-2 text-yellow-700 space-y-1">
                  <li>• Each field must be in its own column - don't put multiple values separated by commas in one field</li>
                  <li>• Phase should be a single name like "Planning" or "Execution"</li>
                  <li>• Operation should be a single name like "Site Prep" or "Installation"</li>
                  <li>• Step should be a single name like "Clear Area" or "Cut Materials"</li>
                  <li>• Only use asterisks (*) to separate multiple inputs in the inputs column</li>
                </ul>
              </div>
              <div>
                <strong>Required Columns:</strong> phase, operation, step
              </div>
              <div>
                <strong>Optional Columns:</strong> step_description, process_variables, inputs, output_name, output_description, output_type, tool_name, tool_description, material_name, material_description
              </div>
              <div>
                <strong>Process Variables Format:</strong> Multiple variables separated by asterisks (*), e.g., "Budget*Project Type*Timeline". Process variables are only read from the FIRST row of each step.
              </div>
              <div>
                <strong>Inputs Format:</strong> Multiple inputs separated by asterisks (*), e.g., "Budget Amount*Project Type*Timeline"
              </div>
              <div>
                <strong>Output Types:</strong> none, major-aesthetics, performance-durability, safety
              </div>
              <div>
                <strong>Note:</strong> Multiple rows can have the same phase/operation/step to add different outputs, tools, or materials. Process variables should only be in the first row for each step.
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
                                {step.inputs && step.inputs.length > 0 && (
                                  <div>
                                    <span className="font-medium">Inputs:</span> {step.inputs.map(i => i.name).join(', ')}
                                  </div>
                                )}
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