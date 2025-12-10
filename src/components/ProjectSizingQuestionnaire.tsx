import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, Calculator, Home } from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';

interface ProjectSizingQuestionnaireProps {
  onComplete: () => void;
  isCompleted: boolean;
}

export const ProjectSizingQuestionnaire: React.FC<ProjectSizingQuestionnaireProps> = ({
  onComplete,
  isCompleted
}) => {
  const { currentProjectRun, updateProjectRun } = useProject();
  const [formData, setFormData] = useState({
    projectSize: currentProjectRun?.projectSize || '',
    scalingFactor: currentProjectRun?.scalingFactor || 1,
    complexityAdjustments: currentProjectRun?.complexityAdjustments || '',
    skillLevelMultiplier: currentProjectRun?.skillLevelMultiplier || 1,
    availableHoursPerDay: currentProjectRun?.availableHoursPerDay || 4,
    workingDaysPerWeek: currentProjectRun?.workingDaysPerWeek || 2,
    specialConsiderations: currentProjectRun?.specialConsiderations || ''
  });

  const scalingUnit = currentProjectRun?.scalingUnit || 'per item';

  const getScalingUnitDisplay = () => {
    switch (scalingUnit) {
      case 'per square feet':
      case 'per square foot': return 'Square Feet';
      case 'per 10x10 room': return 'Rooms (10x10)';
      case 'per linear feet':
      case 'per linear foot': return 'Linear Feet';
      case 'per cubic yard': return 'Cubic Yards';
      case 'per item': return 'Items';
      default: return 'Units';
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!currentProjectRun) return;
    
    await updateProjectRun({
      ...currentProjectRun,
      ...formData,
      updatedAt: new Date()
    });
    
    onComplete();
  };

  if (!currentProjectRun) {
    return <div>No project selected</div>;
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          <CardTitle>Project Sizing & Time Estimation</CardTitle>
          {isCompleted && <CheckCircle className="w-5 h-5 text-green-500" />}
        </div>
        <CardDescription>
          Help us provide accurate time estimates by telling us about your project scope and working capacity.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Project Size */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Home className="w-4 h-4 text-primary" />
            <Label className="text-base font-semibold">Project Size</Label>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="projectSize">Total {getScalingUnitDisplay()}</Label>
              <Input
                id="projectSize"
                type="number"
                placeholder={`Enter total ${getScalingUnitDisplay().toLowerCase()}`}
                value={formData.projectSize}
                onChange={(e) => handleInputChange('projectSize', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="scalingFactor">Scaling Factor</Label>
              <Input
                id="scalingFactor"
                type="number"
                step="0.1"
                placeholder="1.0"
                value={formData.scalingFactor}
                onChange={(e) => handleInputChange('scalingFactor', parseFloat(e.target.value) || 1)}
              />
              <p className="text-xs text-muted-foreground">
                Adjust for project complexity (0.5 = simpler, 1.5 = more complex)
              </p>
            </div>
          </div>
        </div>

        {/* Skill Level & Working Capacity */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Working Capacity</Label>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="skillLevel">Your Skill Level</Label>
              <Select 
                value={formData.skillLevelMultiplier.toString()} 
                onValueChange={(value) => handleInputChange('skillLevelMultiplier', parseFloat(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select skill level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1.5">Beginner (takes 50% longer)</SelectItem>
                  <SelectItem value="1.0">Intermediate (standard time)</SelectItem>
                  <SelectItem value="0.75">Advanced (25% faster)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="hoursPerDay">Hours Available Per Day</Label>
              <Input
                id="hoursPerDay"
                type="number"
                min="1"
                max="12"
                value={formData.availableHoursPerDay}
                onChange={(e) => handleInputChange('availableHoursPerDay', parseInt(e.target.value) || 4)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="daysPerWeek">Days Available Per Week</Label>
              <Input
                id="daysPerWeek"
                type="number"
                min="1"
                max="7"
                value={formData.workingDaysPerWeek}
                onChange={(e) => handleInputChange('workingDaysPerWeek', parseInt(e.target.value) || 2)}
              />
            </div>
          </div>
        </div>

        {/* Complexity Adjustments */}
        <div className="space-y-2">
          <Label htmlFor="complexityAdjustments">Complexity Adjustments</Label>
          <Textarea
            id="complexityAdjustments"
            placeholder="Any factors that might affect timing? (e.g., high ceilings, intricate details, accessibility challenges)"
            value={formData.complexityAdjustments}
            onChange={(e) => handleInputChange('complexityAdjustments', e.target.value)}
            rows={3}
          />
        </div>

        {/* Special Considerations */}
        <div className="space-y-2">
          <Label htmlFor="specialConsiderations">Special Considerations & Notes</Label>
          <Textarea
            id="specialConsiderations"
            placeholder="Any other factors we should consider for scheduling and timing?"
            value={formData.specialConsiderations}
            onChange={(e) => handleInputChange('specialConsiderations', e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            {isCompleted ? 'Update Sizing Information' : 'Complete Sizing'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};