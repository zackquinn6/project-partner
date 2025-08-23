import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Brain, Download, FileText, TrendingUp, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

interface KnowledgeSource {
  id: string;
  name: string;
  url: string;
  type: 'blog' | 'forum' | 'manufacturer' | 'manual';
  category: string;
  lastScrapeAt: Date;
  status: 'active' | 'inactive' | 'error';
  trustScore: number;
}

interface KnowledgeRevision {
  id: string;
  sourceId: string;
  projectType: string;
  stepId: string;
  originalContent: string;
  revisedContent: string;
  changeType: 'improvement' | 'safety_update' | 'new_technique' | 'tool_update';
  impactScore: number;
  appliedAt: Date;
  affectedUsers: number;
  summary: string;
  dataSource: string;
}

interface KnowledgeUpdate {
  id: string;
  title: string;
  content: string;
  projectTypes: string[];
  relevanceScore: number;
  source: string;
  discoveredAt: Date;
  status: 'pending' | 'approved' | 'rejected' | 'integrated';
}

export const KnowledgeIngestionSystem: React.FC = () => {
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [revisions, setRevisions] = useState<KnowledgeRevision[]>([]);
  const [updates, setUpdates] = useState<KnowledgeUpdate[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [newSource, setNewSource] = useState({ name: '', url: '', type: 'blog', category: '' });
  const { toast } = useToast();

  useEffect(() => {
    loadKnowledgeData();
  }, []);

  const loadKnowledgeData = async () => {
    // Load demo data - in production this would fetch from database
    setSources([
      {
        id: '1',
        name: 'Family Handyman',
        url: 'https://familyhandyman.com',
        type: 'blog',
        category: 'general',
        lastScrapeAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        status: 'active',
        trustScore: 9.2
      },
      {
        id: '2',
        name: 'Reddit DIY',
        url: 'https://reddit.com/r/DIY',
        type: 'forum',
        category: 'community',
        lastScrapeAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        status: 'active',
        trustScore: 7.8
      },
      {
        id: '3',
        name: 'Sherwin Williams Tech',
        url: 'https://sherwin-williams.com/homeowners/learn',
        type: 'manufacturer',
        category: 'painting',
        lastScrapeAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        status: 'active',
        trustScore: 9.8
      }
    ]);

    setRevisions([
      {
        id: '1',
        sourceId: '1',
        projectType: 'interior-painting',
        stepId: 'surface-prep',
        originalContent: 'Sand the surface lightly before painting',
        revisedContent: 'Sand the surface with 220-grit sandpaper in circular motions, then wipe clean with tack cloth',
        changeType: 'improvement',
        impactScore: 8.5,
        appliedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        affectedUsers: 127,
        summary: 'Added specific sandpaper grit and technique details based on professional feedback',
        dataSource: 'Professional painter forum feedback analysis'
      },
      {
        id: '2',
        sourceId: '3',
        projectType: 'interior-painting',
        stepId: 'primer-selection',
        originalContent: 'Use a quality primer before painting',
        revisedContent: 'Use a quality primer before painting. For glossy surfaces, use a bonding primer. For stained wood, use a stain-blocking primer.',
        changeType: 'safety_update',
        impactScore: 9.2,
        appliedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
        affectedUsers: 89,
        summary: 'Added surface-specific primer recommendations to prevent paint failure',
        dataSource: 'Sherwin Williams technical bulletin update'
      }
    ]);

    setUpdates([
      {
        id: '1',
        title: 'New Quick-Dry Paint Formula Reduces Wait Time',
        content: 'Recent paint technology allows for recoating in 2 hours instead of 4 for interior latex paints',
        projectTypes: ['interior-painting'],
        relevanceScore: 8.9,
        source: 'Paint Manufacturer Updates',
        discoveredAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
        status: 'pending'
      },
      {
        id: '2',
        title: 'Cordless Oscillating Tool Technique for Precise Cuts',
        content: 'Professional contractors report 40% faster precision cuts using specific blade angles',
        projectTypes: ['flooring', 'trim-work'],
        relevanceScore: 7.6,
        source: 'Professional Contractor Forum',
        discoveredAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
        status: 'approved'
      }
    ]);
  };

  const scanForUpdates = async () => {
    setIsScanning(true);
    
    // Simulate scanning process
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    toast({
      title: "Knowledge Scan Complete",
      description: "Found 3 new updates and 2 potential improvements"
    });
    
    setIsScanning(false);
  };

  const addKnowledgeSource = async () => {
    if (!newSource.name || !newSource.url || !newSource.category) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const source: KnowledgeSource = {
      id: Date.now().toString(),
      ...newSource,
      type: newSource.type as 'blog' | 'forum' | 'manufacturer' | 'manual',
      lastScrapeAt: new Date(),
      status: 'active',
      trustScore: 5.0
    };

    setSources([...sources, source]);
    setNewSource({ name: '', url: '', type: 'blog', category: '' });
    
    toast({
      title: "Knowledge Source Added",
      description: `${source.name} has been added to the ingestion pipeline`
    });
  };

  const approveUpdate = (updateId: string) => {
    setUpdates(updates.map(update => 
      update.id === updateId ? { ...update, status: 'approved' } : update
    ));
    toast({
      title: "Update Approved",
      description: "Knowledge update will be integrated into relevant projects"
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': case 'approved': return 'bg-green-500/10 text-green-500';
      case 'pending': return 'bg-yellow-500/10 text-yellow-500';
      case 'error': case 'rejected': return 'bg-red-500/10 text-red-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Knowledge Ingestion System</h2>
          <p className="text-muted-foreground">Continuously improving project guidance with latest insights</p>
        </div>
        <Button onClick={scanForUpdates} disabled={isScanning} className="gap-2">
          <Brain className="h-4 w-4" />
          {isScanning ? 'Scanning...' : 'Scan for Updates'}
        </Button>
      </div>

      <Tabs defaultValue="sources" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sources">Knowledge Sources</TabsTrigger>
          <TabsTrigger value="updates">Pending Updates</TabsTrigger>
          <TabsTrigger value="revisions">Revision History</TabsTrigger>
          <TabsTrigger value="add-source">Add Source</TabsTrigger>
        </TabsList>

        <TabsContent value="sources" className="space-y-4">
          <div className="grid gap-4">
            {sources.map(source => (
              <Card key={source.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{source.name}</h3>
                        <Badge className={getStatusColor(source.status)}>
                          {source.status}
                        </Badge>
                        <Badge variant="outline">Trust: {source.trustScore}/10</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{source.url}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Type: {source.type}</span>
                        <span>Category: {source.category}</span>
                        <span>Last scan: {source.lastScrapeAt.toLocaleString()}</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Scan Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="updates" className="space-y-4">
          <div className="grid gap-4">
            {updates.map(update => (
              <Card key={update.id}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{update.title}</h3>
                          <Badge className={getStatusColor(update.status)}>
                            {update.status}
                          </Badge>
                          <Badge variant="outline">Score: {update.relevanceScore}/10</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{update.content}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Projects: {update.projectTypes.join(', ')}</span>
                          <span>Source: {update.source}</span>
                          <span>Found: {update.discoveredAt.toLocaleString()}</span>
                        </div>
                      </div>
                      {update.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => approveUpdate(update.id)}
                            className="gap-1"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Approve
                          </Button>
                          <Button variant="outline" size="sm">
                            <AlertTriangle className="h-4 w-4" />
                            Review
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="revisions" className="space-y-4">
          <div className="grid gap-4">
            {revisions.map(revision => (
              <Card key={revision.id}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{revision.changeType}</Badge>
                        <Badge>Impact: {revision.impactScore}/10</Badge>
                        <span className="text-sm text-muted-foreground">
                          {revision.affectedUsers} users affected
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {revision.appliedAt.toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">{revision.summary}</h4>
                      <p className="text-sm text-muted-foreground">
                        Project: {revision.projectType} | Step: {revision.stepId}
                      </p>
                    </div>

                    <div className="grid gap-2">
                      <div>
                        <span className="text-sm font-medium text-red-600">Before:</span>
                        <p className="text-sm bg-red-50 p-2 rounded border-l-2 border-red-200">
                          {revision.originalContent}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-green-600">After:</span>
                        <p className="text-sm bg-green-50 p-2 rounded border-l-2 border-green-200">
                          {revision.revisedContent}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Data Source: {revision.dataSource}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="add-source" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add New Knowledge Source</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <label className="text-sm font-medium">Source Name</label>
                  <Input
                    placeholder="e.g., Home Depot DIY Blog"
                    value={newSource.name}
                    onChange={(e) => setNewSource({...newSource, name: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">URL</label>
                  <Input
                    placeholder="https://..."
                    value={newSource.url}
                    onChange={(e) => setNewSource({...newSource, url: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Source Type</label>
                    <Select 
                      value={newSource.type} 
                      onValueChange={(value) => setNewSource({...newSource, type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="blog">Blog</SelectItem>
                        <SelectItem value="forum">Forum</SelectItem>
                        <SelectItem value="manufacturer">Manufacturer</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <Input
                      placeholder="e.g., painting, plumbing"
                      value={newSource.category}
                      onChange={(e) => setNewSource({...newSource, category: e.target.value})}
                    />
                  </div>
                </div>

                <Button onClick={addKnowledgeSource} className="w-full">
                  Add Knowledge Source
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};