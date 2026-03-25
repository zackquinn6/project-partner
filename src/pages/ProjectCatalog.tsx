import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import ProjectCatalog from '@/components/ProjectCatalog';
import { useGlobalPublicSettings } from '@/hooks/useGlobalPublicSettings';
import { useAuth } from '@/contexts/AuthContext';
import { useMembership } from '@/contexts/MembershipContext';
import { Button } from '@/components/ui/button';
import { UpgradePrompt } from '@/components/UpgradePrompt';
import { useState } from 'react';

const ProjectCatalogPage = () => {
  const { projectCatalogEnabled, loading } = useGlobalPublicSettings();
  const { user } = useAuth();
  const { hasProjectsTier, loading: membershipLoading } = useMembership();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  if (!projectCatalogEnabled) {
    return (
      <div className="container mx-auto max-w-lg space-y-4 px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Project catalog unavailable</h1>
        <p className="text-muted-foreground">
          The project catalog is not available. You can continue from your workshop home.
        </p>
        <Link
          to="/"
          className="inline-block font-medium text-primary underline underline-offset-4 hover:opacity-90"
        >
          Back to home
        </Link>
      </div>
    );
  }

  if (user && !membershipLoading && !hasProjectsTier) {
    return (
      <div className="container mx-auto max-w-lg space-y-6 px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Projects membership required</h1>
        <p className="text-muted-foreground">
          Browsing the project catalog and starting new catalog projects is included with the Projects plan.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button type="button" onClick={() => setUpgradeOpen(true)}>
            View membership options
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link to="/">Back to home</Link>
          </Button>
        </div>
        <UpgradePrompt open={upgradeOpen} onOpenChange={setUpgradeOpen} feature="Projects membership" />
      </div>
    );
  }

  return <ProjectCatalog />;
};

export default ProjectCatalogPage;
