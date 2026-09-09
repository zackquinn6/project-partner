import { useMarketingCopy } from '@/hooks/useMarketingCopy';

interface HowItWorksSectionProps {
  onOpenDemo?: () => void;
}

export const HowItWorksSection = ({ onOpenDemo }: HowItWorksSectionProps) => {
  const { howItWorks } = useMarketingCopy();

  return (
    <section id="how-it-works" className="section-spacing bg-background">
      <div className="container mx-auto px-4">
        <p className="text-2xl md:text-3xl font-bold text-center text-foreground mb-4">
          {howItWorks.headline}
        </p>
        <div className="text-center mb-8">
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mt-2">
            {howItWorks.subhead}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
          {howItWorks.steps.map((step, index) => (
            <div key={index} className="text-center py-2">
              <span className="text-sm md:text-base font-semibold text-primary">Step {step.number}</span>
              <h3 className="text-base md:text-lg font-bold mt-1 mb-1 text-foreground">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-snug">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
