export const StatisticsBar = () => {
  const stats = [
    { value: "10,000+", label: "Projects Completed" },
    { value: "500+", label: "5-Star Reviews" },
    { value: "15hrs", label: "Average Time Saved", highlight: true },
    { value: "94%", label: "Success Rate" }
  ];

  return (
    <section className="py-8 bg-card/50 backdrop-blur-sm border-y border-border">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className={`text-3xl md:text-4xl font-bold mb-2 ${stat.highlight ? 'text-accent' : 'text-primary'}`}>
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
