import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Users, ArrowRight, CheckCircle, Route, Target, TrendingUp } from "lucide-react";
import generalDiyImage from "@/assets/general-diy.png";

interface HomeProps {
  onViewChange: (view: 'admin' | 'user') => void;
}

export default function Home({ onViewChange }: HomeProps) {
  const features = [
    {
      icon: Shield,
      title: "Build with Confidence",
      description: "Never wonder if you're doing it right. Our proven processes ensure professional-quality results every time."
    },
    {
      icon: Route,
      title: "Clear Step-by-Step Guidance",
      description: "Follow our detailed guides with videos, photos, and pro tips that make complex projects manageable."
    },
    {
      icon: TrendingUp,
      title: "Track Your Progress",
      description: "Stay motivated and on track with built-in progress tracking and quality checkpoints."
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
                  Confidently Get the{" "}
                  <span className="bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
                    Results You Want
                  </span>
                </h1>
                <h2 className="text-2xl lg:text-3xl font-semibold text-muted-foreground mb-4">
                  Your Personal Project Partner for Home Improvement Success
                </h2>
                <p className="text-xl text-muted-foreground max-w-2xl">
                  Get guided step-by-step processes, digital tools, equipment lists, videos, easy-to-follow guides, 
                  critical focus zones, quality checkpoints, and access to professional one-on-one video calls.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={() => onViewChange('user')}
                  size="lg" 
                  className="gradient-primary text-white shadow-elegant hover:shadow-lg transition-smooth"
                >
                  <Target className="w-5 h-5 mr-2" />
                  Start My Project
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button 
                  onClick={() => onViewChange('user')}
                  variant="outline" 
                  size="lg"
                  className="transition-smooth border-primary/20 hover:border-primary"
                >
                  Browse Projects
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <img 
                src={generalDiyImage} 
                alt="General DIY" 
                className="w-full h-auto rounded-2xl shadow-card transition-smooth hover:shadow-elegant"
              />
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
              <span className="text-primary">Home Improvement Success</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Professional guidance and tools that give you confidence to tackle any home project.
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
                Ready to Tackle Your Next Home Project?
              </h2>
              <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
                Join thousands of homeowners who've successfully completed their projects with confidence using Project Partner's guided approach.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  onClick={() => onViewChange('user')}
                  variant="secondary"
                  size="lg"
                  className="bg-white text-primary hover:bg-white/90 transition-smooth"
                >
                  Start My First Project
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