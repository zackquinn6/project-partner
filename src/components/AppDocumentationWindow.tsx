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
  Target,
  ListChecks,
  Building2
} from 'lucide-react';

interface AppDocumentationWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Core features available to all users
const coreFeatures = [
  {
    id: 'my-projects',
    icon: Folder,
    name: 'Progress Board',
    category: 'core',
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
        a: "You'll receive a completion certificate, can view before/after photos, and the project moves to your completed projects archive."
      }
    ]
  },
  {
    id: 'home-maintenance',
    icon: HomeIcon,
    name: 'Home Maintenance',
    category: 'core',
    description: 'Stay on top of essential home maintenance with personalized schedules, reminders, and completion tracking.',
    keyFeatures: [
      'Automated maintenance scheduling based on your home',
      'Seasonal task recommendations',
      'Maintenance history and photo documentation',
      'Custom task creation and frequency settings',
      'Email reminders'
    ],
    faq: [
      {
        q: 'How often will I receive reminders?',
        a: 'You can customize reminder frequency in your notification settings - weekly, monthly, or only when tasks are due.'
      },
      {
        q: 'Can I add my own maintenance tasks?',
        a: 'Absolutely! Create custom tasks with your own schedules, descriptions, and reminder preferences.'
      }
    ]
  },
  {
    id: 'task-manager',
    icon: ListChecks,
    name: 'Task Manager',
    category: 'core',
    description: 'Create, organize, and track tasks across your home with powerful scheduling and assignment features.',
    keyFeatures: [
      'Create and organize tasks by home and space',
      'Assign tasks to household members',
      'Schedule tasks with flexible recurrence',
      'Link tasks to projects for better organization',
      'Track completion and maintain history'
    ],
    faq: [
      {
        q: 'Can I assign tasks to others?',
        a: 'Yes! Assign tasks to household members and they\'ll receive notifications when tasks are assigned or due.'
      },
      {
        q: 'How do I link tasks to projects?',
        a: 'When creating a task, select an active project from your Progress Board to link them together.'
      }
    ]
  },
  {
    id: 'tool-library',
    icon: Wrench,
    name: 'My Tools',
    category: 'core',
    description: 'Catalog your tools and materials, get project-specific recommendations, and track what you need to buy.',
    keyFeatures: [
      'Digital inventory of your tools and materials',
      'Project-specific tool recommendations',
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
        a: "Yes, you can share your tool inventory with household members so they know what's available for projects."
      }
    ]
  },
  {
    id: 'project-catalog',
    icon: BookOpen,
    name: 'Project Catalog',
    category: 'core',
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
      }
    ]
  },
  {
    id: 'expert-help',
    icon: HelpCircle,
    name: 'Call the Trades',
    category: 'core',
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
      }
    ]
  },
  {
    id: 'my-profile',
    icon: User,
    name: 'My Profile',
    category: 'core',
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
      }
    ]
  },
  {
    id: 'my-homes',
    icon: MapPin,
    name: 'My Homes',
    category: 'core',
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
      }
    ]
  }
];

// Beta/Labs features
const betaFeatures = [
  {
    id: 'community',
    icon: Users,
    name: 'Community',
    category: 'beta',
    description: 'Connect with other DIY enthusiasts, share project photos, get advice, and celebrate successes together.',
    keyFeatures: [
      'Project showcase and photo sharing',
      'Community Q&A and troubleshooting help',
      'Local DIYer connections',
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
      }
    ]
  },
  {
    id: 'ai-repair',
    icon: Camera,
    name: 'AI Repair',
    category: 'beta',
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
      }
    ]
  },
  {
    id: 'code-permits',
    icon: Building2,
    name: 'Code & Compliance',
    category: 'beta',
    description: 'Get guidance on building codes, permits, and compliance requirements for your DIY projects.',
    keyFeatures: [
      'Local building code information',
      'Permit requirement guidance',
      'Compliance checklists',
      'Inspector preparation tips'
    ],
    faq: [
      {
        q: 'Do I need a permit for my project?',
        a: 'Our tool helps you determine permit requirements based on your project type and location, but always verify with local authorities.'
      }
    ]
  }
];

const allFeatures = [...coreFeatures, ...betaFeatures];

