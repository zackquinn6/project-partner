import { useState, useEffect } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import ProjectCatalog from "@/components/ProjectCatalog";
import DIYSurveyPopup from "@/components/DIYSurveyPopup";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const ProjectCatalogPage = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [showSurvey, setShowSurvey] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const { user } = useAuth();
  
  // Check for admin mode via URL param or route state
  const isAdminMode = searchParams.get('mode') === 'admin' || location.state?.view === 'admin';
  
  useEffect(() => {
    const checkProfileCompletion = async () => {
      if (!user || isAdminMode) {
        setCheckingProfile(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('survey_completed_at')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking profile:', error);
          setShowSurvey(true);
        } else if (!data || !data.survey_completed_at) {
          setShowSurvey(true);
        }
      } catch (error) {
        console.error('Error checking profile:', error);
        setShowSurvey(true);
      } finally {
        setCheckingProfile(false);
      }
    };

    checkProfileCompletion();
  }, [user, isAdminMode]);

  const handleSurveyClose = () => {
    setShowSurvey(false);
  };
  
  return (
    <>
      <ProjectCatalog isAdminMode={isAdminMode} />
      <DIYSurveyPopup 
        open={showSurvey} 
        onOpenChange={handleSurveyClose}
        isNewUser={true}
      />
    </>
  );
};

export default ProjectCatalogPage;