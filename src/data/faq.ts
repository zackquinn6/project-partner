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
      'You can start free with no credit card required. Upgrade, downgrade, or cancel anytime. No contracts.',
  },
  {
    question: 'What happens after the project is done?',
    answer:
      'Your completed projects stay available for reference and maintenance reminders. When you start the next one, you already have the history and home context to build on.',
  },
];
