import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Users, ArrowRight, CheckCircle, GitBranch, Target } from "lucide-react";
import heroImage from "@/assets/hero-workflow.jpg";

interface HomeProps {
  onViewChange: (view: 'admin' | 'user') => void;
}

export default function Home({ onViewChange }: HomeProps) {
  const features = [
    {
      icon: GitBranch,
      title: "Three-Level Organization",
      description: "Organize workflows with Phases, Operations, and Steps for maximum clarity."
    },
    {
      icon: Target,
      title: "Step-by-Step Guidance",
      description: "Guide users through processes with multimedia content and clear instructions."
    },
    {
      icon: CheckCircle,
      title: "Progress Tracking",
      description: "Track completion and maintain accountability across all workflow stages."
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-6 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                  Streamline Your{" "}
                  <span className="bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
                    Workflows
                  </span>
                </h1>
                <p className="text-xl text-muted-foreground max-w-lg">
                  Create, manage, and execute step-by-step processes with multimedia guidance. 
                  Perfect for teams that need structured workflow management.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={() => onViewChange('admin')}
                  size="lg" 
                  className="gradient-primary text-white shadow-elegant hover:shadow-lg transition-smooth"
                >
                  <Settings className="w-5 h-5 mr-2" />
                  Create Workflows
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button 
                  onClick={() => onViewChange('user')}
                  variant="outline" 
                  size="lg"
                  className="transition-smooth border-primary/20 hover:border-primary"
                >
                  <Users className="w-5 h-5 mr-2" />
                  Follow Process
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <img 
                src={heroImage} 
                alt="Workflow Management Visualization" 
                className="w-full h-auto rounded-2xl shadow-card transition-smooth hover:shadow-elegant"
              />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-primary/10 to-transparent"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-card/30">
        <div className="container mx-auto px-6">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold">
              Everything You Need for{" "}
              <span className="text-primary">Workflow Management</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to make process management intuitive and efficient.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="gradient-card border-0 shadow-card hover:shadow-elegant transition-smooth">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 gradient-primary rounded-xl flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <Card className="gradient-primary border-0 text-white text-center shadow-elegant">
            <CardContent className="py-16">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Ready to Transform Your Processes?
              </h2>
              <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
                Start creating structured workflows today and watch your team's productivity soar.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  onClick={() => onViewChange('admin')}
                  variant="secondary"
                  size="lg"
                  className="bg-white text-primary hover:bg-white/90 transition-smooth"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}