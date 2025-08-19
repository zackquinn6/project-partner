import { useSearchParams, useLocation } from "react-router-dom";
import ProjectCatalog from "@/components/ProjectCatalog";

const ProjectCatalogPage = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  
  // Check for admin mode via URL param or route state
  const isAdminMode = searchParams.get('mode') === 'admin' || location.state?.view === 'admin';
  
  
  return (
    <ProjectCatalog isAdminMode={isAdminMode} />
  );
};

export default ProjectCatalogPage;