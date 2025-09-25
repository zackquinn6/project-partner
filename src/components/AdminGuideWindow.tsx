import React, { useState } from 'react';
import { FullScreenDialog } from '@/components/FullScreenDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Settings, 
  BarChart3, 
  Shield, 
  Wrench, 
  Brain, 
  AlertTriangle,
  MapPin,
  Cog,
  RefreshCw,
  Target,
  TrendingUp,
  BookOpen,
  Zap,
  Info,
  Users,
  ExternalLink,
  CheckCircle
} from 'lucide-react';

interface AdminGuideWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const adminFunctions = [
  {
    id: 'project-management',
    icon: Settings,
    name: 'Project Management',
    description: 'Unified project template management with integrated revision control system.',
    keyFeatures: [
      'Create and edit project templates with step-by-step workflows',
      'Version control with branching and merging capabilities',
      'Template categorization and difficulty assignments',
      'Material and tool list management',
      'Time estimation and cost calculation setup',
      'Template publishing and archiving controls'
    ],
    workflows: [
      'Creating new project templates from scratch',
      'Importing existing project data and converting to templates',
      'Managing template revisions and approval workflows',
      'Publishing templates to user catalog',
      'Archiving outdated or problematic templates'
    ],
    terminology: [
      { term: 'Template', definition: 'Base project structure that users can customize for their specific needs' },
      { term: 'Revision', definition: 'Tracked version of a template with complete change history' },
      { term: 'Branch', definition: 'Separate development line for experimental template changes' },
      { term: 'Merge', definition: 'Process of combining changes from different template branches' }
    ]
  },
  {
    id: 'analytics',
    icon: BarChart3,
    name: 'Project Analytics',
    description: 'Comprehensive project metrics, completion rates, and performance analysis.',
    keyFeatures: [
      'Project completion rate tracking by template',
      'User engagement metrics and drop-off analysis',
      'Time estimation accuracy monitoring',
      'Cost prediction performance tracking',
      'Template popularity and usage statistics',
      'Geographic usage patterns and regional preferences'
    ],
    workflows: [
      'Monitoring project success rates and identifying improvement areas',
      'Analyzing user completion patterns to optimize templates',
      'Reviewing time and cost estimate accuracy',
      'Generating reports for stakeholder review',
      'Identifying trending project types and user needs'
    ],
    terminology: [
      { term: 'Completion Rate', definition: 'Percentage of started projects that reach final completion' },
      { term: 'Drop-off Point', definition: 'Specific project step where users most commonly abandon projects' },
      { term: 'Engagement Score', definition: 'Metric combining time spent, steps completed, and user interactions' },
      { term: 'Template Performance', definition: 'Overall success metrics for individual project templates' }
    ]
  },
  {
    id: 'users-security',
    icon: Shield,
    name: 'Users & Security',
    description: 'User role management, permissions, agreements, and comprehensive security monitoring.',
    keyFeatures: [
      'User role assignment (admin, editor, user) with granular permissions',
      'Project agreement management and digital signature tracking',
      'Security event monitoring and incident response',
      'Failed login attempt tracking and rate limiting',
      'User session management and forced logout capabilities',
      'Security audit trail and compliance reporting'
    ],
    workflows: [
      'Promoting users to admin or editor roles',
      'Investigating security incidents and unusual activity',
      'Managing user agreements and ensuring compliance',
      'Responding to security alerts and breaches',
      'Conducting regular security reviews and updates'
    ],
    terminology: [
      { term: 'Role-Based Access Control (RBAC)', definition: 'Permission system based on user roles rather than individual assignments' },
      { term: 'Security Event', definition: 'Any logged activity that could indicate a security concern' },
      { term: 'Audit Trail', definition: 'Complete record of all security-relevant actions in the system' },
      { term: 'Rate Limiting', definition: 'Automatic restriction of request frequency to prevent abuse' }
    ]
  },
  {
    id: 'tools-materials',
    icon: Wrench,
    name: 'Tools & Materials Library',
    description: 'Master catalog management for reusable tools and materials across all projects.',
    keyFeatures: [
      'Global tool and material database management',
      'Category organization and attribute definitions',
      'Pricing integration and rental partnership management',
      'Bulk import/export capabilities for catalog updates',
      'Vendor relationship management and pricing negotiations',
      'Tool maintenance reminder system configuration'
    ],
    workflows: [
      'Adding new tools and materials to the master catalog',
      'Updating pricing and availability information',
      'Managing vendor relationships and rental partnerships',
      'Organizing catalog structure and categories',
      'Bulk updating tool specifications and descriptions'
    ],
    terminology: [
      { term: 'Master Catalog', definition: 'Central database of all available tools and materials' },
      { term: 'SKU', definition: 'Stock Keeping Unit - unique identifier for each catalog item' },
      { term: 'Vendor Integration', definition: 'Automated connection to supplier pricing and availability systems' },
      { term: 'Rental Partnership', definition: 'Formal agreement with tool rental companies for user access' }
    ]
  },
  {
    id: 'knowledge-system',
    icon: Brain,
    name: 'Knowledge System',
    description: 'AI knowledge ingestion and project guidance content improvement system.',
    keyFeatures: [
      'AI-powered content analysis and knowledge extraction',
      'Project guidance improvement recommendations',
      'Knowledge base updates and content versioning',
      'Expert knowledge integration and validation',
      'Content quality scoring and optimization',
      'Automated content gap identification'
    ],
    workflows: [
      'Ingesting new DIY knowledge from expert sources',
      'Reviewing AI-generated content improvements',
      'Validating and approving knowledge updates',
      'Managing expert contributor relationships',
      'Monitoring content quality metrics'
    ],
    terminology: [
      { term: 'Knowledge Ingestion', definition: 'Process of extracting and integrating new information into the system' },
      { term: 'Content Versioning', definition: 'Tracking changes and updates to knowledge base content' },
      { term: 'Expert Validation', definition: 'Human review process to ensure AI-generated content accuracy' },
      { term: 'Content Gap', definition: 'Identified area where additional knowledge or guidance is needed' }
    ]
  },
  {
    id: 'home-risks',
    icon: AlertTriangle,
    name: 'Home Risk Management',
    description: 'Construction risk assessment and management based on home build years and materials.',
    keyFeatures: [
      'Historical construction material risk database',
      'Home age-based safety consideration management',
      'Risk assessment integration into project templates',
      'Safety warning system for hazardous materials',
      'Compliance tracking for safety regulations',
      'Expert consultation trigger conditions'
    ],
    workflows: [
      'Adding new construction risk factors and time periods',
      'Updating safety warnings and precautions',
      'Managing expert consultation requirements',
      'Reviewing and updating safety compliance requirements',
      'Monitoring risk assessment accuracy and updates'
    ],
    terminology: [
      { term: 'Construction Risk', definition: 'Potential safety hazard based on building materials and methods used in specific time periods' },
      { term: 'Hazardous Material', definition: 'Building material that poses health risks (asbestos, lead paint, etc.)' },
      { term: 'Safety Trigger', definition: 'Condition that automatically requires expert consultation or special precautions' },
      { term: 'Compliance Tracking', definition: 'Monitoring adherence to safety regulations and best practices' }
    ]
  },
  {
    id: 'roadmap',
    icon: MapPin,
    name: 'Feature Roadmap Management',
    description: 'Product roadmap planning and user feature request management system.',
    keyFeatures: [
      'Feature request collection and prioritization',
      'Roadmap timeline planning and milestone tracking',
      'User voting and feedback integration',
      'Development resource allocation planning',
      'Feature impact assessment and ROI analysis',
      'Stakeholder communication and updates'
    ],
    workflows: [
      'Reviewing and categorizing incoming feature requests',
      'Planning quarterly roadmap releases',
      'Communicating updates to users and stakeholders',
      'Analyzing feature request trends and patterns',
      'Managing development priorities and resources'
    ],
    terminology: [
      { term: 'Feature Request', definition: 'User-submitted suggestion for new functionality or improvements' },
      { term: 'Roadmap Milestone', definition: 'Significant development checkpoint with specific deliverables' },
      { term: 'Impact Assessment', definition: 'Analysis of potential benefits and costs of implementing a feature' },
      { term: 'User Voting', definition: 'System allowing users to express preference for specific feature requests' }
    ]
  },
  {
    id: 'process-fmea',
    icon: Cog,
    name: 'Process FMEA',
    description: 'Process Failure Mode and Effects Analysis for identifying and mitigating potential system failures.',
    keyFeatures: [
      'Systematic failure mode identification across all processes',
      'Risk priority number (RPN) calculation and tracking',
      'Mitigation strategy development and implementation',
      'Process improvement recommendations',
      'Failure impact assessment and severity scoring',
      'Preventive action tracking and effectiveness monitoring'
    ],
    workflows: [
      'Conducting regular FMEA reviews for critical processes',
      'Identifying new failure modes and updating assessments',
      'Implementing and tracking mitigation strategies',
      'Monitoring process improvements and effectiveness',
      'Reporting FMEA findings to management and stakeholders'
    ],
    terminology: [
      { term: 'Failure Mode', definition: 'Specific way in which a process or system component can fail' },
      { term: 'RPN (Risk Priority Number)', definition: 'Calculated score combining severity, occurrence, and detection ratings' },
      { term: 'Mitigation Strategy', definition: 'Planned action to reduce the likelihood or impact of a failure mode' },
      { term: 'Process Control', definition: 'Method for detecting or preventing failure modes during operation' }
    ]
  },
  {
    id: 'data-refresh',
    icon: RefreshCw,
    name: 'Data Refresh Management',
    description: 'Internet data refresh system for tool rentals, community posts, and external integrations.',
    keyFeatures: [
      'Automated web scraping for tool rental pricing and availability',
      'Community content moderation and quality control',
      'External API integration management and monitoring',
      'Data validation and quality assurance',
      'Refresh scheduling and frequency optimization',
      'Error handling and retry mechanism configuration'
    ],
    workflows: [
      'Configuring automated data refresh schedules',
      'Monitoring data quality and addressing issues',
      'Managing external API connections and authentication',
      'Reviewing and approving community content',
      'Troubleshooting failed data refresh operations'
    ],
    terminology: [
      { term: 'Web Scraping', definition: 'Automated extraction of data from websites and web services' },
      { term: 'API Integration', definition: 'Connection to external services for data exchange' },
      { term: 'Data Validation', definition: 'Process of checking data accuracy and completeness' },
      { term: 'Refresh Schedule', definition: 'Automated timing for updating external data sources' }
    ]
  }
];

