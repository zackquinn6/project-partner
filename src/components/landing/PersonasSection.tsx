import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { HardHat } from 'lucide-react';

export const PersonasSection = () => {
  const personas = [
    {
      emoji: "🌱",
      title: "Complete Beginners",
      description: "Never used a drill? We've got you. Start with simple projects and build confidence as you go.",
      bgColor: "bg-green-100 dark:bg-green-950",
      useIcon: false
    },
    {
      emoji: "⚡",
      title: "Weekend Warriors",
      description: "Make the most of your limited time. Get efficient plans that fit your busy schedule.",
      bgColor: "bg-blue-100 dark:bg-blue-950",
      useIcon: false
    },
    {
      emoji: "🚀",
      title: "DIY Enthusiasts",
      description: "Level up with advanced techniques. Tackle complex projects with confidence.",
      bgColor: "bg-purple-100 dark:bg-purple-950",
      useIcon: false
    },
    {
      emoji: "",
      title: "Contractor",
      description: "Streamline your projects with professional-grade tools and workflows designed for builders.",
      bgColor: "bg-orange-100 dark:bg-orange-950",
      useIcon: true,
      icon: HardHat
    }
  ];

  return (
    <section className="section-spacing bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-16 text-foreground">
          Personalized to You
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {personas.map((persona, index) => (
            <Card key={index} className="p-8 text-center hover:shadow-xl transition-all hover-lift bg-card border-border">
              <div className={`w-20 h-20 ${persona.bgColor} rounded-full flex items-center justify-center mx-auto mb-6`}>
                {persona.useIcon && persona.icon ? (
                  <persona.icon className="w-10 h-10 text-foreground" />
                ) : (
                  <span className="text-4xl">{persona.emoji}</span>
                )}
              </div>
              <CardTitle className="text-2xl mb-4 text-foreground">
                {persona.title}
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground leading-relaxed">
                "{persona.description}"
              </CardDescription>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
