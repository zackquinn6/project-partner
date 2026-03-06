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
  next_due: string;
  description?: string;
}

interface MaintenanceCompletion {
  id: string;
  task: {
    title: string;
    category: string;
  };
  completed_at: string;
  scheduled_due_date?: string;
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
  const planRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const MARGIN_MM = 20;
  const A4_WIDTH_MM = 210;
  const A4_HEIGHT_MM = 297;
  const contentWidthMm = A4_WIDTH_MM - 2 * MARGIN_MM;
  const contentHeightMm = A4_HEIGHT_MM - 2 * MARGIN_MM;

  const addFooterToPage = (pdf: jsPDF) => {
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.text('Created by Project Partner', A4_WIDTH_MM / 2, A4_HEIGHT_MM - 10, { align: 'center' });
  };

  const addCanvasToPdf = (pdf: jsPDF, canvas: HTMLCanvasElement) => {
    const imgData = canvas.toDataURL('image/png');
    const imgWidthMm = contentWidthMm;
    const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;
    let heightLeft = imgHeightMm;
    let positionMm = MARGIN_MM;
    pdf.addImage(imgData, 'PNG', MARGIN_MM, positionMm, imgWidthMm, imgHeightMm);
    addFooterToPage(pdf);
    heightLeft -= contentHeightMm;
    while (heightLeft > 0) {
      positionMm = MARGIN_MM + (heightLeft - imgHeightMm);
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', MARGIN_MM, positionMm, imgWidthMm, imgHeightMm);
      addFooterToPage(pdf);
      heightLeft -= contentHeightMm;
    }
  };

  const generatePDF = async () => {
    if (!planRef.current) return;

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const opts = { scale: 2, allowTaint: true, useCORS: true, backgroundColor: '#ffffff' as const };

      const planCanvas = await html2canvas(planRef.current, opts);
      addCanvasToPdf(pdf, planCanvas);

      if (historyRef.current) {
        pdf.addPage();
        const historyCanvas = await html2canvas(historyRef.current, opts);
        addCanvasToPdf(pdf, historyCanvas);
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
        <Button variant="outline" onClick={generatePDF} className="w-6 h-6 p-0" title="Save to PDF">
          <Download className="h-3 w-3 text-primary" />
        </Button>
      ) : (
        <Button variant="outline" onClick={generatePDF} className="flex items-center gap-2 text-xs h-8" title="Save to PDF">
          <Download className="h-4 w-4 text-primary" />
          Export PDF
        </Button>
      )}

      {/* Hidden content for PDF generation - width matches PDF content area so scaling is 1:1 with margins */}
      <div style={{ position: 'absolute', left: '-9999px', width: `${contentWidthMm}mm`, backgroundColor: 'white', padding: '0', boxSizing: 'border-box' }}>
        <div ref={planRef} style={{ fontFamily: 'Arial, sans-serif', padding: '0 4px', boxSizing: 'border-box' }}>
          <header style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #eee' }}>
            <h1 style={{ fontSize: '22px', margin: '0 0 8px 0', color: '#333' }}>
              Home Maintenance Tracker
            </h1>
            <h2 style={{ fontSize: '16px', color: '#666', margin: '0 0 4px 0' }}>
              {homeName}
            </h2>
            <p style={{ fontSize: '11px', color: '#999', margin: 0 }}>
              Generated on {format(new Date(), 'MMMM dd, yyyy')}
            </p>
          </header>

          {/* Maintenance Plan Section */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#333', borderBottom: '2px solid #ddd', paddingBottom: '4px' }}>
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
                      {format(new Date(task.next_due), 'MMM dd, yyyy')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* History on its own (captured as second page) */}
        <div ref={historyRef} style={{ fontFamily: 'Arial, sans-serif', padding: '0 4px', boxSizing: 'border-box' }}>
          <header style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #eee' }}>
            <h1 style={{ fontSize: '22px', margin: '0 0 8px 0', color: '#333' }}>Home Maintenance Tracker</h1>
            <h2 style={{ fontSize: '16px', color: '#666', margin: '0 0 4px 0' }}>{homeName}</h2>
            <p style={{ fontSize: '11px', color: '#999', margin: 0 }}>Generated on {format(new Date(), 'MMMM dd, yyyy')}</p>
          </header>
          <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#333', borderBottom: '2px solid #ddd', paddingBottom: '4px' }}>
            Maintenance History
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Task</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Category</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Completed</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Plan vs actual</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {completions.slice(0, 20).map((completion, index) => (
                <tr key={completion.id} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{completion.task.title}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{categoryLabels[completion.task.category] ?? completion.task.category}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    {format(new Date(completion.completed_at), 'MMM dd, yyyy')}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    {completion.scheduled_due_date
                      ? (() => {
                          const due = new Date(completion.scheduled_due_date);
                          const done = new Date(completion.completed_at);
                          const days = Math.round((done.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
                          if (days > 0) return `Off-plan +${days} days`;
                          return `On-plan ${days} days`;
                        })()
                      : '-'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{completion.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};