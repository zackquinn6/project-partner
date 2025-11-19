import { Project, Phase, Operation, WorkflowStep, Material, Tool, Output, StepInput } from '@/interfaces/Project';
import * as XLSX from 'xlsx';

interface ExcelProjectRow {
  phase: string;
  operation: string;
  step: string;
  step_description: string;
  inputs: string;
  output_name: string;
  output_description: string;
  output_type: string;
  tool_name: string;
  tool_description: string;
  material_name: string;
  material_description: string;
}

export async function importExcelDirectToProject(file: File, projectId: string): Promise<Project> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON with header row
        const rawData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: ''
        }) as string[][];
        
        if (rawData.length < 2) {
          throw new Error('Excel file must have at least a header row and one data row');
        }
        
        const headers = rawData[0];
        const dataRows = rawData.slice(1);
        
        // Convert to structured data
        const excelRows: ExcelProjectRow[] = dataRows.map(row => {
          const rowData: any = {};
          headers.forEach((header, index) => {
            const cleanHeader = header.toLowerCase().replace(/_/g, '_');
            rowData[cleanHeader] = row[index] || '';
          });
          return rowData as ExcelProjectRow;
        }).filter(row => row.phase && row.operation && row.step); // Filter out empty rows
        
        console.log('Parsed Excel rows:', excelRows.length);
        
        // Convert to Project structure
        const project = convertExcelDataToProject(excelRows, projectId);
        resolve(project);
        
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        reject(new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

function convertExcelDataToProject(excelRows: ExcelProjectRow[], projectId: string): Project {
  const phaseMap = new Map<string, Phase>();
  
  excelRows.forEach(row => {
    const phaseName = row.phase.trim();
    const operationName = row.operation.trim();
    const stepName = row.step.trim();
    
    if (!phaseName || !operationName || !stepName) return;
    
    // Get or create phase
    if (!phaseMap.has(phaseName)) {
      phaseMap.set(phaseName, {
        id: generateId(phaseName),
        name: phaseName,
        description: `${phaseName} phase of the project`,
        operations: []
      });
    }
    
    const phase = phaseMap.get(phaseName)!;
    
    // Find or create operation
    let operation = phase.operations.find(op => op.name === operationName);
    if (!operation) {
      operation = {
        id: generateId(operationName),
        name: operationName,
        description: `${operationName} operation`,
        steps: []
      };
      phase.operations.push(operation);
    }
    
    // Parse inputs
    const inputs: StepInput[] = [];
    if (row.inputs) {
      const inputText = row.inputs.replace(/<br\/?>/gi, '\n').replace(/\\\*/g, '•');
      const inputLines = inputText.split('\n').filter(line => line.trim());
      inputLines.forEach((input, index) => {
        const cleanInput = input.replace(/^\*\s*/, '').replace(/^•\s*/, '').trim();
        if (cleanInput) {
          inputs.push({
            id: generateId(`${stepName}-input-${index}`),
            name: cleanInput,
            description: cleanInput,
            type: 'text',
            required: true
          });
        }
      });
    }
    
    // Parse outputs
    const outputs: Output[] = [];
    if (row.output_name) {
      const outputName = row.output_name.replace(/<br\/?>/gi, '\n');
      const outputLines = outputName.split('\n').filter(line => line.trim());
      outputLines.forEach((output, index) => {
        const cleanOutput = output.trim();
        if (cleanOutput) {
          outputs.push({
            id: generateId(`${stepName}-output-${index}`),
            name: cleanOutput,
            description: row.output_description || cleanOutput,
            type: (row.output_type as any) || 'none'
          });
        }
      });
    }
    
    // Parse materials
    const materials: Material[] = [];
    if (row.material_name) {
      materials.push({
        id: generateId(row.material_name),
        name: row.material_name,
        description: row.material_description || row.material_name,
        category: 'Hardware',
        alternates: []
      });
    }
    
    // Parse tools
    const tools: Tool[] = [];
    if (row.tool_name) {
      tools.push({
        id: generateId(row.tool_name),
        name: row.tool_name,
        description: row.tool_description || row.tool_name,
        category: 'Power Tool',
        alternates: []
      });
    }
    
    // Create step
    const step: WorkflowStep = {
      id: generateId(stepName),
      step: stepName,
      description: row.step_description || stepName,
      contentType: 'text',
      content: row.step_description || stepName,
      contentSections: [{
        id: generateId(`${stepName}-content`),
        type: 'text',
        content: row.step_description || stepName
      }],
      inputs,
      outputs,
      materials,
      tools
    };
    
    operation.steps.push(step);
  });
  
  // Convert to array
  const phases = Array.from(phaseMap.values());
  
  const now = new Date();
  return {
    id: projectId,
    name: 'Tile Flooring Installation',
    description: 'Complete tile flooring installation project imported from Excel',
    phases,
    createdAt: now,
    updatedAt: now,
    publishStatus: 'draft' as const,
    category: ['Tile', 'Flooring']
  };
}

function generateId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50) + '-' + Math.random().toString(36).substring(2, 8);
}