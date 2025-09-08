import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertTriangle, Plus, Edit, Trash2, AlertCircle, Clock, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface HomeRisk {
  id: string;
  material_name: string;
  description: string;
  start_year: number;
  end_year?: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  updated_at: string;
}

export const HomeRiskManager: React.FC = () => {
  const { user } = useAuth();
  const [risks, setRisks] = useState<HomeRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRisk, setEditingRisk] = useState<HomeRisk | null>(null);
  const [formData, setFormData] = useState({
    material_name: '',
    description: '',
    start_year: '',
    end_year: '',
    risk_level: 'medium' as HomeRisk['risk_level']
  });

  useEffect(() => {
    fetchRisks();
  }, []);

  const fetchRisks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('home_risks')
        .select('*')
        .order('risk_level', { ascending: false })
        .order('start_year', { ascending: true });

      if (error) throw error;
      setRisks((data || []) as HomeRisk[]);
    } catch (error) {
      console.error('Error fetching home risks:', error);
      toast.error('Failed to load home risks');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const riskData = {
        ...formData,
        start_year: parseInt(formData.start_year),
        end_year: formData.end_year ? parseInt(formData.end_year) : null,
        created_by: user.id
      };

      if (editingRisk) {
        const { error } = await supabase
          .from('home_risks')
          .update(riskData)
          .eq('id', editingRisk.id);

        if (error) throw error;
        toast.success('Home risk updated successfully');
      } else {
        const { error } = await supabase
          .from('home_risks')
          .insert(riskData);

        if (error) throw error;
        toast.success('Home risk added successfully');
      }

      setShowForm(false);
      setEditingRisk(null);
      setFormData({
        material_name: '',
        description: '',
        start_year: '',
        end_year: '',
        risk_level: 'medium'
      });
      fetchRisks();
    } catch (error) {
      console.error('Error saving home risk:', error);
      toast.error('Failed to save home risk');
    }
  };

  const handleEdit = (risk: HomeRisk) => {
    setEditingRisk(risk);
    setFormData({
      material_name: risk.material_name,
      description: risk.description,
      start_year: risk.start_year.toString(),
      end_year: risk.end_year?.toString() || '',
      risk_level: risk.risk_level
    });
    setShowForm(true);
  };

  const handleDelete = async (riskId: string) => {
    if (!confirm('Are you sure you want to delete this home risk?')) return;

    try {
      const { error } = await supabase
        .from('home_risks')
        .delete()
        .eq('id', riskId);

      if (error) throw error;
      toast.success('Home risk deleted successfully');
      fetchRisks();
    } catch (error) {
      console.error('Error deleting home risk:', error);
      toast.error('Failed to delete home risk');
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'critical': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'high': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'medium': return <Clock className="w-4 h-4 text-yellow-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-50 border-red-200';
      case 'high': return 'bg-orange-50 border-orange-200';
      case 'medium': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Home Risks Management
            </CardTitle>
            <CardDescription>
              Manage construction risks that may affect homes based on build year
            </CardDescription>
          </div>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Risk
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingRisk ? 'Edit Home Risk' : 'Add New Home Risk'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="material_name">Material/Risk Name *</Label>
                    <Input
                      id="material_name"
                      value={formData.material_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, material_name: e.target.value }))}
                      placeholder="e.g., Asbestos, Lead Paint"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="risk_level">Risk Level *</Label>
                    <Select 
                      value={formData.risk_level} 
                      onValueChange={(value: HomeRisk['risk_level']) => 
                        setFormData(prev => ({ ...prev, risk_level: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_year">Start Year *</Label>
                    <Input
                      id="start_year"
                      type="number"
                      value={formData.start_year}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_year: e.target.value }))}
                      placeholder="e.g., 1920"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_year">End Year (optional)</Label>
                    <Input
                      id="end_year"
                      type="number"
                      value={formData.end_year}
                      onChange={(e) => setFormData(prev => ({ ...prev, end_year: e.target.value }))}
                      placeholder="e.g., 1980 (leave empty for ongoing)"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the risk and its potential impact..."
                    rows={3}
                    required
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowForm(false);
                      setEditingRisk(null);
                      setFormData({
                        material_name: '',
                        description: '',
                        start_year: '',
                        end_year: '',
                        risk_level: 'medium'
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingRisk ? 'Update Risk' : 'Add Risk'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Loading home risks...</div>
        ) : risks.length === 0 ? (
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No home risks configured yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {risks.map((risk) => (
              <Card key={risk.id} className={`border ${getRiskColor(risk.risk_level)}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getRiskIcon(risk.risk_level)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{risk.material_name}</h4>
                          <Badge variant={risk.risk_level === 'critical' ? 'destructive' : 'secondary'}>
                            {risk.risk_level.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Active in homes built {risk.start_year}
                          {risk.end_year ? `-${risk.end_year}` : '+'}
                        </p>
                        <p className="text-sm">{risk.description}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(risk)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(risk.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};