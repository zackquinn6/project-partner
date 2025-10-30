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

export const clearAllMaterials = async (): Promise<boolean> => {
  try {
    // Get all variation instance IDs for materials first
    const { data: materialVariations } = await supabase
      .from('variation_instances')
      .select('id')
      .eq('item_type', 'materials');

    const variationIds = materialVariations?.map(v => v.id) || [];

    // Delete in correct order to respect foreign key constraints
    console.log('Deleting variation warning flags...');
    if (variationIds.length > 0) {
      await supabase
        .from('variation_warning_flags')
        .delete()
        .in('variation_instance_id', variationIds);
    }

    console.log('Deleting material variations...');
    await supabase
      .from('variation_instances')
      .delete()
      .eq('item_type', 'materials');

    console.log('Deleting core materials...');
    const { error } = await supabase
      .from('materials')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      console.error('Error clearing materials:', error);
      toast.error('Failed to clear materials');
      return false;
    }

    console.log('All materials cleared successfully');
    return true;
  } catch (error) {
    console.error('Error clearing materials:', error);
    toast.error('Failed to clear materials');
    return false;
  }
};

export const clearAllProjectRuns = async (): Promise<boolean> => {
  try {
    console.log('Deleting all project runs...');
    const { error } = await supabase
      .from('project_runs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      console.error('Error clearing project runs:', error);
      toast.error('Failed to clear project runs');
      return false;
    }

    console.log('All project runs cleared successfully');
    toast.success('All project runs deleted');
    return true;
  } catch (error) {
    console.error('Error clearing project runs:', error);
    toast.error('Failed to clear project runs');
    return false;
  }
};

export const clearAllProjectTemplates = async (): Promise<boolean> => {
  try {
    // Get the Standard Project Foundation ID
    const { data: standardProject } = await supabase
      .from('projects')
      .select('id')
      .eq('name', 'Standard Project Foundation')
      .single();

    if (!standardProject) {
      console.error('Standard Project Foundation not found');
      toast.error('Cannot find Standard Project - aborting cleanup');
      return false;
    }

    console.log('Fetching all project templates except Standard Project...');
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .neq('id', standardProject.id);

    if (!projects || projects.length === 0) {
      console.log('No templates to delete');
      toast.success('No templates to delete');
      return true;
    }

    const projectIds = projects.map(p => p.id);

    // Delete template_steps first
    console.log('Deleting template steps...');
    const { data: operations } = await supabase
      .from('template_operations')
      .select('id')
      .in('project_id', projectIds);

    if (operations && operations.length > 0) {
      const operationIds = operations.map(op => op.id);
      await supabase
        .from('template_steps')
        .delete()
        .in('operation_id', operationIds);
    }

    // Delete template_operations
    console.log('Deleting template operations...');
    await supabase
      .from('template_operations')
      .delete()
      .in('project_id', projectIds);

    // Delete projects
    console.log('Deleting project templates...');
    const { error } = await supabase
      .from('projects')
      .delete()
      .in('id', projectIds);

    if (error) {
      console.error('Error clearing project templates:', error);
      toast.error('Failed to clear project templates');
      return false;
    }

    console.log(`Deleted ${projectIds.length} project templates successfully`);
    toast.success(`Deleted ${projectIds.length} project templates`);
    return true;
  } catch (error) {
    console.error('Error clearing project templates:', error);
    toast.error('Failed to clear project templates');
    return false;
  }
};