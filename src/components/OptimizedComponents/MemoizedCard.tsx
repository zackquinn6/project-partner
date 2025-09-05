import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface MemoizedCardProps {
  title?: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const MemoizedCard = React.memo<MemoizedCardProps>(({ 
  title, 
  description, 
  children, 
  className,
  onClick 
}) => {
  return (
    <Card className={className} onClick={onClick}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      {children && <CardContent>{children}</CardContent>}
    </Card>
  );
});

MemoizedCard.displayName = 'MemoizedCard';