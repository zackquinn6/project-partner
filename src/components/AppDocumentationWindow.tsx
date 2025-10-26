import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Folder, 
  Calculator, 
  HomeIcon, 
  Wrench, 
  Hammer, 
  BookOpen, 
  HelpCircle, 
  User, 
  Users, 
  MapPin, 
  Camera,
  Star,
  Clock,
  Shield,
  Zap,
  Target
} from 'lucide-react';

interface AppDocumentationWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const appFeatures = [
  {
    id: 'my-projects',
    icon: Folder,
    name: 'Progress Board',
    description: 'Manage all your DIY project runs from start to finish with step-by-step guidance, progress tracking, and completion certificates.',
    keyFeatures: [
      'Active project dashboard with progress tracking',
      'Step-by-step workflow guidance',
      'Photo documentation and before/after comparisons',
      'Time tracking and completion certificates',
      'Project customization and scaling options'
    ],
    faq: [
      {
        q: 'How do I start a new project?',
        a: 'Browse the Project Catalog, select a project template, then customize it during the kickoff workflow with your specific details, timeline, and preferences.'
      },
      {
        q: 'Can I pause and resume projects?',
        a: 'Yes! Your progress is automatically saved. You can pause at any step and resume exactly where you left off.'
      },
      {
        q: 'What happens when I complete a project?',
        a: 'You\'ll receive a completion certificate, can view before/after photos, and the project moves to your completed projects archive.'
      },
      {
        q: 'Can I customize project steps?',
        a: 'While the core workflow remains consistent for safety and success, you can add notes, upload additional photos, and adjust timelines to fit your needs.'
      }
    ]
  },
  {
    id: 'home-maintenance',
    icon: HomeIcon,
    name: 'My Home Maintenance',
    description: 'Stay on top of essential home maintenance with personalized schedules, reminders, and completion tracking.',
    keyFeatures: [
      'Automated maintenance scheduling based on your home',
      'Seasonal task recommendations',
      'Maintenance history and photo documentation',
      'Custom task creation and frequency settings',
      'Email and SMS reminders'
    ],
    faq: [
      {
        q: 'How often will I receive reminders?',
        a: 'You can customize reminder frequency in your notification settings - weekly, monthly, or only when tasks are due.'
      },
      {
        q: 'Can I add my own maintenance tasks?',
        a: 'Absolutely! Create custom tasks with your own schedules, descriptions, and reminder preferences.'
      },
      {
        q: 'What if I miss a maintenance task?',
        a: 'The app will continue reminding you, and you can mark tasks complete with notes about any delays or issues encountered.'
      }
    ]
  },
  {
    id: 'tool-library',
    icon: Wrench,
    name: 'My Tool Library',
    description: 'Catalog your tools and materials, get project-specific recommendations, and track what you need to buy or rent.',
    keyFeatures: [
      'Digital inventory of your tools and materials',
      'Project-specific tool recommendations',
      'Purchase and rental suggestions',
      'Tool maintenance reminders',
      'Sharing tools with family members'
    ],
    faq: [
      {
        q: 'How do I add tools to my library?',
        a: 'Browse our tool database and mark items you own, or create custom entries for specialty tools not in our catalog.'
      },
      {
        q: 'Can family members access my tool library?',
        a: 'Yes, you can share your tool inventory with household members so they know what\'s available for projects.'
      },
      {
        q: 'Does it help me avoid buying duplicate tools?',
        a: 'Yes! Before starting projects, check your library to see what you already have and only rent/buy what you actually need.'
      }
    ]
  },
  {
    id: 'tool-access',
    icon: Hammer,
    name: 'Tool Access',
    description: 'Find and rent tools locally through our partnerships or discover the best rental options in your area.',
    keyFeatures: [
      'Boston: Direct rental through Toolio Rentals',
      'Nationwide: Local rental shop finder and comparison',
      'Project-based tool recommendations',
      'Rental cost estimation and availability checking',
      'Integration with project planning'
    ],
    faq: [
      {
        q: 'Is tool rental available in my area?',
        a: 'Our direct rental service covers Boston, MA. For other areas, we help you find the best local rental options.'
      },
      {
        q: 'How do I know what tools I need for a project?',
        a: 'Each project template includes a complete tool list. We also check your Tool Library to show only what you need to rent.'
      },
      {
        q: 'Can I reserve tools in advance?',
        a: 'In Boston, yes through Toolio Rentals. For other areas, we provide contact information for local shops to check availability.'
      }
    ]
  },
  {
    id: 'project-catalog',
    icon: BookOpen,
    name: 'New Project Catalog',
    description: 'Browse 100+ proven DIY project templates with step-by-step instructions, material lists, and expert tips.',
    keyFeatures: [
      '100+ professionally designed project templates',
      'Difficulty filtering and skill-level matching',
      'Category browsing (plumbing, electrical, painting, etc.)',
      'Project preview with time and cost estimates',
      'Recent projects and trending templates'
    ],
    faq: [
      {
        q: 'Are the project templates suitable for beginners?',
        a: 'Yes! Each project is clearly labeled with difficulty level, and we have many beginner-friendly options with extra guidance.'
      },
      {
        q: 'Can I modify project templates?',
        a: 'During the kickoff workflow, you can customize projects for your specific situation, timeline, and preferences.'
      },
      {
        q: 'How often are new projects added?',
        a: 'We regularly add new templates based on user requests, seasonal needs, and trending home improvement projects.'
      }
    ]
  },
  {
    id: 'expert-help',
    icon: HelpCircle,
    name: 'Expert Help',
    description: 'Connect with DIY experts for one-on-one video consultations, real-time guidance, and professional advice.',
    keyFeatures: [
      'One-on-one video consultations with DIY experts',
      'Real-time problem solving during projects',
      'Project-specific expert recommendations',
      'Emergency support for urgent issues',
      'Expert review of your project plans'
    ],
    faq: [
      {
        q: 'How quickly can I connect with an expert?',
        a: 'We aim to connect you within 15 minutes during business hours, or you can schedule consultations in advance.'
      },
      {
        q: 'What expertise areas are covered?',
        a: 'Our experts cover plumbing, electrical, carpentry, painting, tiling, and general home improvement with specialized knowledge.'
      },
      {
        q: 'Is there a cost for expert consultations?',
        a: 'Pricing varies by consultation length and complexity. Basic quick questions may be free, with rates clearly shown before booking.'
      }
    ]
  },
  {
    id: 'my-profile',
    icon: User,
    name: 'My Profile',
    description: 'Manage your DIY skill profile, preferences, home details, and personalization settings for better project recommendations.',
    keyFeatures: [
      'DIY skill level and experience tracking',
      'Learning style and preference settings',
      'Home details and property information',
      'Tool and material inventory management',
      'Achievement badges and project history'
    ],
    faq: [
      {
        q: 'Why is my profile important?',
        a: 'Your profile helps us recommend appropriate projects, estimate realistic timelines, and provide personalized guidance based on your skills and tools.'
      },
      {
        q: 'Can I update my skill level over time?',
        a: 'Yes! As you complete projects and gain experience, update your profile so we can suggest more advanced projects and shorter time estimates.'
      },
      {
        q: 'Is my profile information private?',
        a: 'Absolutely. Your profile information is only used to personalize your experience and is never shared with other users or external parties.'
      }
    ]
  },
  {
    id: 'community',
    icon: Users,
    name: 'Community',
    description: 'Connect with other DIY enthusiasts, share project photos, get advice, and celebrate successes together.',
    keyFeatures: [
      'Project showcase and photo sharing',
      'Community Q&A and troubleshooting help',
      'Local DIYer connections and meetups',
      'Expert-verified tips and tricks',
      'Achievement celebrations and inspiration'
    ],
    faq: [
      {
        q: 'Can I share my project photos?',
        a: 'Yes! Share before/after photos, progress updates, and celebrate completions with the community for feedback and inspiration.'
      },
      {
        q: 'How do I get help with project issues?',
        a: 'Post questions in the community forum where other DIYers and experts can provide advice, solutions, and troubleshooting tips.'
      },
      {
        q: 'Are community interactions moderated?',
        a: 'Yes, our community guidelines ensure helpful, respectful interactions. Expert moderators verify technical advice for accuracy and safety.'
      }
    ]
  },
  {
    id: 'my-homes',
    icon: MapPin,
    name: 'My Homes',
    description: 'Manage multiple properties, track home details, maintenance schedules, and project history for each location.',
    keyFeatures: [
      'Multiple property management',
      'Home details and characteristics tracking',
      'Property-specific maintenance schedules',
      'Project history by location',
      'Risk assessment and material age tracking'
    ],
    faq: [
      {
        q: 'Can I manage multiple properties?',
        a: 'Yes! Add vacation homes, rental properties, or family properties and manage maintenance and projects for each separately.'
      },
      {
        q: 'How does home age affect recommendations?',
        a: 'Older homes may need more frequent maintenance or have specific considerations (like lead paint or asbestos) that we factor into project guidance.'
      },
      {
        q: 'Can I share home management with family?',
        a: 'Family members can be given access to view and update specific homes, perfect for shared properties or helping elderly relatives.'
      }
    ]
  },
  {
    id: 'ai-repair',
    icon: Camera,
    name: 'AI Repair',
    description: 'Take photos of home repair issues and get instant AI-powered analysis with action plans, cost estimates, and material recommendations.',
    keyFeatures: [
      'AI-powered photo analysis of repair issues',
      'Instant root cause and severity assessment',
      'Step-by-step repair action plans',
      'Material and tool recommendations',
      'Cost estimates and difficulty levels'
    ],
    faq: [
      {
        q: 'How accurate is the AI analysis?',
        a: 'Our AI is trained on thousands of repair scenarios and provides reliable initial assessments, but complex issues may require expert consultation.'
      },
      {
        q: 'What types of issues can it analyze?',
        a: 'Specializes in bathroom repairs, tile work, plumbing leaks, window issues, and common home maintenance problems with visual symptoms.'
      },
      {
        q: 'How much does AI analysis cost?',
        a: 'Currently free during our launch period. Regular pricing will be $1 per photo analyzed, with detailed reports and action plans included.'
      },
      {
        q: 'Can I save my AI repair analyses?',
        a: 'Yes! All analyses are saved to your account with photos, recommendations, and any follow-up actions you take.'
      }
    ]
  }
];

