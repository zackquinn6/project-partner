import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Scroll, Search, Download, Calendar, User, FileText, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ProjectAgreement {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  agreement?: {
    signedAt: string;
    signerName: string;
    signature: string;
    agreementText: string;
  };
  profile?: {
    email: string;
    display_name: string;
  };
}

export const ProjectAgreementsList: React.FC = () => {
  const [agreements, setAgreements] = useState<ProjectAgreement[]>([]);
  const [filteredAgreements, setFilteredAgreements] = useState<ProjectAgreement[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedAgreement, setSelectedAgreement] = useState<ProjectAgreement | null>(null);

  useEffect(() => {
    fetchAgreements();
  }, []);

  useEffect(() => {
    const filtered = agreements.filter(agreement => 
      agreement.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agreement.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agreement.profile?.display_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredAgreements(filtered);
  }, [searchTerm, agreements]);

  const fetchAgreements = async () => {
    setLoading(true);
    try {
      // Fetch project runs and their user profiles separately for signed agreements
      const { data: projectRuns, error } = await supabase
        .from('project_runs')
        .select('*')
        .not('phases', 'is', null);

      if (error) throw error;

      // Get user IDs from project runs that have signed agreements
      const projectRunsWithAgreements = projectRuns?.filter(run => {
        // Handle phases - could be string, array, or null
        let phases;
        try {
          if (typeof run.phases === 'string') {
            phases = JSON.parse(run.phases);
          } else if (Array.isArray(run.phases)) {
            phases = run.phases;
          } else {
            return false; // No valid phases data
          }
        } catch {
          return false; // Invalid JSON
        }

        if (!Array.isArray(phases)) return false;
        
        const kickoffPhase = phases.find(p => p?.id === 'kickoff-phase');
        const agreementStep = kickoffPhase?.operations?.[0]?.steps?.find(s => s?.id === 'kickoff-step-2');
        return agreementStep?.outputs?.[0]?.agreement;
      }) || [];

      if (projectRunsWithAgreements.length === 0) {
        setAgreements([]);
        return;
      }

      // Fetch profiles for these users
      const userIds = projectRunsWithAgreements.map(run => run.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, email, display_name')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Process project runs to extract signed agreements and merge with profiles
      const agreementsWithSignatures = projectRunsWithAgreements.map(run => {
        // Handle phases - could be string, array, or null
        let phases;
        try {
          if (typeof run.phases === 'string') {
            phases = JSON.parse(run.phases);
          } else if (Array.isArray(run.phases)) {
            phases = run.phases;
          } else {
            phases = [];
          }
        } catch {
          phases = [];
        }

        const kickoffPhase = Array.isArray(phases) ? phases.find(p => p?.id === 'kickoff-phase') : null;
        const agreementStep = kickoffPhase?.operations?.[0]?.steps?.find(s => s?.id === 'kickoff-step-2');
        const agreement = agreementStep?.outputs?.[0]?.agreement;
        const profile = profiles?.find(p => p.user_id === run.user_id);
        
        return {
          id: run.id,
          user_id: run.user_id,
          name: run.name,
          created_at: run.created_at,
          agreement,
          profile: profile ? {
            email: profile.email || '',
            display_name: profile.display_name || ''
          } : undefined
        };
      });

      setAgreements(agreementsWithSignatures);
    } catch (error) {
      console.error('Error fetching agreements:', error);
      toast.error('Failed to fetch project agreements');
    } finally {
      setLoading(false);
    }
  };

  const downloadAgreement = (agreement: ProjectAgreement) => {
    if (!agreement.agreement) return;

    const content = `Project Partner Agreement
    
Project: ${agreement.name}
Signed by: ${agreement.agreement.signerName}
Date: ${new Date(agreement.agreement.signedAt).toLocaleDateString()}
User: ${agreement.profile?.display_name || agreement.profile?.email || 'Unknown'}

Agreement Terms:
${agreement.agreement.agreementText}

Digital Signature: ${agreement.agreement.signature}
Signed on: ${new Date(agreement.agreement.signedAt).toLocaleString()}
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agreement-${agreement.name.replace(/[^a-zA-Z0-9]/g, '-')}-${agreement.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Agreement downloaded successfully');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Scroll className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold">Project Agreements</h2>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by project name, user email, or display name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>Total Agreements: {agreements.length}</span>
        <span>Filtered Results: {filteredAgreements.length}</span>
      </div>

      {/* Agreements List */}
      {loading ? (
        <div className="text-center py-8">Loading agreements...</div>
      ) : filteredAgreements.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {searchTerm ? 'No agreements match your search' : 'No signed agreements found'}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredAgreements.map((agreement) => (
            <Card key={agreement.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-base sm:text-lg">{agreement.name}</CardTitle>
                    <CardDescription>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-3 h-3" />
                        <span className="break-words">
                          {agreement.profile?.display_name || 'Unknown User'}
                          <span className="text-muted-foreground ml-1">
                            ({agreement.profile?.email || 'No email'})
                          </span>
                        </span>
                      </div>
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 shrink-0">
                    Signed
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      Signed: {agreement.agreement?.signedAt ? 
                        new Date(agreement.agreement.signedAt).toLocaleDateString() : 
                        'Unknown date'
                      }
                    </div>
                    <div>
                      Signer: {agreement.agreement?.signerName || 'Unknown'}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedAgreement(agreement)}
                      className="flex-1 sm:flex-none"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadAgreement(agreement)}
                      className="flex-1 sm:flex-none"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Agreement Detail Modal */}
      {selectedAgreement && (
        <Dialog open={!!selectedAgreement} onOpenChange={() => setSelectedAgreement(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Agreement Details: {selectedAgreement.name}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Project:</strong> {selectedAgreement.name}
                </div>
                <div className="break-words">
                  <strong>User:</strong> {selectedAgreement.profile?.display_name} ({selectedAgreement.profile?.email})
                </div>
                <div>
                  <strong>Signed by:</strong> {selectedAgreement.agreement?.signerName}
                </div>
                <div>
                  <strong>Signed on:</strong> {selectedAgreement.agreement?.signedAt ? 
                    new Date(selectedAgreement.agreement.signedAt).toLocaleString() : 
                    'Unknown'
                  }
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Agreement Text:</h3>
                <div className="bg-muted p-4 rounded-md max-h-96 overflow-y-auto text-sm whitespace-pre-wrap">
                  {selectedAgreement.agreement?.agreementText || 'Agreement text not available'}
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Digital Signature:</h3>
                <div className="bg-muted p-4 rounded-md">
                  <code className="text-sm break-all">
                    {selectedAgreement.agreement?.signature || 'Signature not available'}
                  </code>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => downloadAgreement(selectedAgreement)}
                  className="flex-1 sm:flex-none"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download Agreement
                </Button>
                <Button onClick={() => setSelectedAgreement(null)} className="flex-1 sm:flex-none">
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};