import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, BookOpen, User, ArrowRight, Trophy, Target, Zap, Wrench, Home, Shield, Hammer, HelpCircle, Calculator } from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { ToolRentalsWindow } from '@/components/ToolRentalsWindow';
import { HelpPopup } from '@/components/HelpPopup';
import { SimpleProjectPlanning } from '@/components/SimpleProjectPlanning';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
export const PostAuthLanding = () => {
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const {
    isAdmin
  } = useUserRole();
  const [userNickname, setUserNickname] = useState<string>('');
  const [showToolRentals, setShowToolRentals] = useState(false);
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const [showProjectPlanning, setShowProjectPlanning] = useState(false);
  const [stats, setStats] = useState([{
    label: "Active Projects",
    value: "0",
    icon: Target
  }, {
    label: "Completed",
    value: "0",
    icon: Trophy
  }, {
    label: "Hours Saved",
    value: "0",
    icon: Zap
  }]);
  useEffect(() => {
    const handleKickoffNavigation = (event: CustomEvent) => {
      const {
        projectRunId
      } = event.detail;
      navigate('/', {
        state: {
          view: 'user',
          projectRunId: projectRunId
        }
      });
    };
    window.addEventListener('navigate-to-kickoff', handleKickoffNavigation as EventListener);
    return () => {
      window.removeEventListener('navigate-to-kickoff', handleKickoffNavigation as EventListener);
    };
  }, [navigate]);

  // Fetch user stats and profile
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      try {
        // Fetch project stats
        const {
          data: projectRuns,
          error: projectError
        } = await supabase.from('project_runs').select('status, progress').eq('user_id', user.id);
        if (projectError) throw projectError;
        const activeProjects = projectRuns?.filter(run => run.status !== 'complete' && run.progress < 100).length || 0;
        const completedProjects = projectRuns?.filter(run => run.status === 'complete' || run.progress >= 100).length || 0;
        const totalProjectsStarted = projectRuns?.length || 0;
        const hoursSaved = totalProjectsStarted * 2; // 2 hours research time saved per project

        setStats([{
          label: "Active Projects",
          value: activeProjects.toString(),
          icon: Target
        }, {
          label: "Completed",
          value: completedProjects.toString(),
          icon: Trophy
        }, {
          label: "Hours Saved",
          value: hoursSaved.toString(),
          icon: Zap
        }]);

        // Fetch user profile for nickname
        const {
          data: profile,
          error: profileError
        } = await supabase.from('profiles').select('nickname').eq('user_id', user.id).single();
        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching profile:', profileError);
        } else if (profile?.nickname) {
          setUserNickname(profile.nickname);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    fetchUserData();
  }, [user]);

  // Section 1: My Work
  const myWorkActions = [{
    icon: FolderOpen,
    title: "My Projects",
    action: () => {
      console.log('🔄 PostAuthLanding: My Projects button clicked - dispatching event');
      const event = new CustomEvent('navigate-to-projects');
      window.dispatchEvent(event);
      console.log('🔄 PostAuthLanding: Event dispatched');
    },
    color: "bg-primary",
    textColor: "text-primary-foreground"
  }, {
    icon: Calculator,
    title: "Project Planning",
    action: () => setShowProjectPlanning(true),
    color: "bg-blue-600",
    textColor: "text-white"
  }, {
    icon: Home,
    title: "My Home Maintenance",
    action: () => {
      console.log('🏠 PostAuthLanding: My Home Maintenance clicked - dispatching event');
      const event = new CustomEvent('show-home-maintenance');
      window.dispatchEvent(event);
    },
    color: "bg-green-600",
    textColor: "text-white"
  }, {
    icon: Wrench,
    title: "My Tool Library",
    action: () => {
      console.log('🔧 PostAuthLanding: My Tool Library clicked - dispatching event');
      const event = new CustomEvent('show-user-tools-materials');
      window.dispatchEvent(event);
    },
    color: "bg-primary",
    textColor: "text-primary-foreground"
  }, {
    icon: Hammer,
    title: "Tool Rentals",
    action: () => setShowToolRentals(true),
    color: "bg-orange-600",
    textColor: "text-white"
  }];

  // Section 2: Explore
  const exploreActions = [{
    icon: BookOpen,
    title: "New Project Catalog",
    action: () => navigate('/projects'),
    color: "bg-accent",
    textColor: "text-accent-foreground"
  }, {
    icon: HelpCircle,
    title: "Expert Help",
    action: () => setShowHelpPopup(true),
    color: "bg-green-600",
    textColor: "text-white"
  }];

  // Section 3: Account
  const accountActions = [{
    icon: User,
    title: "My Profile",
    action: () => {
      console.log('🔄 PostAuthLanding: My Profile button clicked - dispatching event');
      const event = new CustomEvent('open-profile-manager');
      window.dispatchEvent(event);
      console.log('🔄 PostAuthLanding: Event dispatched');
    },
    color: "bg-secondary",
    textColor: "text-secondary-foreground"
  }, {
    icon: Home,
    title: "My Homes",
    action: () => {
      console.log('🏠 PostAuthLanding: My Homes clicked - dispatching event');
      const event = new CustomEvent('show-home-manager');
      window.dispatchEvent(event);
    },
    color: "bg-secondary",
    textColor: "text-secondary-foreground"
  }];
  return <div className="min-h-screen bg-background pt-16 md:pt-20 pb-8 md:pb-12">      
      <div className="container mx-auto px-2 md:px-4 max-w-6xl">
        {/* Welcome Header */}
        <div className="text-center mb-8 md:mb-12 px-4">
          <h1 className="text-3xl md:text-4xl lg:text-6xl font-bold text-foreground mb-4 md:mb-6">
            Your DIY Homepage
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">Your DIY journey continues here.
Pick up where you left off or start your next winning project.</p>
        </div>

        {/* Quick Stats - Compact Bar */}
        <div className="bg-card rounded-lg border shadow-sm p-2 md:p-3 mb-6 md:mb-8 mx-4 md:mx-0">
          <div className="flex justify-center items-center space-x-4 md:space-x-8 overflow-x-auto">
            {stats.map((stat, index) => <div key={index} className="flex items-center space-x-1 md:space-x-2 min-w-0">
                <div className="w-5 h-5 md:w-6 md:h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <stat.icon className="h-2 w-2 md:h-3 md:w-3 text-primary-foreground" />
                </div>
                <div className="text-base md:text-lg font-semibold text-foreground whitespace-nowrap">{stat.value}</div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">{stat.label}</div>
              </div>)}
          </div>
        </div>

        {/* My Apps - App Icons Grid (3x2) */}
        <div className="mb-8 md:mb-12 px-4 md:px-0">
          <div className="max-w-lg mx-auto">
            {/* First Row - My Work */}
            <div className="grid grid-cols-5 gap-6 justify-items-center mb-8">
              {myWorkActions.map((action, index) => <div key={index} className="flex flex-col items-center cursor-pointer group" onClick={action.action}>
                  <div className={`w-14 h-14 md:w-16 md:h-16 ${action.color} rounded-2xl flex items-center justify-center mb-2 group-hover:scale-110 transition-all duration-300 shadow-sm group-hover:shadow-md`}>
                    <action.icon className={`h-7 w-7 md:h-8 md:w-8 ${action.textColor}`} />
                  </div>
                  <span className="text-xs text-muted-foreground text-center leading-tight w-20 group-hover:text-foreground transition-colors whitespace-normal">{action.title}</span>
                </div>)}
            </div>
            
            {/* Second Row - Explore & Account */}
            <div className="grid grid-cols-3 gap-8 justify-items-center">
              {[...exploreActions, ...accountActions].map((action, index) => <div key={index} className="flex flex-col items-center cursor-pointer group" onClick={action.action}>
                  <div className={`w-14 h-14 md:w-16 md:h-16 ${action.color} rounded-2xl flex items-center justify-center mb-2 group-hover:scale-110 transition-all duration-300 shadow-sm group-hover:shadow-md`}>
                    <action.icon className={`h-7 w-7 md:h-8 md:w-8 ${action.textColor}`} />
                  </div>
                  <span className="text-xs text-muted-foreground text-center leading-tight w-20 group-hover:text-foreground transition-colors whitespace-normal">{action.title}</span>
                </div>)}
            </div>
          </div>
        </div>

        {/* Motivational Footer */}
        <div className="text-center bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-6 md:p-8 mx-4 md:mx-0">
          <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3 md:mb-4">
            🔨 Time to Get Back on the Field
          </h3>
        </div>
        
        <ToolRentalsWindow isOpen={showToolRentals} onClose={() => setShowToolRentals(false)} />
        
        <HelpPopup isOpen={showHelpPopup} onClose={() => setShowHelpPopup(false)} />
        
        <Dialog open={showProjectPlanning} onOpenChange={setShowProjectPlanning}>
          <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Project Planning</DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[calc(90vh-8rem)]">
              <SimpleProjectPlanning />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>;
};