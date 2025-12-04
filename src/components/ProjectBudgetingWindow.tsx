import React, { useState, useEffect } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogPortal, DialogOverlay } from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';
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
  category: 'material' | 'labor' | 'tools' | 'tool-rentals' | 'other';
  notes?: string;
}

interface ActualEntry {
  id: string;
  lineItemId?: string;
  description: string;
  amount: number;
  date: string;
  category: 'material' | 'labor' | 'tools' | 'tool-rentals' | 'other';
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
  
  // Get available phases for dropdown (custom and incorporated phases only, no standard phases)
  const availablePhases = React.useMemo(() => {
    if (!currentProjectRun?.phases || !Array.isArray(currentProjectRun.phases)) {
      return [];
    }
    
    // Filter to only show custom phases (not isStandard) and incorporated phases (isLinked)
    // Exclude standard phases (isStandard === true && !isLinked)
    return currentProjectRun.phases
      .filter(phase => {
        // Include if it's a custom phase (not standard) or an incorporated phase (linked)
        return !phase.isStandard || phase.isLinked === true;
      })
      .map(phase => ({
        id: phase.id,
        name: phase.name
      }))
      .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
  }, [currentProjectRun?.phases]);
  const [newActualDescription, setNewActualDescription] = useState('');
  const [newActualAmount, setNewActualAmount] = useState('');
  const [newActualCategory, setNewActualCategory] = useState<'material' | 'labor' | 'other'>('material');
  const [newActualDate, setNewActualDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedLineItemForActual, setSelectedLineItemForActual] = useState<string>('');
  const [performanceWindowOpen, setPerformanceWindowOpen] = useState(false);
  // State to hold the budget goal value
  const [budgetGoal, setBudgetGoal] = useState<string | number | null>(null);

  // Listen for performance window open/close events
  useEffect(() => {
    const handlePerformanceOpen = () => {
      setPerformanceWindowOpen(true);
    };
    const handlePerformanceClose = () => {
      setPerformanceWindowOpen(false);
    };
    
    window.addEventListener('performance-window-open', handlePerformanceOpen);
    window.addEventListener('performance-window-close', handlePerformanceClose);
    
    return () => {
      window.removeEventListener('performance-window-open', handlePerformanceOpen);
      window.removeEventListener('performance-window-close', handlePerformanceClose);
    };
  }, []);