export function AdminGuideWindow({ open, onOpenChange }: AdminGuideWindowProps) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <FullScreenDialog 
      open={open} 
      onOpenChange={onOpenChange}
      title="Administrator Guide & Documentation"
      description="Complete administrative control center documentation and best practices"
    >
      <div className="h-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Admin Overview
            </TabsTrigger>
            <TabsTrigger value="functions" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Core Functions
            </TabsTrigger>
            <TabsTrigger value="workflows" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Workflows & Best Practices
            </TabsTrigger>
            <TabsTrigger value="terminology" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Technical Terms
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0">
            <TabsContent value="overview" className="h-full">
              <ScrollArea className="h-full">
                <div className="space-y-8 p-6">
                  {/* Header Section */}
                  <div className="text-center space-y-4">
                    <h2 className="text-3xl font-bold text-foreground">Administrator Panel Overview</h2>
                    <p className="text-xl text-muted-foreground max-w-4xl mx-auto">
                      Complete administrative control center for managing projects, users, content, and system operations. 
                      This guide covers all administrative functions, workflows, and best practices.
                    </p>
                  </div>

                  {/* Main Feature Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Settings className="w-5 h-5 text-primary" />
                          Content Management
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Manage project templates, tools/materials catalog, and knowledge base content with full revision control.
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-accent" />
                          User & Security Management
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Control user access, monitor security events, manage agreements, and maintain system security posture.
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-secondary/20 bg-gradient-to-br from-secondary/5 to-secondary/10">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-secondary" />
                          Analytics & Insights
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Monitor project performance, user engagement, and system health with comprehensive analytics and reporting.
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Getting Started Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Info className="w-5 h-5 text-primary" />
                        Getting Started as an Administrator
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            Essential First Steps
                          </h4>
                          <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="flex items-start gap-2">
                              <span className="text-primary">•</span>
                              Review current project templates and user activity
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-primary">•</span>
                              Check security dashboard for any pending issues
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-primary">•</span>
                              Verify tools/materials catalog is up to date
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-primary">•</span>
                              Review recent analytics for system health
                            </li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <RefreshCw className="w-4 h-4 text-blue-500" />
                            Regular Maintenance Tasks
                          </h4>
                          <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="flex items-start gap-2">
                              <span className="text-primary">•</span>
                              Weekly security and user activity review
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-primary">•</span>
                              Monthly analytics analysis and reporting
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-primary">•</span>
                              Quarterly template performance evaluation
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-primary">•</span>
                              Ongoing knowledge base and catalog updates
                            </li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="functions" className="h-full">
              <ScrollArea className="h-full">
                <div className="space-y-6 p-6">
                  <div className="text-center space-y-2 mb-8">
                    <h2 className="text-2xl font-bold">Administrative Functions Guide</h2>
                    <p className="text-muted-foreground">Detailed breakdown of each administrative function and its capabilities</p>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    {adminFunctions.map((func) => (
                      <Card key={func.id} className="border-l-4 border-l-primary">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-3">
                            <func.icon className="w-6 h-6 text-primary" />
                            {func.name}
                          </CardTitle>
                          <p className="text-muted-foreground">{func.description}</p>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <Zap className="w-4 h-4 text-primary" />
                                Key Features
                              </h4>
                              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                {func.keyFeatures.map((feature, index) => (
                                  <li key={index} className="flex items-start gap-2">
                                    <span className="text-primary text-xs mt-1">•</span>
                                    <span className="text-muted-foreground">{feature}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="workflows" className="h-full">
              <ScrollArea className="h-full">
                <div className="space-y-6 p-6">
                  <div className="text-center space-y-2 mb-8">
                    <h2 className="text-2xl font-bold">Administrative Workflows & Best Practices</h2>
                    <p className="text-muted-foreground">Common administrative tasks and recommended approaches</p>
                  </div>

                  <Accordion type="single" collapsible className="space-y-4">
                    {adminFunctions.map((func) => (
                      <AccordionItem key={func.id} value={func.id} className="border rounded-lg px-4">
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-3">
                            <func.icon className="w-5 h-5 text-primary" />
                            <span className="font-semibold">{func.name} Workflows</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4">
                          <div className="space-y-4">
                            <h4 className="font-semibold text-primary">Common Administrative Tasks:</h4>
                            <ul className="space-y-3">
                              {func.workflows.map((workflow, index) => (
                                <li key={index} className="flex items-start gap-3">
                                  <Badge variant="outline" className="mt-0.5 text-xs">
                                    {index + 1}
                                  </Badge>
                                  <span className="text-sm text-muted-foreground flex-1">{workflow}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="terminology" className="h-full">
              <ScrollArea className="h-full">
                <div className="space-y-6 p-6">
                  <div className="text-center space-y-2 mb-8">
                    <h2 className="text-2xl font-bold">Technical Terminology</h2>
                    <p className="text-muted-foreground">Key terms and definitions for administrative functions</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {adminFunctions.map((func) => (
                      <Card key={func.id}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <func.icon className="w-5 h-5 text-primary" />
                            {func.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {func.terminology.map((term, index) => (
                              <div key={index} className="border-l-2 border-l-primary/30 pl-4 py-2">
                                <h5 className="font-semibold text-sm text-primary mb-1">{term.term}</h5>
                                <p className="text-xs text-muted-foreground leading-relaxed">{term.definition}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </FullScreenDialog>
  );
}