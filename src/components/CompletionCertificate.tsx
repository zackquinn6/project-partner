import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Download, Award, Calendar, Clock, X } from 'lucide-react';
import { format } from 'date-fns';

interface CompletionCertificateProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  startDate: Date;
  endDate: Date;
  projectLeader?: string;
}

export const CompletionCertificate: React.FC<CompletionCertificateProps> = ({
  isOpen,
  onClose,
  projectName,
  startDate,
  endDate,
  projectLeader = "Project Participant"
}) => {
  const handleDownload = () => {
    const certificateElement = document.getElementById('completion-certificate');
    if (!certificateElement) return;

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const certificateHtml = certificateElement.innerHTML;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Project Completion Certificate</title>
          <style>
            body {
              font-family: 'Times New Roman', serif;
              margin: 0;
              padding: 20px;
              background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            }
            .certificate {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              padding: 60px;
              border-radius: 15px;
              box-shadow: 0 20px 40px rgba(0,0,0,0.1);
              border: 8px solid #d4af37;
              position: relative;
            }
            .certificate::before {
              content: '';
              position: absolute;
              top: 20px;
              left: 20px;
              right: 20px;
              bottom: 20px;
              border: 2px solid #d4af37;
              border-radius: 5px;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
            }
            .title {
              font-size: 48px;
              color: #2c3e50;
              font-weight: bold;
              margin-bottom: 10px;
              text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
            }
            .subtitle {
              font-size: 24px;
              color: #7f8c8d;
              margin-bottom: 30px;
            }
            .content {
              text-align: center;
              margin: 40px 0;
            }
            .recipient {
              font-size: 32px;
              color: #2c3e50;
              font-weight: bold;
              margin: 20px 0;
              border-bottom: 3px solid #d4af37;
              padding-bottom: 10px;
              display: inline-block;
            }
            .project-name {
              font-size: 28px;
              color: #3498db;
              font-style: italic;
              margin: 20px 0;
            }
            .dates {
              font-size: 18px;
              color: #7f8c8d;
              margin: 30px 0;
            }
            .footer {
              margin-top: 60px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .signature-line {
              border-bottom: 2px solid #2c3e50;
              width: 200px;
              margin-bottom: 5px;
            }
            .award-icon {
              color: #d4af37;
              font-size: 72px;
              margin: 20px 0;
            }
            @media print {
              body { 
                background: white; 
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="certificate">
            <div class="header">
              <div class="award-icon">🏆</div>
              <div class="title">Certificate of Completion</div>
              <div class="subtitle">DIY Project Achievement</div>
            </div>
            
            <div class="content">
              <p style="font-size: 20px; color: #2c3e50; margin-bottom: 20px;">
                This certifies that
              </p>
              
              <div class="recipient">${projectLeader}</div>
              
              <p style="font-size: 20px; color: #2c3e50; margin: 20px 0;">
                has successfully completed the project
              </p>
              
              <div class="project-name">"${projectName}"</div>
              
              <div class="dates">
                <p><strong>Project Duration:</strong></p>
                <p>${format(startDate, 'MMMM d, yyyy')} - ${format(endDate, 'MMMM d, yyyy')}</p>
              </div>
              
              <p style="font-size: 18px; color: #2c3e50; margin-top: 30px;">
                Demonstrating dedication, skill, and commitment to excellence in DIY craftsmanship.
              </p>
            </div>
            
            <div class="footer">
              <div style="text-align: center;">
                <div class="signature-line"></div>
                <p style="margin: 5px 0; font-size: 14px;">Project Supervisor</p>
              </div>
              <div style="text-align: center;">
                <p style="margin: 0; font-size: 14px; color: #7f8c8d;">
                  Certificate issued on<br/>
                  ${format(new Date(), 'MMMM d, yyyy')}
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    
    // Wait for the content to load before printing
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-end mb-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div id="completion-certificate" className="bg-gradient-to-br from-blue-50 to-indigo-100 p-12 rounded-lg border-4 border-yellow-400 relative">
          {/* Decorative corners */}
          <div className="absolute top-4 left-4 w-12 h-12 border-l-4 border-t-4 border-yellow-400 rounded-tl-lg"></div>
          <div className="absolute top-4 right-4 w-12 h-12 border-r-4 border-t-4 border-yellow-400 rounded-tr-lg"></div>
          <div className="absolute bottom-4 left-4 w-12 h-12 border-l-4 border-b-4 border-yellow-400 rounded-bl-lg"></div>
          <div className="absolute bottom-4 right-4 w-12 h-12 border-r-4 border-b-4 border-yellow-400 rounded-br-lg"></div>

          <div className="text-center space-y-6">
            <Award className="w-20 h-20 text-yellow-500 mx-auto" />
            
            <div>
              <h1 className="text-5xl font-bold text-gray-800 mb-2">Certificate of Completion</h1>
              <p className="text-xl text-gray-600">DIY Project Achievement</p>
            </div>

            <div className="space-y-4">
              <p className="text-lg text-gray-700">This certifies that</p>
              
              <div className="text-4xl font-bold text-gray-800 border-b-2 border-yellow-400 pb-2 inline-block">
                {projectLeader}
              </div>
              
              <p className="text-lg text-gray-700">has successfully completed the project</p>
              
              <div className="text-3xl font-semibold text-blue-600 italic">
                "{projectName}"
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="grid grid-cols-2 gap-8">
                <div className="flex items-center justify-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-600">Start Date</p>
                    <p className="font-semibold">{format(startDate, 'MMM d, yyyy')}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-600">Completion Date</p>
                    <p className="font-semibold">{format(endDate, 'MMM d, yyyy')}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-center gap-2">
                  <Clock className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-600">Project Duration</p>
                    <p className="font-semibold">{duration} day{duration !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-gray-700 italic">
              Demonstrating dedication, skill, and commitment to excellence in DIY craftsmanship.
            </p>

            <div className="flex justify-between items-end pt-8">
              <div className="text-center">
                <div className="w-48 h-0.5 bg-gray-400 mb-2"></div>
                <p className="text-sm text-gray-600">Project Supervisor</p>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Certificate issued on<br/>
                  {format(new Date(), 'MMMM d, yyyy')}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center mt-6">
          <Button onClick={handleDownload} className="bg-blue-600 hover:bg-blue-700">
            <Download className="w-4 h-4 mr-2" />
            Download Certificate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};