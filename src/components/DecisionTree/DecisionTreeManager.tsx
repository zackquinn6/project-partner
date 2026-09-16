import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminWorkflowEditor } from './AdminWorkflowEditor';
import { AdminDecisionTreeVisual } from './AdminDecisionTreeVisual';
import { UserProjectCustomizer, CustomizationSelections } from './UserProjectCustomizer';
import { UserPhasesFlowchart } from './UserPhasesFlowchart';
import { Phase } from '@/interfaces/Project';
import { Settings, GitBranch, CheckSquare, Layout } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';

interface DecisionTreeManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phases: Phase[];
  onPhasesUpdate: (phases: Phase[]) => void;
  onCustomizationSave?: (selections: CustomizationSelections) => void;
}

export const DecisionTreeManager: React.FC<DecisionTreeManagerProps> = ({
  open,
  onOpenChange,
  phases,
  onPhasesUpdate,
  onCustomizationSave
}) => {
  const { isAdmin } = useUserRole();
  const [activeTab, setActiveTab] = useState(isAdmin ? 'workflow-editor' : 'customizer');
  const [customizationSelections, setCustomizationSelections] = useState<CustomizationSelections>({
    alternateChoices: {},
    ifNecessaryChoices: {}
  });

  const handleWorkflowSave = (updatedPhases: Phase[]) => {
    onPhasesUpdate(updatedPhases);
  };

  const handleCustomizationSave = (selections: CustomizationSelections) => {
    setCustomizationSelections(selections);
    if (onCustomizationSave) {
      onCustomizationSave(selections);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] h-[95vh] p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full">
          {isAdmin ? (
            <>
              {/* Admin View */}
              <TabsList className="mx-6 mt-6 w-fit">
                <TabsTrigger value="workflow-editor" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Workflow Editor
                </TabsTrigger>
                <TabsTrigger value="decision-tree" className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  Decision Tree
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="workflow-editor" className="flex-1 mt-0 overflow-hidden">
                <AdminWorkflowEditor
                  phases={phases}
                  onBack={() => onOpenChange(false)}
                  onSave={handleWorkflowSave}
                />
              </TabsContent>
              
              <TabsContent value="decision-tree" className="flex-1 mt-0 overflow-hidden">
                <AdminDecisionTreeVisual
                  phases={phases}
                  onBack={() => onOpenChange(false)}
                />
              </TabsContent>
            </>
          ) : (
            <>
              {/* User View */}
              <TabsList className="mx-6 mt-6 w-fit">
                <TabsTrigger value="customizer" className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4" />
                  Scope
                </TabsTrigger>
                <TabsTrigger value="phases-overview" className="flex items-center gap-2">
                  <Layout className="w-4 h-4" />
                  Phases Overview
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="customizer" className="flex-1 mt-0 overflow-hidden">
                <UserProjectCustomizer
                  phases={phases}
                  onBack={() => onOpenChange(false)}
                  onSave={handleCustomizationSave}
                />
              </TabsContent>
              
              <TabsContent value="phases-overview" className="flex-1 mt-0 overflow-hidden">
                <UserPhasesFlowchart
                  phases={phases}
                  onBack={() => onOpenChange(false)}
                  selectedAlternates={customizationSelections.alternateChoices}
                  selectedIfNecessary={customizationSelections.ifNecessaryChoices}
                />
              </TabsContent>
            </>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
