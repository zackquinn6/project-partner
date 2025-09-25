import { importExcelDirectToProject } from './excelProjectImporter';
import { Project } from '@/interfaces/Project';

export async function importExcelToTileProject(): Promise<Project> {
  try {
    // Load the Excel file
    const response = await fetch('/src/assets/project-content-template.xlsx');
    const blob = await response.blob();
    const file = new File([blob], 'project-content-template.xlsx', { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    // Import to project structure
    const project = await importExcelDirectToProject(file, 'tile-flooring-installation');
    
    console.log('Successfully imported Excel data to tile flooring project');
    console.log('Project contains:', project.phases.length, 'phases');
    
    return project;
    
  } catch (error) {
    console.error('Error importing Excel to tile project:', error);
    throw new Error('Failed to import Excel data to tile flooring project');
  }
}