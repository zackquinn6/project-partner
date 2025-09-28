import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary specifically for project navigation issues
 * Prevents Continue button failures from crashing the entire app
 */
export class ProjectNavigationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    console.error('🚨 ProjectNavigationErrorBoundary: Navigation error caught:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 ProjectNavigationErrorBoundary: Component error:', error, errorInfo);
    
    // Show user-friendly error message
    toast.error('Navigation failed. Please try again or refresh the page.');
  }

  handleRetry = () => {
    console.log('🔄 ProjectNavigationErrorBoundary: User clicked retry');
    this.setState({ hasError: false, error: undefined });
  };

  handleRefresh = () => {
    console.log('🔄 ProjectNavigationErrorBoundary: User clicked refresh');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-6 space-y-4 text-center bg-background border border-border rounded-lg">
          <AlertTriangle className="h-8 w-8 text-orange-500" />
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">Navigation Error</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {this.props.fallbackMessage || 
               'Something went wrong while navigating to your project. Please try again.'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={this.handleRetry}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={this.handleRefresh}
            >
              Refresh Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}