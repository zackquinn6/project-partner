import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const clearAllToolVariations = async (): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('variation_instances')
      .delete()
      .eq('item_type', 'tools');

    if (error) {
      console.error('Error clearing tool variations:', error);
      toast.error('Failed to clear tool variations');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error clearing tool variations:', error);
    toast.error('Failed to clear tool variations');
    return false;
  }
};

export const clearAllMaterialVariations = async (): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('variation_instances')
      .delete()
      .eq('item_type', 'materials');

    if (error) {
      console.error('Error clearing material variations:', error);
      toast.error('Failed to clear material variations');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error clearing material variations:', error);
    toast.error('Failed to clear material variations');
    return false;
  }
};

export const clearAllTools = async (): Promise<boolean> => {
  try {
    // Get all variation instance IDs for tools first
    const { data: toolVariations } = await supabase
      .from('variation_instances')
      .select('id')
      .eq('item_type', 'tools');

    const variationIds = toolVariations?.map(v => v.id) || [];

    // Get all tool model IDs
    const { data: toolModels } = await supabase
      .from('tool_models')
      .select('id');

    const modelIds = toolModels?.map(m => m.id) || [];

    // Delete in correct order to respect foreign key constraints
    console.log('Deleting pricing data...');
    if (modelIds.length > 0) {
      await supabase
        .from('pricing_data')
        .delete()
        .in('model_id', modelIds);
    }

    console.log('Deleting tool models...');
    await supabase
      .from('tool_models')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    console.log('Deleting variation warning flags...');
    if (variationIds.length > 0) {
      await supabase
        .from('variation_warning_flags')
        .delete()
        .in('variation_instance_id', variationIds);
    }

    console.log('Deleting tool variations...');
    await supabase
      .from('variation_instances')
      .delete()
      .eq('item_type', 'tools');

    console.log('Deleting core tools...');
    const { error } = await supabase
      .from('tools')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      console.error('Error clearing tools:', error);
      toast.error('Failed to clear tools');
      return false;
    }

    console.log('All tools cleared successfully');
    return true;
  } catch (error) {
    console.error('Error clearing tools:', error);
    toast.error('Failed to clear tools');
    return false;
  }
};