export function AppDocumentationWindow({ open, onOpenChange }: AppDocumentationWindowProps) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-full max-w-[100vw] max-h-[100vh] md:w-[95vw] md:h-[95vh] md:max-w-none md:max-h-none p-0 overflow-hidden rounded-none md:rounded-lg">
        <div className="h-full flex flex-col">
          <DialogHeader className="p-4 md:p-6 border-b bg-gradient-to-r from-primary/5 to-primary/10 flex-shrink-0">
            <DialogTitle className="text-lg md:text-xl font-bold flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <span>App Documentation & User Guide</span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="grid grid-cols-3 w-full bg-muted/50 border-b border-border rounded-none flex-shrink-0">
                <TabsTrigger value="overview" className="flex items-center gap-2 text-sm">
                  <Star className="w-4 h-4" />
                  <span className="hidden sm:inline">App</span> Overview
                </TabsTrigger>
                <TabsTrigger value="features" className="flex items-center gap-2 text-sm">
                  <Target className="w-4 h-4" />
                  Feature Guide
                </TabsTrigger>
                <TabsTrigger value="getting-started" className="flex items-center gap-2 text-sm">
                  <Zap className="w-4 h-4" />
                  <span className="hidden sm:inline">Getting</span> Started
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-hidden">
                <TabsContent value="overview" className="h-full p-0 m-0">
                  <ScrollArea className="h-full">
                    <div className="p-4 md:p-6 space-y-6">
                      <div className="text-center space-y-3">
                        <h2 className="text-2xl md:text-3xl font-bold text-foreground">Welcome to Project Partner</h2>
                        <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto">
                          The complete homeowner's app with everything you need to manage your home - maintenance, projects, tools, and expert guidance all in one place.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                          <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                              <Target className="w-5 h-5 text-primary" />
                              Personalized Management
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <p className="text-sm text-muted-foreground">
                              DIY + Home Profile tracking with 100+ project templates for guaranteed first-time success.
                            </p>
                          </CardContent>
                        </Card>

                        <Card className="border-secondary/20 bg-gradient-to-br from-secondary/5 to-secondary/10">
                          <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                              <Users className="w-5 h-5 text-secondary" />
                              Expert Support Platform
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <p className="text-sm text-muted-foreground">
                              One-on-one video consultations with DIY experts for real-time guidance and problem solving.
                            </p>
                          </CardContent>
                        </Card>
                      </div>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Core Philosophy</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-sm">
                            Project Partner believes every homeowner can successfully complete DIY projects with the right guidance, tools, and support. Our platform combines:
                          </p>
                          <ul className="space-y-2">
                            <li className="flex items-start gap-2 text-sm">
                              <Shield className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <span><strong>Proven Templates:</strong> 100+ tested project workflows with step-by-step guidance</span>
                            </li>
                            <li className="flex items-start gap-2 text-sm">
                              <Clock className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                              <span><strong>Time Savings:</strong> Avoid costly mistakes with expert-designed processes</span>
                            </li>
                            <li className="flex items-start gap-2 text-sm">
                              <Target className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                              <span><strong>Personalization:</strong> Recommendations based on your skills, tools, and home</span>
                            </li>
                            <li className="flex items-start gap-2 text-sm">
                              <Users className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                              <span><strong>Human Support:</strong> Expert help when you need it most</span>
                            </li>
                          </ul>
                        </CardContent>
                      </Card>
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="features" className="h-full p-0 m-0">
                  <ScrollArea className="h-full">
                    <div className="p-4 md:p-6 space-y-6">
                      {/* Core Features Section */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b">
                          <Star className="w-5 h-5 text-primary" />
                          <h3 className="text-xl font-bold">Core Features</h3>
                        </div>
                        {coreFeatures.map((feature) => (
                          <Card key={feature.id} className="border-l-4 border-l-primary">
                            <CardHeader className="pb-3">
                              <CardTitle className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <feature.icon className="w-5 h-5 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-lg font-bold">{feature.name}</h3>
                                </div>
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <p className="text-sm text-muted-foreground">{feature.description}</p>
                              
                              <div>
                                <h4 className="font-semibold text-sm mb-2">Key Features:</h4>
                                <ul className="space-y-1">
                                  {feature.keyFeatures.map((feat, index) => (
                                    <li key={index} className="flex items-start gap-2 text-sm">
                                      <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                                      <span>{feat}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="faq" className="border-0">
                                  <AccordionTrigger className="text-sm font-semibold hover:no-underline py-2">
                                    Frequently Asked Questions
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <div className="space-y-3">
                                      {feature.faq.map((item, index) => (
                                        <div key={index} className="border-l-2 border-muted pl-3">
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

                      {/* Beta Features Section */}
                      <div className="space-y-4 pt-4">
                        <div className="flex items-center gap-2 pb-2 border-b">
                          <Zap className="w-5 h-5 text-amber-600" />
                          <h3 className="text-xl font-bold">Beta & Labs Features</h3>
                          <Badge variant="secondary" className="ml-2">Experimental</Badge>
                        </div>
                        {betaFeatures.map((feature) => (
                          <Card key={feature.id} className="border-l-4 border-l-amber-500">
                            <CardHeader className="pb-3">
                              <CardTitle className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <feature.icon className="w-5 h-5 text-amber-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-lg font-bold">{feature.name}</h3>
                                  <Badge variant="outline" className="mt-1 text-xs">Beta</Badge>
                                </div>
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <p className="text-sm text-muted-foreground">{feature.description}</p>
                              
                              <div>
                                <h4 className="font-semibold text-sm mb-2">Key Features:</h4>
                                <ul className="space-y-1">
                                  {feature.keyFeatures.map((feat, index) => (
                                    <li key={index} className="flex items-start gap-2 text-sm">
                                      <div className="w-1.5 h-1.5 bg-amber-600 rounded-full mt-1.5 flex-shrink-0" />
                                      <span>{feat}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="faq" className="border-0">
                                  <AccordionTrigger className="text-sm font-semibold hover:no-underline py-2">
                                    Frequently Asked Questions
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <div className="space-y-3">
                                      {feature.faq.map((item, index) => (
                                        <div key={index} className="border-l-2 border-muted pl-3">
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
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="getting-started" className="h-full p-0 m-0">
                  <ScrollArea className="h-full">
                    <div className="p-4 md:p-6 space-y-6">
                      <div className="text-center space-y-3">
                        <h2 className="text-2xl font-bold">Getting Started Guide</h2>
                        <p className="text-sm text-muted-foreground">
                          Follow these steps to set up your account and start your first project successfully.
                        </p>
                      </div>

                      <div className="grid gap-4">
                        <Card className="border-l-4 border-l-blue-500">
                          <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
                              Complete Your Profile
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="mb-2 text-sm">Set up your DIY profile for personalized recommendations:</p>
                            <ul className="space-y-1 text-sm">
                              <li>• Go to "My Profile" and complete the DIY skill assessment</li>
                              <li>• Add your home details (age, type, location)</li>
                              <li>• Inventory your existing tools and materials</li>
                              <li>• Set your learning style and preferences</li>
                            </ul>
                          </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-green-500">
                          <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                              <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
                              Set Up Home Maintenance
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="mb-2 text-sm">Protect your home with proactive maintenance:</p>
                            <ul className="space-y-1 text-sm">
                              <li>• Add your home to "My Homes" with property details</li>
                              <li>• Review and activate recommended maintenance tasks</li>
                              <li>• Set notification preferences for reminders</li>
                              <li>• Schedule your first seasonal maintenance review</li>
                            </ul>
                          </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-purple-500">
                          <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                              <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
                              Start Your First Project
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="mb-2 text-sm">Choose and customize your first DIY project:</p>
                            <ul className="space-y-1 text-sm">
                              <li>• Browse the Project Catalog for beginner-friendly options</li>
                              <li>• Use Task Manager to create tasks and cost assessments</li>
                              <li>• Complete the project kickoff workflow with customizations</li>
                              <li>• Review your tool needs and plan purchases if necessary</li>
                            </ul>
                          </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-orange-500">
                          <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                              <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">4</div>
                              Execute with Confidence
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="mb-2 text-sm">Follow the proven workflow for success:</p>
                            <ul className="space-y-1 text-sm">
                              <li>• Follow step-by-step guidance in "Progress Board"</li>
                              <li>• Document progress with photos at each phase</li>
                              <li>• Use "Call the Trades" for expert help when needed</li>
                              <li>• Celebrate completion and share with the community!</li>
                            </ul>
                          </CardContent>
                        </Card>
                      </div>

                      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2 text-base">
                            <HelpCircle className="w-5 h-5 text-primary" />
                            Need Help?
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <h4 className="font-semibold mb-1">Quick Questions</h4>
                              <p className="text-muted-foreground text-xs">Use the Community forum for DIY tips and advice</p>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-1">Expert Support</h4>
                              <p className="text-muted-foreground text-xs">Schedule one-on-one consultations via "Call the Trades"</p>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-1">Technical Issues</h4>
                              <p className="text-muted-foreground text-xs">Contact support through "Give us feedback"</p>
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
