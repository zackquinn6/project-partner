interface HowItWorksSectionProps {
  onOpenDemo?: () => void;
}

const steps = [
  { number: 1, title: "Choose Your Project", description: "Browse 50+ proven templates or describe your own custom project" },
  { number: 2, title: "Get Your Personalized Plan", description: "Answer 3 quick questions about your skills, tools, and timeline" },
  { number: 3, title: "Build with Confidence", description: "Follow your custom workflow with photos, videos, and expert support" }
];

export const HowItWorksSection = ({ onOpenDemo }: HowItWorksSectionProps) => {
  return (
    <section id="how-it-works" className="section-spacing bg-background">
      <div className="container mx-auto px-4">
        <p className="text-2xl md:text-3xl font-bold text-center text-foreground mb-4">
          Designed to run one great project—not a career of building
        </p>
        <div className="text-center mb-8">
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mt-2">
            In 30min or less—build a project framework that leads to success
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
          {steps.map((step, index) => (
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
