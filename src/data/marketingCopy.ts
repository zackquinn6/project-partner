import type { FAQItem } from '@/data/faq';
import { faqItems as generalFaq } from '@/data/faq';

export type MarketingMode = 'general' | 'tile';

export interface MarketingPersona {
  emoji: string;
  title: string;
  description: string;
  bgColor: string;
  useIcon: boolean;
}

export interface MarketingHowItWorksStep {
  number: number;
  title: string;
  description: string;
}

export interface MarketingCopy {
  documentTitle: string;
  metaDescription: string;
  hero: {
    headlineLine1: string;
    headlineLine2: string;
    subhead: string;
    ctaPrimary: string;
    ctaSecondary: string;
  };
  simplifiedHero: {
    headlineLines: [string, string, string];
    subhead: string;
    projectsTierBlurb: string;
  };
  valueProp: {
    title: string;
    subtitle: string;
    structuredTitle: string;
    structuredBody: string;
    riskTitle: string;
    riskBody: string;
    homeAppsTitle: string;
    homeAppsBody: string;
  };
  howItWorks: {
    headline: string;
    subhead: string;
    steps: MarketingHowItWorksStep[];
  };
  personas: {
    sectionTitle: string;
    items: MarketingPersona[];
  };
  pricing: {
    title: string;
    subtitle: string;
    projectsTierBlurb: string;
  };
  faq: FAQItem[];
  finalCta: {
    headline: string;
    submitLabel: string;
  };
  auth: {
    signupBlurb: string;
  };
}

const tileFaq: FAQItem[] = [
  {
    question: 'How is this different from YouTube?',
    answer:
      'YouTube tutorials show a tile install. Project Partner helps you actually run the project—floors, backsplashes, and showers/baths—with a plan built around your skill level, tools, and timeline, plus checkpoints and a recovery path when something goes wrong.',
  },
  {
    question: 'What is Project Partner?',
    answer:
      'Project Partner is a planning, execution, and management app focused on residential tile projects. You choose a tile workflow, get a structured plan that fits your space, work through it step by step, and keep maintenance and records after you finish.',
  },
  {
    question: 'What if I get stuck mid-project?',
    answer:
      'Use Something Wrong? on any step to triage the issue and apply a recovery plan (rework, shopping top-up, or schedule slip). AI help scoped to your project family responds in seconds (with a low usage cap). Live video with a pro is a premium escalate on the Projects plan.',
  },
  {
    question: 'Do I need experience or all the right tools?',
    answer:
      'No. Tile plans work for first-time installers and experienced DIYers. If you are missing a tool, the workflow suggests alternatives based on what you already have, so you can start from where you are.',
  },
  {
    question: 'How does pricing work?',
    answer:
      'We offer three tiers, billed annually because home projects and maintenance run on longer cycles than a monthly subscription. Free covers home maintenance and task management—the cleanest, most focused home-improvement toolkit on the market (no credit card required). Risk Radar focuses on mitigating project risk when you get instructions and planning elsewhere—a huge benefit, though it does not include schedule planning. Projects is our Project Partner flagship: full workflow execution so you can plan, schedule, and run the job end to end. Upgrade or cancel anytime.',
  },
  {
    question: 'What happens after the project is done?',
    answer:
      'Your completed tile projects stay available for reference and maintenance reminders. When you start the next one, you already have the history and home context to build on.',
  },
];

