import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Database, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DataSource {
  id: string;
  name: string;
  type: 'tool_rentals' | 'community_posts' | 'knowledge_base';
  lastRefresh: Date;
  status: 'active' | 'inactive' | 'error';
  autoRefreshDays: number;
}

export function AdminDataRefresh() {
  const { toast } = useToast();
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [dataSources, setDataSources] = useState<DataSource[]>([
    {
      id: '1',
      name: 'Tool Rental Centers',
      type: 'tool_rentals',
      lastRefresh: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      status: 'active',
      autoRefreshDays: 30
    },
    {
      id: '2',
      name: 'Tool Library Pricing Data',
      type: 'tool_rentals',
      lastRefresh: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      status: 'active',
      autoRefreshDays: 7
    },
    {
      id: '3',
      name: 'Community Posts & Forums',
      type: 'community_posts',
      lastRefresh: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      status: 'active',
      autoRefreshDays: 30
    },
    {
      id: '4',
      name: 'Knowledge Base Articles',
      type: 'knowledge_base',
      lastRefresh: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      status: 'active',
      autoRefreshDays: 14
    }
  ]);

  const handleManualRefresh = async (sourceId: string) => {
    setRefreshing(sourceId);
    const source = dataSources.find(s => s.id === sourceId);
    
    try {
      // Simulate API call to refresh data
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update the data source
      setDataSources(prev => prev.map(ds => 
        ds.id === sourceId 
          ? { ...ds, lastRefresh: new Date(), status: 'active' as const }
          : ds
      ));
      
      toast({
        title: "Data Refreshed",
        description: `${source?.name} data has been successfully updated.`
      });
    } catch (error) {
      setDataSources(prev => prev.map(ds => 
        ds.id === sourceId 
          ? { ...ds, status: 'error' as const }
          : ds
      ));
      
      toast({
        title: "Refresh Failed",
        description: `Failed to refresh ${source?.name} data. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setRefreshing(null);
    }
  };

  const updateAutoRefreshDays = (sourceId: string, days: number) => {
    setDataSources(prev => prev.map(ds => 
      ds.id === sourceId 
        ? { ...ds, autoRefreshDays: days }
        : ds
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getDaysUntilRefresh = (lastRefresh: Date, autoRefreshDays: number) => {
    const daysSinceRefresh = Math.floor((Date.now() - lastRefresh.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, autoRefreshDays - daysSinceRefresh);
  };

  const isOverdue = (lastRefresh: Date, autoRefreshDays: number) => {
    const daysSinceRefresh = Math.floor((Date.now() - lastRefresh.getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceRefresh >= autoRefreshDays;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Internet Data Refresh Management
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Manage automatic and manual refresh schedules for external data sources including tool rental centers, tool library pricing data, and community forums.
          </p>
        </CardHeader>
      </Card>

      <div className="grid gap-4">
        {dataSources.map((source) => (
          <Card key={source.id} className={`transition-colors ${isOverdue(source.lastRefresh, source.autoRefreshDays) ? 'border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(source.status)}
                    <CardTitle className="text-lg">{source.name}</CardTitle>
                  </div>
                  <Badge className={getStatusColor(source.status)}>
                    {source.status}
                  </Badge>
                  {isOverdue(source.lastRefresh, source.autoRefreshDays) && (
                    <Badge variant="outline" className="border-orange-500 text-orange-700 dark:text-orange-300">
                      Overdue
                    </Badge>
                  )}
                </div>
                <Button
                  onClick={() => handleManualRefresh(source.id)}
                  disabled={refreshing === source.id}
                  size="sm"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${refreshing === source.id ? 'animate-spin' : ''}`} />
                  {refreshing === source.id ? 'Refreshing...' : 'Refresh Now'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Last Refresh</Label>
                  <p className="font-medium">
                    {source.lastRefresh.toLocaleDateString()} at {source.lastRefresh.toLocaleTimeString()}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Next Auto Refresh</Label>
                  <p className="font-medium">
                    {getDaysUntilRefresh(source.lastRefresh, source.autoRefreshDays) === 0 
                      ? 'Due now' 
                      : `In ${getDaysUntilRefresh(source.lastRefresh, source.autoRefreshDays)} days`
                    }
                  </p>
                </div>
                <div>
                  <Label htmlFor={`refresh-${source.id}`} className="text-xs text-muted-foreground">
                    Auto Refresh Frequency (days)
                  </Label>
                  <Select
                    value={source.autoRefreshDays.toString()}
                    onValueChange={(value) => updateAutoRefreshDays(source.id, parseInt(value))}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Daily</SelectItem>
                      <SelectItem value="3">Every 3 days</SelectItem>
                      <SelectItem value="7">Weekly</SelectItem>
                      <SelectItem value="14">Bi-weekly</SelectItem>
                      <SelectItem value="30">Monthly</SelectItem>
                      <SelectItem value="60">Bi-monthly</SelectItem>
                      <SelectItem value="90">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Progress bar showing time since last refresh */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Days since last refresh</span>
                  <span>
                    {Math.floor((Date.now() - source.lastRefresh.getTime()) / (1000 * 60 * 60 * 24))} / {source.autoRefreshDays}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      isOverdue(source.lastRefresh, source.autoRefreshDays) 
                        ? 'bg-red-500' 
                        : 'bg-blue-500'
                    }`}
                    style={{
                      width: `${Math.min(100, (Math.floor((Date.now() - source.lastRefresh.getTime()) / (1000 * 60 * 60 * 24)) / source.autoRefreshDays) * 100)}%`
                    }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4" />
            <p>
              <strong>Note:</strong> Manual refreshes will fetch the latest data from external sources. 
              Auto-refresh is performed automatically based on the configured frequency.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}