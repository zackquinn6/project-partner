import React, { useMemo } from 'react';

interface VirtualizedListProps<T> {
  items: T[];
  height: number;
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

export function VirtualizedList<T>({ 
  items, 
  height, 
  itemHeight, 
  renderItem, 
  className 
}: VirtualizedListProps<T>) {
  const visibleItems = useMemo(() => {
    const itemCount = Math.ceil(height / itemHeight);
    return items.slice(0, itemCount + 2); // Add buffer items
  }, [items, height, itemHeight]);

  if (items.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <p className="text-muted-foreground">No items to display</p>
      </div>
    );
  }

  return (
    <div className={`overflow-y-auto ${className}`} style={{ height }}>
      {visibleItems.map((item, index) => (
        <div key={index} style={{ minHeight: itemHeight }}>
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}