import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ResponsiveDialog } from '@/components/ResponsiveDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PropertySyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  homeId: string;
  homeAddress: string;
  onSyncComplete: () => void;
}

export const ZillowSyncDialog = ({ 
  open, 
  onOpenChange, 
  homeId, 
  homeAddress,
  onSyncComplete 
}: PropertySyncDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [squareFootage, setSquareFootage] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');

  const handleSubmit = async () => {
    if (!squareFootage && !bedrooms && !bathrooms) {
      toast.error('Please enter at least one property detail');
      return;
    }

    setIsLoading(true);
    try {
      const { data: existingDetails } = await supabase
        .from('home_details')
        .select('*')
        .eq('home_id', homeId)
        .maybeSingle();

      const detailsData = {
        home_id: homeId,
        square_footage: squareFootage ? parseInt(squareFootage) : null,
        bedrooms: bedrooms ? parseInt(bedrooms) : null,
        bathrooms: bathrooms ? parseFloat(bathrooms) : null,
      };

      if (existingDetails) {
        await supabase
          .from('home_details')
          .update(detailsData)
          .eq('home_id', homeId);
      } else {
        await supabase
          .from('home_details')
          .insert(detailsData);
      }

      // Create bedroom spaces
      if (bedrooms && parseInt(bedrooms) > 0) {
        const bedroomCount = parseInt(bedrooms);
        for (let i = 1; i <= bedroomCount; i++) {
          await supabase.from('home_spaces').insert({
            home_id: homeId,
            space_name: `Bedroom ${i}`,
            space_type: 'bedroom'
          });
        }
      }

      // Create bathroom spaces
      if (bathrooms && parseFloat(bathrooms) > 0) {
        const bathroomCount = Math.ceil(parseFloat(bathrooms));
        for (let i = 1; i <= bathroomCount; i++) {
          await supabase.from('home_spaces').insert({
            home_id: homeId,
            space_name: `Bathroom ${i}`,
            space_type: 'bathroom'
          });
        }
      }

      toast.success('Home data saved successfully!');
      onSyncComplete();
      onOpenChange(false);
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Error saving home data:', error);
      toast.error('Failed to save home data');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) {
          setSquareFootage('');
          setBedrooms('');
          setBathrooms('');
        }
      }}
      title="Add Property Details"
      description={`Enter details for ${homeAddress}`}
      className="z-[150]"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="squareFootage">Square Footage</Label>
          <Input
            id="squareFootage"
            type="number"
            placeholder="e.g., 2000"
            value={squareFootage}
            onChange={(e) => setSquareFootage(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bedrooms">Number of Bedrooms</Label>
          <Input
            id="bedrooms"
            type="number"
            placeholder="e.g., 3"
            value={bedrooms}
            onChange={(e) => setBedrooms(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bathrooms">Number of Bathrooms</Label>
          <Input
            id="bathrooms"
            type="number"
            step="0.5"
            placeholder="e.g., 2.5"
            value={bathrooms}
            onChange={(e) => setBathrooms(e.target.value)}
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Property Details'
          )}
        </Button>
      </div>
    </ResponsiveDialog>
  );
};
