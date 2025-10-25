export interface Testimonial {
  name: string;
  project: string;
  quote: string;
  avatar?: string;
  initials: string;
}

export const testimonials: Testimonial[] = [
  {
    name: "Sarah M.",
    project: "Tile Backsplash",
    quote: "The step-by-step guidance made me feel like a pro! I finished in one weekend instead of three.",
    initials: "SM"
  },
  {
    name: "Mike R.",
    project: "Deck Building",
    quote: "Finally, a tool that adapts to MY schedule and MY skill level. No more guessing!",
    initials: "MR"
  },
  {
    name: "Jessica L.",
    project: "Interior Painting",
    quote: "Saved me over $2,000 in contractor fees. The material calculator alone paid for itself.",
    initials: "JL"
  },
  {
    name: "David K.",
    project: "LVP Flooring",
    quote: "I was terrified to start, but the beginner-friendly workflow gave me the confidence I needed.",
    initials: "DK"
  },
  {
    name: "Amanda T.",
    project: "Kitchen Remodel",
    quote: "Having everything organized in one place saved me countless hours. Worth every penny!",
    initials: "AT"
  }
];
