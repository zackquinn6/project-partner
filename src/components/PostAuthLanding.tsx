import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
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
  Zap
} from 'lucide-react';

export const PostAuthLanding = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleProjectsNavigation = () => {
      // Navigate to user view in listing mode, same as "My Projects" button in Navigation
      navigate('/', { 
        state: { view: 'user', forceListingMode: true } 
      });
    };

    const handleKickoffNavigation = (event: CustomEvent) => {
      const { projectRunId } = event.detail;
      navigate('/', {
        state: {
          view: 'user',
          projectRunId: projectRunId
        }
      });
    };

    window.addEventListener('navigate-to-projects', handleProjectsNavigation);
    window.addEventListener('navigate-to-kickoff', handleKickoffNavigation as EventListener);
    
    return () => {
      window.removeEventListener('navigate-to-projects', handleProjectsNavigation);
      window.removeEventListener('navigate-to-kickoff', handleKickoffNavigation as EventListener);
    };
  }, [navigate]);

  const quickActions = [
    {
      icon: FolderOpen,
      title: "My Projects",
      description: "Continue working on your active projects and track progress",
      action: () => window.dispatchEvent(new CustomEvent('navigate-to-projects')),
      color: "bg-primary",
      textColor: "text-primary-foreground"
    },
    {
      icon: BookOpen,
      title: "Project Catalog", 
      description: "Browse and start new DIY projects from our library",
      action: () => navigate('/projects'),
      color: "bg-accent",
      textColor: "text-accent-foreground"
    },
    {
      icon: User,
      title: "My Profile",
      description: "Manage your account settings and DIY preferences",
      action: () => console.log('Profile clicked'), // TODO: Implement profile navigation
      color: "bg-secondary",
      textColor: "text-secondary-foreground"
    }
  ];

  const stats = [
    { label: "Active Projects", value: "2", icon: Target },
    { label: "Completed", value: "5", icon: Trophy }, 
    { label: "Hours Saved", value: "24", icon: Zap }
  ];

  return (
    <div className="min-h-screen bg-background pt-20 pb-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Welcome Header */}
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4 text-primary border-primary">
            🏆 Welcome Back, Champion!
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Ready to Build Something Great?
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Your DIY journey continues here. Pick up where you left off or start your next winning project.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {stats.map((stat, index) => (
            <Card key={index} className="text-center border-0 shadow-card hover:shadow-elegant transition-all duration-300">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-3">
                  <stat.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <div className="text-3xl font-bold text-foreground mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {quickActions.map((action, index) => (
            <Card 
              key={index} 
              className="gradient-card border-0 shadow-card hover:shadow-elegant transition-all duration-300 cursor-pointer group"
              onClick={action.action}
            >
              <CardHeader className="text-center pb-4">
                <div className={`w-16 h-16 ${action.color} rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                  <action.icon className={`h-8 w-8 ${action.textColor}`} />
                </div>
                <CardTitle className="text-xl group-hover:text-primary transition-colors">{action.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-base leading-relaxed mb-4">
                  {action.description}
                </CardDescription>
                <Button variant="ghost" size="sm" className="group-hover:bg-accent group-hover:text-accent-foreground">
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Motivational Footer */}
        <div className="text-center bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-8">
          <h3 className="text-2xl font-bold text-foreground mb-4">
            🔨 Time to Get Back on the Field
          </h3>
          <p className="text-lg text-muted-foreground italic">
            "Every expert was once a beginner. Every pro was once an amateur. Every legend was once a learner."
          </p>
        </div>
      </div>
    </div>
  );
};