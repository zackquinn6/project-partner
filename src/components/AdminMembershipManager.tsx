import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Plus, Gift, Calendar, Users } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface CouponCode {
  id: string;
  code: string;
  trial_extension_days: number;
  max_uses: number | null;
  times_used: number;
  active: boolean;
  created_at: string;
  expires_at: string | null;
}

export const AdminMembershipManager: React.FC = () => {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<CouponCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [extensionDays, setExtensionDays] = useState(7);
  const [maxUses, setMaxUses] = useState<number | ''>('');
  const [expiresIn, setExpiresIn] = useState<number | ''>(30);

  const loadCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from('coupon_codes' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons((data as any) || []);
    } catch (error) {
      console.error('Error loading coupons:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const createCoupon = async () => {
    if (!newCouponCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a coupon code",
        variant: "destructive",
      });
      return;
    }

    try {
      const expiresAt = expiresIn
        ? new Date(Date.now() + (expiresIn as number) * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { error } = await supabase.from('coupon_codes' as any).insert({
        code: newCouponCode.toUpperCase(),
        trial_extension_days: extensionDays,
        max_uses: maxUses || null,
        expires_at: expiresAt,
      } as any);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Coupon code created successfully",
      });

      setNewCouponCode('');
      setExtensionDays(7);
      setMaxUses('');
      setExpiresIn(30);
      loadCoupons();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create coupon",
        variant: "destructive",
      });
    }
  };

  const toggleCouponStatus = async (couponId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('coupon_codes' as any)
        .update({ active: !currentStatus } as any)
        .eq('id', couponId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Coupon ${!currentStatus ? 'activated' : 'deactivated'}`,
      });

      loadCoupons();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update coupon",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Coupon */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Create Coupon Code
          </CardTitle>
          <CardDescription>
            Generate coupon codes to extend user trial periods
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="couponCode">Coupon Code</Label>
              <Input
                id="couponCode"
                placeholder="TRIAL30"
                value={newCouponCode}
                onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="extensionDays">Extension Days</Label>
              <Input
                id="extensionDays"
                type="number"
                min="1"
                value={extensionDays}
                onChange={(e) => setExtensionDays(parseInt(e.target.value) || 7)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxUses">Max Uses (Optional)</Label>
              <Input
                id="maxUses"
                type="number"
                min="1"
                placeholder="Unlimited"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value ? parseInt(e.target.value) : '')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiresIn">Expires In (Days)</Label>
              <Input
                id="expiresIn"
                type="number"
                min="1"
                placeholder="Never"
                value={expiresIn}
                onChange={(e) => setExpiresIn(e.target.value ? parseInt(e.target.value) : '')}
              />
            </div>
          </div>
          <Button onClick={createCoupon} className="w-full md:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Create Coupon
          </Button>
        </CardContent>
      </Card>

      {/* Existing Coupons */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Coupons</CardTitle>
          <CardDescription>Manage and monitor coupon codes</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : coupons.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No coupons created yet</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Extension</TableHead>
                    <TableHead>Uses</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((coupon) => (
                    <TableRow key={coupon.id}>
                      <TableCell className="font-mono font-semibold">{coupon.code}</TableCell>
                      <TableCell>+{coupon.trial_extension_days} days</TableCell>
                      <TableCell>
                        {coupon.times_used} {coupon.max_uses ? `/ ${coupon.max_uses}` : ''}
                      </TableCell>
                      <TableCell>
                        <Badge variant={coupon.active ? 'default' : 'secondary'}>
                          {coupon.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {coupon.expires_at ? format(new Date(coupon.expires_at), 'PP') : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleCouponStatus(coupon.id, coupon.active)}
                        >
                          {coupon.active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
