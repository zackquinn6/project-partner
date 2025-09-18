import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProjectProvider } from '@/contexts/ProjectContext';
import { ProjectDataProvider } from '@/contexts/ProjectDataContext';
import { ProjectActionsProvider } from '@/contexts/ProjectActionsContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { SecurityMaintenanceProvider } from '@/components/SecurityMaintenanceProvider';
import { SecurityHeadersProvider } from '@/components/SecurityHeadersProvider';
import { TempQuizProvider } from '@/contexts/TempQuizContext';
import Index from "./pages/Index";
import ProjectCatalogPage from "./pages/ProjectCatalog";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <SecurityHeadersProvider>
        <AuthProvider>
          <SecurityMaintenanceProvider>
            <TempQuizProvider>
              <ProjectDataProvider>
                <ProjectActionsProvider>
                  <ProjectProvider>
                  <Toaster />
                  <Sonner />
                  <BrowserRouter>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/projects" element={<ProjectCatalogPage />} />
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </BrowserRouter>
                  </ProjectProvider>
                </ProjectActionsProvider>
              </ProjectDataProvider>
            </TempQuizProvider>
          </SecurityMaintenanceProvider>
        </AuthProvider>
      </SecurityHeadersProvider>
    </QueryClientProvider>
  );
};

export default App;
