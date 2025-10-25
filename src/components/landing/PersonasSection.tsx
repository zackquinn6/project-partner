import { Card, CardTitle, CardDescription } from '@/components/ui/card';

export const PersonasSection = () => {
  const personas = [
    {
      emoji: "🌱",
      title: "Complete Beginners",
      description: "Never used a drill? We've got you. Start with simple projects and build confidence as you go.",
      bgColor: "bg-green-100 dark:bg-green-950"
    },
    {
      emoji: "⚡",
      title: "Weekend Warriors",
      description: "Make the most of your limited time. Get efficient plans that fit your busy schedule.",
      bgColor: "bg-blue-100 dark:bg-blue-950"
    },
    {
      emoji: "🚀",
      title: "DIY Enthusiasts",
      description: "Level up with advanced techniques. Tackle complex projects with confidence.",
      bgColor: "bg-purple-100 dark:bg-purple-950"
    }
  ];

  return (
    <section className="section-spacing bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-16 text-foreground">
          Perfect For Every DIY Journey
        </h2>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {personas.map((persona, index) => (
            <Card key={index} className="p-8 text-center hover:shadow-xl transition-all hover-lift bg-card border-border">
              <div className={`w-20 h-20 ${persona.bgColor} rounded-full flex items-center justify-center mx-auto mb-6`}>
                <span className="text-4xl">{persona.emoji}</span>
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
