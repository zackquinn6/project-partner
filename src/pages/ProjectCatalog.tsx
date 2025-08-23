import ProjectCatalog from '@/components/ProjectCatalog';
import { ProtectedRoute } from '@/components/ProtectedRoute';

const ProjectCatalogPage = () => {
  return (
    <ProtectedRoute>
      <ProjectCatalog />
    </ProtectedRoute>
  );
};

export default ProjectCatalogPage;