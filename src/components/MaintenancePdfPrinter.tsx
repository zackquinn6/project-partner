import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Calendar, Download } from 'lucide-react';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useIsMobile } from '@/hooks/use-mobile';

interface MaintenanceTask {
  id: string;
  title: string;
  category: string;
  frequency_days: number;
  next_due_date: string;
  description?: string;
}

interface MaintenanceCompletion {
  id: string;
  task: {
    title: string;
    category: string;
  };
  completed_at: string;
  notes?: string;
}

interface MaintenancePdfPrinterProps {
  tasks: MaintenanceTask[];
  completions: MaintenanceCompletion[];
  homeName: string;
}

export const MaintenancePdfPrinter: React.FC<MaintenancePdfPrinterProps> = ({ 
  tasks, 
  completions, 
  homeName 
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const generatePDF = async () => {
    if (!printRef.current) return;

    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        allowTaint: true,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${homeName.replace(/\s+/g, '_')}_maintenance_tracker.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const categoryLabels: Record<string, string> = {
    appliances: 'Appliances',
    hvac: 'HVAC',
    safety: 'Safety',
    plumbing: 'Plumbing',
    exterior: 'Exterior',
    general: 'General'
  };

  return (
    <>
      {isMobile ? (
        <Button onClick={generatePDF} className="w-6 h-6 p-0" title="Save to PDF">
          <Download className="h-3 w-3" />
        </Button>
      ) : (
        <Button onClick={generatePDF} className="flex items-center gap-2 text-xs" title="Save to PDF">
          <Download className="h-4 w-4" />
          Export PDF
        </Button>
      )}

      {/* Hidden content for PDF generation */}
      <div ref={printRef} style={{ position: 'absolute', left: '-9999px', width: '210mm', backgroundColor: 'white', padding: '20px' }}>
        <div style={{ fontFamily: 'Arial, sans-serif' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ fontSize: '24px', marginBottom: '10px', color: '#333' }}>
              Home Maintenance Tracker
            </h1>
            <h2 style={{ fontSize: '18px', color: '#666', marginBottom: '5px' }}>
              {homeName}
            </h2>
            <p style={{ fontSize: '12px', color: '#999' }}>
              Generated on {format(new Date(), 'MMMM dd, yyyy')}
            </p>
          </div>

          {/* Maintenance Plan Section */}
          <div style={{ marginBottom: '40px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '20px', color: '#333', borderBottom: '2px solid #ddd', paddingBottom: '5px' }}>
              Maintenance Plan
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Task</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Category</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Frequency</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Next Due</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task, index) => (
                  <tr key={task.id} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{task.title}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{categoryLabels[task.category]}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>Every {task.frequency_days} days</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                      {format(new Date(task.next_due_date), 'MMM dd, yyyy')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Maintenance History Section */}
          <div>
            <h3 style={{ fontSize: '18px', marginBottom: '20px', color: '#333', borderBottom: '2px solid #ddd', paddingBottom: '5px' }}>
              Maintenance History
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Task</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Category</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Completed</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {completions.slice(0, 20).map((completion, index) => (
                  <tr key={completion.id} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{completion.task.title}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{categoryLabels[completion.task.category]}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                      {format(new Date(completion.completed_at), 'MMM dd, yyyy')}
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{completion.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};