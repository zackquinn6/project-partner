import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CommunityPosts } from "./CommunityPosts";

interface CommunityPostsWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommunityPostsWindow({ open, onOpenChange }: CommunityPostsWindowProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-full sm:max-w-7xl sm:max-h-[90vh] overflow-hidden border-none sm:border p-0 sm:p-6">
        <DialogHeader className="p-4 sm:p-0 border-b sm:border-none">
          <div className="flex items-center justify-between">
            <DialogTitle>Community Posts</DialogTitle>
            <Button 
              variant="ghost" 
              onClick={() => onOpenChange(false)}
              className="sm:hidden text-xs px-2 py-1 h-6"
            >
              close
            </Button>
          </div>
        </DialogHeader>
        
        <div className="overflow-y-auto h-full sm:max-h-[80vh] p-4 sm:pr-2 sm:p-0">
          <CommunityPosts />
        </div>
      </DialogContent>
    </Dialog>
  );
}