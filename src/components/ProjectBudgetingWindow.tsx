import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { TrendingUp, Plus, Trash2, Upload, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useProject } from '@/contexts/ProjectContext';
import { supabase } from '@/integrations/supabase/client';

interface BudgetLineItem {
  id: string;
  section: string;
  item: string;
  budgetedAmount: number;
  actualAmount: number;
  category: 'material' | 'labor' | 'other';
  notes?: string;
}

interface ActualEntry {
  id: string;
  lineItemId?: string;
  description: string;
  amount: number;
  date: string;
  category: 'material' | 'labor' | 'other';
  receiptUrl?: string;
  notes?: string;
}

interface ProjectBudgetingWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProjectBudgetingWindow: React.FC<ProjectBudgetingWindowProps> = ({ open, onOpenChange }) => {
  const { toast } = useToast();
  const { currentProjectRun, updateProjectRun } = useProject();
  const [budgetItems, setBudgetItems] = useState<BudgetLineItem[]>([]);
  const [actualEntries, setActualEntries] = useState<ActualEntry[]>([]);
  const [newItemSection, setNewItemSection] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<'material' | 'labor' | 'other'>('material');
  const [newActualDescription, setNewActualDescription] = useState('');
  const [newActualAmount, setNewActualAmount] = useState('');
  const [newActualCategory, setNewActualCategory] = useState<'material' | 'labor' | 'other'>('material');
  const [newActualDate, setNewActualDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedLineItemForActual, setSelectedLineItemForActual] = useState<string>('');

  useEffect(() => {
    if (currentProjectRun?.budget_data) {
      try {
        // Handle both object and parsed JSON string
        const budgetData = typeof currentProjectRun.budget_data === 'string' 
          ? JSON.parse(currentProjectRun.budget_data) 
          : currentProjectRun.budget_data;
        
        // Validate and normalize lineItems
        const normalizedItems: BudgetLineItem[] = (budgetData.lineItems || []).map((item: any) => ({
          id: item.id || `budget-${Date.now()}-${Math.random()}`,
          section: String(item.section || ''),
          item: String(item.item || ''),
          budgetedAmount: typeof item.budgetedAmount === 'number' ? item.budgetedAmount : parseFloat(String(item.budgetedAmount || 0)) || 0,
          actualAmount: typeof item.actualAmount === 'number' ? item.actualAmount : parseFloat(String(item.actualAmount || 0)) || 0,
          category: ['material', 'labor', 'other'].includes(item.category) ? item.category : 'other',
          notes: item.notes || undefined
        }));
        
        // Validate and normalize actualEntries
        const normalizedEntries: ActualEntry[] = (budgetData.actualEntries || []).map((entry: any) => ({
          id: entry.id || `actual-${Date.now()}-${Math.random()}`,
          lineItemId: entry.lineItemId || undefined,
          description: String(entry.description || ''),
          amount: typeof entry.amount === 'number' ? entry.amount : parseFloat(String(entry.amount || 0)) || 0,
          date: entry.date || new Date().toISOString().split('T')[0],
          category: ['material', 'labor', 'other'].includes(entry.category) ? entry.category : 'other',
          receiptUrl: entry.receiptUrl || undefined,
          notes: entry.notes || undefined
        }));
        
        setBudgetItems(normalizedItems);
        setActualEntries(normalizedEntries);
        console.log('✅ Loaded budget data:', { 
          itemsCount: normalizedItems.length, 
          entriesCount: normalizedEntries.length 
        });
      } catch (error) {
        console.error('❌ Error parsing budget data:', error);
        toast({ 
          title: 'Error loading budget data', 
          description: 'Some data may be corrupted. Please check your budget entries.',
          variant: 'destructive' 
        });
        setBudgetItems([]);
        setActualEntries([]);
      }
    } else {
      // Reset when no project run or no budget data
      setBudgetItems([]);
      setActualEntries([]);
    }
  }, [currentProjectRun]);

