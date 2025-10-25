import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FolderOpen, BookOpen, User, ArrowRight, Trophy, Target, Zap, Wrench, Home, Shield, Hammer, HelpCircle, Calculator, Building2, Users, ListChecks, Camera } from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { ToolRentalsWindow } from '@/components/ToolRentalsWindow';
import { ExpertHelpWindow } from '@/components/ExpertHelpWindow';
import { RapidProjectAssessmentWindow } from '@/components/RapidProjectAssessmentWindow';
import { CodePermitsWindow } from '@/components/CodePermitsWindow';
import { ContractorFinderWindow } from '@/components/ContractorFinderWindow';
import { AIRepairWindow } from '@/components/AIRepairWindow';
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
  const [showExpertHelp, setShowExpertHelp] = useState(false);
  const [showProjectPlanning, setShowProjectPlanning] = useState(false);
  const [showCodePermits, setShowCodePermits] = useState(false);
  const [showContractorFinder, setShowContractorFinder] = useState(false);
  const [showHomeTaskList, setShowHomeTaskList] = useState(false);
  const [showAIRepair, setShowAIRepair] = useState(false);
  const [stats, setStats] = useState([{
    label: "Active Projects", 
    value: "0",
    icon: Target
  }, {
    label: "Completed",
    value: "0", 
    icon: Trophy
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

        setStats([{
          label: "Active Projects",
          value: activeProjects.toString(),
          icon: Target
        }, {
          label: "Completed",
          value: completedProjects.toString(),
          icon: Trophy
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

  // Section 1: My Work - Semantic color system
  const myWorkActions = [{
    icon: FolderOpen,
    title: "My Projects",
    action: () => {
      console.log('🔄 PostAuthLanding: My Projects button clicked - dispatching event');
      const event = new CustomEvent('navigate-to-projects');
      window.dispatchEvent(event);
      console.log('🔄 PostAuthLanding: Event dispatched');
    },
    color: "bg-blue-600", // Projects: Blue
    textColor: "text-white"
  }, {
    icon: Calculator,
    title: "Rapid Assessment",
    action: () => setShowProjectPlanning(true),
    color: "bg-blue-500", // Projects: Blue
    textColor: "text-white"
  }, {
    icon: Home,
    title: "My Home Maintenance",
    action: () => {
      console.log('🏠 PostAuthLanding: My Home Maintenance clicked - dispatching event');
      const event = new CustomEvent('show-home-maintenance');
      window.dispatchEvent(event);
    },
    color: "bg-green-600", // Home: Green
    textColor: "text-white"
  }, {
    icon: ListChecks,
    title: "Home Task List",
    action: () => setShowHomeTaskList(true),
    color: "bg-green-500", // Home: Green
    textColor: "text-white"
  }, {
    icon: Wrench,
    title: "My Tool Library",
    action: () => {
      console.log('🔧 PostAuthLanding: My Tool Library clicked - dispatching event');
      const event = new CustomEvent('show-user-tools-materials');
      window.dispatchEvent(event);
    },
    color: "bg-orange-600", // Tools: Orange
    textColor: "text-white"
  }];

  // Section 2: Explore
  const exploreActions = [{
    icon: BookOpen,
    title: "Browse Project Catalog",
    action: () => navigate('/projects'),
    color: "bg-blue-700", // Projects: Blue
    textColor: "text-white"
  }, {
    icon: HelpCircle,
    title: "Expert Help",
    action: () => setShowExpertHelp(true),
    color: "bg-purple-600", // Help: Purple
    textColor: "text-white"
  }, {
    icon: Hammer,
    title: "Tool Access",
    action: () => setShowToolRentals(true),
    color: "bg-orange-500", // Tools: Orange (Labs item)
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
    color: "bg-slate-600", // Profile: Gray
    textColor: "text-white"
  }, {
    icon: Home,
    title: "My Homes",
    action: () => {
      console.log('🏠 PostAuthLanding: My Homes clicked - dispatching event');
      const event = new CustomEvent('show-home-manager');
      window.dispatchEvent(event);
    },
    color: "bg-green-700", // Home: Green
    textColor: "text-white"
  }];
  return <div className="min-h-screen bg-background pt-16 md:pt-20 pb-8 md:pb-12">      
      <div className="container mx-auto px-2 md:px-4 max-w-6xl">
        {/* Welcome Header */}
        <div className="text-center mb-8 md:mb-12 px-4">
          <h1 className="text-3xl md:text-4xl lg:text-6xl font-bold text-foreground mb-4 md:mb-6">
            {userNickname ? `Welcome back, ${userNickname}!` : 'My Workshop'}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            Continue where you left off, or start something new
          </p>
        </div>

        {/* Quick Stats - Compact Bar */}
        <div className="bg-card rounded-lg border shadow-sm p-2 md:p-2 mb-6 md:mb-8 mx-4 md:mx-0">
          <div className="flex justify-center items-center space-x-4 md:space-x-8 overflow-x-auto">
            {stats.map((stat, index) => <div key={index} className="flex items-center space-x-1 md:space-x-2 min-w-0">
                <div className="text-base md:text-lg font-semibold text-foreground whitespace-nowrap">{stat.value}</div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">{stat.label}</div>
              </div>)}
          </div>
        </div>

        {/* My Apps - Organized by Sections */}
        <div className="mb-8 md:mb-12 px-4 md:px-0">
          <div className="max-w-5xl mx-auto space-y-8">
            
            {/* My Work Section */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4 text-center">Start Here</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6 justify-items-center">
                {myWorkActions.map((action, index) => (
                  <div key={index} className="flex flex-col items-center cursor-pointer group min-h-[88px]" onClick={action.action}>
                    <div className={`w-14 h-14 md:w-16 md:h-16 ${action.color} rounded-2xl flex items-center justify-center mb-2 group-hover:scale-105 transition-all duration-300 shadow-sm group-hover:shadow-md`}>
                      <action.icon className={`h-6 w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 ${action.textColor}`} />
                    </div>
                    <span className="text-xs text-muted-foreground text-center leading-tight w-16 sm:w-20 group-hover:text-foreground transition-colors whitespace-normal">{action.title}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Explore & Account Sections */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Explore Section */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4 text-center">Browse & Learn</h3>
                <div className="grid grid-cols-3 gap-4 sm:gap-6 justify-items-center">
                  {exploreActions.map((action, index) => (
                    <div key={index} className="flex flex-col items-center cursor-pointer group min-h-[88px]" onClick={action.action}>
                      <div className={`w-14 h-14 md:w-16 md:h-16 ${action.color} rounded-2xl flex items-center justify-center mb-2 group-hover:scale-105 transition-all duration-300 shadow-sm group-hover:shadow-md`}>
                        <action.icon className={`h-6 w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 ${action.textColor}`} />
                      </div>
                      <span className="text-xs text-muted-foreground text-center leading-tight w-16 sm:w-20 group-hover:text-foreground transition-colors whitespace-normal">{action.title}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Account Section */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4 text-center">Account</h3>
                <div className="grid grid-cols-2 gap-4 sm:gap-6 justify-items-center">
                  {accountActions.map((action, index) => (
                    <div key={index} className="flex flex-col items-center cursor-pointer group min-h-[88px]" onClick={action.action}>
                      <div className={`w-14 h-14 md:w-16 md:h-16 ${action.color} rounded-2xl flex items-center justify-center mb-2 group-hover:scale-105 transition-all duration-300 shadow-sm group-hover:shadow-md`}>
                        <action.icon className={`h-6 w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 ${action.textColor}`} />
                      </div>
                      <span className="text-xs text-muted-foreground text-center leading-tight w-16 sm:w-20 group-hover:text-foreground transition-colors whitespace-normal">{action.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Labs - Experimental Features - Collapsed by default */}
            <div>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="labs" className="border rounded-xl shadow-sm max-w-2xl mx-auto">
                  <AccordionTrigger className="px-4 sm:px-6 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-foreground">🧪 Labs</span>
                      <Badge variant="secondary" className="text-xs">4</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="divide-y divide-border">
                      <div className="flex items-center gap-3 p-3 sm:p-4 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => window.dispatchEvent(new CustomEvent('show-community-posts'))}>
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm text-card-foreground">Community</h3>
                          <p className="text-xs text-muted-foreground">Connect with other DIYers</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 sm:p-4 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setShowToolRentals(true)}>
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Hammer className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm text-card-foreground">Tool Access</h3>
                          <p className="text-xs text-muted-foreground">Find and rent tools nearby</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 sm:p-4 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setShowAIRepair(true)}>
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Camera className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm text-card-foreground">AI Repair</h3>
                          <p className="text-xs text-muted-foreground">Diagnose issues with AI</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 sm:p-4 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setShowCodePermits(true)}>
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm text-card-foreground">Code & Compliance</h3>
                          <p className="text-xs text-muted-foreground">Building codes and permits</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </div>

        {/* Motivational Footer */}
        <div className="text-center bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-6 md:p-8 mx-4 md:mx-0">
          <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3 md:mb-4">
            Ready to build something amazing?
          </h3>
        </div>
        
        <ToolRentalsWindow isOpen={showToolRentals} onClose={() => setShowToolRentals(false)} />
        
        <ExpertHelpWindow isOpen={showExpertHelp} onClose={() => setShowExpertHelp(false)} />
        
        <AIRepairWindow open={showAIRepair} onOpenChange={setShowAIRepair} />
        
        <CodePermitsWindow open={showCodePermits} onOpenChange={setShowCodePermits} />
        
        <ContractorFinderWindow open={showContractorFinder} onOpenChange={setShowContractorFinder} />
        
        <RapidProjectAssessmentWindow open={showProjectPlanning} onOpenChange={setShowProjectPlanning} />
      </div>
    </div>;
};