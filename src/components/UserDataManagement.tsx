import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PoliciesWindow } from '@/components/PoliciesWindow';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Download, Trash2, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';

function excelCellValue(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  return JSON.stringify(value);
}

function excelRowFromObject(obj: Record<string, unknown>): Record<string, string | number | boolean | null> {
  const row: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(obj)) {
    row[key] = excelCellValue(value);
  }
  return row;
}

function sheetNameFromKey(key: string): string {
  const cleaned = key.replace(/[\\/?*[\]]/g, '_').trim();
  return (cleaned || 'Sheet').slice(0, 31);
}

function workbookFromExportData(data: unknown): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();

  const appendSheet = (name: string, rows: Record<string, unknown>[]) => {
    const sheet = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ info: 'No records' }]);
    XLSX.utils.book_append_sheet(workbook, sheet, sheetNameFromKey(name));
  };

  if (data === null || data === undefined) {
    appendSheet('Export', [{ info: 'No data' }]);
    return workbook;
  }

  if (Array.isArray(data)) {
    appendSheet(
      'Data',
      data.map((item) =>
        item && typeof item === 'object' && !Array.isArray(item)
          ? excelRowFromObject(item as Record<string, unknown>)
          : { value: excelCellValue(item) }
      )
    );
    return workbook;
  }

  if (typeof data !== 'object') {
    appendSheet('Export', [{ value: excelCellValue(data) }]);
    return workbook;
  }

  const record = data as Record<string, unknown>;
  const summaryRows: { Field: string; Value: string | number | boolean | null }[] = [];
  let sheetCount = 0;

  for (const [key, value] of Object.entries(record)) {
    if (Array.isArray(value)) {
      appendSheet(
        key,
        value.map((item) =>
          item && typeof item === 'object' && !Array.isArray(item)
            ? excelRowFromObject(item as Record<string, unknown>)
            : { value: excelCellValue(item) }
        )
      );
      sheetCount += 1;
      continue;
    }

    if (value && typeof value === 'object') {
      appendSheet(key, [excelRowFromObject(value as Record<string, unknown>)]);
      sheetCount += 1;
      continue;
    }

    summaryRows.push({ Field: key, Value: excelCellValue(value) });
  }

  if (summaryRows.length > 0) {
    appendSheet('Summary', summaryRows);
    sheetCount += 1;
  }

  if (sheetCount === 0) {
    appendSheet('Export', [{ info: 'No data' }]);
  }

  return workbook;
}

export const UserDataManagement: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [policiesOpen, setPoliciesOpen] = useState(false);

  const exportUserData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('export_user_data' as any, {
        user_uuid: user.id
      });

      if (error) throw error;

      const workbook = workbookFromExportData(data);
      const filename = `user-data-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, filename);
    } catch (error) {
      console.error('Error exporting user data:', error);
      toast({
        title: "Error",
        description: "Failed to export user data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteUserData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('delete_user_data' as any, {
        user_uuid: user.id
      });

      if (error) throw error;

      
      // Sign out the user after data deletion
      await supabase.auth.signOut();
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting user data:', error);
      toast({
        title: "Error",
        description: "Failed to delete user data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {/* Data Export */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Download className="h-4 w-4" />
              Export Your Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Download a complete copy of all your personal data including profile, project runs, and role assignments in Excel format.
            </p>
            <Button onClick={exportUserData} disabled={loading} size="sm">
              <Download className="h-3 w-3 mr-2" />
              {loading ? 'Exporting...' : 'Export My Data'}
            </Button>
          </CardContent>
        </Card>

        {/* Data Deletion */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-destructive text-base">
              <Trash2 className="h-4 w-4" />
              Delete Your Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Alert
              variant="destructive"
              className="flex items-start gap-2 py-2 [&>svg]:static [&>svg]:left-auto [&>svg]:top-auto [&>svg~*]:pl-0 [&>svg+div]:translate-y-0"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <AlertDescription className="text-xs">
                Permanently removes profile, project runs, and all other account data.
              </AlertDescription>
            </Alert>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" disabled={loading} size="sm">
                  <Trash2 className="h-3 w-3 mr-2" />
                  Delete My Data
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-base">Confirm Data Deletion</DialogTitle>
                  <DialogDescription className="text-sm">
                    Are you sure? This will permanently delete:
                  </DialogDescription>
                </DialogHeader>
                <div className="py-2">
                  <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                    <li>User profile and preferences</li>
                    <li>All project runs and progress</li>
                    <li>Role assignments and permissions</li>
                    <li>Any other personal data stored</li>
                  </ul>
                </div>
                <DialogFooter className="gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setDeleteDialogOpen(false)}
                    disabled={loading}
                    size="sm"
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={deleteUserData}
                    disabled={loading}
                    size="sm"
                  >
                    {loading ? 'Deleting...' : 'Delete Everything'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          Review how we handle your information in our{' '}
          <button
            type="button"
            className="text-primary underline underline-offset-2 hover:opacity-80"
            onClick={() => setPoliciesOpen(true)}
          >
            Privacy Policy
          </button>
          .
        </p>
      </div>

      <PoliciesWindow open={policiesOpen} onOpenChange={setPoliciesOpen} />
    </div>
  );
};
