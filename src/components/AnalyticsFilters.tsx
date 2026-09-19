import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, CalendarIcon, Download, TestTube } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

interface AnalyticsFiltersProps {
  selectedProject: string;
  onProjectChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  demoMode: boolean;
  onDemoModeToggle: () => void;
  onExport: () => void;
  projects: Array<{
    id: string;
    name: string;
    category?: string[];
  }>;
  showDemoAndExport?: boolean;
}

export function AnalyticsFilters({
  selectedProject,
  onProjectChange,
  selectedCategory,
  onCategoryChange,
  dateRange,
  onDateRangeChange,
  demoMode,
  onDemoModeToggle,
  onExport,
  projects,
  showDemoAndExport = true,
}: AnalyticsFiltersProps) {
  const categories = Array.from(
    new Set(
      projects.flatMap(p => Array.isArray(p.category) ? p.category : (p.category ? [p.category] : []))
    )
  ).filter(Boolean);

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-secondary/30 rounded-lg">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Project:</span>
        <Select value={selectedProject} onValueChange={onProjectChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Category:</span>
        <Select value={selectedCategory} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category!}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Date Range:</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant="outline"
              className={cn(
                "w-80 justify-start text-left font-normal",
                !dateRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} -{" "}
                    {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={onDateRangeChange}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>

      {showDemoAndExport && (
      <div className="flex items-center gap-2 ml-auto">
        <Button
          variant={demoMode ? "default" : "outline"}
          size="sm"
          onClick={onDemoModeToggle}
          className="flex items-center gap-2"
        >
          <TestTube className="h-4 w-4" />
          {demoMode ? "Exit Demo" : "Demo Mode"}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>
      )}
    </div>
  );
}