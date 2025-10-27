import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { User } from 'lucide-react';

interface ProjectOwnershipSelectorProps {
  projectId: string;
  currentOwnerId: string | null;
  onOwnerChange: (ownerId: string | null) => void;
  disabled?: boolean;
}

interface ProjectOwnerOption {
  user_id: string;
  email: string;
  display_name: string;
}

export const ProjectOwnershipSelector: React.FC<ProjectOwnershipSelectorProps> = ({
  projectId,
  currentOwnerId,
  onOwnerChange,
  disabled = false
}) => {
  const { toast } = useToast();
  const [projectOwners, setProjectOwners] = useState<ProjectOwnerOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProjectOwners = async () => {
      try {
        // Get all users with project_owner role
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'project_owner');

        if (roleError) throw roleError;

        if (!roleData || roleData.length === 0) {
          setProjectOwners([]);
          setLoading(false);
          return;
        }

        const userIds = roleData.map(r => r.user_id);

        // Get profiles for these users
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, email, display_name')
          .in('user_id', userIds);

        if (profileError) throw profileError;

        setProjectOwners(profileData || []);
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

    loadProjectOwners();
  }, [toast]);

  const handleOwnerChange = async (value: string) => {
    const newOwnerId = value === 'none' ? null : value;
    
    try {
      const { error } = await supabase
        .from('projects')
        .update({ owner_id: newOwnerId })
        .eq('id', projectId);

      if (error) throw error;

      onOwnerChange(newOwnerId);
      
      toast({
        title: "Owner updated",
        description: newOwnerId 
          ? "Project owner has been assigned successfully."
          : "Project owner has been removed.",
      });
    } catch (error) {
      console.error('Error updating project owner:', error);
      toast({
        title: "Error updating owner",
        description: "Could not update the project owner.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading project owners...</div>;
  }

  return (
    <div className="space-y-1">
      <Label className="text-sm flex items-center gap-2">
        <User className="w-4 h-4" />
        Project Owner
      </Label>
      <Select
        value={currentOwnerId || 'none'}
        onValueChange={handleOwnerChange}
        disabled={disabled}
      >
        <SelectTrigger className="text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No Owner Assigned</SelectItem>
          {projectOwners.map((owner) => (
            <SelectItem key={owner.user_id} value={owner.user_id}>
              {owner.display_name || owner.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {projectOwners.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No project owners available. Assign the project_owner role to users first.
        </p>
      )}
    </div>
  );
};
