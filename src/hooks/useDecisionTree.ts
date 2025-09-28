import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DecisionTree, DecisionTreeOperation, DecisionTreeCondition } from '@/interfaces/DecisionTree';
import { useToast } from '@/hooks/use-toast';

export const useDecisionTree = (projectId?: string) => {
  const [decisionTrees, setDecisionTrees] = useState<DecisionTree[]>([]);
  const [operations, setOperations] = useState<DecisionTreeOperation[]>([]);
  const [conditions, setConditions] = useState<DecisionTreeCondition[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchDecisionTrees = async () => {
    if (!projectId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('decision_trees')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDecisionTrees(data || []);
    } catch (error) {
      console.error('Error fetching decision trees:', error);
      toast({
        title: "Error",
        description: "Failed to fetch decision trees",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOperations = async (decisionTreeId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('decision_tree_operations')
        .select('*')
        .eq('decision_tree_id', decisionTreeId)
        .order('phase_name', { ascending: true })
        .order('display_order', { ascending: true });

      if (error) throw error;
      setOperations(data?.map(op => ({
        ...op,
        condition_rules: op.condition_rules as Record<string, any>
      })) || []);
    } catch (error) {
      console.error('Error fetching operations:', error);
      toast({
        title: "Error",
        description: "Failed to fetch operations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createDecisionTree = async (tree: Omit<DecisionTree, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('decision_trees')
        .insert([tree])
        .select()
        .single();

      if (error) throw error;
      
      setDecisionTrees(prev => [data, ...prev]);
      toast({
        title: "Success",
        description: "Decision tree created successfully",
      });
      
      return data;
    } catch (error) {
      console.error('Error creating decision tree:', error);
      toast({
        title: "Error",
        description: "Failed to create decision tree",
        variant: "destructive",
      });
      throw error;
    }
  };

  const createOperation = async (operation: Omit<DecisionTreeOperation, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('decision_tree_operations')
        .insert([operation])
        .select()
        .single();

      if (error) throw error;
      
      setOperations(prev => [...prev, {
        ...data,
        condition_rules: data.condition_rules as Record<string, any>
      }].sort((a, b) => {
        if (a.phase_name !== b.phase_name) {
          return a.phase_name.localeCompare(b.phase_name);
        }
        return a.display_order - b.display_order;
      }));
      
      toast({
        title: "Success",
        description: "Operation created successfully",
      });
      
      return data;
    } catch (error) {
      console.error('Error creating operation:', error);
      toast({
        title: "Error",
        description: "Failed to create operation",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateOperation = async (id: string, updates: Partial<DecisionTreeOperation>) => {
    try {
      const { data, error } = await supabase
        .from('decision_tree_operations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setOperations(prev => prev.map(op => op.id === id ? {
        ...data,
        condition_rules: data.condition_rules as Record<string, any>
      } : op));
      toast({
        title: "Success",
        description: "Operation updated successfully",
      });
      
      return data;
    } catch (error) {
      console.error('Error updating operation:', error);
      toast({
        title: "Error",
        description: "Failed to update operation",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteOperation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('decision_tree_operations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setOperations(prev => prev.filter(op => op.id !== id));
      toast({
        title: "Success",
        description: "Operation deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting operation:', error);
      toast({
        title: "Error",
        description: "Failed to delete operation",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchDecisionTrees();
    }
  }, [projectId]);

  return {
    decisionTrees,
    operations,
    conditions,
    loading,
    fetchDecisionTrees,
    fetchOperations,
    createDecisionTree,
    createOperation,
    updateOperation,
    deleteOperation,
  };
};