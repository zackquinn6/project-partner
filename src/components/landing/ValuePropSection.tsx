import { Calendar, BookOpen } from 'lucide-react';

export const ValuePropSection = () => {
  return (
    <section id="value-prop" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Modular project management built for home improvement
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              A tool to get maximum efficiency from home improvement projects.
            </p>
          </div>

          {/* Two-step structure: 1. Structured process library, 2. Home management apps */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Step 1: Structured Process Library */}
            <div className="group relative p-8 rounded-2xl border border-border bg-card hover:shadow-lg hover:shadow-accent/10 transition-all duration-300 hover:-translate-y-1">
              <div className="flex flex-col items-center text-center space-y-4">
                <span className="text-sm font-semibold text-primary">Step 1</span>
                <div className="w-16 h-16 rounded-xl bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <BookOpen className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-xl font-bold text-foreground">
                  Structured Process Library
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Manufacturing-style process design makes DIY repeatable. Multi-level instructions, tool alternatives, quality checks, and critical focus points—all in one organized hub.
                </p>
              </div>
            </div>

            {/* Step 2: Home Management Apps */}
            <div className="group relative p-8 rounded-2xl border border-border bg-card hover:shadow-lg hover:shadow-accent/10 transition-all duration-300 hover:-translate-y-1">
              <div className="flex flex-col items-center text-center space-y-4">
                <span className="text-sm font-semibold text-primary">Step 2</span>
                <div className="w-16 h-16 rounded-xl bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-xl font-bold text-foreground">
                  Home Management Apps
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  Home Maintenance, Maintenance tracking, Tool Tracking, and Task & Project Tracking—so you stay on top of ongoing work and link it to your projects.
                </p>
                <ul className="text-sm text-muted-foreground text-left space-y-1 w-full max-w-xs mx-auto">
                  <li>• Home Maintenance</li>
                  <li>• Maintenance</li>
                  <li>• Tool Tracking</li>
                  <li>• Task & Project Tracking</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

