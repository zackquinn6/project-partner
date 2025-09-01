import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FolderOpen, 
  BookOpen, 
  User, 
  ArrowRight,
  Trophy,
  Target,
  Zap,
  Wrench,
  Home
} from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const PostAuthLanding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userNickname, setUserNickname] = useState<string>('');
  const [stats, setStats] = useState([
    { label: "Active Projects", value: "0", icon: Target },
    { label: "Completed", value: "0", icon: Trophy }, 
    { label: "Hours Saved", value: "0", icon: Zap }
  ]);

  useEffect(() => {
    const handleKickoffNavigation = (event: CustomEvent) => {
      const { projectRunId } = event.detail;
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
        const { data: projectRuns, error: projectError } = await supabase
          .from('project_runs')
          .select('status, progress')
          .eq('user_id', user.id);

        if (projectError) throw projectError;

        const activeProjects = projectRuns?.filter(run => 
          run.status !== 'complete' && run.progress < 100
        ).length || 0;

        const completedProjects = projectRuns?.filter(run => 
          run.status === 'complete' || run.progress >= 100
        ).length || 0;

        const totalProjectsStarted = projectRuns?.length || 0;
        const hoursSaved = totalProjectsStarted * 2; // 2 hours research time saved per project

        setStats([
          { label: "Active Projects", value: activeProjects.toString(), icon: Target },
          { label: "Completed", value: completedProjects.toString(), icon: Trophy }, 
          { label: "Hours Saved", value: hoursSaved.toString(), icon: Zap }
        ]);

        // Fetch user profile for nickname
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('user_id', user.id)
          .single();

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
  const myWorkActions = [
    {
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
    },
    {
      icon: Wrench,
      title: "My Tool Library",
      action: () => {
        console.log('🔧 PostAuthLanding: My Tool Library clicked - dispatching event');
        const event = new CustomEvent('show-tools-materials');
        window.dispatchEvent(event);
      },
      color: "bg-primary",
      textColor: "text-primary-foreground"
    }
  ];

  // Section 2: Explore
  const exploreActions = [
    {
      icon: BookOpen,
      title: "Project Catalog", 
      action: () => navigate('/projects'),
      color: "bg-accent",
      textColor: "text-accent-foreground"
    }
  ];

  // Section 3: Account
  const accountActions = [
    {
      icon: User,
      title: "My Profile",
      action: () => {
        console.log('🔄 PostAuthLanding: My Profile button clicked - dispatching event');
        const event = new CustomEvent('show-profile');
        window.dispatchEvent(event);
        console.log('🔄 PostAuthLanding: Event dispatched');
      },
      color: "bg-secondary",
      textColor: "text-secondary-foreground"
    },
    {
      icon: Home,
      title: "My Homes",
      action: () => {
        console.log('🏠 PostAuthLanding: My Homes clicked - dispatching event');
        const event = new CustomEvent('show-home-manager');
        window.dispatchEvent(event);
      },
      color: "bg-secondary",
      textColor: "text-secondary-foreground"
    }
  ];


  return (
    <div className="min-h-screen bg-background pt-16 md:pt-20 pb-8 md:pb-12">
      <div className="container mx-auto px-2 md:px-4 max-w-6xl">
        {/* Welcome Header */}
        <div className="text-center mb-8 md:mb-12 px-4">
          <Badge variant="outline" className="mb-3 md:mb-4 text-primary border-primary text-xs md:text-sm">
            🏆 Welcome Back{userNickname ? `, ${userNickname}` : ', Champion'}!
          </Badge>
          <h1 className="text-3xl md:text-4xl lg:text-6xl font-bold text-foreground mb-4 md:mb-6">
            Ready to Build Something Great?
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            Your DIY journey continues here. Pick up where you left off or start your next winning project.
          </p>
        </div>

        {/* Quick Stats - Compact Bar */}
        <div className="bg-card rounded-lg border shadow-sm p-2 md:p-3 mb-6 md:mb-8 mx-4 md:mx-0">
          <div className="flex justify-center items-center space-x-4 md:space-x-8 overflow-x-auto">
            {stats.map((stat, index) => (
              <div key={index} className="flex items-center space-x-1 md:space-x-2 min-w-0">
                <div className="w-5 h-5 md:w-6 md:h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <stat.icon className="h-2 w-2 md:h-3 md:w-3 text-primary-foreground" />
                </div>
                <div className="text-base md:text-lg font-semibold text-foreground whitespace-nowrap">{stat.value}</div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions - Single Row */}
        <div className="mb-8 md:mb-12 px-4 md:px-0">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
            {[...myWorkActions, ...exploreActions, ...accountActions].map((action, index) => (
              <Card 
                key={index} 
                className="gradient-card border-0 shadow-card hover:shadow-elegant transition-all duration-300 cursor-pointer group"
                onClick={action.action}
              >
                <CardHeader className="text-center pb-2 px-2 pt-4">
                  <div className={`w-6 h-6 ${action.color} rounded-full flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform`}>
                    <action.icon className={`h-4 w-4 ${action.textColor}`} />
                  </div>
                  <CardTitle className="text-sm group-hover:text-primary transition-colors leading-tight">{action.title}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        {/* Motivational Footer */}
        <div className="text-center bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-6 md:p-8 mx-4 md:mx-0">
          <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3 md:mb-4">
            🔨 Time to Get Back on the Field
          </h3>
          <p className="text-base md:text-lg text-muted-foreground italic">
            "Every expert was once a beginner. Every pro was once an amateur. Every legend was once a learner."
          </p>
        </div>
      </div>
    </div>
  );
};