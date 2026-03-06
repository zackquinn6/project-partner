import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, ClipboardList, Loader2, Shield, Trash2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { addDays } from 'date-fns';

const PRIVACY_MESSAGE = 'We do not share your home information with any other businesses. Your data is safe and secure.';

const HEATING_COOLING_OPTIONS = [
  'Oil furnace',
  'Gas furnace',
  'Electric furnace',
  'Hydronic (boiler + radiators/baseboards)',
  'Heat pump',
  'Central air conditioning',
  'Mini-split system',
  'Wood stove / pellet stove',
] as const;

const HOT_WATER_OPTIONS = [
  'Tank water heater (gas/oil/electric)',
  'Tankless/on-demand',
  'Indirect tank (connected to boiler)',
  'Heat pump water heater',
  'Solar hot water',
] as const;

const HOME_TYPE_OPTIONS = ['Single family', 'Condo', 'Townhouse', 'Multi-family', 'Mobile', 'Other'];
const HOME_AGE_OPTIONS = ['New (0–5 yrs)', '5–15 years', '15–30 years', '30–50 years', '50+ years', 'Unknown'];
const FOUNDATION_OPTIONS = ['Slab', 'Crawl space', 'Full basement', 'Other'];
const EXTERIOR_OPTIONS = ['Vinyl siding', 'Brick', 'Wood siding', 'Stucco', 'Metal', 'Other'];
const ROOF_OPTIONS = ['Asphalt shingle', 'Metal', 'Tile', 'Flat / built-up', 'Wood shake', 'Other'];

const APPLIANCES_SYSTEMS_OPTIONS = [
  'Sump pump',
  'Water softener',
  'Septic system',
  'Well water',
  'Fireplace/chimney',
  'Irrigation system',
  'Solar panels',
  'Generator',
  'Dryer (gas/electric)',
  'Dishwasher',
  'Garbage disposal',
] as const;

function zipToClimateRegion(zip: string): string {
  const n = parseInt(zip.replace(/\D/g, '').slice(0, 3), 10);
  if (Number.isNaN(n)) return '';
  if (n <= 299) return 'Northeast';
  if (n <= 399) return 'Southeast';
  if (n <= 599) return 'Midwest';
  if (n <= 799) return 'South / South Central';
  return 'West';
}

interface HomeDetailsRow {
  home_id: string;
  heating_cooling_systems?: string[] | null;
  hot_water_system?: string | null;
  zip?: string | null;
  climate_region?: string | null;
  home_type?: string | null;
  home_age?: string | null;
  foundation_type?: string | null;
  exterior_type?: string | null;
  roof_type?: string | null;
  appliances_systems?: string[] | null;
  square_footage?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
}

interface MaintenanceTemplate {
  id: string;
  title: string;
  description: string | null;
  summary: string | null;
  category: string;
  frequency_days: number;
  instructions: string | null;
  criticality: number | null;
  risks_of_skipping: string | null;
  benefits_of_maintenance: string | null;
  repair_cost_savings: string | null;
}

interface PlanItem {
  type: 'template';
  templateId: string;
  title: string;
  template: MaintenanceTemplate;
}

interface PlanCustomItem {
  type: 'custom';
  title: string;
}

type PlanEntry = PlanItem | PlanCustomItem;

interface MaintenancePlanWorkflowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  homeId: string | null;
  homeName: string;
  onPlanSaved: () => void;
}

