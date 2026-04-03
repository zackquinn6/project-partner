import { ExternalLink, HelpCircle, Calendar as CalendarIcon, ShoppingCart, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface ContentSection {
  id?: string;
  type: 'text' | 'image' | 'video' | 'link' | 'button' | 'safety-warning';
  content: string;
  title?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  width?: 'full' | 'half' | 'third' | 'two-thirds';
  alignment?: 'left' | 'center' | 'right';
  display_order?: number;
  // Button-specific properties
  buttonAction?: 'project-customizer' | 'project-scheduler' | 'shopping-checklist' | 'materials-selection' | 'project-budgeting' | 'project-performance' | 'after-action-review';
  buttonLabel?: string;
  buttonIcon?: string;
  buttonVariant?: 'default' | 'outline' | 'secondary';
}

interface MultiContentRendererProps {
  sections: ContentSection[];
  onButtonAction?: (action: string) => void;
}

export function MultiContentRenderer({ sections, onButtonAction }: MultiContentRendererProps) {
  const getButtonIcon = (iconName?: string) => {
    switch (iconName) {
      case 'HelpCircle': return <HelpCircle className="w-4 h-4" />;
      case 'Calendar': return <CalendarIcon className="w-4 h-4" />;
      case 'ShoppingCart': return <ShoppingCart className="w-4 h-4" />;
      default: return null;
    }
  };
  const getWidthClass = (width?: string) => {
    switch (width) {
      case 'half':
        return 'w-full sm:w-1/2';
      case 'third':
        return 'w-full sm:w-1/3';
      case 'two-thirds':
        return 'w-full sm:w-2/3';
      default:
        return 'w-full';
    }
  };

  const getAlignmentClass = (alignment?: string) => {
    switch (alignment) {
      case 'center': return 'mx-auto text-center';
      case 'right': return 'ml-auto text-right';
      default: return 'text-left';
    }
  };

  if (!sections || sections.length === 0) {
    return null;
  }

  const sortedSections = [...sections].sort((a, b) => {
    const aOrder = typeof a.display_order === 'number' ? a.display_order : Number.MAX_SAFE_INTEGER;
    const bOrder = typeof b.display_order === 'number' ? b.display_order : Number.MAX_SAFE_INTEGER;
    return aOrder - bOrder;
  });

  const warningSections = sortedSections.filter((s) => s.type === "safety-warning" && s.content);
  const nonWarningSections = sortedSections.filter((s) => !(s.type === "safety-warning" && s.content));

  return (
    <div className="space-y-6">
      {warningSections.length > 0 && (
        <div className="space-y-3">
          {warningSections.map((section, index) => (
            <Alert
              key={section.id || `warning-${index}`}
              variant="destructive"
              className="border-2 w-full"
            >
              <AlertTriangle className="h-5 w-5" />
              {(section.title || section.severity) && (
                <AlertTitle className="flex items-center gap-2">
                  {section.title ? <span>{section.title}</span> : null}
                  {section.severity ? (
                    <Badge variant="secondary" className="uppercase">
                      {section.severity}
                    </Badge>
                  ) : null}
                </AlertTitle>
              )}
              <AlertDescription className="mt-2">{section.content}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-4 items-start">
        {nonWarningSections.map((section, index) => (
          <div 
            key={section.id || `section-${index}`} 
            className={`${getWidthClass(section.width)} ${getAlignmentClass(section.alignment)} min-w-0 shrink-0`}
          >
            {section.type === 'text' && (
              <div className="space-y-2">
                {section.title && (
                  <h4 className="text-lg font-semibold text-foreground">{section.title}</h4>
                )}
                <div className="text-muted-foreground whitespace-pre-wrap">
                  {section.content}
                </div>
              </div>
            )}

            {section.type === 'image' && section.content && (
              <div className="space-y-2">
                {section.title && (
                  <h4 className="text-lg font-semibold text-foreground">{section.title}</h4>
                )}
                <img 
                  src={section.content} 
                  alt={section.title || 'Step image'} 
                  className="rounded-lg border shadow-sm max-w-full h-auto"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}

            {section.type === 'video' && section.content && (
              <div className="space-y-2">
                {section.title && (
                  <h4 className="text-lg font-semibold text-foreground">{section.title}</h4>
                )}
                <div className="aspect-video rounded-lg overflow-hidden border shadow-sm">
                  <iframe 
                    src={section.content} 
                    className="w-full h-full" 
                    allowFullScreen 
                    title={section.title || 'Video content'}
                  />
                </div>
              </div>
            )}

            {section.type === 'link' && section.content && section.title && (
              <div className="space-y-2">
                <a 
                  href={section.content} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-2 font-medium"
                >
                  <ExternalLink className="w-4 h-4" />
                  {section.title}
                </a>
              </div>
            )}

            {section.type === 'button' && section.buttonAction && section.buttonLabel && (
              <div className="flex justify-center pt-4">
                <Button
                  onClick={() => onButtonAction?.(section.buttonAction!)}
                  variant={(section.buttonVariant as "default" | "outline" | "secondary") || "outline"}
                  className="flex items-center gap-2"
                >
                  {getButtonIcon(section.buttonIcon)}
                  {section.buttonLabel}
                </Button>
              </div>
            )}

            {/* safety warnings are hoisted into the top banner */}
          </div>
        ))}
      </div>
    </div>
  );
}