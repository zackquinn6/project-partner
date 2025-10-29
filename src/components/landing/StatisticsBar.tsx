export const StatisticsBar = () => {
  return (
    <section className="py-12 bg-card/50 backdrop-blur-sm border-y border-border">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 text-foreground">
            Our goal is to help get better project success
          </h2>
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
            {/* YouTube Failure Rate */}
            <div className="text-center">
              <div className="text-5xl md:text-6xl font-bold text-destructive mb-3">
                50%
              </div>
              <div className="text-sm md:text-base text-muted-foreground font-medium">
                YouTube-led failure rate
              </div>
            </div>

            {/* Arrow or separator */}
            <div className="hidden md:block text-4xl text-muted-foreground">→</div>

            {/* Project Partner Success Rate */}
            <div className="text-center">
              <div className="text-5xl md:text-6xl font-bold text-accent mb-3">
                90%+
              </div>
              <div className="text-sm md:text-base text-muted-foreground font-medium">
                Project Partner Success Rate
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
