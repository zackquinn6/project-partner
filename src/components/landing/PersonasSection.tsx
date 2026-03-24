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
    <section className="py-8 md:py-10 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-xl md:text-2xl font-bold text-center mb-6 md:mb-8 text-foreground">
          Who It&apos;s For
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 max-w-3xl mx-auto">
          {personas.map((persona, index) => (
            <Card
              key={index}
              className="p-2.5 sm:p-3 text-center shadow-sm hover:shadow-md transition-shadow bg-card border-border"
            >
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 ${persona.bgColor} rounded-full flex items-center justify-center mx-auto mb-2`}
              >
                {persona.useIcon && persona.icon ? (
                  <persona.icon className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
                ) : (
                  <span className="text-lg sm:text-xl leading-none" aria-hidden>
                    {persona.emoji}
                  </span>
                )}
              </div>
              <CardTitle className="text-xs sm:text-sm font-semibold mb-1 text-foreground leading-tight">
                {persona.title}
              </CardTitle>
              <CardDescription className="text-[11px] sm:text-xs text-muted-foreground leading-snug line-clamp-4">
                &ldquo;{persona.description}&rdquo;
              </CardDescription>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
