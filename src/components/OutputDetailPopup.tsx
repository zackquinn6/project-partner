import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Output } from '@/interfaces/Project';
import { AlertTriangle, CheckCircle, Eye, Target } from 'lucide-react';

interface OutputDetailPopupProps {
  output: Output;
  isOpen: boolean;
  onClose: () => void;
}

export const OutputDetailPopup: React.FC<OutputDetailPopupProps> = ({
  output,
  isOpen,
  onClose
}) => {
  const getTypeIcon = (type: Output['type']) => {
    switch (type) {
      case 'safety':
        return <AlertTriangle className="w-4 h-4 text-destructive-soft" />;
      case 'performance-durability':
        return <Target className="w-4 h-4 text-info" />;
      case 'major-aesthetics':
        return <Eye className="w-4 h-4 text-category-3" />;
      default:
        return <CheckCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTypeColor = (type: Output['type']) => {
    switch (type) {
      case 'safety':
        return 'bg-destructive-soft/15 text-destructive-soft border-destructive-soft/40';
      case 'performance-durability':
        return 'bg-info/15 text-info border-info/40';
      case 'major-aesthetics':
        return 'bg-category-3/15 text-category-3 border-category-3/40';
      default:
        return 'bg-muted text-foreground border-border';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            {getTypeIcon(output.type)}
            {output.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Output Type */}
          {output.type !== 'none' && ['major-aesthetics', 'performance-durability', 'safety'].includes(output.type) && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Type:</span>
              <Badge 
                variant="outline" 
                className={`${getTypeColor(output.type)} font-medium`}
              >
                {output.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Badge>
            </div>
          )}

          {/* Description */}
          {output.description && (
            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-muted-foreground">{output.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Requirement */}
          {output.requirement && (
            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Requirement
                </h4>
                <p className="text-muted-foreground">{output.requirement}</p>
              </CardContent>
            </Card>
          )}

          {/* Potential Effects */}
          {output.potentialEffects && (
            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning-soft" />
                  Potential Effects if Error
                </h4>
                <p className="text-muted-foreground">{output.potentialEffects}</p>
              </CardContent>
            </Card>
          )}

          {/* Photos of Effects */}
          {output.photosOfEffects && (
            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Photos of Potential Effects
                </h4>
                {output.photosOfEffects.startsWith('http') || output.photosOfEffects.startsWith('/') || output.photosOfEffects.includes('.jpg') || output.photosOfEffects.includes('.png') ? (
                  <img 
                    src={output.photosOfEffects} 
                    alt="Example of potential effects" 
                    className="w-full max-w-md rounded-lg shadow-sm"
                  />
                ) : (
                  <p className="text-muted-foreground italic">{output.photosOfEffects}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Key Inputs */}
          {output.keyInputs && output.keyInputs.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-2">Key Inputs</h4>
                <ul className="list-disc list-inside space-y-1">
                  {output.keyInputs.map((input, index) => (
                    <li key={index} className="text-muted-foreground">
                      {input}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Quality control (step output field) */}
          {output.qualityChecks && (
            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  Quality control
                </h4>
                <p className="text-muted-foreground">{output.qualityChecks}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};