-- =====================================================
-- UPDATE COMMENTS ON TIME ESTIMATE COLUMNS
-- Explain that time estimates are based on step type
-- =====================================================

-- Check if columns exist before updating comments
DO $$
BEGIN
  -- Update comments explaining time estimate columns based on step_type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'operation_steps' 
    AND column_name = 'time_estimate_low'
  ) THEN
    COMMENT ON COLUMN public.operation_steps.time_estimate_low IS 
      'Low time estimate (best case, 10th percentile). Interpretation depends on step_type: 
       - If step_type = ''prime'' or ''quality_control_non_scaled'': Total time in hours (does not scale)
       - If step_type = ''scaled'' or ''quality_control_scaled'': Time per scaling unit in hours (e.g., 0.083 hours per square foot = 5 min/sq ft)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'operation_steps' 
    AND column_name = 'time_estimate_medium'
  ) THEN
    COMMENT ON COLUMN public.operation_steps.time_estimate_medium IS 
      'Medium time estimate (typical/average). Interpretation depends on step_type: 
       - If step_type = ''prime'' or ''quality_control_non_scaled'': Total time in hours (does not scale)
       - If step_type = ''scaled'' or ''quality_control_scaled'': Time per scaling unit in hours (e.g., 0.083 hours per square foot = 5 min/sq ft)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'operation_steps' 
    AND column_name = 'time_estimate_high'
  ) THEN
    COMMENT ON COLUMN public.operation_steps.time_estimate_high IS 
      'High time estimate (worst case, 90th percentile). Interpretation depends on step_type: 
       - If step_type = ''prime'' or ''quality_control_non_scaled'': Total time in hours (does not scale)
       - If step_type = ''scaled'' or ''quality_control_scaled'': Time per scaling unit in hours (e.g., 0.083 hours per square foot = 5 min/sq ft)';
  END IF;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Added comments to time estimate columns explaining step type interpretation';
END $$;

