import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Home, MapPin, Bed, Bath, Square, Calendar, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ZillowMatch {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  homeAge: number | null;
  squareFootage: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  zillowUrl: string;
}

interface ZillowSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  homeId: string;
  homeAddress: string;
  onSyncComplete: () => void;
}

export const ZillowSyncDialog: React.FC<ZillowSyncDialogProps> = ({
  open,
  onOpenChange,
  homeId,
  homeAddress,
  onSyncComplete
}) => {
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<ZillowMatch[]>([]);
  const [showMatches, setShowMatches] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('scrape-zillow-data', {
        body: { address: homeAddress }
      });

      if (error) throw error;

      if (data.success && data.matches) {
        setMatches(data.matches);
        setShowMatches(true);
        
        if (data.blocked) {
          toast.warning(data.message || 'Zillow data unavailable. Please enter details manually.');
        } else if (data.matches.length === 1 && !data.blocked) {
          // Auto-select if only one match and not blocked
          await handleSelectMatch(data.matches[0]);
        }
      } else {
        throw new Error(data.error || 'Failed to fetch Zillow data');
      }
    } catch (error) {
      console.error('Error searching Zillow:', error);
      toast.error('Unable to connect to Zillow. You can enter home details manually instead.');
      // Show empty match for manual entry
      setMatches([{
        address: homeAddress,
        city: '',
        state: '',
        zipCode: '',
        homeAge: null,
        squareFootage: null,
        bedrooms: null,
        bathrooms: null,
        zillowUrl: '',
      }]);
      setShowMatches(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMatch = async (match: ZillowMatch) => {
    try {
      // Check if home_details already exists
      const { data: existing } = await supabase
        .from('home_details')
        .select('id')
        .eq('home_id', homeId)
        .single();

      const homeDetailsData = {
        home_id: homeId,
        home_age: match.homeAge,
        square_footage: match.squareFootage,
        bedrooms: match.bedrooms,
        bathrooms: match.bathrooms,
        zillow_url: match.zillowUrl,
        last_synced_at: new Date().toISOString()
      };

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('home_details')
          .update(homeDetailsData)
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('home_details')
          .insert(homeDetailsData);

        if (error) throw error;
      }

      // Auto-create spaces from bedroom/bathroom counts
      if (match.bedrooms || match.bathrooms) {
        const spacesToCreate = [];
        
        if (match.bedrooms) {
          for (let i = 1; i <= match.bedrooms; i++) {
            spacesToCreate.push({
              home_id: homeId,
              name: `Bedroom ${i}`,
              type: 'bedroom',
              scale_unit: match.squareFootage ? Math.floor(match.squareFootage / (match.bedrooms + (match.bathrooms || 0))) : null
            });
          }
        }
        
        if (match.bathrooms) {
          const fullBaths = Math.floor(match.bathrooms);
          const hasHalfBath = match.bathrooms % 1 !== 0;
          
          for (let i = 1; i <= fullBaths; i++) {
            spacesToCreate.push({
              home_id: homeId,
              name: `Bathroom ${i}`,
              type: 'bathroom',
              scale_unit: match.squareFootage ? Math.floor(match.squareFootage / ((match.bedrooms || 0) + match.bathrooms)) : null
            });
          }
          
          if (hasHalfBath) {
            spacesToCreate.push({
              home_id: homeId,
              name: 'Half Bath',
              type: 'bathroom',
              scale_unit: match.squareFootage ? Math.floor(match.squareFootage / ((match.bedrooms || 0) + match.bathrooms)) : null
            });
          }
        }

        if (spacesToCreate.length > 0) {
          const { error: spacesError } = await supabase
            .from('home_spaces')
            .insert(spacesToCreate);

          if (spacesError) {
            console.error('Error creating spaces:', spacesError);
            toast.warning('Home details saved, but could not auto-create spaces');
          } else {
            toast.success(`Home data synced and ${spacesToCreate.length} spaces created!`);
          }
        } else {
          toast.success('Home data synced successfully!');
        }
      } else {
        toast.success('Home data synced successfully!');
      }

      onSyncComplete();
      onOpenChange(false);
      
      // Trigger a data refresh
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Error saving home details:', error);
      toast.error('Failed to save home details');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sync Data with Zillow</DialogTitle>
          <DialogDescription>
            Search Zillow for property data including square footage, bedrooms, and bathrooms.
          </DialogDescription>
        </DialogHeader>

        {!showMatches ? (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Searching for:</span>
              </div>
              <p className="text-sm">{homeAddress}</p>
            </div>

            <Button 
              onClick={handleSearch}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Searching Zillow...' : 'Search Zillow'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {matches.length > 1 ? 'Select Your Property' : 'Property Found'}
              </h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowMatches(false)}
              >
                Search Again
              </Button>
            </div>

            {matches.length > 1 && (
              <p className="text-sm text-muted-foreground">
                We found {matches.length} properties. Please select the correct one:
              </p>
            )}

            <div className="space-y-3">
              {matches.map((match, index) => (
                <Card 
                  key={index}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleSelectMatch(match)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Home className="w-4 h-4 text-primary" />
                          <h4 className="font-medium">{match.address}</h4>
                        </div>
                        {match.city && match.state && (
                          <p className="text-sm text-muted-foreground">
                            {match.city}, {match.state} {match.zipCode}
                          </p>
                        )}
                      </div>
                      {match.zillowUrl && (
                        <a
                          href={match.zillowUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-primary hover:text-primary/80"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {match.bedrooms !== null && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Bed className="w-3 h-3" />
                          {match.bedrooms} bed
                        </Badge>
                      )}
                      {match.bathrooms !== null && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Bath className="w-3 h-3" />
                          {match.bathrooms} bath
                        </Badge>
                      )}
                      {match.squareFootage !== null && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Square className="w-3 h-3" />
                          {match.squareFootage.toLocaleString()} sqft
                        </Badge>
                      )}
                      {match.homeAge !== null && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {match.homeAge} years old
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};