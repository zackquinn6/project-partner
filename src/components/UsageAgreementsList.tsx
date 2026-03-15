import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Calendar, User, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface UsageAgreementRow {
  id: string;
  user_id: string;
  agreed_at: string;
  created_at: string;
  agreement_type: string;
  pdf_storage_path: string | null;
  profile_full_name: string | null;
}

export const UsageAgreementsList: React.FC = () => {
  const [list, setList] = useState<UsageAgreementRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchList = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('usage_agreements')
        .select('id, user_id, agreed_at, created_at, agreement_type, pdf_storage_path, user_profiles!inner(full_name)')
        .order('agreed_at', { ascending: false });

      if (error) throw error;
      const rows = (data ?? []).map((row: any) => ({
        id: row.id as string,
        user_id: row.user_id as string,
        agreed_at: row.agreed_at as string,
        created_at: row.created_at as string,
        agreement_type: (row.agreement_type as string) ?? 'liability',
        pdf_storage_path: row.pdf_storage_path ?? null,
        profile_full_name: row.user_profiles?.full_name ?? null,
      })) as UsageAgreementRow[];
      setList(rows);
    } catch (e) {
      console.error('Error fetching usage agreements:', e);
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold">Usage Agreements</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Users who have accepted the Usage Agreement (required to use the app).
      </p>
      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading…
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No usage agreements recorded yet.
        </div>
      ) : (
        <div className="grid gap-4">
          {list.map((row) => (
            <Card key={row.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <CardTitle className="text-base">
                      {row.profile_full_name || 'Name not set'}
                    </CardTitle>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="capitalize">
                      {row.agreement_type}
                    </Badge>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Accepted
                    </Badge>
                  </div>
                </div>
                <CardDescription className="flex items-center gap-2 text-xs font-mono mt-1">
                  {row.user_id}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground flex flex-wrap gap-4 items-center">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(row.agreed_at).toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground">
                  Recorded: {new Date(row.created_at).toLocaleString()}
                </span>
                {row.pdf_storage_path && (
                  <a
                    href={supabase.storage.from('liability-pdfs').getPublicUrl(row.pdf_storage_path).data.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-xs"
                  >
                    View PDF
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
