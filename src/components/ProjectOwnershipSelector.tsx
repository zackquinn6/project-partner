import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { User, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface ProjectOwnershipSelectorProps {
  projectId: string;
  onOwnersChange?: () => void;
  disabled?: boolean;
}

interface ProjectOwnerOption {
  user_id: string;
  email: string;
  display_name: string;
}

interface ProjectOwner {
  id: string;
  user_id: string;
  profiles: {
    email: string;
    display_name: string;
  };
}

export const ProjectOwnershipSelector: React.FC<ProjectOwnershipSelectorProps> = ({
  projectId,
  onOwnersChange,
  disabled = false
}) => {
  const { toast } = useToast();
  const [availableOwners, setAvailableOwners] = useState<ProjectOwnerOption[]>([]);
  const [currentOwners, setCurrentOwners] = useState<ProjectOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('user_id, email, display_name')
          .contains('roles', ['project_owner']);

        if (profileError) throw profileError;

        setAvailableOwners(profileData || []);

        // Load current project owners
        const { data: ownersData, error: ownersError } = await supabase
          .from('project_owners')
          .select('id, user_id')
          .eq('project_id', projectId)
          .is('invitation_status', null);

        if (ownersError) throw ownersError;

        // Get profiles for current owners
        if (ownersData && ownersData.length > 0) {
          const ownerUserIds = ownersData.map(o => o.user_id).filter(Boolean) as string[];
          const { data: ownerProfiles } = await supabase
            .from('user_profiles')
            .select('user_id, email, display_name')
            .in('user_id', ownerUserIds);

          const ownersWithProfiles = ownersData.map(owner => ({
            ...owner,
            profiles: ownerProfiles?.find(p => p.user_id === owner.user_id) || {
              email: '',
              display_name: ''
            }
          }));

          setCurrentOwners(ownersWithProfiles);
        } else {
          setCurrentOwners([]);
        }
      } catch (error) {
        console.error('Error loading project owners:', error);
        toast({
          title: "Error loading project owners",
          description: "Could not load the list of project owners.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [toast, projectId]);

  const handleAddOwner = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('project_owners')
        .insert({
          project_id: projectId,
          user_id: userId,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      // Reload current owners
      const { data: ownersData } = await supabase
        .from('project_owners')
        .select('id, user_id')
        .eq('project_id', projectId)
        .is('invitation_status', null);

      // Get profiles for current owners
      if (ownersData && ownersData.length > 0) {
        const ownerUserIds = ownersData.map(o => o.user_id).filter(Boolean) as string[];
        const { data: ownerProfiles } = await supabase
          .from('user_profiles')
          .select('user_id, email, display_name')
          .in('user_id', ownerUserIds);

        const ownersWithProfiles = ownersData.map(owner => ({
          ...owner,
          profiles: ownerProfiles?.find(p => p.user_id === owner.user_id) || {
            email: '',
            display_name: ''
          }
        }));

        setCurrentOwners(ownersWithProfiles);
      } else {
        setCurrentOwners([]);
      }
      setOpen(false);
      
      toast({
        title: "Owner added",
        description: "Project owner has been added successfully.",
      });

      onOwnersChange?.();
    } catch (error) {
      console.error('Error adding project owner:', error);
      toast({
        title: "Error adding owner",
        description: "Could not add the project owner.",
        variant: "destructive"
      });
    }
  };

  const handleRemoveOwner = async (ownerId: string) => {
    try {
      const { error } = await supabase
        .from('project_owners')
        .delete()
        .eq('id', ownerId);

      if (error) throw error;

      setCurrentOwners(currentOwners.filter(o => o.id !== ownerId));
      
      toast({
        title: "Owner removed",
        description: "Project owner has been removed successfully.",
      });

      onOwnersChange?.();
    } catch (error) {
      console.error('Error removing project owner:', error);
      toast({
        title: "Error removing owner",
        description: "Could not remove the project owner.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading project owners...</div>;
  }

  const currentOwnerIds = currentOwners.map(o => o.user_id);
  const availableToAdd = availableOwners.filter(o => !currentOwnerIds.includes(o.user_id));

  return (
    <div className="space-y-2">
      <Label className="text-sm flex items-center gap-2">
        <User className="w-4 h-4" />
        Project Owners
      </Label>
      
      <div className="flex flex-wrap gap-2">
        {currentOwners.length === 0 ? (
          <p className="text-sm text-muted-foreground">No owners assigned</p>
        ) : (
          currentOwners.map((owner) => (
            <Badge key={owner.id} variant="secondary" className="flex items-center gap-1">
              {owner.profiles?.display_name || owner.profiles?.email || owner.user_id}
              <button
                onClick={() => handleRemoveOwner(owner.id)}
                disabled={disabled}
                className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))
        )}
      </div>

      {availableToAdd.length > 0 && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              className="w-full"
            >
              <User className="w-4 h-4 mr-2" />
              Add Project Owner
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search project owners..." />
              <CommandEmpty>No project owners found.</CommandEmpty>
              <CommandGroup>
                {availableToAdd.map((owner) => (
                  <CommandItem
                    key={owner.user_id}
                    value={owner.email}
                    onSelect={() => handleAddOwner(owner.user_id)}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {owner.display_name || owner.email}
                      </span>
                      {owner.display_name && (
                        <span className="text-xs text-muted-foreground">
                          {owner.email}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      {availableOwners.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No project owners available. Assign the project_owner role to users first.
        </p>
      )}
      
      <p className="text-xs text-muted-foreground">
        Note: Admins automatically have owner access to all projects
      </p>
    </div>
  );
};
