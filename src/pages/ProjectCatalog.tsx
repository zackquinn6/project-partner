import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import ProjectCatalog from '@/components/ProjectCatalog';
import { useGlobalPublicSettings } from '@/hooks/useGlobalPublicSettings';

const ProjectCatalogPage = () => {
  const { projectCatalogEnabled, loading } = useGlobalPublicSettings();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  if (!projectCatalogEnabled) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-lg text-center space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">Project catalog unavailable</h1>
        <p className="text-muted-foreground">
          The project catalog is not available. You can continue from your workshop home.
        </p>
        <Link
          to="/"
          className="inline-block text-primary font-medium underline underline-offset-4 hover:opacity-90"
        >
          Back to home
        </Link>
      </div>
    );
  }

  return <ProjectCatalog />;
};

export default ProjectCatalogPage;
