export interface DecisionTree {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  version: number;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface DecisionTreeOperation {
  id: string;
  decision_tree_id: string;
  phase_name: string;
  operation_name: string;
  operation_type: string;
  display_order: number;
  dependencies?: string[];
  parallel_group?: string;
  fallback_operation_id?: string;
  is_optional: boolean;
  condition_rules: Record<string, any>;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DecisionTreeCondition {
  id: string;
  operation_id: string;
  condition_type: string;
  condition_data: Record<string, any>;
  next_operation_id?: string;
  priority: number;
  is_fallback: boolean;
  created_at: string;
  updated_at: string;
}

export interface DecisionTreeExecutionPath {
  id: string;
  project_run_id: string;
  decision_tree_id: string;
  operation_id: string;
  phase_name: string;
  operation_name: string;
  chosen_path?: string;
  execution_timestamp: string;
  user_id: string;
  decision_data: Record<string, any>;
  execution_status: string;
  created_at: string;
}