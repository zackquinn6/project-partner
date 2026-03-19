import { Calendar, BookOpen } from 'lucide-react';

export const ValuePropSection = () => {
  return (
    <section id="value-prop" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Built for Better Project Experiences
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              Some sources show half of DIY projects don&apos;t land as planned—we think that&apos;s a problem.
            </p>
          </div>

          {/* Two-step structure: 1. Structured Projects, 2. Home management apps */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Step 1: Structured Projects */}
            <div className="group relative p-8 rounded-2xl border border-border bg-card hover:shadow-lg hover:shadow-accent/10 transition-all duration-300 hover:-translate-y-1">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-xl bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <BookOpen className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-xl font-bold text-foreground">
                  Structured Projects
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Manufacturing-style process design makes DIY repeatable. Multi-level instructions, tool alternatives, quality checks, and critical focus points—all in one organized hub.
                </p>
              </div>
            </div>

            {/* Step 2: Home Management Apps */}
            <div className="group relative p-8 rounded-2xl border border-border bg-card hover:shadow-lg hover:shadow-accent/10 transition-all duration-300 hover:-translate-y-1">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-xl bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-xl font-bold text-foreground">
                  Home Management Apps
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Home Maintenance, Tool Tracking, and Task & Project Tracking, and others so you stay on top of ongoing work.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

