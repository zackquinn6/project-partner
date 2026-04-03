import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProjectProvider } from '@/contexts/ProjectContext';
import { ProjectDataProvider } from '@/contexts/ProjectDataContext';
import { ProjectActionsProvider } from '@/contexts/ProjectActionsContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { GuestProvider } from '@/contexts/GuestContext';
import { MembershipProvider } from '@/contexts/MembershipContext';
import { SecurityMaintenanceProvider } from '@/components/SecurityMaintenanceProvider';
import { SecurityHeadersProvider } from '@/components/SecurityHeadersProvider';
// Temporarily disabled due to initialization order issues
// import { EnhancedSecurityProvider } from '@/components/EnhancedSecurityProvider';
import { TempQuizProvider } from '@/contexts/TempQuizContext';

import Index from "./pages/Index";
import ProjectCatalogPage from "./pages/ProjectCatalog";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import ImportTileContent from "./pages/ImportTileContent";
import ApplyProjectOwner from "./pages/ApplyProjectOwner";
import AcceptProjectOwnerInvite from "./pages/AcceptProjectOwnerInvite";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";

const queryClient = new QueryClient();

// Main application component with authentication and membership providers
const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <SecurityHeadersProvider>
        <GuestProvider>
          <AuthProvider>
            <MembershipProvider>
              <SecurityMaintenanceProvider>
                <TempQuizProvider>
                  <ProjectDataProvider>
                    <ProjectActionsProvider>
                      <ProjectProvider>
                    <BrowserRouter>
                      <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/auth" element={<Auth />} />
                        <Route path="/projects" element={<ProjectCatalogPage />} />
                        <Route path="/import-tile-content" element={<ImportTileContent />} />
                        <Route path="/apply-project-owner" element={<ApplyProjectOwner />} />
                        <Route path="/accept-project-owner" element={<AcceptProjectOwnerInvite />} />
                        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </BrowserRouter>
                      </ProjectProvider>
                    </ProjectActionsProvider>
                  </ProjectDataProvider>
                </TempQuizProvider>
              </SecurityMaintenanceProvider>
            </MembershipProvider>
          </AuthProvider>
        </GuestProvider>
      </SecurityHeadersProvider>
      <Toaster />
      <SonnerToaster richColors position="top-center" />
    </QueryClientProvider>
  );
};

export default App;
