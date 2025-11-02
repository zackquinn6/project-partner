import { useState, useEffect } from 'react';
import { Home, Folder, HelpCircle, CheckSquare, MessageCircle, TrendingUp, BookOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FeedbackDialog } from './FeedbackDialog';
import { FeatureRoadmapWindow } from './FeatureRoadmapWindow';
import { AppDocumentationWindow } from './AppDocumentationWindow';

interface MobileBottomNavProps {
  currentView: string;
  onViewChange: (view: 'home' | 'projects' | 'profile' | 'help' | 'expert') => void;
  onQuickAction?: () => void;
}

export function MobileBottomNav({ currentView, onViewChange, onQuickAction }: MobileBottomNavProps) {
  const { user } = useAuth();
  const { currentProjectRun } = useProject();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState(currentView);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);
  const [isDocumentationOpen, setIsDocumentationOpen] = useState(false);

  useEffect(() => {
    setActiveTab(currentView);
  }, [currentView]);

  if (!isMobile || !user) return null;

  const handleTabClick = (tab: 'home' | 'projects' | 'profile' | 'help' | 'expert') => {
    setActiveTab(tab);
    onViewChange(tab);
  };

  const navItems = [
    {
      id: 'home',
      icon: Home,
      label: 'Home',
      onClick: () => handleTabClick('home')
    },
    {
      id: 'projects',
      icon: Folder,
      label: 'Projects',
      onClick: () => handleTabClick('projects')
    },
    {
      id: 'tasks',
      icon: CheckSquare,
      label: 'Tasks',
      onClick: () => {
        // TODO: Implement task manager functionality
        console.log('Task Manager clicked');
      }
    }
  ];

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="bg-card/95 backdrop-blur-sm border-t border-border shadow-elegant">
          <div className="grid grid-cols-4 h-16">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  className={`
                    h-full rounded-none flex flex-col items-center justify-center gap-1 px-1 py-2 transition-fast
                    ${isActive 
                      ? 'text-primary bg-primary/5' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }
                  `}
                  onClick={item.onClick}
                >
                  <Icon className={`h-5 w-5 transition-fast ${isActive ? 'text-primary' : ''}`} />
                  <span className={`text-xs font-medium leading-none transition-fast ${isActive ? 'text-primary' : ''}`}>
                    {item.label}
                  </span>
                </Button>
              );
            })}
            
            {/* Help Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-full rounded-none flex flex-col items-center justify-center gap-1 px-1 py-2 transition-fast text-muted-foreground hover:text-foreground hover:bg-muted/50"
                >
                  <HelpCircle className="h-5 w-5 transition-fast" />
                  <span className="text-xs font-medium leading-none transition-fast">Help</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                side="top"
                className="z-[9999] !bg-white dark:!bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl min-w-[200px] !opacity-100 mb-2"
              >
                <DropdownMenuItem onClick={() => setShowFeedback(true)}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Send Feedback
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsRoadmapOpen(true)}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  App Roadmap
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsDocumentationOpen(true)}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Documentation
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {/* Safe area padding for iOS */}
        <div className="h-safe-area-inset-bottom bg-card/95" />
      </div>

      {/* Dialogs */}
      <FeedbackDialog open={showFeedback} onOpenChange={setShowFeedback} />
      <FeatureRoadmapWindow open={isRoadmapOpen} onOpenChange={setIsRoadmapOpen} />
      <AppDocumentationWindow open={isDocumentationOpen} onOpenChange={setIsDocumentationOpen} />
    </>
  );
}