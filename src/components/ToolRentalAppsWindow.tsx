import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Star, MapPin } from 'lucide-react';

interface ToolRentalApp {
  id: string;
  name: string;
  description: string;
  website: string;
  rating: number;
  coverage: string;
}

interface ToolRentalAppsWindowProps {
  open: boolean;
  onClose: () => void;
}

export function ToolRentalAppsWindow({ open, onClose }: ToolRentalAppsWindowProps) {
  const toolRentalApps: ToolRentalApp[] = [
    {
      id: 'community-tools',
      name: 'Community Tools',
      description: 'A peer-to-peer tool rental platform in Australia that connects tool owners with those in need of tools.',
      website: 'https://communitytools.com.au',
      rating: 4.2,
      coverage: 'Australia'
    },
    {
      id: 'rentmytool',
      name: 'RentMyTool',
      description: 'This app allows users to rent out tools, equipment, and sporting gear to their community, helping generate income from underutilized items.',
      website: 'https://rentmytool.com',
      rating: 4.0,
      coverage: 'North America'
    },
    {
      id: 'share-my-tools',
      name: 'Share My Tools',
      description: 'A marketplace for renting various tools like drills and ladders within your local community.',
      website: 'https://sharemytools.com',
      rating: 3.8,
      coverage: 'United States'
    },
    {
      id: 'rease',
      name: 'Rease',
      description: 'Australia\'s largest online rental marketplace, offering a wide range of rental options, including tools.',
      website: 'https://rease.com.au',
      rating: 4.3,
      coverage: 'Australia'
    },
    {
      id: 'toolbevy',
      name: 'ToolBevy',
      description: 'An app that enables neighbors to rent tools from each other, promoting community sharing.',
      website: 'https://toolbevy.com',
      rating: 3.9,
      coverage: 'United States & Canada'
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Tool Rental Apps
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Peer-to-peer and community tool rental platforms that connect you with local tool owners.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {toolRentalApps.map((app) => (
              <Card key={app.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-semibold text-lg">{app.name}</h4>
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>{app.rating}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
                    <MapPin className="h-4 w-4" />
                    <span>{app.coverage}</span>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-4">
                    {app.description}
                  </p>
                  
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <a href={app.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Visit App
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}