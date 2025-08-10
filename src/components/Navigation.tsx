import { Button } from "@/components/ui/button";
import { Settings, Users, Workflow } from "lucide-react";
interface NavigationProps {
  currentView: 'home' | 'admin' | 'user';
  onViewChange: (view: 'home' | 'admin' | 'user') => void;
}
export default function Navigation({
  currentView,
  onViewChange
}: NavigationProps) {
  return <nav className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src="/lovable-uploads/4abd91fc-1cee-4a05-927d-e023723f8317.png" alt="Project Partner Logo" className="h-10 w-auto" />
            
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant={currentView === 'home' ? 'default' : 'ghost'} onClick={() => onViewChange('home')} className="transition-fast">
              <Workflow className="w-4 h-4 mr-2" />
              Overview
            </Button>
            <Button variant={currentView === 'admin' ? 'default' : 'ghost'} onClick={() => onViewChange('admin')} className="transition-fast">
              <Settings className="w-4 h-4 mr-2" />
              Admin
            </Button>
            <Button variant={currentView === 'user' ? 'default' : 'ghost'} onClick={() => onViewChange('user')} className="transition-fast">
              <Users className="w-4 h-4 mr-2" />
              User
            </Button>
          </div>
        </div>
      </div>
    </nav>;
}