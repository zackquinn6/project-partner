-- =====================================================
-- ADD ADMIN POLICIES FOR ROADMAP AND FEEDBACK MANAGEMENT
-- Admins need to be able to insert/update/delete roadmap items
-- =====================================================

-- =====================================================
-- FEATURE_ROADMAP - Admin policies
-- =====================================================

-- Admins can insert roadmap items
DROP POLICY IF EXISTS "Admins can insert roadmap items" ON public.feature_roadmap;
CREATE POLICY "Admins can insert roadmap items"
  ON public.feature_roadmap FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update roadmap items
DROP POLICY IF EXISTS "Admins can update roadmap items" ON public.feature_roadmap;
CREATE POLICY "Admins can update roadmap items"
  ON public.feature_roadmap FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can delete roadmap items
DROP POLICY IF EXISTS "Admins can delete roadmap items" ON public.feature_roadmap;
CREATE POLICY "Admins can delete roadmap items"
  ON public.feature_roadmap FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- FEATURE_REQUESTS - Admin update/delete policies
-- =====================================================

-- Admins can update any feature request
DROP POLICY IF EXISTS "Admins can update feature requests" ON public.feature_requests;
CREATE POLICY "Admins can update feature requests"
  ON public.feature_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can delete feature requests
DROP POLICY IF EXISTS "Admins can delete feature requests" ON public.feature_requests;
CREATE POLICY "Admins can delete feature requests"
  ON public.feature_requests FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- FEEDBACK - Admin update/delete policies
-- =====================================================

-- Admins can update feedback
DROP POLICY IF EXISTS "Admins can update feedback" ON public.feedback;
CREATE POLICY "Admins can update feedback"
  ON public.feedback FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can delete feedback
DROP POLICY IF EXISTS "Admins can delete feedback" ON public.feedback;
CREATE POLICY "Admins can delete feedback"
  ON public.feedback FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Admin policies added for feature_roadmap';
  RAISE NOTICE '✅ Admin policies added for feature_requests';
  RAISE NOTICE '✅ Admin policies added for feedback';
  RAISE NOTICE '✅ Admins can now manage roadmap, requests, and feedback';
END $$;