export function MaintenancePlanWorkflow({
  open,
  onOpenChange,
  homeId,
  homeName,
  onPlanSaved,
}: MaintenancePlanWorkflowProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [doNotSaveHomeInfo, setDoNotSaveHomeInfo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(true);

  const [heatingCooling, setHeatingCooling] = useState<string[]>([]);
  const [heatingCoolingOther, setHeatingCoolingOther] = useState('');
  const [hotWater, setHotWater] = useState('');
  const [hotWaterOther, setHotWaterOther] = useState('');
  const [zip, setZip] = useState('');
  const [climateRegion, setClimateRegion] = useState('');
  const [homeType, setHomeType] = useState('');
  const [homeAge, setHomeAge] = useState('');
  const [foundationType, setFoundationType] = useState('');
  const [exteriorType, setExteriorType] = useState('');
  const [roofType, setRoofType] = useState('');
  const [appliancesSystems, setAppliancesSystems] = useState<string[]>([]);
  const [appliancesOther, setAppliancesOther] = useState('');
  const [customTaskLines, setCustomTaskLines] = useState<string[]>([]);
  const [customTaskInput, setCustomTaskInput] = useState('');

  const [planEntries, setPlanEntries] = useState<PlanEntry[]>([]);
  const [planGenerated, setPlanGenerated] = useState(false);

  const totalSteps = 8;
  const isLastStep = step === totalSteps - 1;

  useEffect(() => {
    if (open) {
      setStep(0);
      setPlanGenerated(false);
      setPlanEntries([]);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !homeId) {
      setLoadingDetails(false);
      return;
    }
    setLoadingDetails(true);
    supabase
      .from('home_details')
      .select('*')
      .eq('home_id', homeId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error('Error fetching home details:', error);
          setLoadingDetails(false);
          return;
        }
        const row = data as HomeDetailsRow | null;
        if (row) {
          const hc = row.heating_cooling_systems;
          setHeatingCooling(Array.isArray(hc) ? hc : []);
          setHotWater(row.hot_water_system ?? '');
          setZip(row.zip ?? '');
          setClimateRegion(row.climate_region ?? '');
          setHomeType(row.home_type ?? '');
          setHomeAge(row.home_age ?? '');
          setFoundationType(row.foundation_type ?? '');
          setExteriorType(row.exterior_type ?? '');
          setRoofType(row.roof_type ?? '');
          const as = row.appliances_systems;
          setAppliancesSystems(Array.isArray(as) ? as : []);
        }
        setLoadingDetails(false);
      });
  }, [open, homeId]);

  useEffect(() => {
    if (zip.trim() && !climateRegion) {
      setClimateRegion(zipToClimateRegion(zip));
    }
  }, [zip, climateRegion]);

  const toggleMulti = (arr: string[], value: string, setter: (a: string[]) => void) => {
    if (arr.includes(value)) setter(arr.filter((x) => x !== value));
    else setter([...arr, value]);
  };

  const addCustomTaskLine = () => {
    const t = customTaskInput.trim();
    if (t) {
      setCustomTaskLines((prev) => [...prev, t]);
      setCustomTaskInput('');
    }
  };

  const removePlanEntry = (index: number) => {
    setPlanEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const generatePlan = (): Promise<void> => {
    if (!homeId || !user) return Promise.resolve();
    setLoading(true);
    return (async () => {
      try {
        const [templatesRes, existingRes] = await Promise.all([
          supabase
            .from('maintenance_templates')
            .select('*')
            .order('category')
            .order('title'),
          supabase
            .from('user_maintenance_tasks')
            .select('template_id')
            .eq('user_id', user.id)
            .eq('home_id', homeId)
            .not('template_id', 'is', null),
        ]);

        if (templatesRes.error) throw templatesRes.error;
        const templates = templatesRes.data || [];
        const existingTemplateIds = new Set(
          (existingRes.data || []).map((r: { template_id: string }) => r.template_id)
        );

        const categoriesToInclude = new Set<string>();
        categoriesToInclude.add('safety');
        categoriesToInclude.add('exterior');
        if (heatingCooling.length > 0 || heatingCoolingOther) categoriesToInclude.add('hvac');
        if (hotWater || hotWaterOther) categoriesToInclude.add('plumbing');
        if (
          appliancesSystems.some(
            (a) =>
              a === 'Sump pump' ||
              a === 'Water softener' ||
              a === 'Septic system' ||
              a === 'Well water'
          )
        )
          categoriesToInclude.add('plumbing');
        if (appliancesSystems.some((a) => a === 'Fireplace/chimney')) {
          categoriesToInclude.add('safety');
          categoriesToInclude.add('exterior');
        }
        if (appliancesSystems.some((a) => a === 'Irrigation system' || a === 'Solar panels'))
          categoriesToInclude.add('exterior');
        if (appliancesSystems.some((a) => a === 'Dryer (gas/electric)')) categoriesToInclude.add('safety');
        if (appliancesSystems.some((a) => a === 'Dishwasher' || a === 'Garbage disposal'))
          categoriesToInclude.add('interior');
        categoriesToInclude.add('electrical');
        categoriesToInclude.add('interior');

        const selected = templates.filter(
          (t: MaintenanceTemplate) =>
            categoriesToInclude.has(t.category) && !existingTemplateIds.has(t.id)
        );
        const entries: PlanEntry[] = [
          ...selected.map((t: MaintenanceTemplate) => ({
            type: 'template' as const,
            templateId: t.id,
            title: t.title,
            template: t,
          })),
          ...customTaskLines.map((title) => ({ type: 'custom' as const, title })),
        ];
        setPlanEntries(entries);
        setPlanGenerated(true);
      } catch (e) {
        console.error(e);
        toast({ title: 'Error', description: 'Failed to generate plan', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  };

  const savePlan = async () => {
    if (!homeId || !user) return;
    setSaving(true);
    try {
      for (const entry of planEntries) {
        if (entry.type === 'template') {
          const t = entry.template;
          const nextDue = addDays(new Date(), t.frequency_days);
          await supabase.from('user_maintenance_tasks').insert({
            user_id: user.id,
            home_id: homeId,
            template_id: t.id,
            title: t.title,
            description: t.description ?? null,
            summary: t.summary ?? null,
            instructions: t.instructions ?? null,
            category: t.category,
            frequency_days: t.frequency_days,
            next_due: nextDue.toISOString(),
            risks_of_skipping: t.risks_of_skipping ?? null,
            benefits_of_maintenance: t.benefits_of_maintenance ?? null,
            criticality: t.criticality ?? 2,
            repair_cost_savings: t.repair_cost_savings ?? null,
          });
        } else {
          const nextDue = addDays(new Date(), 90);
          await supabase.from('user_maintenance_tasks').insert({
            user_id: user.id,
            home_id: homeId,
            title: entry.title,
            description: null,
            category: 'general',
            frequency_days: 90,
            next_due: nextDue.toISOString(),
            criticality: 2,
          });
        }
      }

      if (!doNotSaveHomeInfo) {
        const heatingArr = heatingCoolingOther.trim()
          ? [...heatingCooling, heatingCoolingOther.trim()]
          : heatingCooling;
        const hotWaterVal = hotWaterOther.trim() || hotWater;
        const appliancesArr = appliancesOther.trim()
          ? [...appliancesSystems, appliancesOther.trim()]
          : appliancesSystems;
        const region = zip.trim() ? zipToClimateRegion(zip) : climateRegion;

        const payload = {
          home_id: homeId,
          heating_cooling_systems: heatingArr,
          hot_water_system: hotWaterVal || null,
          zip: zip.trim() || null,
          climate_region: region || null,
          home_type: homeType || null,
          home_age: homeAge || null,
          foundation_type: foundationType || null,
          exterior_type: exteriorType || null,
          roof_type: roofType || null,
          appliances_systems: appliancesArr,
        };

        const { data: existing } = await supabase
          .from('home_details')
          .select('home_id')
          .eq('home_id', homeId)
          .maybeSingle();

        if (existing) {
          await supabase.from('home_details').update(payload).eq('home_id', homeId);
        } else {
          await supabase.from('home_details').insert(payload);
        }
      }

      toast({ title: 'Plan saved', description: 'Your maintenance plan has been saved.' });
      onPlanSaved();
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Failed to save plan', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const canNext = () => {
    if (step === 0) return true;
    if (step === 3) return true;
    if (step === 7) return true;
    return true;
  };

  const handleNext = async () => {
    if (step === 6 && !planGenerated) {
      await generatePlan();
      setStep(7);
      return;
    }
    if (step < totalSteps - 1) setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Generate Maintenance Plan {homeName ? `— ${homeName}` : ''}
          </DialogTitle>
        </DialogHeader>

        {loadingDetails ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="text-xs text-muted-foreground mb-2">
              Step {step + 1} of {totalSteps}
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pb-4">
              {/* Step 0 — Privacy & persistence choice */}
              {step === 0 && (
                <div className="space-y-4">
                  <div className="rounded-lg border bg-muted/30 p-4 flex items-start gap-3">
                    <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Data Privacy Notice</p>
                      <p className="text-sm text-muted-foreground mt-1">{PRIVACY_MESSAGE}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 space-x-2">
                    <Checkbox
                      id="doNotSave"
                      checked={doNotSaveHomeInfo}
                      onCheckedChange={(c) => setDoNotSaveHomeInfo(!!c)}
                    />
                    <Label htmlFor="doNotSave" className="text-sm font-normal cursor-pointer leading-tight">
                      Do NOT save my home information. Only use it temporarily to build my maintenance plan. Delete it after the plan is generated.
                    </Label>
                  </div>
                </div>
              )}

              {/* Step 1 — Heating & Cooling */}
              {step === 1 && (
                <div className="space-y-4">
                  <p className="text-sm">
                    Which heating or cooling system does your home use? Select all that apply.
                  </p>
                  <p className="text-xs text-muted-foreground">{PRIVACY_MESSAGE}</p>
                  <div className="flex flex-wrap gap-2">
                    {HEATING_COOLING_OPTIONS.map((opt) => (
                      <Button
                        key={opt}
                        type="button"
                        variant={heatingCooling.includes(opt) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleMulti(heatingCooling, opt, setHeatingCooling)}
                      >
                        {opt}
                      </Button>
                    ))}
                  </div>
                  <div>
                    <Label className="text-xs">Other</Label>
                    <Input
                      value={heatingCoolingOther}
                      onChange={(e) => setHeatingCoolingOther(e.target.value)}
                      placeholder="Other (free-text)"
                      className="mt-1"
                    />
                  </div>
                </div>
              )}

              {/* Step 2 — Hot Water */}
              {step === 2 && (
                <div className="space-y-4">
                  <p className="text-sm">How is your hot water generated?</p>
                  <p className="text-xs text-muted-foreground">{PRIVACY_MESSAGE}</p>
                  <div className="flex flex-wrap gap-2">
                    {HOT_WATER_OPTIONS.map((opt) => (
                      <Button
                        key={opt}
                        type="button"
                        variant={hotWater === opt ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setHotWater(opt)}
                      >
                        {opt}
                      </Button>
                    ))}
                  </div>
                  <div>
                    <Label className="text-xs">Other</Label>
                    <Input
                      value={hotWaterOther}
                      onChange={(e) => setHotWaterOther(e.target.value)}
                      placeholder="Other (free-text)"
                      className="mt-1"
                    />
                  </div>
                </div>
              )}

              {/* Step 3 — ZIP / Climate */}
              {step === 3 && (
                <div className="space-y-4">
                  <p className="text-sm">
                    What's your ZIP code? We'll use it to determine your climate region.
                  </p>
                  <p className="text-xs text-muted-foreground">{PRIVACY_MESSAGE}</p>
                  <div>
                    <Label>ZIP code</Label>
                    <Input
                      value={zip}
                      onChange={(e) => {
                        setZip(e.target.value);
                        if (e.target.value.trim()) setClimateRegion(zipToClimateRegion(e.target.value));
                      }}
                      placeholder="e.g. 12345"
                      className="mt-1 max-w-[140px]"
                    />
                  </div>
                  {climateRegion && (
                    <p className="text-sm text-muted-foreground">Climate region: {climateRegion}</p>
                  )}
                </div>
              )}

              {/* Step 4 — Home characteristics */}
              {step === 4 && (
                <div className="space-y-4">
                  <p className="text-sm">
                    Tell us a bit more about your home so we can fine-tune your maintenance plan.
                  </p>
                  <p className="text-xs text-muted-foreground">{PRIVACY_MESSAGE}</p>
                  <div className="grid gap-3">
                    <div>
                      <Label>Home type</Label>
                      <select
                        className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                        value={homeType}
                        onChange={(e) => setHomeType(e.target.value)}
                      >
                        <option value="">Select</option>
                        {HOME_TYPE_OPTIONS.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Approximate home age</Label>
                      <select
                        className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                        value={homeAge}
                        onChange={(e) => setHomeAge(e.target.value)}
                      >
                        <option value="">Select</option>
                        {HOME_AGE_OPTIONS.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Foundation type</Label>
                      <select
                        className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                        value={foundationType}
                        onChange={(e) => setFoundationType(e.target.value)}
                      >
                        <option value="">Select</option>
                        {FOUNDATION_OPTIONS.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Exterior type</Label>
                      <select
                        className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                        value={exteriorType}
                        onChange={(e) => setExteriorType(e.target.value)}
                      >
                        <option value="">Select</option>
                        {EXTERIOR_OPTIONS.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Roof type</Label>
                      <select
                        className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                        value={roofType}
                        onChange={(e) => setRoofType(e.target.value)}
                      >
                        <option value="">Select</option>
                        {ROOF_OPTIONS.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5 — Appliances & systems */}
              {step === 5 && (
                <div className="space-y-4">
                  <p className="text-sm">
                    Which of these systems or appliances do you have? Select all that apply.
                  </p>
                  <p className="text-xs text-muted-foreground">{PRIVACY_MESSAGE}</p>
                  <div className="flex flex-wrap gap-2">
                    {APPLIANCES_SYSTEMS_OPTIONS.map((opt) => (
                      <Button
                        key={opt}
                        type="button"
                        variant={appliancesSystems.includes(opt) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleMulti(appliancesSystems, opt, setAppliancesSystems)}
                      >
                        {opt}
                      </Button>
                    ))}
                  </div>
                  <div>
                    <Label className="text-xs">Other</Label>
                    <Input
                      value={appliancesOther}
                      onChange={(e) => setAppliancesOther(e.target.value)}
                      placeholder="Other (free-text)"
                      className="mt-1"
                    />
                  </div>
                </div>
              )}

              {/* Step 6 — Unique home tasks */}
              {step === 6 && (
                <div className="space-y-4">
                  <p className="text-sm">
                    Are there any maintenance tasks unique to your home that you'd like to include?
                    Examples: "Clean koi pond filter", "Check flat roof drains", "Inspect retaining wall".
                  </p>
                  <p className="text-xs text-muted-foreground">{PRIVACY_MESSAGE}</p>
                  <div className="flex gap-2">
                    <Input
                      value={customTaskInput}
                      onChange={(e) => setCustomTaskInput(e.target.value)}
                      placeholder="e.g. Inspect retaining wall"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTaskLine())}
                    />
                    <Button type="button" variant="outline" size="icon" onClick={addCustomTaskLine}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {customTaskLines.length > 0 && (
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {customTaskLines.map((line, i) => (
                        <li key={i} className="flex items-center justify-between gap-2">
                          <span>{line}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setCustomTaskLines((p) => p.filter((_, j) => j !== i))}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Step 7 — Generate & review plan */}
              {step === 7 && (
                <div className="space-y-4">
                  {loading && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {!loading && planEntries.length > 0 && (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Review your plan. Remove any task you don't want, then tap Save My Plan.
                      </p>
                      <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
                        {planEntries.map((entry, index) => (
                          <Card key={index}>
                            <CardContent className="py-2 px-3 flex items-center justify-between gap-2">
                              <span className="text-sm truncate flex-1">
                                {entry.type === 'template' ? entry.title : entry.title}
                                {entry.type === 'custom' && (
                                  <span className="text-muted-foreground ml-1">(custom)</span>
                                )}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                onClick={() => removePlanEntry(index)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </>
                  )}
                  {!loading && planGenerated && planEntries.length === 0 && (
                    <p className="text-sm text-muted-foreground">No tasks in plan. Add templates or custom tasks in earlier steps.</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t">
              <Button variant="outline" onClick={handleBack} disabled={step === 0}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              {step < totalSteps - 1 ? (
                <Button onClick={handleNext} disabled={!canNext()}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={savePlan}
                  disabled={saving || loading || planEntries.length === 0}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save My Plan
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
