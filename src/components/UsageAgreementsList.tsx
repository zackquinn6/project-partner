import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Calendar, User, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface UsageAgreementRow {
  id: string;
  user_id: string;
  full_name: string;
  agreed_at: string;
  policy_version: string | null;
  created_at: string;
}

export const UsageAgreementsList: React.FC = () => {
  const [list, setList] = useState<UsageAgreementRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchList = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('liability_agreements')
        .select('id, user_id, full_name, agreed_at, policy_version, created_at')
        .order('agreed_at', { ascending: false });

      if (error) throw error;
      setList(data ?? []);
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
                    <CardTitle className="text-base">{row.full_name}</CardTitle>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 shrink-0">
                    Accepted
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-2 text-xs font-mono mt-1">
                  {row.user_id}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground flex flex-wrap gap-4">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(row.agreed_at).toLocaleString()}
                </span>
                {row.policy_version && (
                  <span>Version: {row.policy_version}</span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
