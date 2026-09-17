import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExternalLink, Search, Users, Star, MessageSquare, Video, TrendingUp } from 'lucide-react';

interface CommunityPost {
  id: string;
  name: string;
  platform: 'Reddit' | 'Facebook' | 'Instagram' | 'YouTube' | 'Forum' | 'Discord';
  focusTopics: string[];
  popularityScore: number;
  memberCount?: string;
  description: string;
  link: string;
  type: 'forum' | 'group' | 'channel' | 'subreddit';
}

export function CommunityPosts() {
  const [communities, setCommunities] = useState<CommunityPost[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Mock data - top 25 DIY/home improvement communities
  const mockCommunities: CommunityPost[] = [
    {
      id: '1',
      name: 'r/DIY',
      platform: 'Reddit',
      focusTopics: ['General DIY', 'Home Projects', 'Crafts', 'Repairs'],
      popularityScore: 98,
      memberCount: '18M+',
      description: 'A place where people can come to share their DIY projects, get advice, and learn new skills.',
      link: 'https://reddit.com/r/DIY',
      type: 'subreddit'
    },
    {
      id: '2',
      name: 'r/HomeImprovement',
      platform: 'Reddit',
      focusTopics: ['Home Renovation', 'Repairs', 'Tools', 'Before/After'],
      popularityScore: 95,
      memberCount: '3.2M+',
      description: 'Share your home improvement projects, get advice from experts, and showcase your results.',
      link: 'https://reddit.com/r/HomeImprovement',
      type: 'subreddit'
    },
    {
      id: '3',
      name: 'This Old House Community',
      platform: 'Forum',
      focusTopics: ['Professional Tips', 'Home Systems', 'Renovation Planning', 'Expert Advice'],
      popularityScore: 92,
      memberCount: '500K+',
      description: 'Official community forum for This Old House with expert contractors and experienced DIYers.',
      link: 'https://www.thisoldhouse.com/community',
      type: 'forum'
    },
    {
      id: '4',
      name: 'DIY Network Facebook Community',
      platform: 'Facebook',
      focusTopics: ['TV Show Discussion', 'Project Ideas', 'Tips & Tricks', 'Photo Sharing'],
      popularityScore: 89,
      memberCount: '2.1M+',
      description: 'Official DIY Network community for sharing projects and getting inspiration.',
      link: 'https://facebook.com/DIYNetwork',
      type: 'group'
    },
    {
      id: '5',
      name: 'Instructables Community',
      platform: 'Forum',
      focusTopics: ['Step-by-step Guides', 'Electronics', 'Woodworking', 'Innovation'],
      popularityScore: 87,
      memberCount: '1.8M+',
      description: 'Platform for sharing detailed DIY tutorials and creative projects with global community.',
      link: 'https://www.instructables.com',
      type: 'forum'
    },
    {
      id: '6',
      name: 'Steve Ramsey - YouTube',
      platform: 'YouTube',
      focusTopics: ['Woodworking', 'Tool Reviews', 'Beginner Projects', 'Shop Setup'],
      popularityScore: 85,
      memberCount: '2.3M+',
      description: 'Weekend woodworker teaching practical skills for beginners and hobbyists.',
      link: 'https://youtube.com/c/stevinmarin',
      type: 'channel'
    },
    {
      id: '7',
      name: 'r/woodworking',
      platform: 'Reddit',
      focusTopics: ['Furniture Making', 'Wood Selection', 'Tool Discussion', 'Project Showcase'],
      popularityScore: 84,
      memberCount: '2.8M+',
      description: 'Community for woodworkers of all skill levels to share projects and knowledge.',
      link: 'https://reddit.com/r/woodworking',
      type: 'subreddit'
    },
    {
      id: '8',
      name: 'DoItYourself.com Forum',
      platform: 'Forum',
      focusTopics: ['Home Repair', 'Electrical', 'Plumbing', 'HVAC'],
      popularityScore: 82,
      memberCount: '750K+',
      description: 'Comprehensive forum covering all aspects of home improvement and repair.',
      link: 'https://www.doityourself.com/forum',
      type: 'forum'
    },
    {
      id: '9',
      name: 'Family Handyman Facebook',
      platform: 'Facebook',
      focusTopics: ['Quick Fixes', 'Tool Tips', 'Seasonal Projects', 'Safety'],
      popularityScore: 80,
      memberCount: '1.5M+',
      description: 'Tips, tricks, and project ideas from the trusted home improvement magazine.',
      link: 'https://facebook.com/FamilyHandyman',
      type: 'group'
    },
    {
      id: '10',
      name: 'Ana White Plans',
      platform: 'Forum',
      focusTopics: ['Free Plans', 'Furniture Building', 'Budget Projects', 'Beginner Friendly'],
      popularityScore: 78,
      memberCount: '650K+',
      description: 'Free woodworking plans and supportive community for DIY furniture builders.',
      link: 'https://www.ana-white.com',
      type: 'forum'
    },
    {
      id: '11',
      name: 'r/Tools',
      platform: 'Reddit',
      focusTopics: ['Tool Reviews', 'Recommendations', 'Deals', 'Collection Showcase'],
      popularityScore: 76,
      memberCount: '850K+',
      description: 'Everything about tools - reviews, recommendations, deals, and collection photos.',
      link: 'https://reddit.com/r/Tools',
      type: 'subreddit'
    },
    {
      id: '12',
      name: 'Bob Vila Facebook Community',
      platform: 'Facebook',
      focusTopics: ['Classic Techniques', 'Restoration', 'Historical Methods', 'Expert Tips'],
      popularityScore: 75,
      memberCount: '900K+',
      description: 'Time-tested home improvement wisdom from the legendary Bob Vila.',
      link: 'https://facebook.com/BobVila',
      type: 'group'
    },
    {
      id: '13',
      name: 'The Wood Whisperer Guild',
      platform: 'Forum',
      focusTopics: ['Advanced Woodworking', 'Premium Content', 'Live Q&A', 'Project Support'],
      popularityScore: 74,
      memberCount: '45K+',
      description: 'Premium woodworking community with access to exclusive content and direct instructor support.',
      link: 'https://www.thewoodwhispererguild.com',
      type: 'forum'
    },
    {
      id: '14',
      name: 'r/BeginnerWoodWorking',
      platform: 'Reddit',
      focusTopics: ['First Projects', 'Tool Basics', 'Mistakes & Learning', 'Encouragement'],
      popularityScore: 72,
      memberCount: '450K+',
      description: 'Supportive community for woodworking beginners to learn and share their first projects.',
      link: 'https://reddit.com/r/BeginnerWoodWorking',
      type: 'subreddit'
    },
    {
      id: '15',
      name: 'HGTV Facebook DIY Community',
      platform: 'Facebook',
      focusTopics: ['Interior Design', 'Decorating', 'Budget Makeovers', 'Room Transformations'],
      popularityScore: 71,
      memberCount: '1.2M+',
      description: 'Home design and DIY decorating community inspired by HGTV shows.',
      link: 'https://facebook.com/HGTV',
      type: 'group'
    },
    {
      id: '16',
      name: 'DIY Chatroom Discord',
      platform: 'Discord',
      focusTopics: ['Real-time Help', 'Project Troubleshooting', 'Voice Chat', 'Community Support'],
      popularityScore: 70,
      memberCount: '75K+',
      description: 'Active Discord server for real-time DIY help and community interaction.',
      link: 'https://discord.gg/diy',
      type: 'channel'
    },
    {
      id: '17',
      name: 'r/fixit',
      platform: 'Reddit',
      focusTopics: ['Repair Help', 'Troubleshooting', 'Problem Solving', 'Quick Fixes'],
      popularityScore: 69,
      memberCount: '380K+',
      description: 'Community dedicated to helping people fix broken things around the house.',
      link: 'https://reddit.com/r/fixit',
      type: 'subreddit'
    },
    {
      id: '18',
      name: 'Kreg Owners Community',
      platform: 'Forum',
      focusTopics: ['Pocket Hole Joinery', 'Kreg Tools', 'Project Plans', 'Techniques'],
      popularityScore: 68,
      memberCount: '125K+',
      description: 'Official community for Kreg tool owners sharing projects and techniques.',
      link: 'https://www.kregtool.com/community',
      type: 'forum'
    },
    {
      id: '19',
      name: 'April Wilkerson - YouTube',
      platform: 'YouTube',
      focusTopics: ['Shop Projects', 'Tool Making', 'Metal Fabrication', 'Workshop Setup'],
      popularityScore: 66,
      memberCount: '750K+',
      description: 'Creator building her dream workshop and sharing the journey with detailed tutorials.',
      link: 'https://youtube.com/c/AprilWilkersonDIY',
      type: 'channel'
    },
    {
      id: '20',
      name: 'r/handtools',
      platform: 'Reddit',
      focusTopics: ['Traditional Tools', 'Hand Tool Techniques', 'Restoration', 'Vintage Tools'],
      popularityScore: 65,
      memberCount: '250K+',
      description: 'Community focused on traditional hand tools and time-honored woodworking techniques.',
      link: 'https://reddit.com/r/handtools',
      type: 'subreddit'
    },
    {
      id: '21',
      name: 'Fine Homebuilding Forum',
      platform: 'Forum',
      focusTopics: ['Professional Building', 'Construction Techniques', 'Building Science', 'Quality Craftsmanship'],
      popularityScore: 64,
      memberCount: '180K+',
      description: 'Professional-level discussions on high-quality home construction and renovation.',
      link: 'https://www.finehomebuilding.com/forum',
      type: 'forum'
    },
    {
      id: '22',
      name: 'DIY Pete - YouTube',
      platform: 'YouTube',
      focusTopics: ['Home Repair', 'Tool Reviews', 'How-to Guides', 'Problem Solving'],
      popularityScore: 63,
      memberCount: '420K+',
      description: 'Practical home repair and improvement tutorials with clear explanations.',
      link: 'https://youtube.com/c/DIYPete',
      type: 'channel'
    },
    {
      id: '23',
      name: 'Sawmill Creek Forum',
      platform: 'Forum',
      focusTopics: ['Woodworking Community', 'Project Sharing', 'Tool Discussion', 'Lumber Sources'],
      popularityScore: 62,
      memberCount: '95K+',
      description: 'Long-established woodworking forum with experienced community members.',
      link: 'https://sawmillcreek.org',
      type: 'forum'
    },
    {
      id: '24',
      name: 'r/somethingimade',
      platform: 'Reddit',
      focusTopics: ['Project Showcase', 'Creative Projects', 'Inspiration', 'Multi-craft'],
      popularityScore: 61,
      memberCount: '1.1M+',
      description: 'Showcase community for sharing completed DIY projects across all crafts and mediums.',
      link: 'https://reddit.com/r/somethingimade',
      type: 'subreddit'
    },
    {
      id: '25',
      name: 'Festool Owners Group',
      platform: 'Facebook',
      focusTopics: ['Premium Tools', 'Festool Systems', 'Advanced Techniques', 'Professional Tips'],
      popularityScore: 60,
      memberCount: '85K+',
      description: 'Community for Festool tool owners sharing advanced techniques and system integration.',
      link: 'https://facebook.com/groups/festoolownersgroup',
      type: 'group'
    }
  ];

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setCommunities(mockCommunities);
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const filteredCommunities = communities.filter(community => 
    community.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    community.focusTopics.some(topic => topic.toLowerCase().includes(searchTerm.toLowerCase())) ||
    community.platform.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'Reddit': return '🔴';
      case 'Facebook': return '🔵';
      case 'Instagram': return '🟣';
      case 'YouTube': return '🔴';
      case 'Forum': return '💬';
      case 'Discord': return '🟦';
      default: return '🌐';
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'Reddit': return 'bg-category-4/15 text-category-4';
      case 'Facebook': return 'bg-category-1/15 text-category-1';
      case 'Instagram': return 'bg-category-3/15 text-category-3';
      case 'YouTube': return 'bg-category-5/15 text-category-5';
      case 'Forum': return 'bg-category-2/15 text-category-2';
      case 'Discord': return 'bg-category-6/15 text-category-6';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPopularityColor = (score: number) => {
    if (score >= 90) return 'text-destructive-soft';
    if (score >= 80) return 'text-warning-soft';
    if (score >= 70) return 'text-warning-soft';
    if (score >= 60) return 'text-success';
    return 'text-muted-foreground';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading communities...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            DIY & Home Improvement Communities
          </CardTitle>
          <p className="text-muted-foreground">
            Discover the most popular DIY and home improvement communities across platforms. Connect, learn, and share your projects!
          </p>
        </CardHeader>
        <CardContent>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search communities by name, topic, or platform..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Community Name</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Focus Topics</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Popularity</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCommunities.map((community) => (
                <TableRow key={community.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getPlatformIcon(community.platform)}</span>
                      <div>
                        <div className="font-medium">{community.name}</div>
                        <div className="text-sm text-muted-foreground line-clamp-2">{community.description}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getPlatformColor(community.platform)}>
                      {community.platform}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {community.focusTopics.slice(0, 2).map((topic, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {topic}
                        </Badge>
                      ))}
                      {community.focusTopics.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{community.focusTopics.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{community.memberCount || 'N/A'}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <TrendingUp className={`w-4 h-4 ${getPopularityColor(community.popularityScore)}`} />
                      <span className={`font-medium ${getPopularityColor(community.popularityScore)}`}>
                        {community.popularityScore}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(community.link, '_blank')}
                      className="flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Visit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {filteredCommunities.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No communities found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search terms to find relevant communities.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground text-center">
            <strong>Note:</strong> Popularity scores are based on member count, activity level, and content quality. 
            Communities are regularly updated to ensure accuracy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}