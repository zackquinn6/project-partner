import { Calendar, Package, BookOpen } from 'lucide-react';

export const ValuePropSection = () => {
  return (
    <section className="py-16 md:py-24 bg-background">
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

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8">
            {/* Smart Scheduling */}
            <div className="group relative p-8 rounded-2xl border border-border bg-card hover:shadow-lg hover:shadow-accent/10 transition-all duration-300 hover:-translate-y-1">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-xl bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-xl font-bold text-foreground">
                  Smart Scheduling
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Modular project blocks + real-world time data = accurate timelines that adapt to skill level, constraints, and uncertainty.
                </p>
              </div>
            </div>

            {/* Tool & Material Tracking */}
            <div className="group relative p-8 rounded-2xl border border-border bg-card hover:shadow-lg hover:shadow-accent/10 transition-all duration-300 hover:-translate-y-1">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-xl bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Package className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-xl font-bold text-foreground">
                  Tool & Material Tracking
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Auto-generated shopping lists, inventory of owned tools, and leftover material tracking to reduce waste and boost efficiency.
                </p>
              </div>
            </div>

            {/* Structured Process Library */}
            <div className="group relative p-8 rounded-2xl border border-border bg-card hover:shadow-lg hover:shadow-accent/10 transition-all duration-300 hover:-translate-y-1">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-xl bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <BookOpen className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-xl font-bold text-foreground">
                  Structured Process Library
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Manufacturing-style process design makes DIY repeatable. Includes multi-level instructions (quick, standard, beginner), tool alternatives, quality checks, and critical focus points—all in one organized hub.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

