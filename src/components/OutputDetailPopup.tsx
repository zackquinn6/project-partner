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
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'performance-durability':
        return <Target className="w-4 h-4 text-blue-500" />;
      case 'major-aesthetics':
        return <Eye className="w-4 h-4 text-purple-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTypeColor = (type: Output['type']) => {
    switch (type) {
      case 'safety':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'performance-durability':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'major-aesthetics':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
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
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Type:</span>
            <Badge 
              variant="outline" 
              className={`${getTypeColor(output.type)} font-medium`}
            >
              {output.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Badge>
          </div>

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
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
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

          {/* Quality Check */}
          {output.qualityChecks && (
            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Quality Check
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