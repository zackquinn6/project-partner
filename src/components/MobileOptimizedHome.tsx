import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { 
  Home as HomeIcon, 
  Folder, 
  User, 
  Users,
  Wrench, 
  BookOpen, 
  Calculator, 
  HelpCircle, 
  MapPin,
  Camera,
  Building2,
  Hammer,
  Play,
  TrendingUp,
  CheckCircle,
  Clock
} from 'lucide-react';

export function MobileOptimizedHome() {
  const { user } = useAuth();
  const { projectRuns, currentProjectRun } = useProject();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState({
    activeProjects: 0,
    completedProjects: 0
  });

  // Calculate stats
  useEffect(() => {
    const active = projectRuns.filter(run => (run.progress || 0) < 100).length;
    const completed = projectRuns.filter(run => (run.progress || 0) >= 100).length;
    
    setStats({
      activeProjects: active,
      completedProjects: completed
    });
  }, [projectRuns]);

  const quickActions = [
    {
      id: 'my-projects',
      icon: Folder,
      title: 'My Projects',
      subtitle: 'Continue or start new',
      color: 'bg-blue-600',
      action: () => {
        console.log('🔄 MobileOptimizedHome: My Projects clicked');
        window.dispatchEvent(new CustomEvent('navigate-to-projects'));
      }
    },
    {
      id: 'home-maintenance',
      icon: HomeIcon,
      title: 'Home Maintenance',
      subtitle: 'Schedule & track',
      color: 'bg-purple-600',
      action: () => window.dispatchEvent(new CustomEvent('show-home-maintenance'))
    },
    {
      id: 'expert-help',
      icon: HelpCircle,
      title: 'Expert Help',
      subtitle: 'Get assistance',
      color: 'bg-emerald-600',
      action: () => window.dispatchEvent(new CustomEvent('show-help-popup'))
    }
  ];

  const utilityApps = [
    {
      id: 'project-catalog',
      icon: BookOpen,
      title: 'Project Catalog',
      color: 'bg-cyan-600',
      action: () => navigate('/projects')
    },
    {
      id: 'rapid-plan',
      icon: Calculator,
      title: 'Rapid Plan',
      color: 'bg-green-600',
      action: () => {
        console.log('🎯 MobileOptimizedHome: Rapid Plan clicked');
        window.dispatchEvent(new CustomEvent('show-rapid-assessment'));
      }
    },
    {
      id: 'tool-rentals',
      icon: Hammer,
      title: 'Tool Access',
      color: 'bg-indigo-600',
      action: () => window.dispatchEvent(new CustomEvent('show-tool-rentals'))
    },
    {
      id: 'tool-library',
      icon: Wrench,
      title: 'My Tools',
      color: 'bg-orange-600',
      action: () => window.dispatchEvent(new CustomEvent('show-user-tools-materials'))
    },
    {
      id: 'profile',
      icon: User,
      title: 'My Profile',
      color: 'bg-violet-600',
      action: () => window.dispatchEvent(new CustomEvent('open-profile-manager'))
    },
    {
      id: 'my-homes',
      icon: MapPin,
      title: 'My Homes',
      color: 'bg-slate-600',
      action: () => window.dispatchEvent(new CustomEvent('show-home-manager'))
    }
  ];

  const betaApps = [
    {
      id: 'community',
      icon: Users,
      title: 'Community',
      color: 'bg-pink-600',
      action: () => window.dispatchEvent(new CustomEvent('show-community-posts'))
    },
    {
      id: 'contractor-finder',
      icon: Users,
      title: 'Contractor Finder',
      color: 'bg-indigo-600',
      action: () => window.dispatchEvent(new CustomEvent('show-contractor-finder'))
    },
    {
      id: 'ai-repair',
      icon: Camera,
      title: 'AI Repair',
      color: 'bg-red-600',
      action: () => window.dispatchEvent(new CustomEvent('show-ai-repair'))
    },
    {
      id: 'code-permits',
      icon: Building2,
      title: 'Code & Permits',
      color: 'bg-amber-600',
      action: () => {} // Add action when ready
    }
  ];

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20 mobile-scroll">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <img 
                src="/lovable-uploads/1a837ddc-50ca-40f7-b975-0ad92fdf9882.png" 
                alt="Project Partner Logo" 
                className="h-8 w-auto"
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.dispatchEvent(new CustomEvent('open-profile-manager'))}
              className="p-2 touch-target"
            >
              <User className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">Welcome Back!</h1>
            <p className="text-muted-foreground text-sm mb-4">
              Ready to tackle your next project?
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6 mobile-scroll">
        {/* Current Project (if any) */}
        {currentProjectRun && (
          <Card className="gradient-card border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Badge className="bg-primary/10 text-primary">Active Project</Badge>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    navigate('/', {
                      replace: true,
                      state: { view: 'user', projectRunId: currentProjectRun.id }
                    });
                  }}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Continue
                </Button>
              </div>
              <h3 className="font-semibold text-card-foreground mb-2">{currentProjectRun.name}</h3>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{Math.round(currentProjectRun.progress || 0)}% complete</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  In progress
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Project Scoreboard */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 text-center">Project Scoreboard</h2>
          <div className="grid grid-cols-2 gap-3">
            <Card className="gradient-card">
              <CardContent className="p-2 text-center">
                <p className="text-lg font-bold text-card-foreground">{stats.activeProjects}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </CardContent>
            </Card>
            
            <Card className="gradient-card">
              <CardContent className="p-2 text-center">
                <p className="text-lg font-bold text-card-foreground">{stats.completedProjects}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Key Characteristics Section */}
        <div className="bg-gradient-subtle p-4 rounded-lg">
          <h2 className="text-lg font-semibold text-foreground mb-2">🔑 Key Characteristics</h2>
          <p className="text-sm text-muted-foreground mb-3">
            KCs are the way that engineered processes are personalized to each builder. Get the right level of detail for your skill level.
          </p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.dispatchEvent(new CustomEvent('show-kc-explainer'))}
            className="text-primary border-primary hover:bg-primary/10 text-xs px-3 py-1 h-7"
          >
            Learn More
          </Button>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Quick Actions</h2>
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Card 
                  key={action.id}
                  className="gradient-card cursor-pointer hover:shadow-card transition-smooth touch-target"
                  onClick={action.action}
                >
                  <CardContent className="p-4">
                    <div className={`w-10 h-10 ${action.color} rounded-xl flex items-center justify-center mb-3`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-sm text-card-foreground mb-1">{action.title}</h3>
                    <p className="text-xs text-muted-foreground">{action.subtitle}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* All Apps */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">All Apps</h2>
          <div className="grid grid-cols-3 gap-2">
            {utilityApps.map((app) => {
              const Icon = app.icon;
              return (
                <Card 
                  key={app.id}
                  className="gradient-card cursor-pointer hover:shadow-card transition-smooth touch-target"
                  onClick={app.action}
                >
                  <CardContent className="p-3 text-center">
                    <div className={`w-8 h-8 ${app.color} rounded-lg flex items-center justify-center mx-auto mb-2`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <p className="text-xs font-medium text-card-foreground leading-tight">{app.title}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Beta Apps */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            Beta Features
            <Badge className="bg-orange-100 text-orange-700 text-xs">NEW</Badge>
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {betaApps.map((app) => {
              const Icon = app.icon;
              return (
                <Card 
                  key={app.id}
                  className="gradient-card cursor-pointer hover:shadow-card transition-smooth touch-target relative"
                  onClick={app.action}
                >
                  <CardContent className="p-4">
                    <Badge className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      BETA
                    </Badge>
                    <div className={`w-10 h-10 ${app.color} rounded-xl flex items-center justify-center mb-3`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-sm text-card-foreground">{app.title}</h3>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}