export const marketingCopyByMode: Record<MarketingMode, MarketingCopy> = {
  general: {
    documentTitle: 'Project Partner - Workflow Management',
    metaDescription: 'Professional workflow management with step-by-step processes',
    hero: {
      headlineLine1: 'Project Management,',
      headlineLine2: 'Built for Home Improvement',
      subhead: 'Transform scattered DIY content and tools to a predictable execution system',
      ctaPrimary: 'Get Started Today',
      ctaSecondary: 'Learn More',
    },
    simplifiedHero: {
      headlineLines: [
        'Project Execution,',
        'Engineered for Smarter Planning',
        'and Reliable Outcomes.',
      ],
      subhead: 'Helping you run one great project.',
      projectsTierBlurb: 'A complete suite of apps and tools to run one great project.',
    },
    valueProp: {
      title: 'Built for Better Project Experiences',
      subtitle:
        "Some sources show half of DIY projects don't land as planned—we think that's a problem.",
      structuredTitle: 'Structured Project',
      structuredBody:
        'Manufacturing-inspired processes drive out uncertainty and make DIY repeatable.',
      riskTitle: 'Risk management',
      riskBody:
        'We help you manage risk or uncertainty by not just telling you what to do, but showing you what could go wrong. The result is rapid training and understanding of critical processes.',
      homeAppsTitle: 'Home Management Apps',
      homeAppsBody:
        'Home Maintenance, Tool Tracking, and Task & Project Tracking, and others so you stay on top of ongoing work.',
    },
    howItWorks: {
      headline: 'Designed to run one great project—not a career of building',
      subhead: 'In 30min or less—build a project framework that leads to success',
      steps: [
        {
          number: 1,
          title: 'Choose Your Project',
          description: 'Start with proven playbooks for tile, painting, flooring, and carpentry',
        },
        {
          number: 2,
          title: 'Get Your Personalized Plan',
          description: 'Answer a few questions about your skills, tools, and timeline',
        },
        {
          number: 3,
          title: 'Build with Confidence',
          description:
            'Follow your workflow with checkpoints, photos, and AI help when something goes wrong',
        },
      ],
    },
    personas: {
      sectionTitle: "Who It's For",
      items: [
        {
          emoji: '🌱',
          title: 'Complete Beginners',
          description:
            "Never used a drill? We've got you. Start with simple projects and build confidence as you go.",
          bgColor: 'bg-green-100 dark:bg-green-950',
          useIcon: false,
        },
        {
          emoji: '⚡',
          title: 'Weekend Warriors',
          description:
            'Make the most of your limited time. Get efficient plans that fit your busy schedule.',
          bgColor: 'bg-blue-100 dark:bg-blue-950',
          useIcon: false,
        },
        {
          emoji: '🚀',
          title: 'DIY Enthusiasts',
          description: 'Level up with advanced techniques. Tackle complex projects with confidence.',
          bgColor: 'bg-purple-100 dark:bg-purple-950',
          useIcon: false,
        },
        {
          emoji: '',
          title: 'Contractor',
          description:
            'Streamline your projects with professional-grade tools and workflows designed for builders.',
          bgColor: 'bg-orange-100 dark:bg-orange-950',
          useIcon: true,
        },
      ],
    },
    pricing: {
      title: 'Simple pricing for every level of projects',
      subtitle: 'Start free and unlock project control when you need it',
      projectsTierBlurb: 'A complete suite of apps and tools to run one great project.',
    },
    faq: generalFaq,
    finalCta: {
      headline: 'Ready for better projects?',
      submitLabel: 'Start Free Trial',
    },
    auth: {
      signupBlurb:
        'Project Partner saves your plans and progress, so you can always pick up where you left off. Your login keeps everything secure and ready when you return.',
    },
  },
  tile: {
    documentTitle: 'Project Partner - Tile Project Workflows',
    metaDescription:
      'Run tile floors, backsplashes, and showers/baths with proven step-by-step project workflows',
    hero: {
      headlineLine1: 'Project Management,',
      headlineLine2: 'Built for Tile Projects',
      subhead:
        'Run tile floors, backsplashes, and showers/baths with a predictable execution system',
      ctaPrimary: 'Get Started Today',
      ctaSecondary: 'Learn More',
    },
    simplifiedHero: {
      headlineLines: [
        'Tile Project Execution,',
        'Engineered for Smarter Planning',
        'and Reliable Outcomes.',
      ],
      subhead: 'Helping you run one great tile project.',
      projectsTierBlurb: 'A complete suite of apps and tools to run one great tile project.',
    },
    valueProp: {
      title: 'Built for Better Tile Project Experiences',
      subtitle:
        "Tile installs go sideways when prep, layout, and wet-area details aren't planned—we think that's a problem.",
      structuredTitle: 'Structured Tile Workflow',
      structuredBody:
        'Manufacturing-inspired processes drive out uncertainty and make tile installs repeatable.',
      riskTitle: 'Risk management',
      riskBody:
        'We help you manage risk on floors, walls, and wet areas by not just telling you what to do, but showing you what could go wrong—before thinset sets.',
      homeAppsTitle: 'Home Management Apps',
      homeAppsBody:
        'Home Maintenance, Tool Tracking, and Task & Project Tracking so you stay on top of prep, install, and follow-up work.',
    },
    howItWorks: {
      headline: 'Designed to run one great tile project—not a career of tiling',
      subhead: 'In 30min or less—build a tile project framework that leads to success',
      steps: [
        {
          number: 1,
          title: 'Choose Your Tile Project',
          description: 'Start with proven workflows for floors, backsplashes, and showers/baths',
        },
        {
          number: 2,
          title: 'Get Your Personalized Plan',
          description: 'Answer a few questions about your skills, tools, and timeline',
        },
        {
          number: 3,
          title: 'Install with Confidence',
          description:
            'Follow your workflow with checkpoints, photos, and AI help when something goes wrong',
        },
      ],
    },
    personas: {
      sectionTitle: "Who It's For",
      items: [
        {
          emoji: '🌱',
          title: 'First-Time Tilers',
          description:
            'Never set a tile? Start with clear floor or backsplash workflows and build confidence as you go.',
          bgColor: 'bg-green-100 dark:bg-green-950',
          useIcon: false,
        },
        {
          emoji: '⚡',
          title: 'Weekend Warriors',
          description:
            'Make the most of limited time. Get efficient tile plans that fit a busy schedule.',
          bgColor: 'bg-blue-100 dark:bg-blue-950',
          useIcon: false,
        },
        {
          emoji: '🚀',
          title: 'DIY Enthusiasts',
          description:
            'Level up on wet areas and complex layouts. Tackle showers and baths with confidence.',
          bgColor: 'bg-purple-100 dark:bg-purple-950',
          useIcon: false,
        },
        {
          emoji: '',
          title: 'Contractor',
          description:
            'Streamline residential tile jobs with professional-grade workflows designed for builders.',
          bgColor: 'bg-orange-100 dark:bg-orange-950',
          useIcon: true,
        },
      ],
    },
    pricing: {
      title: 'Simple pricing for every tile project',
      subtitle: 'Start free and unlock project control when you need it',
      projectsTierBlurb: 'A complete suite of apps and tools to run one great tile project.',
    },
    faq: tileFaq,
    finalCta: {
      headline: 'Ready for a better tile project?',
      submitLabel: 'Start Free Trial',
    },
    auth: {
      signupBlurb:
        'Project Partner saves your tile plans and progress, so you can always pick up where you left off. Your login keeps everything secure and ready when you return.',
    },
  },
};

export function getMarketingCopy(tileFocusMode: boolean): MarketingCopy {
  return marketingCopyByMode[tileFocusMode ? 'tile' : 'general'];
}

export function applyMarketingDocumentMeta(copy: MarketingCopy): void {
  if (typeof document === 'undefined') return;
  document.title = copy.documentTitle;
  const meta = document.querySelector('meta[name="description"]');
  if (meta) {
    meta.setAttribute('content', copy.metaDescription);
  }
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) {
    ogTitle.setAttribute('content', copy.documentTitle);
  }
  const ogDescription = document.querySelector('meta[property="og:description"]');
  if (ogDescription) {
    ogDescription.setAttribute('content', copy.metaDescription);
  }
}
