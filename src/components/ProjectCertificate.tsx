import { useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Mail, Award } from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';

interface ProjectCertificateProps {
  projectRun: any;
  onClose?: () => void;
}

export function ProjectCertificate({ projectRun, onClose }: ProjectCertificateProps) {
  const { user } = useAuth();
  const certificateRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!certificateRef.current) return;

    try {
      setDownloading(true);
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        backgroundColor: '#ffffff'
      });
      
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = `${projectRun.name}-certificate.png`;
      link.click();

          } catch (error) {
      console.error('Error downloading certificate:', error);
      toast.error('Failed to download certificate');
    } finally {
      setDownloading(false);
    }
  };

  const handleEmailShare = async () => {
    if (!email || !certificateRef.current || !user) {
      toast.error('Please enter an email address');
      return;
    }

    try {
      setSending(true);

      // Generate certificate image
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        backgroundColor: '#ffffff'
      });
      
      const imageDataUrl = canvas.toDataURL('image/png');

      // Save certificate to database
      const certificateData = {
        project_name: projectRun.name,
        completed_date: projectRun.end_date || new Date().toISOString(),
        user_name: user.email,
        difficulty: projectRun.difficulty,
        image_data: imageDataUrl
      };

      const { error: saveError } = await supabase
        .from('project_certificates')
        .upsert({
          user_id: user.id,
          project_run_id: projectRun.id,
          certificate_data: certificateData,
          shared_via_email: true
        });

      if (saveError) throw saveError;

      // Call edge function to send email
      const { error: emailError } = await supabase.functions.invoke('send-certificate-email', {
        body: {
          to_email: email,
          certificate_data: certificateData
        }
      });

      if (emailError) throw emailError;

            setEmail('');
    } catch (error) {
      console.error('Error sending certificate:', error);
      toast.error('Failed to send certificate');
    } finally {
      setSending(false);
    }
  };

  const completedDate = projectRun.end_date 
    ? new Date(projectRun.end_date).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

  return (
    <div className="space-y-6">
      {/* Certificate Preview */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div
            ref={certificateRef}
            className="bg-gradient-to-br from-amber-50 to-orange-50 p-12 text-center"
          >
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex justify-center mb-8">
                <Award className="h-20 w-20 text-amber-600" />
              </div>

              <h1 className="text-4xl font-bold text-gray-800 mb-2">
                Certificate of Completion
              </h1>
              
              <div className="h-1 w-32 bg-amber-600 mx-auto mb-6" />

              {/* Content */}
              <p className="text-lg text-gray-600 mb-4">
                This certifies that
              </p>

              <p className="text-3xl font-semibold text-gray-800 mb-6">
                {user?.email || 'DIY Enthusiast'}
              </p>

              <p className="text-lg text-gray-600 mb-4">
                has successfully completed
              </p>

              <p className="text-2xl font-bold text-primary mb-6">
                {projectRun.name}
              </p>

              {projectRun.difficulty && (
                <p className="text-sm text-gray-600 mb-4">
                  Difficulty Level: <span className="font-semibold">{projectRun.difficulty}</span>
                </p>
              )}

              <p className="text-sm text-gray-600 mb-8">
                Completed on {completedDate}
              </p>

              {/* Footer */}
              <div className="border-t-2 border-gray-300 pt-6">
                <p className="text-sm text-gray-500">
                  Project Partner - Empowering DIY Excellence
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <Button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            {downloading ? 'Downloading...' : 'Download Certificate'}
          </Button>

          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleEmailShare}
                disabled={sending || !email}
              >
                <Mail className="h-4 w-4 mr-2" />
                {sending ? 'Sending...' : 'Send'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share your achievement via email
            </p>
          </div>
        </div>

        {onClose && (
          <Button variant="outline" onClick={onClose} className="w-full">
            Close
          </Button>
        )}
      </div>
    </div>
  );
}
