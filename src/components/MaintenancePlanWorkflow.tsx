import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, ClipboardList, Loader2, Trash2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { addDays } from 'date-fns';

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

const CUSTOM_TASK_FREQUENCIES = [
  { label: 'Weekly', days: 7 },
  { label: 'Monthly', days: 30 },
  { label: 'Quarterly', days: 90 },
  { label: 'Yearly', days: 365 },
] as const;

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
  frequency_days: number;
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
  const [hotWater, setHotWater] = useState('');
  const [zip, setZip] = useState('');
  const [zipFromProfile, setZipFromProfile] = useState(false);
  const [climateRegion, setClimateRegion] = useState('');
  const [homeType, setHomeType] = useState('');
  const [homeAge, setHomeAge] = useState('');
  const [foundationType, setFoundationType] = useState('');
  const [exteriorTypes, setExteriorTypes] = useState<string[]>([]);
  const [roofType, setRoofType] = useState('');
  const [appliancesSystems, setAppliancesSystems] = useState<string[]>(['Dryer (gas/electric)', 'Dishwasher']);
  const [appliancesOther, setAppliancesOther] = useState('');
  const [customTasks, setCustomTasks] = useState<{ title: string; frequency_days: number }[]>([]);
  const [customTaskInput, setCustomTaskInput] = useState('');
  const [customTaskFrequencyDays, setCustomTaskFrequencyDays] = useState(90);

  const [planEntries, setPlanEntries] = useState<PlanEntry[]>([]);
  const [planGenerated, setPlanGenerated] = useState(false);

  const totalSteps = 7;
  const isLastStep = step === totalSteps - 1;

  const doNotSaveCheckbox = (
    <div className="flex items-start gap-3 mt-4 pt-3 border-t">
      <Checkbox
        id="doNotSave"
        checked={doNotSaveHomeInfo}
        onCheckedChange={(c) => setDoNotSaveHomeInfo(!!c)}
      />
      <Label htmlFor="doNotSave" className="text-sm font-normal cursor-pointer leading-tight">
        Do NOT save my home information. Only use it temporarily to build my plan.
      </Label>
    </div>
  );

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
          const zipVal = row.zip ?? '';
          setZip(zipVal);
          setZipFromProfile(!!zipVal.trim());
          setClimateRegion(row.climate_region ?? '');
          setHomeType(row.home_type ?? '');
          setHomeAge(row.home_age ?? '');
          setFoundationType(row.foundation_type ?? '');
          const ext = row.exterior_type;
          setExteriorTypes(ext && typeof ext === 'string' ? ext.split(',').map((s) => s.trim()).filter(Boolean) : []);
          setRoofType(row.roof_type ?? '');
          const as = row.appliances_systems;
          setAppliancesSystems(Array.isArray(as) && as.length > 0 ? as : ['Dryer (gas/electric)', 'Dishwasher']);
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
      setCustomTasks((prev) => [...prev, { title: t, frequency_days: customTaskFrequencyDays }]);
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
        if (heatingCooling.length > 0) categoriesToInclude.add('hvac');
        if (hotWater) categoriesToInclude.add('plumbing');
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
          ...customTasks.map((ct) => ({ type: 'custom' as const, title: ct.title, frequency_days: ct.frequency_days })),
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
          const nextDue = addDays(new Date(), entry.frequency_days);
          await supabase.from('user_maintenance_tasks').insert({
            user_id: user.id,
            home_id: homeId,
            title: entry.title,
            description: null,
            category: 'general',
            frequency_days: entry.frequency_days,
            next_due: nextDue.toISOString(),
            criticality: 2,
          });
        }
      }

      if (!doNotSaveHomeInfo) {
        const appliancesArr = appliancesOther.trim()
          ? [...appliancesSystems, appliancesOther.trim()]
          : appliancesSystems;
        const region = zip.trim() ? zipToClimateRegion(zip) : climateRegion;

        const payload = {
          home_id: homeId,
          heating_cooling_systems: heatingCooling,
          hot_water_system: hotWater || null,
          zip: zip.trim() || null,
          climate_region: region || null,
          home_type: homeType || null,
          home_age: homeAge || null,
          foundation_type: foundationType || null,
          exterior_type: exteriorTypes.length > 0 ? exteriorTypes.join(',') : null,
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

  const canNext = () => true;

  const handleNext = async () => {
    if (step === 5 && !planGenerated) {
      await generatePlan();
      setStep(6);
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
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
              {/* Step 0 — Heating & Cooling */}
              {step === 0 && (
                <div className="space-y-4">
                  <p className="text-sm">
                    Which heating or cooling system does your home use? Select all that apply.
                  </p>
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
                  {doNotSaveCheckbox}
                </div>
              )}

              {/* Step 1 — Hot Water */}
              {step === 1 && (
                <div className="space-y-4">
                  <p className="text-sm">How is your hot water generated?</p>
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
                  {doNotSaveCheckbox}
                </div>
              )}

              {/* Step 2 — ZIP / Climate */}
              {step === 2 && (
                <div className="space-y-4">
                  {zipFromProfile && zip.trim() ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Your home profile already has ZIP code <strong>{zip}</strong>.
                        {climateRegion && ` Climate region: ${climateRegion}.`}
                      </p>
                      <p className="text-sm">You can change it below if needed.</p>
                    </>
                  ) : (
                    <p className="text-sm">
                      What's your ZIP code? We'll use it to determine your climate region.
                    </p>
                  )}
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
                  {doNotSaveCheckbox}
                </div>
              )}

              {/* Step 3 — Home characteristics */}
              {step === 3 && (
                <div className="space-y-4">
                  <p className="text-sm">
                    Tell us a bit more about your home so we can fine-tune your maintenance plan.
                  </p>
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
                      <Label>Exterior type (select all that apply)</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {EXTERIOR_OPTIONS.map((opt) => (
                          <Button
                            key={opt}
                            type="button"
                            variant={exteriorTypes.includes(opt) ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => toggleMulti(exteriorTypes, opt, setExteriorTypes)}
                          >
                            {opt}
                          </Button>
                        ))}
                      </div>
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
                  {doNotSaveCheckbox}
                </div>
              )}

              {/* Step 4 — Appliances & systems */}
              {step === 4 && (
                <div className="space-y-4">
                  <p className="text-sm">
                    Which of these systems or appliances do you have? Select all that apply.
                  </p>
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
                  {doNotSaveCheckbox}
                </div>
              )}

              {/* Step 5 — Unique home tasks */}
              {step === 5 && (
                <div className="space-y-4 p-4">
                  <p className="text-sm">
                    Are there any maintenance tasks unique to your home that you'd like to include?
                    Examples: "Clean koi pond filter", "Check flat roof drains", "Inspect retaining wall".
                  </p>
                  <div className="flex flex-wrap gap-2 items-end">
                    <Input
                      value={customTaskInput}
                      onChange={(e) => setCustomTaskInput(e.target.value)}
                      placeholder="e.g. Inspect retaining wall"
                      className="flex-1 min-w-[180px]"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTaskLine())}
                    />
                    <div className="flex items-center gap-2">
                      <Label className="text-xs whitespace-nowrap">Frequency</Label>
                      <select
                        className="h-9 rounded-md border border-input bg-background px-2 py-1 text-sm min-w-[100px]"
                        value={customTaskFrequencyDays}
                        onChange={(e) => setCustomTaskFrequencyDays(Number(e.target.value))}
                      >
                        {CUSTOM_TASK_FREQUENCIES.map((f) => (
                          <option key={f.days} value={f.days}>{f.label}</option>
                        ))}
                      </select>
                    </div>
                    <Button type="button" variant="outline" size="icon" onClick={addCustomTaskLine}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {customTasks.length > 0 && (
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {customTasks.map((ct, i) => (
                        <li key={i} className="flex items-center justify-between gap-2">
                          <span>{ct.title}</span>
                          <span className="text-muted-foreground text-xs">
                            {CUSTOM_TASK_FREQUENCIES.find((f) => f.days === ct.frequency_days)?.label ?? `${ct.frequency_days} days`}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setCustomTasks((p) => p.filter((_, j) => j !== i))}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {doNotSaveCheckbox}
                </div>
              )}

              {/* Step 6 — Generate & review plan */}
              {step === 6 && (
                <div className="space-y-4 p-4">
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
                      <div className="max-h-[320px] overflow-y-auto space-y-2 p-4 pr-6">
                        {planEntries.map((entry, index) => (
                          <Card key={index}>
                            <CardContent className="py-3 px-4 flex items-center justify-between gap-2">
                              <span className="text-sm truncate flex-1 min-w-0">
                                {entry.type === 'template' ? entry.title : entry.title}
                                {entry.type === 'custom' && (
                                  <span className="text-muted-foreground ml-1">
                                    (custom · {CUSTOM_TASK_FREQUENCIES.find((f) => f.days === entry.frequency_days)?.label ?? `${entry.frequency_days} days`})
                                  </span>
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
                  {doNotSaveCheckbox}
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
