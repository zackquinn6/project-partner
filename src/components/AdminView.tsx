import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProjectCatalog from './ProjectCatalog';
import ProjectAnalytics from './ProjectAnalytics';
import ProjectRunsView from './ProjectRunsView';
import { Settings, BarChart3, FolderOpen, Calendar } from 'lucide-react';

const AdminView: React.FC = () => {
  console.log('AdminView component loaded successfully');
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Admin Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="projects" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="projects" className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Projects
              </TabsTrigger>
              <TabsTrigger value="runs" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Project Runs
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="projects" className="space-y-4">
              <ProjectCatalog />
            </TabsContent>
            
            <TabsContent value="runs" className="space-y-4">
              <ProjectRunsView />
            </TabsContent>
            
            <TabsContent value="analytics" className="space-y-4">
              <ProjectAnalytics />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminView;