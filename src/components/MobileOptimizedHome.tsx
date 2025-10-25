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
  Clock,
  ListChecks,
  ArrowRight
} from 'lucide-react';

export function MobileOptimizedHome() {
  const { user } = useAuth();
  const { projectRuns, currentProjectRun } = useProject();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState({
    activeProjects: 0,
    completedProjects: 0
  });
  
  const [userNickname, setUserNickname] = useState<string>('');

  // Calculate stats and fetch user nickname
  useEffect(() => {
    const active = projectRuns.filter(run => (run.progress || 0) < 100).length;
    const completed = projectRuns.filter(run => (run.progress || 0) >= 100).length;
    
    setStats({
      activeProjects: active,
      completedProjects: completed
    });
  }, [projectRuns]);

  // Fetch user nickname
  useEffect(() => {
    const fetchNickname = async () => {
      if (!user) return;
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('user_id', user.id)
        .single();
      if (data?.nickname) {
        setUserNickname(data.nickname);
      }
    };
    fetchNickname();
  }, [user]);

  // Semantic color system for apps
  const quickActions = [
    {
      id: 'my-projects',
      icon: Folder,
      title: 'My Projects',
      subtitle: 'Continue or start new',
      color: 'bg-blue-600', // Projects: Blue
      action: () => {
        console.log('🔄 MobileOptimizedHome: My Projects clicked');
        window.dispatchEvent(new CustomEvent('navigate-to-projects'));
      }
    },
    {
      id: 'home-task-list',
      icon: ListChecks,
      title: 'Home Task List',
      subtitle: 'Manage tasks',
      color: 'bg-green-500', // Home: Green
      action: () => window.dispatchEvent(new CustomEvent('show-home-task-list'))
    },
    {
      id: 'home-maintenance',
      icon: HomeIcon,
      title: 'Home Maintenance',
      subtitle: 'Schedule & track',
      color: 'bg-green-600', // Home: Green
      action: () => window.dispatchEvent(new CustomEvent('show-home-maintenance'))
    },
    {
      id: 'expert-help',
      icon: HelpCircle,
      title: 'Expert Help',
      subtitle: 'Get assistance',
      color: 'bg-purple-600', // Help: Purple
      action: () => window.dispatchEvent(new CustomEvent('show-expert-help'))
    }
  ];

  const utilityApps = [
    {
      id: 'rapid-plan',
      icon: Calculator,
      title: 'Rapid Costing',
      color: 'bg-blue-500', // Projects: Blue
      action: () => {
        console.log('🎯 MobileOptimizedHome: Rapid Costing clicked');
        window.dispatchEvent(new CustomEvent('show-rapid-assessment'));
      }
    },
    {
      id: 'tool-library',
      icon: Wrench,
      title: 'My Tools',
      color: 'bg-orange-600', // Tools: Orange
      action: () => window.dispatchEvent(new CustomEvent('show-tools-library-grid'))
    },
    {
      id: 'profile',
      icon: User,
      title: 'My Profile',
      color: 'bg-slate-600', // Profile: Gray
      action: () => window.dispatchEvent(new CustomEvent('open-profile-manager'))
    },
    {
      id: 'my-homes',
      icon: MapPin,
      title: 'My Homes',
      color: 'bg-green-700', // Home: Green
      action: () => window.dispatchEvent(new CustomEvent('show-home-manager'))
    }
  ];

  // All beta/experimental features
  const betaApps = [
    {
      id: 'community',
      icon: Users,
      title: 'Community',
      description: 'Connect with other DIYers',
      action: () => window.dispatchEvent(new CustomEvent('show-community-posts'))
    },
    {
      id: 'tool-rentals',
      icon: Hammer,
      title: 'Tool Access',
      description: 'Find and rent tools nearby',
      action: () => window.dispatchEvent(new CustomEvent('show-tool-rentals'))
    },
    {
      id: 'ai-repair',
      icon: Camera,
      title: 'AI Repair',
      description: 'Diagnose issues with AI',
      action: () => window.dispatchEvent(new CustomEvent('show-ai-repair'))
    },
    {
      id: 'code-permits',
      icon: Building2,
      title: 'Code & Compliance',
      description: 'Building codes and permits',
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
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {userNickname ? `Welcome back, ${userNickname}!` : 'Welcome back!'}
            </h1>
            <p className="text-muted-foreground text-sm mb-4">
              Continue where you left off, or start something new
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

        {/* At a Glance Stats */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 text-center">At a Glance</h2>
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


        {/* Project Catalog - Reduced Prominence */}
        <div className="mb-4">
          <Button 
            onClick={() => navigate('/projects')}
            variant="outline"
            className="w-full h-10 text-sm font-medium border-primary text-primary hover:bg-primary/10"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Explore New Projects
          </Button>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Start Here</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Card 
                  key={action.id}
                  className="gradient-card cursor-pointer hover:shadow-md transition-smooth shadow-sm rounded-xl"
                  onClick={action.action}
                >
                  <CardContent className="p-4 min-h-[110px]">
                    <div className={`w-12 h-12 ${action.color} rounded-2xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-xs text-card-foreground mb-1">{action.title}</h3>
                    <p className="text-[10px] text-muted-foreground leading-tight">{action.subtitle}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* All Apps */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Browse Tools</h2>
          <div className="grid grid-cols-3 gap-2">
            {utilityApps.map((app) => {
              const Icon = app.icon;
              return (
                <Card 
                  key={app.id}
                  className="gradient-card cursor-pointer hover:shadow-md transition-smooth shadow-sm rounded-xl min-h-[100px]"
                  onClick={app.action}
                >
                  <CardContent className="p-3 text-center flex flex-col items-center justify-center h-full">
                    <div className={`w-10 h-10 ${app.color} rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <p className="text-xs font-medium text-card-foreground leading-tight">{app.title}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Labs - Experimental Features */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            🧪 Labs
            <Badge variant="secondary" className="text-[10px]">Experimental</Badge>
          </h2>
          <Card className="gradient-card shadow-sm rounded-xl">
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {betaApps.map((app, index) => {
                  const Icon = app.icon;
                  return (
                    <div 
                      key={app.id}
                      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={app.action}
                    >
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm text-card-foreground">{app.title}</h3>
                        <p className="text-xs text-muted-foreground truncate">{app.description}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}