  const saveBudgetData = async (items: BudgetLineItem[], entries: ActualEntry[]) => {
    if (!currentProjectRun) {
      toast({ title: 'No project selected', variant: 'destructive' });
      return;
    }

    try {
      const budgetData = {
        lineItems: items,
        actualEntries: entries,
        lastUpdated: new Date().toISOString()
      };

      await updateProjectRun({
        ...currentProjectRun,
        budget_data: budgetData
      });
      
      console.log('✅ Budget data saved successfully');
    } catch (error) {
      console.error('❌ Error saving budget data:', error);
      toast({ 
        title: 'Failed to save budget data', 
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive' 
      });
    }
  };

  const addBudgetItem = async () => {
    if (!newItemSection.trim() || !newItemName.trim() || !newItemAmount.trim()) {
      toast({ title: 'Please fill in all fields', variant: 'destructive' });
      return;
    }

    const parsedAmount = parseFloat(newItemAmount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      toast({ title: 'Please enter a valid positive number for amount', variant: 'destructive' });
      return;
    }

    const newItem: BudgetLineItem = {
      id: `budget-${Date.now()}`,
      section: newItemSection.trim(),
      item: newItemName.trim(),
      budgetedAmount: parsedAmount,
      actualAmount: 0,
      category: newItemCategory
    };

    const updatedItems = [...budgetItems, newItem];
    setBudgetItems(updatedItems);
    await saveBudgetData(updatedItems, actualEntries);

    setNewItemSection('');
    setNewItemName('');
    setNewItemAmount('');
    toast({ title: 'Budget item added successfully' });
  };

  const removeBudgetItem = async (id: string) => {
    const updatedItems = budgetItems.filter(item => item.id !== id);
    setBudgetItems(updatedItems);
    await saveBudgetData(updatedItems, actualEntries);
    toast({ title: 'Budget item removed' });
  };

  const addActualEntry = async () => {
    if (!newActualDescription.trim() || !newActualAmount.trim()) {
      toast({ title: 'Please fill in description and amount', variant: 'destructive' });
      return;
    }

    const parsedAmount = parseFloat(newActualAmount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      toast({ title: 'Please enter a valid positive number for amount', variant: 'destructive' });
      return;
    }

    const newEntry: ActualEntry = {
      id: `actual-${Date.now()}`,
      lineItemId: selectedLineItemForActual || undefined,
      description: newActualDescription.trim(),
      amount: parsedAmount,
      date: newActualDate,
      category: newActualCategory
    };

    const updatedEntries = [...actualEntries, newEntry];
    
    // Update the actual amount on the budget line item if matched
    const updatedItems = budgetItems.map(item => {
      if (item.id === selectedLineItemForActual) {
        return { ...item, actualAmount: item.actualAmount + newEntry.amount };
      }
      return item;
    });

    setActualEntries(updatedEntries);
    setBudgetItems(updatedItems);
    await saveBudgetData(updatedItems, updatedEntries);

    setNewActualDescription('');
    setNewActualAmount('');
    setSelectedLineItemForActual('');
    toast({ title: 'Actual spend recorded successfully' });
  };

  const handleReceiptUpload = async (entryId: string, file: File) => {
    if (!currentProjectRun) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentProjectRun.id}/${entryId}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('project-receipts')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('project-receipts')
        .getPublicUrl(fileName);

      const updatedEntries = actualEntries.map(entry =>
        entry.id === entryId ? { ...entry, receiptUrl: publicUrl } : entry
      );

