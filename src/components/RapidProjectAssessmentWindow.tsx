import React from 'react';
import { ResponsiveDialog } from '@/components/ResponsiveDialog';
import { RapidProjectAssessment } from '@/components/RapidProjectAssessment';

interface RapidProjectAssessmentWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RapidProjectAssessmentWindow({ open, onOpenChange }: RapidProjectAssessmentWindowProps) {
  console.log('🚀 RapidProjectAssessmentWindow render - open:', open);
  
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      size="content-large"
      title="Rapid Project Assessment"
    >
      <RapidProjectAssessment />
    </ResponsiveDialog>
  );
}