  useEffect(() => {
    // Debug: Log initial_budget value to help diagnose the issue
    if (currentProjectRun && open) {
      const budgetValue = (currentProjectRun as any)?.initial_budget || (currentProjectRun as any)?.initialBudget;
      console.log('💰 ProjectBudgetingWindow: Checking initial_budget:', {
        hasCurrentProjectRun: !!currentProjectRun,
        initial_budget: (currentProjectRun as any)?.initial_budget,
        initialBudget: (currentProjectRun as any)?.initialBudget,
        budgetValue,
        budgetValueType: typeof budgetValue,
        allKeys: Object.keys(currentProjectRun).filter(k => k.toLowerCase().includes('budget')),
        projectRunId: currentProjectRun.id
      });
      // Update budget goal state
      setBudgetGoal(budgetValue);
    }
    
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
          category: ['material', 'labor', 'tools', 'tool-rentals', 'other'].includes(item.category) ? item.category : 'other',
          notes: item.notes || undefined
        }));
        
        // Validate and normalize actualEntries
        const normalizedEntries: ActualEntry[] = (budgetData.actualEntries || []).map((entry: any) => ({
          id: entry.id || `actual-${Date.now()}-${Math.random()}`,
          lineItemId: entry.lineItemId || undefined,
          description: String(entry.description || ''),
          amount: typeof entry.amount === 'number' ? entry.amount : parseFloat(String(entry.amount || 0)) || 0,
          date: entry.date || new Date().toISOString().split('T')[0],
          category: ['material', 'labor', 'tools', 'tool-rentals', 'other'].includes(entry.category) ? entry.category : 'other',
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
  
  // CRITICAL: Always fetch initial_budget directly from database when window opens
  // This bypasses any context caching issues and ensures we get the latest value
  useEffect(() => {
    if (open && currentProjectRun?.id) {
      const fetchBudgetGoal = async () => {
        try {
          console.log('🔍 ProjectBudgetingWindow: Fetching initial_budget from database for project:', currentProjectRun.id);
          const { data: freshRun, error } = await supabase
            .from('project_runs')
            .select('initial_budget')
            .eq('id', currentProjectRun.id)
            .single();
          
          if (error) {
            console.error('❌ Error fetching initial_budget:', error);
            // Fallback to context value if database fetch fails
            const budgetFromContext = (currentProjectRun as any)?.initial_budget ?? (currentProjectRun as any)?.initialBudget ?? null;
            setBudgetGoal(budgetFromContext);
            return;
          }
          
          if (freshRun) {
            const budgetValue = freshRun.initial_budget || null;
            console.log('✅ ProjectBudgetingWindow: Fetched initial_budget from database:', {
              value: budgetValue,
              type: typeof budgetValue,
              isEmpty: !budgetValue || budgetValue === '',
              projectRunId: currentProjectRun.id
            });
            setBudgetGoal(budgetValue);
            
            // Also update context if it's missing or different
            const contextBudget = (currentProjectRun as any)?.initial_budget ?? (currentProjectRun as any)?.initialBudget ?? null;
            if (contextBudget !== budgetValue) {
              console.log('🔄 ProjectBudgetingWindow: Updating context with fresh budget value');
              const updatedRun = {
                ...currentProjectRun,
                initial_budget: budgetValue
              };
              await updateProjectRun(updatedRun);
            }
          }
        } catch (error) {
          console.error('❌ Exception fetching initial_budget:', error);
          // Fallback to context value
          const budgetFromContext = (currentProjectRun as any)?.initial_budget ?? (currentProjectRun as any)?.initialBudget ?? null;
          setBudgetGoal(budgetFromContext);
        }
      };
      
      fetchBudgetGoal();
    } else if (!open) {
      // Reset budget goal when dialog closes
      setBudgetGoal(null);
    }
  }, [open, currentProjectRun?.id, updateProjectRun]);

  // Also update budget goal when currentProjectRun changes
  useEffect(() => {
    if (currentProjectRun) {
      const budgetValue = (currentProjectRun as any)?.initial_budget ?? (currentProjectRun as any)?.initialBudget ?? null;
      setBudgetGoal(budgetValue);
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

      console.log('💾 ProjectBudgetingWindow: Saving budget data:', {
        itemsCount: items.length,
        entriesCount: entries.length,
        projectRunId: currentProjectRun.id
      });

      const updatedProjectRun = {
        ...currentProjectRun,
        budget_data: budgetData
      };

      await updateProjectRun(updatedProjectRun);
      
      // CRITICAL: Update local state immediately to reflect the saved data
      // This ensures the UI shows the saved data even if context hasn't updated yet
      setBudgetItems(items);
      setActualEntries(entries);
      
      console.log('✅ Budget data saved successfully to database');
    } catch (error) {
      console.error('❌ Error saving budget data:', error);
      toast({ 
        title: 'Failed to save budget data', 
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive' 
      });
      throw error; // Re-throw so calling function knows save failed
    }
  };

  const addBudgetItem = async () => {
    // Validate required fields with specific messages
    const missingFields: string[] = [];
    
    if (!newItemSection.trim()) {
      missingFields.push('Section/Phase');
    }
    if (!newItemName.trim()) {
      missingFields.push('Item Description');
    }
    if (!newItemAmount.trim()) {
      missingFields.push('Budget Amount');
    }

    if (missingFields.length > 0) {
      toast({ 
        title: 'Missing Required Fields', 
        description: `Please fill in: ${missingFields.join(', ')}`,
        variant: 'destructive' 
      });
      return;
    }

    const parsedAmount = parseFloat(newItemAmount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      toast({ 
        title: 'Invalid Budget Amount', 
        description: 'Please enter a valid positive number for Budget Amount',
        variant: 'destructive' 
      });
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
    <Dialog 
      open={open} 
      onOpenChange={(newOpen) => {
        // CRITICAL: Only close if explicitly set to false AND performance window is not open
        // This prevents the budgeting window from closing when performance dashboard opens
        if (!newOpen) {
          // Check if performance window is actually open before closing
          if (!performanceWindowOpen) {
            onOpenChange(false);
          } else {
            // Performance window is open, don't close budgeting window
            console.log('💰 Budgeting window: Preventing close because performance window is open');
          }
        }
      }} 
      modal={false}
    >
      <DialogPortal>
        {/* CRITICAL: Manually control overlay visibility for modal={false} dialogs */}
        {/* Radix UI doesn't automatically manage overlay state when modal={false} */}
        {open && (
          <div 
            className="bg-black/60 backdrop-blur-md fixed inset-0 z-[90] transition-opacity duration-200"
            style={{ 
              opacity: open ? 1 : 0,
              pointerEvents: open ? 'auto' : 'none'
            }}
            aria-hidden="true"
          />
        )}
        <div
          data-dialog-content
          onClick={(e) => e.stopPropagation()}
          className={cn(
            // Mobile: Full screen
            "fixed inset-0 z-[91]",
            // Desktop: Centered with 90% viewport
            "md:fixed md:left-1/2 md:top-1/2 md:right-auto md:bottom-auto md:-translate-x-1/2 md:-translate-y-1/2",
            "md:w-[90vw] md:max-w-[90vw] md:h-[90vh] md:max-h-[90vh]",
            "md:max-w-[calc(100vw-2rem)] md:max-h-[calc(100vh-2rem)]",
            "bg-background md:border md:rounded-lg shadow-lg",
            "flex flex-col overflow-hidden"
          )}
          style={{ 
            pointerEvents: 'auto',
            position: 'fixed'
          }}
          onPointerDownOutside={(e) => {
            // CRITICAL: Prevent closing when clicking outside if performance window is open
            if (performanceWindowOpen) {
              e.preventDefault();
              return;
            }
            // Also prevent closing when clicking on another dialog
            const target = e.target as HTMLElement;
            if (target.closest('[data-dialog-content]') && target.closest('[data-dialog-content]') !== e.currentTarget) {
              e.preventDefault();
            }
          }}
        >
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
                  {(() => {
                    // Use budgetGoal state first, then fall back to currentProjectRun
                    const budgetValue = budgetGoal ?? (currentProjectRun as any)?.initial_budget ?? (currentProjectRun as any)?.initialBudget ?? null;
                    
                    if (budgetValue === null || budgetValue === undefined || budgetValue === '') {
                      return 'Not set';
                    }
                    
                    // Handle both string and number types
                    const budgetStr = typeof budgetValue === 'string' ? budgetValue.trim() : String(budgetValue).trim();
                    const budgetNum = budgetStr ? parseFloat(budgetStr) : NaN;
                    
                    if (budgetStr && !isNaN(budgetNum) && budgetNum > 0) {
                      return `$${budgetNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    }
                    return 'Not set';
                  })()}
                </div>
              </div>
              {(() => {
                // Use budgetGoal state first, then fall back to currentProjectRun
                const budgetValue = budgetGoal ?? (currentProjectRun as any)?.initial_budget ?? (currentProjectRun as any)?.initialBudget ?? null;
                
                if (budgetValue === null || budgetValue === undefined || budgetValue === '') {
                  return null;
                }
                
                const budgetStr = typeof budgetValue === 'string' ? budgetValue.trim() : String(budgetValue).trim();
                const budgetNum = budgetStr ? parseFloat(budgetStr) : NaN;
                
                if (budgetStr && !isNaN(budgetNum) && budgetNum > 0 && totalBudgeted > 0) {
                  return (
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground mb-1">Budgeted vs Goal</div>
                      <div className={`text-lg font-semibold ${totalBudgeted > budgetNum ? 'text-red-600' : 'text-green-600'}`}>
                        ${totalBudgeted.toFixed(2)} / ${budgetNum.toFixed(2)}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>

          {/* Summary Section - Stacked on mobile, side-by-side on desktop */}
          <div className="mb-4 space-y-3 md:space-y-0">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
              <div className="grid grid-cols-3 gap-3 md:gap-4 flex-1">
                <div>
                  <div className="text-xs md:text-sm text-muted-foreground">Total Budget</div>
                  <div className="text-xl md:text-2xl font-bold">${totalBudgeted.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs md:text-sm text-muted-foreground">Total Actual</div>
                  <div className="text-xl md:text-2xl font-bold">${totalActual.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs md:text-sm text-muted-foreground">Variance</div>
                  <div className={`text-xl md:text-2xl font-bold ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${variance.toFixed(2)}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  // Signal that performance window is opening
                  setPerformanceWindowOpen(true);
                  window.dispatchEvent(new CustomEvent('performance-window-open'));
                  // Open performance window without closing budgeting window
                  window.dispatchEvent(new CustomEvent('open-app', { detail: { actionKey: 'project-performance' } }));
                }}
                className="w-full md:w-auto h-11 md:h-9"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                View Performance
              </Button>
            </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Section/Phase <span className="text-red-500">*</span></Label>
                  <Select
                    value={newItemSection}
                    onValueChange={setNewItemSection}
                  >
                    <SelectTrigger className="h-11 md:h-10">
                      <SelectValue placeholder="Select a phase" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePhases.length === 0 ? (
                        <SelectItem value="" disabled>No phases available</SelectItem>
                      ) : (
                        availablePhases.map(phase => (
                          <SelectItem key={phase.id} value={phase.name}>
                            {phase.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Item Description <span className="text-red-500">*</span></Label>
                  <Input
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="e.g., 2x4 Lumber"
                    className="h-11 md:h-10"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Budget Amount <span className="text-red-500">*</span></Label>
                  <Input
                    type="number"
                    value={newItemAmount}
                    onChange={(e) => setNewItemAmount(e.target.value)}
                    placeholder="0.00"
                    className="h-11 md:h-10"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={newItemCategory} onValueChange={(value: any) => setNewItemCategory(value)}>
                    <SelectTrigger className="h-11 md:h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="material">Material</SelectItem>
                      <SelectItem value="labor">Labor</SelectItem>
                      <SelectItem value="tools">Tools</SelectItem>
                      <SelectItem value="tool-rentals">Tool Rentals</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">
                  <span className="text-red-500">*</span> Required fields
                </p>
                <Button 
                  onClick={async () => {
                    try {
                      console.log('🎯 ProjectBudgetingWindow: Add Line Item button clicked');
                      await addBudgetItem();
                    } catch (error) {
                      console.error('❌ Error adding budget item:', error);
                      toast({
                        title: 'Failed to add budget item',
                        description: error instanceof Error ? error.message : 'Unknown error',
                        variant: 'destructive'
                      });
                    }
                  }}
                  className="h-11 md:h-10 w-full md:w-auto"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Line Item
                </Button>
              </div>
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
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <CardTitle className="text-base md:text-lg">{section}</CardTitle>
                        <div className="text-xs md:text-sm text-muted-foreground">
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
                              <div key={item.id} className="flex items-center justify-between p-2 md:p-3 border rounded gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm md:text-base truncate">{item.item || 'Untitled Item'}</div>
                                  <div className="text-xs md:text-sm text-muted-foreground mt-1">
                                    <Badge variant="outline" className="mr-2 text-[10px] md:text-xs">{item.category || 'other'}</Badge>
                                    <span className="block md:inline">Budget: ${budgetedAmount.toFixed(2)}</span>
                                    <span className="hidden md:inline"> | </span>
                                    <span className="block md:inline">Actual: ${actualAmount.toFixed(2)}</span>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeBudgetItem(item.id)}
                                  className="h-11 w-11 md:h-9 md:w-9 p-0 flex-shrink-0"
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Description</Label>
                  <Input
                    value={newActualDescription}
                    onChange={(e) => setNewActualDescription(e.target.value)}
                    placeholder="What did you buy?"
                    className="h-11 md:h-10"
                  />
                </div>
                <div>
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    value={newActualAmount}
                    onChange={(e) => setNewActualAmount(e.target.value)}
                    placeholder="0.00"
                    className="h-11 md:h-10"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={newActualDate}
                    onChange={(e) => setNewActualDate(e.target.value)}
                    className="h-11 md:h-10"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={newActualCategory} onValueChange={(value: any) => setNewActualCategory(value)}>
                    <SelectTrigger className="h-11 md:h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="material">Material</SelectItem>
                      <SelectItem value="labor">Labor</SelectItem>
                      <SelectItem value="tools">Tools</SelectItem>
                      <SelectItem value="tool-rentals">Tool Rentals</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Match to Budget Item (Optional)</Label>
                  <Select value={selectedLineItemForActual || 'none'} onValueChange={(value) => setSelectedLineItemForActual(value === 'none' ? '' : value)}>
                    <SelectTrigger className="h-11 md:h-10">
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
              <Button 
                onClick={async () => {
                  try {
                    await addActualEntry();
                  } catch (error) {
                    console.error('❌ Error adding actual entry:', error);
                    toast({
                      title: 'Failed to record spend',
                      description: error instanceof Error ? error.message : 'Unknown error',
                      variant: 'destructive'
                    });
                  }
                }}
                className="h-11 md:h-10 w-full md:w-auto"
              >
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
                      <div key={entry.id} className="flex items-center justify-between p-2 md:p-3 border rounded gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm md:text-base truncate">{entry.description || 'Untitled Entry'}</div>
                          <div className="text-xs md:text-sm text-muted-foreground mt-1">
                            <Badge variant="outline" className="mr-2 text-[10px] md:text-xs">{entry.category || 'other'}</Badge>
                            <span className="block md:inline">{date}</span>
                            <span className="hidden md:inline"> | </span>
                            <span className="block md:inline">${amount.toFixed(2)}</span>
                            {matchedItem && (
                              <span className="ml-2 text-blue-600 block md:inline">
                                (Matched to: {matchedItem.item || 'Unknown Item'})
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <label>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*,.pdf"
                              onChange={(e) => e.target.files?.[0] && handleReceiptUpload(entry.id, e.target.files[0])}
                            />
                            <Button variant="outline" size="sm" asChild className="h-11 w-11 md:h-9 md:w-9 p-0">
                              <span>
                                <Upload className="w-4 h-4" />
                              </span>
                            </Button>
                          </label>
                          {entry.receiptUrl && (
                            <Badge variant="secondary" className="text-[10px] md:text-xs">Receipt</Badge>
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
        </div>
      </DialogPortal>
    </Dialog>
  );
};
