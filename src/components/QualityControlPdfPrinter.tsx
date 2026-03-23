import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useIsMobile } from '@/hooks/use-mobile';

/** Row shape aligned with Quality Check output table (PDF only needs display fields). */
export type QualityControlPdfRow = {
  key: string;
  phaseName: string;
  operationStepName: string;
  outputName: string;
  outputType: string;
  isComplete: boolean;
};

interface QualityControlPdfPrinterProps {
  rows: QualityControlPdfRow[];
  /** Report title (e.g. app display name). */
  reportTitle: string;
  projectName: string;
  userDisplayName: string;
  /** Optional id to trigger export from a menu (mobile pattern). */
  buttonId?: string;
}

function formatOutputType(t: string): string {
  return t.replace(/-/g, ' ');
}

export const QualityControlPdfPrinter: React.FC<QualityControlPdfPrinterProps> = ({
  rows,
  reportTitle,
  projectName,
  userDisplayName,
  buttonId
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const MARGIN_MM = 20;
  const A4_WIDTH_MM = 210;
  const A4_HEIGHT_MM = 297;
  const contentWidthMm = A4_WIDTH_MM - 2 * MARGIN_MM;
  const contentHeightMm = A4_HEIGHT_MM - 2 * MARGIN_MM;

  const incomplete = rows.filter((r) => !r.isComplete);
  const complete = rows.filter((r) => r.isComplete);

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
    if (!contentRef.current) return;
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const opts = { scale: 2, allowTaint: true, useCORS: true, backgroundColor: '#ffffff' as const };
      const canvas = await html2canvas(contentRef.current, opts);
      addCanvasToPdf(pdf, canvas);
      const safeProject = projectName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
      pdf.save(`${safeProject || 'project'}_quality_control.pdf`);
    } catch (error) {
      console.error('Error generating Quality Control PDF:', error);
    }
  };

  const generatedAt = format(new Date(), 'MMMM dd, yyyy · h:mm a');

  const renderTable = (title: string, data: QualityControlPdfRow[]) => (
    <div style={{ marginBottom: '24px' }}>
      <h3
        style={{
          fontSize: '16px',
          marginBottom: '12px',
          color: '#333',
          borderBottom: '2px solid #ddd',
          paddingBottom: '4px'
        }}
      >
        {title}
      </h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8f9fa' }}>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Phase</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Step</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Output</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Type</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                style={{ border: '1px solid #ddd', padding: '10px', color: '#666', fontStyle: 'italic' }}
              >
                None
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr key={row.key} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{row.phaseName || '—'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{row.operationStepName}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{row.outputName}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px', textTransform: 'capitalize' }}>
                  {formatOutputType(row.outputType)}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  {row.isComplete ? 'Complete' : 'Incomplete'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      {isMobile ? (
        <Button
          id={buttonId}
          variant="outline"
          onClick={generatePDF}
          className="h-8 w-8 p-0 shrink-0"
          title="Export PDF"
        >
          <Download className="h-4 w-4 text-primary" />
        </Button>
      ) : (
        <Button
          id={buttonId}
          variant="outline"
          onClick={generatePDF}
          className="flex items-center gap-2 text-xs md:text-sm h-8"
          title="Export PDF"
        >
          <Download className="h-4 w-4 text-primary" />
          Export PDF
        </Button>
      )}

      <div
        style={{
          position: 'absolute',
          left: '-9999px',
          width: `${contentWidthMm}mm`,
          backgroundColor: 'white',
          padding: '0',
          boxSizing: 'border-box'
        }}
      >
        <div
          ref={contentRef}
          style={{ fontFamily: 'Arial, sans-serif', padding: '0 4px', boxSizing: 'border-box' }}
        >
          <header
            style={{
              marginBottom: '20px',
              paddingBottom: '16px',
              borderBottom: '1px solid #eee'
            }}
          >
            <h1 style={{ fontSize: '22px', margin: '0 0 8px 0', color: '#333' }}>{reportTitle}</h1>
            <h2 style={{ fontSize: '16px', color: '#666', margin: '0 0 6px 0' }}>Project: {projectName}</h2>
            {userDisplayName.trim() ? (
              <p style={{ fontSize: '12px', color: '#555', margin: '0 0 4px 0' }}>
                Prepared for: {userDisplayName}
              </p>
            ) : null}
            <p style={{ fontSize: '11px', color: '#999', margin: 0 }}>Generated: {generatedAt}</p>
          </header>

          {renderTable('Incomplete Outputs', incomplete)}
          {renderTable('Complete Outputs', complete)}
        </div>
      </div>
    </>
  );
};
