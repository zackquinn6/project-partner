import { useState, useEffect } from 'react';
import { Home, Folder, HelpCircle, Headphones } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

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
      id: 'expert',
      icon: Headphones,
      label: 'Expert Help',
      onClick: () => handleTabClick('expert'),
      isExpert: true
    },
    {
      id: 'help',
      icon: HelpCircle, 
      label: 'Help',
      onClick: () => handleTabClick('help')
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="bg-card/95 backdrop-blur-sm border-t border-border shadow-elegant">
        <div className="grid grid-cols-4 h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isExpertButton = item.isExpert;
            
            return (
              <Button
                key={item.id}
                variant="ghost"
                className={`
                  h-full rounded-none flex flex-col items-center justify-center gap-1 px-1 py-2 transition-fast
                  ${isExpertButton
                    ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-700 hover:from-emerald-100 hover:to-emerald-200 border-emerald-200'
                    : isActive 
                      ? 'text-primary bg-primary/5' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }
                `}
                onClick={item.onClick}
              >
                <Icon 
                  className={`
                    h-5 w-5 transition-fast
                    ${isExpertButton 
                      ? 'text-emerald-600' 
                      : isActive 
                        ? 'text-primary' 
                        : ''
                    }
                  `} 
                />
                <span className={`
                  text-xs font-medium leading-none transition-fast
                  ${isExpertButton 
                    ? 'text-emerald-700' 
                    : isActive 
                      ? 'text-primary' 
                      : ''
                  }
                `}>
                  {item.label}
                </span>
              </Button>
            );
          })}
        </div>
      </div>
      {/* Safe area padding for iOS */}
      <div className="h-safe-area-inset-bottom bg-card/95" />
    </div>
  );
}