      setActualEntries(updatedEntries);
      saveBudgetData(budgetItems, updatedEntries);
      toast({ title: 'Receipt uploaded' });
    } catch (error) {
      toast({ title: 'Failed to upload receipt', variant: 'destructive' });
    }
  };

  const calculateTotals = () => {
    const totalBudgeted = Array.isArray(budgetItems) 
      ? budgetItems.reduce((sum, item) => {
          if (!item) return sum;
          const amount = typeof item.budgetedAmount === 'number' ? item.budgetedAmount : parseFloat(String(item.budgetedAmount || 0)) || 0;
          return sum + amount;
        }, 0)
      : 0;
    const totalActual = Array.isArray(actualEntries)
      ? actualEntries.reduce((sum, entry) => {
          if (!entry) return sum;
          const amount = typeof entry.amount === 'number' ? entry.amount : parseFloat(String(entry.amount || 0)) || 0;
          return sum + amount;
        }, 0)
      : 0;
    const variance = totalBudgeted - totalActual;
    return { totalBudgeted, totalActual, variance };
  };

  const { totalBudgeted, totalActual, variance } = calculateTotals();

  const getSectionTotal = (section: string) => {
    if (!Array.isArray(budgetItems)) return { budgeted: 0, actual: 0 };
    const sectionItems = budgetItems.filter(item => item && item.section === section);
    const budgeted = sectionItems.reduce((sum, item) => {
      const amount = typeof item.budgetedAmount === 'number' ? item.budgetedAmount : parseFloat(String(item.budgetedAmount || 0)) || 0;
      return sum + amount;
    }, 0);
    const actual = sectionItems.reduce((sum, item) => {
      const amount = typeof item.actualAmount === 'number' ? item.actualAmount : parseFloat(String(item.actualAmount || 0)) || 0;
      return sum + amount;
    }, 0);
    return { budgeted, actual };
  };

  const uniqueSections = Array.isArray(budgetItems) 
    ? [...new Set(budgetItems.filter(item => item && item.section).map(item => item.section))]
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-screen max-w-full max-h-full md:max-w-[90vw] md:h-[90vh] md:rounded-lg p-0 overflow-hidden flex flex-col [&>button]:hidden md:!top-[50%] md:!left-[50%] md:!translate-x-[-50%] md:!translate-y-[-50%]">
        <DialogHeader className="px-2 md:px-4 py-1.5 md:py-2 border-b flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-lg md:text-xl font-bold">Project Budgeting</DialogTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onOpenChange(false)} 
              className="h-7 px-2 text-[9px] md:text-xs"
            >
              Close
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-2 md:px-4 py-3 md:py-4">
          {/* Budget Goal Header */}
          <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Project Budget Goal</div>
                <div className="text-xl font-bold text-primary">
                  {currentProjectRun?.initial_budget && String(currentProjectRun.initial_budget).trim() !== '' && parseFloat(String(currentProjectRun.initial_budget)) > 0
                    ? `$${parseFloat(String(currentProjectRun.initial_budget)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : 'Not set'}
                </div>
              </div>
              {currentProjectRun?.initial_budget && String(currentProjectRun.initial_budget).trim() !== '' && parseFloat(String(currentProjectRun.initial_budget)) > 0 && totalBudgeted > 0 && (
                <div className="text-right">
                  <div className="text-xs text-muted-foreground mb-1">Budgeted vs Goal</div>
                  <div className={`text-lg font-semibold ${totalBudgeted > parseFloat(String(currentProjectRun.initial_budget)) ? 'text-red-600' : 'text-green-600'}`}>
                    ${totalBudgeted.toFixed(2)} / ${parseFloat(String(currentProjectRun.initial_budget)).toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
        <div className="flex gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Total Budget</div>
            <div className="text-2xl font-bold">${totalBudgeted.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Total Actual</div>
            <div className="text-2xl font-bold">${totalActual.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Variance</div>
            <div className={`text-2xl font-bold ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${variance.toFixed(2)}
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.dispatchEvent(new CustomEvent('open-app', { detail: { actionKey: 'project-performance' } }))}
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          View Performance
        </Button>
      </div>

      <Tabs defaultValue="budget" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="actual">Actual Spend</TabsTrigger>
        </TabsList>

        <TabsContent value="budget" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add Budget Line Item</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Section/Phase</Label>
                  <Input
                    value={newItemSection}
                    onChange={(e) => setNewItemSection(e.target.value)}
                    placeholder="e.g., Demo, Framing"
                  />
                </div>
                <div>
                  <Label>Item Description</Label>
                  <Input
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="e.g., 2x4 Lumber"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Budget Amount</Label>
                  <Input
                    type="number"
                    value={newItemAmount}
                    onChange={(e) => setNewItemAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={newItemCategory} onValueChange={(value: any) => setNewItemCategory(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="material">Material</SelectItem>
                      <SelectItem value="labor">Labor</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={async () => {
                console.log('🎯 ProjectBudgetingWindow: Add Line Item button clicked');
                await addBudgetItem();
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Line Item
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {uniqueSections.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No budget items yet. Add your first line item above.</p>
                </CardContent>
              </Card>
            ) : (
              uniqueSections.map(section => {
                if (!section) return null;
                const sectionTotals = getSectionTotal(section);
                const sectionItems = Array.isArray(budgetItems) 
                  ? budgetItems.filter(item => item && item.section === section)
                  : [];
                
                return (
                  <Card key={section}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{section}</CardTitle>
                        <div className="text-sm text-muted-foreground">
                          Budget: ${sectionTotals.budgeted.toFixed(2)} | Actual: ${sectionTotals.actual.toFixed(2)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {sectionItems.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No items in this section</p>
                        ) : (
                          sectionItems.map(item => {
                            if (!item || !item.id) return null;
                            const budgetedAmount = typeof item.budgetedAmount === 'number' ? item.budgetedAmount : parseFloat(String(item.budgetedAmount || 0)) || 0;
                            const actualAmount = typeof item.actualAmount === 'number' ? item.actualAmount : parseFloat(String(item.actualAmount || 0)) || 0;
                            
                            return (
                              <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                                <div className="flex-1">
                                  <div className="font-medium">{item.item || 'Untitled Item'}</div>
                                  <div className="text-sm text-muted-foreground">
                                    <Badge variant="outline" className="mr-2">{item.category || 'other'}</Badge>
                                    Budget: ${budgetedAmount.toFixed(2)} | Actual: ${actualAmount.toFixed(2)}
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeBudgetItem(item.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="actual" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Record Actual Spend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Description</Label>
                  <Input
                    value={newActualDescription}
                    onChange={(e) => setNewActualDescription(e.target.value)}
                    placeholder="What did you buy?"
                  />
                </div>
                <div>
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    value={newActualAmount}
                    onChange={(e) => setNewActualAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={newActualDate}
                    onChange={(e) => setNewActualDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={newActualCategory} onValueChange={(value: any) => setNewActualCategory(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="material">Material</SelectItem>
                      <SelectItem value="labor">Labor</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Match to Budget Item (Optional)</Label>
                  <Select value={selectedLineItemForActual || 'none'} onValueChange={(value) => setSelectedLineItemForActual(value === 'none' ? '' : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select item" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (New expense)</SelectItem>
                      {Array.isArray(budgetItems) && budgetItems.map(item => (
                        item && item.id ? (
                          <SelectItem key={item.id} value={item.id}>
                            {item.section || 'Uncategorized'} - {item.item || 'Untitled Item'}
                          </SelectItem>
                        ) : null
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={async () => await addActualEntry()}>
                <DollarSign className="w-4 h-4 mr-2" />
                Record Spend
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actual Spending History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {!actualEntries || actualEntries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No spending recorded yet</p>
                ) : (
                  actualEntries.map(entry => {
                    if (!entry || !entry.id) return null;
                    
                    const amount = typeof entry.amount === 'number' ? entry.amount : parseFloat(String(entry.amount || 0)) || 0;
                    const date = entry.date || new Date().toISOString().split('T')[0];
                    const matchedItem = entry.lineItemId && Array.isArray(budgetItems) 
                      ? budgetItems.find(i => i && i.id === entry.lineItemId) 
                      : null;
                    
                    return (
                      <div key={entry.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex-1">
                          <div className="font-medium">{entry.description || 'Untitled Entry'}</div>
                          <div className="text-sm text-muted-foreground">
                            <Badge variant="outline" className="mr-2">{entry.category || 'other'}</Badge>
                            {date} | ${amount.toFixed(2)}
                            {matchedItem && (
                              <span className="ml-2 text-blue-600">
                                (Matched to: {matchedItem.item || 'Unknown Item'})
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <label>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*,.pdf"
                              onChange={(e) => e.target.files?.[0] && handleReceiptUpload(entry.id, e.target.files[0])}
                            />
                            <Button variant="outline" size="sm" asChild>
                              <span>
                                <Upload className="w-4 h-4" />
                              </span>
                            </Button>
                          </label>
                          {entry.receiptUrl && (
                            <Badge variant="secondary">Receipt</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
