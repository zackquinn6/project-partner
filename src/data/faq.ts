export interface FAQItem {
  question: string;
  answer: string;
}

export const faqItems: FAQItem[] = [
  {
    question: 'How is this different from YouTube?',
    answer:
      'YouTube tutorials show you how something is done. Project Partner is a DIY planning, execution, and management app that helps you actually run the project. You get a plan built around your skill level, tools, and timeline, plus checkpoints and a recovery path when something goes wrong — not just comment threads hoping someone replies.',
  },
  {
    question: 'What is Project Partner?',
    answer:
      'Project Partner is a DIY planning, execution, and management app for home improvement. You choose a project, get a structured plan that fits your situation, work through it step by step, and keep maintenance and records after you finish.',
  },
  {
    question: 'What if I get stuck mid-project?',
    answer:
      'Use Something Wrong? on any step to triage the issue and apply a recovery plan (rework, shopping top-up, or schedule slip). AI help scoped to your project family responds in seconds (with a low usage cap). Live video with a pro is a premium escalate on the Projects plan.',
  },
  {
    question: 'Do I need experience or all the right tools?',
    answer:
      'No. Plans work for beginners and experienced DIYers. If you are missing a tool, the workflow suggests alternatives based on what you already have, so you can start from where you are.',
  },
  {
    question: 'How does pricing work?',
    answer:
      'We offer three tiers, billed annually because home projects and maintenance run on longer cycles than a monthly subscription. Free covers home maintenance and task management—the cleanest, most focused home-improvement toolkit on the market (no credit card required). Risk Radar focuses on mitigating project risk when you get instructions and planning elsewhere—a huge benefit, though it does not include schedule planning. Projects is our Project Partner flagship: full workflow execution so you can plan, schedule, and run the job end to end. Upgrade or cancel anytime.',
  },
  {
    question: 'What happens after the project is done?',
    answer:
      'Your completed projects stay available for reference and maintenance reminders. When you start the next one, you already have the history and home context to build on.',
  },
];
