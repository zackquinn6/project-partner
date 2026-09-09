import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { HardHat } from 'lucide-react';
import { useMarketingCopy } from '@/hooks/useMarketingCopy';

export const PersonasSection = () => {
  const { personas } = useMarketingCopy();

  return (
    <section className="py-8 md:py-10 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-xl md:text-2xl font-bold text-center mb-6 md:mb-8 text-foreground">
          {personas.sectionTitle}
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 max-w-3xl mx-auto">
          {personas.items.map((persona, index) => (
            <Card
              key={index}
              className="p-2.5 sm:p-3 text-center shadow-sm hover:shadow-md transition-shadow bg-card border-border"
            >
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 ${persona.bgColor} rounded-full flex items-center justify-center mx-auto mb-2`}
              >
                {persona.useIcon ? (
                  <HardHat className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
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
