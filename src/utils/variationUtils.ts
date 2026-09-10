import { supabase } from '@/integrations/supabase/client';
const db: any = supabase;
import { toast } from 'sonner';

export const clearAllToolVariations = async (): Promise<boolean> => {
  try {
    const { error } = await db.from('tool_variations').delete().neq('id', '00000000-0000-0000-0000-000000000000');

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
    const { error } = await db
      .from('materials_variants')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      console.error('Error clearing material variants:', error);
      toast.error('Failed to clear material variants');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error clearing material variants:', error);
    toast.error('Failed to clear material variants');
    return false;
  }
};

export const clearAllTools = async (): Promise<boolean> => {
  try {
    // Get all variation instance IDs for tools first
    const { data: toolVariations } = await db.from('tool_variations').select('id');

    const variationIds = toolVariations?.map(v => v.id) || [];
    if (variationIds.length > 0) {
      await db
        .from('variation_warning_flags')
        .delete()
        .in('variation_instance_id', variationIds);
    }
    await db.from('tool_variations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    const { error } = await db
      .from('tools')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      console.error('Error clearing tools:', error);
      toast.error('Failed to clear tools');
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error clearing tools:', error);
    toast.error('Failed to clear tools');
    return false;
  }
};

export const clearAllMaterials = async (): Promise<boolean> => {
  try {
    const { error } = await db
      .from('materials')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      console.error('Error clearing materials:', error);
      toast.error('Failed to clear materials');
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error clearing materials:', error);
    toast.error('Failed to clear materials');
    return false;
  }
};

export const clearAllProjectRuns = async (): Promise<boolean> => {
  try {
    const { error } = await db
      .from('project_runs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      console.error('Error clearing project runs:', error);
      toast.error('Failed to clear project runs');
      return false;
    }
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
    const { data: standardProject } = await db
      .from('projects')
      .select('id')
      .eq('name', 'Standard Project Foundation')
      .single();

    if (!standardProject) {
      console.error('Standard Project Foundation not found');
      toast.error('Cannot find Standard Project - aborting cleanup');
      return false;
    }
    const { data: projects } = await db
      .from('projects')
      .select('id')
      .neq('id', standardProject.id);

    if (!projects || projects.length === 0) {
            return true;
    }

    const projectIds = projects.map(p => p.id);
    const { data: operations } = await db
      .from('template_operations')
      .select('id')
      .in('project_id', projectIds);

    if (operations && operations.length > 0) {
      const operationIds = operations.map(op => op.id);
      await db
        .from('template_steps')
        .delete()
        .in('operation_id', operationIds);
    }
    await db
      .from('template_operations')
      .delete()
      .in('project_id', projectIds);
    const { error } = await db
      .from('projects')
      .delete()
      .in('id', projectIds);

    if (error) {
      console.error('Error clearing project templates:', error);
      toast.error('Failed to clear project templates');
      return false;
    }
        return true;
  } catch (error) {
    console.error('Error clearing project templates:', error);
    toast.error('Failed to clear project templates');
    return false;
  }
};