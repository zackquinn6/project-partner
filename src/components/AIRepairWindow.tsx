import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Upload, Loader2, CheckCircle, AlertTriangle, Wrench, Clock, DollarSign, AlertCircle, Sparkles } from 'lucide-react';

interface AIRepairWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AnalysisResult {
  issue_category: string;
  severity_level: string;
  estimated_cost_range: string;
  action_plan: string;
  root_cause_analysis: string;
  recommended_materials: string[];
  recommended_tools: string[];
  difficulty_level: string;
  estimated_time: string;
}

export function AIRepairWindow({ open, onOpenChange }: AIRepairWindowProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [photos, setPhotos] = useState<File[]>([]);
  const [description, setDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [showPricingAlert, setShowPricingAlert] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (files: FileList | null) => {
    if (!files) return;
    
    const newPhotos = Array.from(files).slice(0, 3 - photos.length);
    setPhotos(prev => [...prev, ...newPhotos]);
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async (files: File[]): Promise<string[]> => {
    const uploadPromises = files.map(async (file) => {
      const fileName = `ai-repair/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('project-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('project-photos')
        .getPublicUrl(fileName);

      return publicUrl;
    });

    return Promise.all(uploadPromises);
  };

  const analyzeRepair = async () => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to use AI repair analysis.",
        variant: "destructive",
      });
      return;
    }

    if (photos.length === 0) {
      toast({
        title: "Photos Required",
        description: "Please upload at least one photo to analyze.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    
    try {
      // Upload photos to storage
      const photoUrls = await uploadPhotos(photos);
      
      // Convert photos to base64 for AI analysis
      const photoPromises = photos.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      });
      
      const base64Photos = await Promise.all(photoPromises);
      
      // Call AI analysis edge function
      const { data: analysisResult, error } = await supabase.functions.invoke('ai-repair-analysis', {
        body: {
          photos: base64Photos,
          description: description || 'Analyze this home repair issue'
        }
      });

      if (error) throw error;

      const result: AnalysisResult = analysisResult;
      setAnalysis(result);

      // Save to database - only if user is authenticated
      if (!user?.id) {
        throw new Error('User authentication required to save analysis');
      }

      const { error: dbError } = await supabase
        .from('ai_repair_analyses')
        .insert({
          user_id: user.id,
          photos: photoUrls.map(url => ({ url, uploaded_at: new Date().toISOString() })),
          analysis_result: result as any,
          issue_category: result.issue_category,
          severity_level: result.severity_level,
          estimated_cost_range: result.estimated_cost_range,
          action_plan: result.action_plan,
          root_cause_analysis: result.root_cause_analysis,
          recommended_materials: result.recommended_materials as any,
          recommended_tools: result.recommended_tools as any,
          difficulty_level: result.difficulty_level,
          estimated_time: result.estimated_time
        });

      if (dbError) {
        console.error('Database error:', dbError);
        throw new Error(`Failed to save analysis: ${dbError.message}`);
      }

      toast({
        title: "Analysis Complete",
        description: "Your repair has been analyzed and saved to your account.",
      });

    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze photos. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'critical': return 'destructive';
      case 'high': return 'secondary';
      case 'medium': return 'default';
      case 'low': return 'outline';
      default: return 'default';
    }
  };

  const getSeverityIcon = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'critical': return AlertTriangle;
      case 'high': return AlertCircle;
      default: return CheckCircle;
    }
  };

  const reset = () => {
    setPhotos([]);
    setDescription('');
    setAnalysis(null);
    setShowPricingAlert(true);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) reset();
    }}>
      <DialogContent className="w-[95vw] h-[95vh] max-w-none max-h-none p-0 overflow-hidden sm:w-[90vw] sm:h-[90vh] lg:w-[80vw] lg:h-[85vh]">
        <div className="h-full flex flex-col">
          <DialogHeader className="p-4 sm:p-6 border-b">
            <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              AI Repair Analysis
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1">
            <div className="pb-4">
              {/* Pricing Alert */}
              {showPricingAlert && (
                <div className="bg-gradient-to-r from-orange-50 to-green-50 border border-orange-200 p-4 m-4 rounded-xl shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-gradient-to-r from-orange-500 to-green-500">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 mb-1">Free Trial During Launch</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        This feature is completely free during our initial app launch. Regular pricing will be $1 per photo analyzed.
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPricingAlert(false)}
                      className="text-gray-500 hover:text-gray-700 hover:bg-white/50 rounded-full h-8 w-8 p-0"
                    >
                      ×
                    </Button>
                  </div>
                </div>
              )}

              {!analysis ? (
                // Upload and Analysis Section
                <div className="p-4 sm:p-6 space-y-6">
                {/* Photo Upload */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Upload className="w-5 h-5" />
                      Upload Photos (1-3 photos)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {photos.map((photo, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(photo)}
                            alt={`Repair photo ${index + 1}`}
                            className="w-20 h-20 object-cover rounded-lg border"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute -top-1 -right-1 h-6 w-6 p-0 rounded-full text-xs"
                            onClick={() => removePhoto(index)}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                      
                      {photos.length < 3 && (
                        <Button
                          variant="outline"
                          className="w-20 h-20 border-2 border-dashed flex flex-col items-center justify-center p-1"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Camera className="w-4 h-4 text-muted-foreground mb-1" />
                          <span className="text-xs text-muted-foreground">Add</span>
                        </Button>
                      )}
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handlePhotoSelect(e.target.files)}
                    />
                  </CardContent>
                </Card>

                {/* Description */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Additional Details (Optional)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Describe the issue, when it started, any symptoms you've noticed..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                    />
                  </CardContent>
                </Card>

                {/* Analyze Button */}
                <Button
                  onClick={analyzeRepair}
                  disabled={isAnalyzing || photos.length === 0}
                  className="w-full h-10 text-base font-medium"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 mr-2" />
                      Analyze Issue
                    </>
                  )}
                </Button>
              </div>
              ) : (
                // Analysis Results Section
                <div className="p-4 sm:p-6 space-y-4">
                {/* Issue Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        {React.createElement(getSeverityIcon(analysis.severity_level), { 
                          className: "w-5 h-5" 
                        })}
                        {analysis.issue_category}
                      </span>
                      <Badge variant={getSeverityColor(analysis.severity_level)}>
                        {analysis.severity_level} Priority
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">Time:</span> {analysis.estimated_time}
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">Cost:</span> {analysis.estimated_cost_range}
                      </div>
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">Difficulty:</span> {analysis.difficulty_level}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Action Plan */}
                <Card>
                  <CardHeader>
                    <CardTitle>Action Plan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{analysis.action_plan}</p>
                  </CardContent>
                </Card>

                {/* Root Cause */}
                {analysis.root_cause_analysis && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Root Cause Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed">{analysis.root_cause_analysis}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Materials and Tools */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Recommended Materials</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {analysis.recommended_materials?.map((material, index) => (
                          <li key={index} className="text-sm flex items-center gap-2">
                            <CheckCircle className="w-3 h-3 text-green-600" />
                            {material}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Recommended Tools</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {analysis.recommended_tools?.map((tool, index) => (
                          <li key={index} className="text-sm flex items-center gap-2">
                            <CheckCircle className="w-3 h-3 text-green-600" />
                            {tool}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-2 pt-4">
                  <Button onClick={reset} variant="outline" className="flex-1">
                    New Analysis
                  </Button>
                  <Button 
                    onClick={() => onOpenChange(false)} 
                    className="flex-1"
                  >
                    Save & Close
                  </Button>
                </div>
              </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}