export function AppDocumentationWindow({ open, onOpenChange }: AppDocumentationWindowProps) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-full max-w-[100vw] max-h-[100vh] md:w-[95vw] md:h-[95vh] md:max-w-none md:max-h-none p-0 overflow-hidden rounded-none md:rounded-lg">
        <div className="h-full flex flex-col">
          <DialogHeader className="p-4 md:p-6 border-b bg-gradient-to-r from-primary/5 to-primary/10">
            <DialogTitle className="text-xl md:text-2xl font-bold flex items-center gap-2 md:gap-3">
              <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              <span className="truncate">App Documentation & User Guide</span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="grid grid-cols-3 w-full bg-muted/50 border-b border-border rounded-none">
                <TabsTrigger value="overview" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                  <Star className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">App</span> Overview
                </TabsTrigger>
                <TabsTrigger value="features" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                  <Target className="w-3 h-3 md:w-4 md:h-4" />
                  Feature Guide
                </TabsTrigger>
                <TabsTrigger value="getting-started" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                  <Zap className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">Getting</span> Started
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto">
                <TabsContent value="overview" className="p-4 md:p-6 space-y-4 md:space-y-6 h-full">
                  <div className="text-center space-y-3 md:space-y-4">
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground">Welcome to Project Partner</h2>
                    <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto px-2">
                      The complete homeowners app with everything you need to manage your home - maintenance, projects, tools, and expert guidance all in one place.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                          <Target className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                          Personalized Management
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-xs md:text-sm text-muted-foreground">
                          DIY + Home Profile tracking with 100+ project templates for guaranteed first-time success.
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-secondary/20 bg-gradient-to-br from-secondary/5 to-secondary/10">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                          <Users className="w-4 h-4 md:w-5 md:h-5 text-secondary" />
                          Virtual Expert Platform
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-xs md:text-sm text-muted-foreground">
                          One-on-one video consultations with DIY experts for real-time guidance and problem solving.
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                          <Hammer className="w-4 h-4 md:w-5 md:h-5 text-accent" />
                          Tool Rental Platform
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-xs md:text-sm text-muted-foreground">
                          Direct rentals in Boston via Toolio Rentals, smart rental finder nationwide. Never buy tools you'll only use once.
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Core Philosophy</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p>
                        Project Partner believes every homeowner can successfully complete DIY projects with the right guidance, tools, and support. Our platform combines:
                      </p>
                      <ul className="space-y-2">
                        <li className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-green-600" />
                          <span><strong>Proven Templates:</strong> 100+ tested project workflows with step-by-step guidance</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span><strong>Time Savings:</strong> Avoid costly mistakes with expert-designed processes</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-purple-600" />
                          <span><strong>Personalization:</strong> Recommendations based on your skills, tools, and home</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-orange-600" />
                          <span><strong>Human Support:</strong> Expert help when you need it most</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="features" className="p-0">
                  <ScrollArea className="h-[60vh]">
                    <div className="p-6 space-y-6">
                      {appFeatures.map((feature) => (
                      <Card key={feature.id} className="border-l-4 border-l-primary">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                              <feature.icon className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold">{feature.name}</h3>
                              <Badge variant="outline" className="mt-1">{feature.id}</Badge>
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-muted-foreground">{feature.description}</p>
                          
                          <div>
                            <h4 className="font-semibold mb-2">Key Features:</h4>
                            <ul className="space-y-1">
                              {feature.keyFeatures.map((feat, index) => (
                                <li key={index} className="flex items-center gap-2 text-sm">
                                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                                  {feat}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="faq" className="border-0">
                              <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                                Frequently Asked Questions
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-3">
                                  {feature.faq.map((item, index) => (
                                    <div key={index} className="border-l-2 border-muted pl-4">
                                      <h5 className="font-medium text-sm mb-1">{item.q}</h5>
                                      <p className="text-sm text-muted-foreground">{item.a}</p>
                                    </div>
                                  ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        </CardContent>
                      </Card>
                     ))}
                   </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="getting-started" className="p-0">
                  <ScrollArea className="h-[60vh]">
                    <div className="p-6 space-y-6">
                      <div className="text-center space-y-4">
                        <h2 className="text-2xl font-bold">Getting Started Guide</h2>
                        <p className="text-muted-foreground">
                          Follow these steps to set up your account and start your first project successfully.
                        </p>
                      </div>

                      <div className="grid gap-6">
                    <Card className="border-l-4 border-l-blue-500">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                          Complete Your Profile
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="mb-3">Set up your DIY profile for personalized recommendations:</p>
                        <ul className="space-y-2 text-sm">
                          <li>• Go to "My Profile" and complete the DIY skill assessment</li>
                          <li>• Add your home details (age, type, location)</li>
                          <li>• Inventory your existing tools and materials</li>
                          <li>• Set your learning style and preferences</li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-green-500">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                          Set Up Home Maintenance
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="mb-3">Protect your home with proactive maintenance:</p>
                        <ul className="space-y-2 text-sm">
                          <li>• Add your home to "My Homes" with property details</li>
                          <li>• Review and activate recommended maintenance tasks</li>
                          <li>• Set notification preferences for reminders</li>
                          <li>• Schedule your first seasonal maintenance review</li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-purple-500">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                          Start Your First Project
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="mb-3">Choose and customize your first DIY project:</p>
                        <ul className="space-y-2 text-sm">
                          <li>• Browse the Project Catalog for beginner-friendly options</li>
                          <li>• Use Task Manager to create tasks and cost assessments</li>
                          <li>• Complete the project kickoff workflow with customizations</li>
                          <li>• Review your tool needs and plan rentals if necessary</li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-orange-500">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                          Execute with Confidence
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="mb-3">Follow the proven workflow for success:</p>
                        <ul className="space-y-2 text-sm">
                          <li>• Follow step-by-step guidance in "Progress Board"</li>
                          <li>• Document progress with photos at each phase</li>
                          <li>• Use "Get Expert Help" for expert help when needed</li>
                          <li>• Celebrate completion and share with the community!</li>
                        </ul>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <HelpCircle className="w-5 h-5 text-primary" />
                        Need Help?
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <h4 className="font-semibold mb-1">Quick Questions</h4>
                          <p className="text-muted-foreground">Use the Community forum for DIY tips and advice</p>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-1">Expert Support</h4>
                          <p className="text-muted-foreground">Schedule one-on-one consultations via "Get Expert Help"</p>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-1">Technical Issues</h4>
                          <p className="text-muted-foreground">Contact support through "Give us feedback"</p>
                        </div>
                      </div>
                      </CardContent>
                    </Card>
                    </div>
                  </ScrollArea>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}