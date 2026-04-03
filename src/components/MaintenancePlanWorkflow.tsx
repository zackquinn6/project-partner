import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, ClipboardList, Loader2, Trash2, Plus, Shield, ShieldCheck, Home, HelpCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { addDays } from 'date-fns';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { useResponsive } from '@/hooks/useResponsive';

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
] as const;

const MAINTENANCE_LEVELS = [
  { value: 1, minCriticality: 3, label: 'Essential only', sublabel: 'High criticality tasks', icon: Shield },
  { value: 2, minCriticality: 2, label: 'Add recommended', sublabel: 'High + medium criticality', icon: ShieldCheck },
  { value: 3, minCriticality: 1, label: 'Full control', sublabel: 'All tasks for your home', icon: Home },
] as const;

const HOME_TYPE_OPTIONS = ['Single family', 'Condo', 'Townhouse', 'Multi-family', 'Mobile', 'Other'];

const HOME_AGE_OPTIONS = ['New (0–5 yrs)', '5–15 years', '15–30 years', '30–50 years', '50+ years', 'Unknown'] as const;
/** Median year for each approximate age range (e.g. 1980-2000 -> 1990). */
function homeAgeToMedianYear(ageLabel: string): number | null {
  const now = new Date().getFullYear();
  switch (ageLabel) {
    case 'New (0–5 yrs)': return now - 2;
    case '5–15 years': return now - 10;
    case '15–30 years': return now - 22;
    case '30–50 years': return now - 40;
    case '50+ years': return now - 55;
    case 'Unknown': return 2000;
    default: return null;
  }
}

const YEAR_MIN = 1850;
const YEAR_MAX = new Date().getFullYear();

const CATEGORY_LABELS: Record<string, string> = {
  appliances: 'Appliances',
  electrical: 'Electrical',
  exterior: 'Exterior',
  general: 'General',
  hvac: 'HVAC',
  interior: 'Interior',
  landscaping: 'Landscaping',
  outdoor: 'Outdoor',
  plumbing: 'Plumbing',
  roof: 'Roof',
  safety: 'Safety',
  security: 'Security',
};

const STEP_TOOLTIPS: Record<number, string> = {
  0: 'Your heating and cooling systems drive which HVAC tasks we recommend (e.g. filter changes, furnace tune-ups). This keeps your plan relevant to how your home is actually heated and cooled.',
  1: 'Hot water system type affects plumbing and safety tasks (e.g. flushing a tank, checking pressure relief). We use this to include the right maintenance for your setup.',
  2: 'Your ZIP code helps us pick a climate region so we can tailor tasks to your area—for example, winterizing in cold regions or AC and irrigation in warmer ones.',
  3: 'Home type, age, foundation, exterior, and roof shape which categories and tasks we suggest. Older homes or certain materials often need specific checks and care.',
  4: 'Systems like sump pumps, septic, or solar have their own maintenance needs. Telling us what you have ensures those tasks are included and nothing important is missed.',
  5: 'Lawn and landscape choices determine whether we add mowing, irrigation, gutter, and leaf-cleanup tasks. This keeps outdoor maintenance in line with what you actually maintain.',
  6: 'Add one-off tasks that are specific to your property (e.g. a pond, flat roof, or retaining wall). They become part of your plan with the schedule you choose.',
  7: 'Choose how many tasks you want: essential only (high priority), recommended (high + medium), or full (all tasks). More tasks mean better coverage but more to track.',
  8: 'Browse templates that weren’t added from your answers. Add any that fit your home—for example, tasks for systems you have that the questionnaire didn’t cover. Already-added tasks don’t appear here.',
  9: 'Here’s your plan. Remove any task you don’t want, then press Save to add everything to your maintenance list so you can track and log completions.',
};
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
  'Garage door & opener',
  'Pool',
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

const LAWN_LANDSCAPE_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'not_important', label: 'Not important' },
  { value: 'no_lawn', label: 'No Lawn / No Maintenance Needs' },
] as const;

interface HomeDetailsRow {
  home_id: string;
  heating_cooling_systems?: string[] | null;
  hot_water_system?: string | null;
  zip?: string | null;
  climate_region?: string | null;
  home_type?: string | null;
  home_age?: string | null;
  home_year?: number | null;
  foundation_type?: string | null;
  exterior_type?: string | null;
  roof_type?: string | null;
  appliances_systems?: string[] | null;
  lawn_landscape_choice?: string | null;
  sprinkler_system?: boolean | null;
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
  maintenanceTemplateId: string;
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
  const { isMobile } = useResponsive();
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
  const [homeYear, setHomeYear] = useState<number>(2000);
  const [foundationType, setFoundationType] = useState('');
  const [exteriorTypes, setExteriorTypes] = useState<string[]>([]);
  const [roofType, setRoofType] = useState('');
  const [appliancesSystems, setAppliancesSystems] = useState<string[]>(['Dryer (gas/electric)', 'Dishwasher']);
  const [lawnLandscapeChoice, setLawnLandscapeChoice] = useState<'yes' | 'not_important' | 'no_lawn' | ''>('');
  const [sprinklerSystem, setSprinklerSystem] = useState(false);
  const [customTasks, setCustomTasks] = useState<{ title: string; frequency_days: number }[]>([]);
  const [customTaskInput, setCustomTaskInput] = useState('');
  const [customTaskFrequencyDays, setCustomTaskFrequencyDays] = useState(90);
  const [maintenanceLevel, setMaintenanceLevel] = useState<1 | 2 | 3>(2);

  const [planEntries, setPlanEntries] = useState<PlanEntry[]>([]);
  const [planGenerated, setPlanGenerated] = useState(false);
  const [allTemplates, setAllTemplates] = useState<MaintenanceTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [existingTemplateIds, setExistingTemplateIds] = useState<Set<string>>(new Set());

  const totalSteps = 10;
  const isLastStep = step === totalSteps - 1;

  const doNotSaveCheckbox = (
    <div className="flex items-start gap-3 mt-4 pt-3 border-t">
      <Checkbox
        id="doNotSave"
        checked={doNotSaveHomeInfo}
        onCheckedChange={(c) => setDoNotSaveHomeInfo(!!c)}
        className="h-5 w-5 shrink-0 [&_svg]:h-5 [&_svg]:w-5"
      />
      <Label htmlFor="doNotSave" className="text-xs font-normal cursor-pointer leading-tight">
        Do NOT save my home information. Only use it temporarily to build my plan.
      </Label>
    </div>
  );

  useEffect(() => {
    if (open) {
      setStep(0);
      setPlanGenerated(false);
      setPlanEntries([]);
      setAllTemplates([]);
    }
  }, [open]);

  // Generate plan when user reaches step 7 so we use the latest form state (selections from steps 0–6).
  useEffect(() => {
    if (!open || !homeId || !user || step !== 7 || planGenerated || loading) return;
    generatePlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when step becomes 7; generatePlan reads current state from closure
  }, [open, homeId, user, step, planGenerated, loading]);

  useEffect(() => {
    if (!open || step !== 7 || !planGenerated) return;
    setLoadingTemplates(true);
    supabase
      .from('maintenance_templates')
      .select('*')
      .order('category', { ascending: true })
      .order('title', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error('Error fetching templates for step 9:', error);
          setAllTemplates([]);
        } else {
          setAllTemplates((data as MaintenanceTemplate[]) || []);
        }
        setLoadingTemplates(false);
      });
  }, [open, step, planGenerated]);

  useEffect(() => {
    if (!open || !homeId) {
      setLoadingDetails(false);
      return;
    }
    setLoadingDetails(true);
    Promise.all([
      supabase.from('home_details').select('*').eq('home_id', homeId).maybeSingle(),
      supabase.from('homes').select('ZIP_code').eq('id', homeId).maybeSingle(), // column created as "ZIP_code" in migration
    ])
      .then(([detailsRes, homesRes]) => {
        const row = detailsRes.data as HomeDetailsRow | null;
        const homeRow = homesRes.data as { ZIP_code?: string | null } | null;
        const zipVal = (homeRow?.ZIP_code ?? '').trim();
        setZip(zipVal);
        setZipFromProfile(!!zipVal);
        if (row) {
          const hc = row.heating_cooling_systems;
          setHeatingCooling(Array.isArray(hc) ? hc : []);
          const hw = row.hot_water_system ?? '';
          const hotWaterOpts = HOT_WATER_OPTIONS as readonly string[];
          setHotWater(hotWaterOpts.includes(hw) ? hw : '');
          if (zipVal) setClimateRegion(zipToClimateRegion(zipVal));
          else setClimateRegion(row.climate_region ?? '');
          setHomeType((row.home_type ?? '').trim());
          setHomeAge(row.home_age ?? '');
          if (row.home_year != null) setHomeYear(row.home_year);
          else if (row.home_age) {
            const median = homeAgeToMedianYear(row.home_age);
            if (median != null) setHomeYear(median);
          }
          setFoundationType(row.foundation_type ?? '');
          const ext = row.exterior_type;
          setExteriorTypes(ext && typeof ext === 'string' ? ext.split(',').map((s) => s.trim()).filter(Boolean) : []);
          setRoofType(row.roof_type ?? '');
          const as = row.appliances_systems;
          setAppliancesSystems(Array.isArray(as) && as.length > 0 ? as : ['Dryer (gas/electric)', 'Dishwasher']);
          const ll = row.lawn_landscape_choice;
          setLawnLandscapeChoice(ll === 'yes' || ll === 'not_important' || ll === 'no_lawn' ? ll : '');
          setSprinklerSystem(!!row.sprinkler_system);
        } else if (zipVal) {
          setClimateRegion(zipToClimateRegion(zipVal));
        }
        setLoadingDetails(false);
      })
      .catch((err) => {
        console.error('Error fetching home details / homes:', err);
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
    if (!t) {
      toast({ title: 'Enter a task name', description: 'Type a maintenance task above, then click Add task.', variant: 'destructive' });
      return;
    }
    setCustomTasks((prev) => [...prev, { title: t, frequency_days: customTaskFrequencyDays }]);
    setCustomTaskInput('');
  };

  const removePlanEntry = (index: number) => {
    setPlanEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const addTemplateToPlan = (template: MaintenanceTemplate) => {
    setPlanEntries((prev) => [
      ...prev,
      { type: 'template' as const, maintenanceTemplateId: template.id, title: template.title, template },
    ]);
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
            .select('maintenance_template_id')
            .eq('user_id', user.id)
            .eq('home_id', homeId)
            .not('maintenance_template_id', 'is', null),
        ]);

        if (templatesRes.error) throw templatesRes.error;
        const templates = (templatesRes.data || []) as MaintenanceTemplate[];
        const existingTemplateIdSet = new Set<string>(
          existingRes.error
            ? []
            : (existingRes.data || []).map((r: { maintenance_template_id: string }) => r.maintenance_template_id)
        );
        setExistingTemplateIds(existingTemplateIdSet);

        if (templates.length === 0) {
          toast({
            title: 'No templates available',
            description: 'Maintenance templates could not be loaded. Your plan will only include custom tasks you add.',
            variant: 'destructive',
          });
        }

        const categoriesToInclude = new Set<string>();
        categoriesToInclude.add('safety');
        categoriesToInclude.add('exterior');
        const hasDuctedOrMechanicalHeatOrCooling = heatingCooling.some(
          (system) =>
            system === 'Oil furnace' ||
            system === 'Gas furnace' ||
            system === 'Electric furnace' ||
            system === 'Hydronic (boiler + radiators/baseboards)' ||
            system === 'Heat pump' ||
            system === 'Central air conditioning' ||
            system === 'Mini-split system'
        );
        if (hasDuctedOrMechanicalHeatOrCooling) categoriesToInclude.add('hvac');
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
        if (appliancesSystems.some((a) => a === 'Solar panels')) categoriesToInclude.add('exterior');
        if (appliancesSystems.some((a) => a === 'Dryer (gas/electric)')) categoriesToInclude.add('safety');
        if (appliancesSystems.some((a) => a === 'Dishwasher' || a === 'Garbage disposal'))
          categoriesToInclude.add('interior');
        if (
          appliancesSystems.some(
            (a) =>
              a === 'Dishwasher' ||
              a === 'Garbage disposal' ||
              a === 'Dryer (gas/electric)'
          )
        )
          categoriesToInclude.add('appliances');
        categoriesToInclude.add('electrical');
        categoriesToInclude.add('interior');

        // Lawn & landscape: no_lawn = no landscape tasks; not_important = gutter (medium) + leaf (low) only; yes = all landscape (irrigation only if sprinkler)
        const lawnChoice = lawnLandscapeChoice || 'no_lawn';
        const LANDSCAPE_TITLE_GUTTER = 'Clean gutters';
        const LANDSCAPE_TITLE_LEAF = 'Leaf cleanup';
        const LANDSCAPE_TITLE_IRRIGATION = 'Flush lawn sprinkler irrigation system';

        if (lawnChoice === 'no_lawn') {
          categoriesToInclude.delete('landscaping');
        } else if (lawnChoice === 'not_important') {
          categoriesToInclude.delete('landscaping');
        } else {
          categoriesToInclude.add('landscaping');
        }

        const levelConfig = MAINTENANCE_LEVELS.find((l) => l.value === maintenanceLevel);
        const minCriticality = levelConfig?.minCriticality ?? 2;
        let selected = templates.filter(
          (t: MaintenanceTemplate) =>
            categoriesToInclude.has(t.category) &&
            !existingTemplateIdSet.has(t.id) &&
            ((t.criticality ?? 2) >= minCriticality)
        );

        if (lawnChoice === 'no_lawn') {
          selected = selected.filter(
            (t: MaintenanceTemplate) =>
              t.title !== LANDSCAPE_TITLE_GUTTER &&
              t.title !== LANDSCAPE_TITLE_LEAF &&
              !t.title.toLowerCase().includes('sprinkler') &&
              !t.title.toLowerCase().includes('irrigation') &&
              t.category !== 'landscaping'
          );
        } else if (lawnChoice === 'not_important') {
          selected = selected.filter(
            (t: MaintenanceTemplate) =>
              t.title !== LANDSCAPE_TITLE_GUTTER &&
              t.category !== 'landscaping'
          );
          const gutterTemplate = templates.find((t: MaintenanceTemplate) => t.title === LANDSCAPE_TITLE_GUTTER);
          const leafTemplate = templates.find((t: MaintenanceTemplate) => t.title === LANDSCAPE_TITLE_LEAF);
          if (gutterTemplate && !existingTemplateIdSet.has(gutterTemplate.id)) {
            selected.push({ ...gutterTemplate, criticality: 2 });
          }
          if (leafTemplate && !existingTemplateIdSet.has(leafTemplate.id)) {
            selected.push(leafTemplate);
          }
        } else {
          selected = selected.filter((t: MaintenanceTemplate) => {
            if (t.category !== 'landscaping') return true;
            if (t.title === LANDSCAPE_TITLE_IRRIGATION || (t.title.toLowerCase().includes('sprinkler') || t.title.toLowerCase().includes('irrigation'))) {
              return sprinklerSystem;
            }
            return true;
          });
        }

        // Sump pump templates should only be included when user selected a sump pump in the workflow.
        const HAS_SUMP_PUMP = appliancesSystems.some((a) => a === 'Sump pump');
        if (!HAS_SUMP_PUMP) {
          const SUMP_TITLES = new Set<string>(['Check sump pump', 'Test sump pump backup']);
          selected = selected.filter((t: MaintenanceTemplate) => !SUMP_TITLES.has(t.title));
        }

        // Filter templates that depend on specific systems so we only include them when the user has that system.
        const hasCentralAir = heatingCooling.includes('Central air conditioning');
        const hasDryer = appliancesSystems.some((a) => a === 'Dryer (gas/electric)');
        const hasDishwasher = appliancesSystems.some((a) => a === 'Dishwasher');
        const hasGarbageDisposal = appliancesSystems.some((a) => a === 'Garbage disposal');
        const hasWaterSoftener = appliancesSystems.some((a) => a === 'Water softener');
        const hasSepticSystem = appliancesSystems.some((a) => a === 'Septic system');
        const hasFireplaceOrChimney = appliancesSystems.some((a) => a === 'Fireplace/chimney');
        const hasGarageDoor = appliancesSystems.some((a) => a === 'Garage door & opener');
        const hasPool = appliancesSystems.some((a) => a === 'Pool');

        if (!hasCentralAir) {
          selected = selected.filter(
            (t: MaintenanceTemplate) =>
              !(t.category === 'hvac' && t.title.toLowerCase().includes('filter'))
          );
        }
        if (!hasDryer) {
          const DRYER_TITLES = new Set<string>(['Clean dryer vent', 'Inspect dryer exhaust duct']);
          selected = selected.filter((t: MaintenanceTemplate) => !DRYER_TITLES.has(t.title));
        }
        if (!hasDishwasher) {
          const DISHWASHER_TITLES = new Set<string>([
            'Clean dishwasher interior and filter',
            'Inspect dishwasher door seal and connections',
          ]);
          selected = selected.filter((t: MaintenanceTemplate) => !DISHWASHER_TITLES.has(t.title));
        }
        if (!hasGarbageDisposal) {
          const DISPOSAL_TITLES = new Set<string>(['Clean garbage disposal', 'Sharpen garbage disposal']);
          selected = selected.filter((t: MaintenanceTemplate) => !DISPOSAL_TITLES.has(t.title));
        }
        if (!hasWaterSoftener) {
          selected = selected.filter((t: MaintenanceTemplate) => t.title !== 'Water softener maintenance');
        }
        if (!hasSepticSystem) {
          const SEPTIC_TITLES = new Set<string>(['Inspect septic tank', 'Pump septic tank']);
          selected = selected.filter((t: MaintenanceTemplate) => !SEPTIC_TITLES.has(t.title));
        }
        if (!hasFireplaceOrChimney) {
          selected = selected.filter((t: MaintenanceTemplate) => t.title !== 'Chimney cleaning');
        }
        if (!hasGarageDoor) {
          const GARAGE_TITLES = new Set<string>(['Test garage door auto reverse', 'Lubricate garage door openers']);
          selected = selected.filter((t: MaintenanceTemplate) => !GARAGE_TITLES.has(t.title));
        }
        if (!hasPool) {
          selected = selected.filter(
            (t: MaintenanceTemplate) => !t.title.toLowerCase().includes('pool')
          );
        }

        const entries: PlanEntry[] = [
          ...selected.map((t: MaintenanceTemplate) => ({
            type: 'template' as const,
            maintenanceTemplateId: t.id,
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
      const { data: existingTasks } = await supabase
        .from('user_maintenance_tasks')
        .select('maintenance_template_id, title')
        .eq('user_id', user.id)
        .eq('home_id', homeId);

      const existingTemplateIds = new Set(
        (existingTasks || []).filter((r) => r.maintenance_template_id != null).map((r) => r.maintenance_template_id as string)
      );
      const existingCustomTitles = new Set(
        (existingTasks || [])
          .filter((r) => r.maintenance_template_id == null && r.title != null)
          .map((r) => (r.title as string).trim().toLowerCase())
      );

      const toInsert: Record<string, unknown>[] = [];
      const now = new Date();
      for (const entry of planEntries) {
        if (entry.type === 'template') {
          if (existingTemplateIds.has(entry.maintenanceTemplateId)) continue;
          const t = entry.template;
          toInsert.push({
            user_id: user.id,
            home_id: homeId,
            maintenance_template_id: t.id,
            title: t.title,
            description: t.description ?? null,
            summary: t.summary ?? null,
            instructions: t.instructions ?? null,
            category: t.category,
            frequency_days: t.frequency_days,
            next_due: addDays(now, t.frequency_days).toISOString(),
            risks_of_skipping: t.risks_of_skipping ?? null,
            benefits_of_maintenance: t.benefits_of_maintenance ?? null,
            criticality: t.criticality ?? 2,
            repair_cost_savings: t.repair_cost_savings ?? null,
          });
          existingTemplateIds.add(entry.maintenanceTemplateId);
        } else {
          if (existingCustomTitles.has(entry.title.trim().toLowerCase())) continue;
          toInsert.push({
            user_id: user.id,
            home_id: homeId,
            title: entry.title,
            description: null,
            category: 'general',
            frequency_days: entry.frequency_days,
            next_due: addDays(now, entry.frequency_days).toISOString(),
            criticality: 2,
          });
          existingCustomTitles.add(entry.title.trim().toLowerCase());
        }
      }

      if (toInsert.length > 0) {
        const { error } = await supabase.from('user_maintenance_tasks').insert(toInsert);
        if (error) throw error;
      }

      if (!doNotSaveHomeInfo) {
        const region = zip.trim() ? zipToClimateRegion(zip) : climateRegion;
        const resolvedHomeYear =
          homeAge
            ? homeAgeToMedianYear(homeAge) ?? homeYear
            : homeYear;

        const payload = {
          home_id: homeId,
          heating_cooling_systems: heatingCooling,
          hot_water_system: hotWater || null,
          zip: zip.trim() || null,
          climate_region: region || null,
          home_type: homeType || null,
          home_age: homeAge || null,
          home_year: resolvedHomeYear,
          foundation_type: foundationType || null,
          exterior_type: exteriorTypes.length > 0 ? exteriorTypes.join(',') : null,
          roof_type: roofType || null,
          appliances_systems: appliancesSystems,
          lawn_landscape_choice: lawnLandscapeChoice || null,
          sprinkler_system: sprinklerSystem || null,
        };

        const { data: existing, error: existingDetailsError } = await supabase
          .from('home_details')
          .select('home_id')
          .eq('home_id', homeId)
          .maybeSingle();
        if (existingDetailsError) throw existingDetailsError;

        if (existing) {
          const { error } = await supabase.from('home_details').update(payload).eq('home_id', homeId);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('home_details').insert(payload);
          if (error) throw error;
        }

        const { error: homesError } = await supabase
          .from('homes')
          .update({
            ZIP_code: zip.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', homeId);
        if (homesError) throw homesError;
      }

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

  const handleNext = () => {
    if (step < totalSteps - 1) setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`h-[85vh] min-h-[560px] max-h-[90vh] overflow-hidden flex flex-col p-0 ${
          isMobile ? 'max-w-[95vw]' : 'max-w-[90vw] md:max-w-6xl'
        }`}
      >
        <DialogHeader className="px-4 md:px-8 pt-4 md:pt-6 pb-2 md:pb-3 border-b bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-start justify-between gap-3">
            <DialogTitle className="flex flex-col gap-0.5 text-primary">
              <span className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 md:h-7 md:w-7 shrink-0" />
                <span className="text-base md:text-3xl font-semibold">Generate Maintenance Plan</span>
              </span>
              {homeName ? (
                <span className="text-sm md:text-2xl font-semibold text-muted-foreground mt-0.5">
                  {homeName}
                </span>
              ) : null}
            </DialogTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="hidden md:inline-flex text-muted-foreground hover:text-foreground"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
          {!loadingDetails && (
            <div className="flex items-center gap-3 mt-2">
              <Progress value={((step + 1) / totalSteps) * 100} className="h-2 flex-1" />
              <span className="text-xs font-medium text-primary tabular-nums">Step {step + 1} of {totalSteps}</span>
            </div>
          )}
        </DialogHeader>

        {loadingDetails ? (
          <div className="flex-1 flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 md:px-8 py-3 md:py-5 min-h-[380px]">
              {/* Step 0 — Heating & Cooling */}
              {step === 0 && (
                <div className="space-y-4 p-4 rounded-xl border border-primary/20 bg-gradient-to-br from-background via-background to-primary/5 shadow-sm">
                  <div className="flex items-start gap-2">
                    <p className="text-sm md:text-xl font-medium flex-1">
                      Which heating or cooling system does your home use? Select all that apply.
                    </p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className="shrink-0 text-muted-foreground hover:text-foreground rounded p-0.5 touch-manipulation" aria-label="Why we ask this">
                          <HelpCircle className="h-4 w-4" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="left" className="max-w-[280px] p-3 text-sm">
                        {STEP_TOOLTIPS[0]}
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {HEATING_COOLING_OPTIONS.map((opt) => (
                      <Button
                        key={opt}
                        type="button"
                        variant={heatingCooling.includes(opt) ? 'default' : 'outline'}
                        size="sm"
                        className={heatingCooling.includes(opt) ? 'ring-2 ring-primary/30' : ''}
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
                <div className="space-y-4 p-4 rounded-xl border border-primary/20 bg-gradient-to-br from-background via-background to-primary/5 shadow-sm">
                  <div className="flex items-start gap-2">
                    <p className="text-sm md:text-xl font-medium flex-1">How is your hot water generated?</p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className="shrink-0 text-muted-foreground hover:text-foreground rounded p-0.5 touch-manipulation" aria-label="Why we ask this">
                          <HelpCircle className="h-4 w-4" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="left" className="max-w-[280px] p-3 text-sm">
                        {STEP_TOOLTIPS[1]}
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {HOT_WATER_OPTIONS.map((opt) => (
                      <Button
                        key={opt}
                        type="button"
                        variant={hotWater === opt ? 'default' : 'outline'}
                        size="sm"
                        className={hotWater === opt ? 'ring-2 ring-primary/30' : ''}
                        onClick={() => setHotWater(opt)}
                      >
                        {opt}
                      </Button>
                    ))}
                  </div>
                  {doNotSaveCheckbox}
                </div>
              )}

              {/* Step 2 — ZIP / Climate (single path: selected home's ZIP from homes.ZIP_code) */}
              {step === 2 && (
                <div className="space-y-4 p-4 rounded-xl border border-primary/20 bg-gradient-to-br from-background via-background to-primary/5 shadow-sm">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <p className="text-sm md:text-xl">
                        {zipFromProfile && zip.trim()
                          ? `ZIP code for this home: ${zip}. We use it to determine your climate region. You can change it below.`
                          : "Enter this home's ZIP code. We'll use it to determine your climate region."}
                      </p>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className="shrink-0 text-muted-foreground hover:text-foreground rounded p-0.5 touch-manipulation" aria-label="Why we ask this">
                          <HelpCircle className="h-4 w-4" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="left" className="max-w-[280px] p-3 text-sm">
                        {STEP_TOOLTIPS[2]}
                      </PopoverContent>
                    </Popover>
                  </div>
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
                <div className="space-y-4 p-4 rounded-xl border border-primary/20 bg-gradient-to-br from-background via-background to-primary/5 shadow-sm">
                  <div className="flex items-start gap-2">
                    <p className="text-sm md:text-xl font-medium flex-1">
                      Tell us a bit more about your home so we can fine-tune your maintenance plan.
                    </p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className="shrink-0 text-muted-foreground hover:text-foreground rounded p-0.5 touch-manipulation" aria-label="Why we ask this">
                          <HelpCircle className="h-4 w-4" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="left" className="max-w-[280px] p-3 text-sm">
                        {STEP_TOOLTIPS[3]}
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="grid gap-3">
                    <div>
                      <Label className="text-xs">Home type</Label>
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
                    <div className="flex flex-wrap items-end gap-2">
                        <div className="min-w-0 flex-1">
                          <Label className="text-xs">Approx. age</Label>
                          <select
                            className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                            value={homeAge}
                            onChange={(e) => {
                              const v = e.target.value;
                              setHomeAge(v);
                              const median = homeAgeToMedianYear(v);
                              if (median != null) setHomeYear(median);
                            }}
                          >
                            <option value="">Select</option>
                            {HOME_AGE_OPTIONS.map((o) => (
                              <option key={o} value={o}>{o}</option>
                            ))}
                          </select>
                        </div>
                        <span className="text-muted-foreground text-sm font-medium shrink-0 pb-2">or</span>
                        <div className="min-w-0 flex-1">
                          <Label className="text-xs">Build year</Label>
                          <select
                            className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                            value={homeYear}
                            onChange={(e) => setHomeYear(parseInt(e.target.value, 10))}
                          >
                            {Array.from({ length: YEAR_MAX - YEAR_MIN + 1 }, (_, i) => YEAR_MAX - i).map((y) => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    <div>
                      <Label className="text-xs">Foundation type</Label>
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
                      <Label className="text-xs">Exterior type (select all that apply)</Label>
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
                      <Label className="text-xs">Roof type</Label>
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
                <div className="space-y-4 p-4 rounded-xl border border-primary/20 bg-gradient-to-br from-background via-background to-primary/5 shadow-sm">
                  <div className="flex items-start gap-2">
                    <p className="text-sm md:text-base font-medium flex-1">
                      Which of these systems or appliances do you have? Select all that apply.
                    </p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className="shrink-0 text-muted-foreground hover:text-foreground rounded p-0.5 touch-manipulation" aria-label="Why we ask this">
                          <HelpCircle className="h-4 w-4" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="left" className="max-w-[280px] p-3 text-sm">
                        {STEP_TOOLTIPS[4]}
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {APPLIANCES_SYSTEMS_OPTIONS.map((opt) => (
                      <Button
                        key={opt}
                        type="button"
                        variant={appliancesSystems.includes(opt) ? 'default' : 'outline'}
                        size="sm"
                        className={appliancesSystems.includes(opt) ? 'ring-2 ring-primary/30' : ''}
                        onClick={() => toggleMulti(appliancesSystems, opt, setAppliancesSystems)}
                      >
                        {opt}
                      </Button>
                    ))}
                  </div>
                  {doNotSaveCheckbox}
                </div>
              )}

              {/* Step 5 — Lawn & Landscape */}
              {step === 5 && (
                <div className="space-y-4 p-4 rounded-xl border border-primary/20 bg-gradient-to-br from-background via-background to-primary/5 shadow-sm">
                  <div className="flex items-start gap-2">
                    <p className="text-sm md:text-xl font-medium flex-1">
                      Are you maintaining a green lawn?
                    </p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className="shrink-0 text-muted-foreground hover:text-foreground rounded p-0.5 touch-manipulation" aria-label="Why we ask this">
                          <HelpCircle className="h-4 w-4" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="left" className="max-w-[280px] p-3 text-sm">
                        {STEP_TOOLTIPS[5]}
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {LAWN_LANDSCAPE_OPTIONS.map((opt) => (
                      <Button
                        key={opt.value}
                        type="button"
                        variant={lawnLandscapeChoice === opt.value ? 'default' : 'outline'}
                        size="sm"
                        className={lawnLandscapeChoice === opt.value ? 'ring-2 ring-primary/30' : ''}
                        onClick={() => setLawnLandscapeChoice(opt.value)}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                  {lawnLandscapeChoice === 'yes' && (
                    <>
                      <p className="text-sm font-medium pt-2">Do you have a sprinkler system?</p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant={sprinklerSystem ? 'default' : 'outline'}
                          size="sm"
                          className={sprinklerSystem ? 'ring-2 ring-primary/30' : ''}
                          onClick={() => setSprinklerSystem(true)}
                        >
                          Yes
                        </Button>
                        <Button
                          type="button"
                          variant={!sprinklerSystem ? 'default' : 'outline'}
                          size="sm"
                          className={!sprinklerSystem ? 'ring-2 ring-primary/30' : ''}
                          onClick={() => setSprinklerSystem(false)}
                        >
                          No
                        </Button>
                      </div>
                    </>
                  )}
                  {doNotSaveCheckbox}
                </div>
              )}

              {/* Step 9 — Unique home tasks */}
              {step === 8 && (
                <div className="space-y-4 p-4 rounded-xl border border-primary/20 bg-gradient-to-br from-background via-background to-primary/5 shadow-sm">
                  <div className="flex items-start gap-2">
                      <p className="text-sm md:text-xl flex-1">
                      Are there any maintenance tasks unique to your home that you'd like to include?
                      Examples: "Clean koi pond filter", "Check flat roof drains", "Inspect retaining wall".
                    </p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className="shrink-0 text-muted-foreground hover:text-foreground rounded p-0.5 touch-manipulation" aria-label="Why we ask this">
                          <HelpCircle className="h-4 w-4" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="left" className="max-w-[280px] p-3 text-sm">
                        {STEP_TOOLTIPS[6]}
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex flex-wrap gap-3 items-end">
                    <Input
                      value={customTaskInput}
                      onChange={(e) => setCustomTaskInput(e.target.value)}
                      placeholder="e.g. Inspect retaining wall"
                      className="flex-1 min-w-[180px]"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTaskLine())}
                    />
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs font-medium">Frequency</Label>
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
                    <Button type="button" variant="default" size="sm" onClick={addCustomTaskLine} className="shrink-0">
                      <Plus className="h-4 w-4 mr-1" />
                      Add task
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

              {/* Step 7 — Maintenance level */}
              {step === 6 && (
                <div className="space-y-6 p-4 rounded-xl border border-primary/20 bg-gradient-to-br from-background via-background to-primary/5 shadow-sm">
                  <div className="flex items-start gap-2">
                    <p className="text-sm md:text-xl font-medium text-foreground flex-1">
                      Choose how much maintenance to include. More tasks give you better control of your home - and require more effort to track them.
                    </p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className="shrink-0 text-muted-foreground hover:text-foreground rounded p-0.5 touch-manipulation" aria-label="Why we ask this">
                          <HelpCircle className="h-4 w-4" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="left" className="max-w-[280px] p-3 text-sm">
                        {STEP_TOOLTIPS[7]}
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-4">
                    <Slider
                      value={[maintenanceLevel]}
                      onValueChange={([v]) => setMaintenanceLevel(v)}
                      min={1}
                      max={3}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between gap-2 text-xs">
                      {MAINTENANCE_LEVELS.map((level) => {
                        const Icon = level.icon;
                        const active = maintenanceLevel === level.value;
                        return (
                          <button
                            key={level.value}
                            type="button"
                            onClick={() => setMaintenanceLevel(level.value)}
                            className={`flex flex-col items-center gap-1 min-w-0 flex-1 p-2 rounded-lg transition-colors ${
                              active ? 'bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/40' : 'text-muted-foreground hover:bg-muted'
                            }`}
                          >
                            <Icon className="h-5 w-5 shrink-0" />
                            <span className="font-medium">{level.label}</span>
                            <span className="text-[10px] opacity-90">{level.sublabel}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {doNotSaveCheckbox}
                </div>
              )}

              {/* Step 8 — Plan summary and add any tasks */}
              {step === 7 && (
                <div className="space-y-4 p-4 rounded-xl border border-primary/20 bg-gradient-to-br from-background via-background to-primary/5 shadow-sm">
                  <div className="flex items-start gap-2">
                    <p className="text-sm md:text-xl font-medium flex-1">
                      Your maintenance plan currently includes{' '}
                      <span className="font-semibold">
                        {planEntries.length} task{planEntries.length === 1 ? '' : 's'}
                      </span>
                      . Add any additional tasks below.
                    </p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className="shrink-0 text-muted-foreground hover:text-foreground rounded p-0.5 touch-manipulation" aria-label="Why we ask this">
                          <HelpCircle className="h-4 w-4" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="left" className="max-w-[280px] p-3 text-sm">
                        {STEP_TOOLTIPS[8]}
                      </PopoverContent>
                    </Popover>
                  </div>
                  {!planGenerated || loading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Generating your plan from your selections…</p>
                    </div>
                  ) : loadingTemplates ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (() => {
                    const alreadyInPlanIds = new Set(
                      planEntries.filter((e): e is PlanItem => e.type === 'template').map((e) => e.maintenanceTemplateId)
                    );
                    const existingIds = existingTemplateIds;
                    const excludedIds = new Set<string>([
                      ...Array.from(alreadyInPlanIds),
                      ...Array.from(existingIds),
                    ]);
                    const notYetInPlan = allTemplates
                      .filter((t) => !excludedIds.has(t.id))
                      .sort((a, b) => (b.criticality ?? 0) - (a.criticality ?? 0));
                    const grouped = notYetInPlan.reduce((acc, t) => {
                      if (!acc[t.category]) acc[t.category] = [];
                      acc[t.category].push(t);
                      return acc;
                    }, {} as Record<string, MaintenanceTemplate[]>);
                    // Order categories by highest criticality first, then name
                    const sortedCategories = Object.keys(grouped).sort((a, b) => {
                      const maxA = Math.max(...grouped[a].map((t) => t.criticality ?? 0));
                      const maxB = Math.max(...grouped[b].map((t) => t.criticality ?? 0));
                      if (maxB !== maxA) return maxB - maxA;
                      return a.localeCompare(b);
                    });
                    // Within each category, templates already sorted by criticality desc from notYetInPlan
                    sortedCategories.forEach((cat) => {
                      grouped[cat].sort((a, b) => (b.criticality ?? 0) - (a.criticality ?? 0));
                    });
                    return (
                      <div className="max-h-[360px] overflow-y-auto space-y-4 pr-2">
                        {sortedCategories.length === 0 ? (
                          <p className="text-sm text-muted-foreground">All available templates are already in your plan. Tap Next to review and save.</p>
                        ) : (
                          sortedCategories.map((category) => (
                            <div key={category}>
                              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                {CATEGORY_LABELS[category] ?? category}
                              </h3>
                              <div className="space-y-2">
                                {grouped[category].map((template) => (
                                  <Card key={template.id} className="border-border hover:border-primary/30 transition-colors">
                                    <CardContent className="py-2.5 px-3 flex items-center justify-between gap-2">
                                      <div className="min-w-0 flex-1">
                                        <span className="text-sm font-medium block truncate">{template.title}</span>
                                        <span className="text-xs text-muted-foreground">Every {template.frequency_days} days</span>
                                      </div>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="shrink-0 h-8"
                                        onClick={() => addTemplateToPlan(template)}
                                      >
                                        <Plus className="h-3.5 w-3.5 mr-1" />
                                        Add
                                      </Button>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    );
                  })()}
                  {doNotSaveCheckbox}
                </div>
              )}

              {/* Step 9 — Here's your plan, now press save */}
              {step === 9 && (
                <div className="space-y-4 p-4 rounded-xl border border-primary/20 bg-gradient-to-br from-background via-background to-primary/5 shadow-sm">
                  <div className="flex items-start gap-2">
                    <p className="text-sm md:text-xl text-muted-foreground flex-1">
                      Here's your plan. Remove any task you don't want, then press Save My Plan.
                    </p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className="shrink-0 text-muted-foreground hover:text-foreground rounded p-0.5 touch-manipulation" aria-label="Why we ask this">
                          <HelpCircle className="h-4 w-4" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="left" className="max-w-[280px] p-3 text-sm">
                        {STEP_TOOLTIPS[9]}
                      </PopoverContent>
                    </Popover>
                  </div>
                  {planEntries.length > 0 ? (
                    <div className="max-h-[320px] overflow-y-auto space-y-3 p-4 pr-6">
                      {(() => {
                        const buckets: Record<'high' | 'medium' | 'low', { entry: PlanEntry; index: number }[]> = {
                          high: [],
                          medium: [],
                          low: [],
                        };
                        const getEntryCriticality = (entry: PlanEntry): number => {
                          if (entry.type === 'template') {
                            return entry.template.criticality ?? 2;
                          }
                          return 2;
                        };
                        const getEntryCategoryLabel = (entry: PlanEntry): string => {
                          if (entry.type === 'template') {
                            return CATEGORY_LABELS[entry.template.category] ?? entry.template.category;
                          }
                          return 'General (custom)';
                        };
                        planEntries.forEach((entry, index) => {
                          const crit = getEntryCriticality(entry);
                          const bucketKey: 'high' | 'medium' | 'low' =
                            crit >= 3 ? 'high' : crit <= 1 ? 'low' : 'medium';
                          buckets[bucketKey].push({ entry, index });
                        });
                        (['high', 'medium', 'low'] as const).forEach((key) => {
                          buckets[key].sort((a, b) => {
                            const critA = getEntryCriticality(a.entry);
                            const critB = getEntryCriticality(b.entry);
                            if (critB !== critA) return critB - critA;
                            const catA = getEntryCategoryLabel(a.entry);
                            const catB = getEntryCategoryLabel(b.entry);
                            if (catA !== catB) return catA.localeCompare(catB);
                            return a.entry.title.localeCompare(b.entry.title);
                          });
                        });
                        const orderedBuckets: { key: 'high' | 'medium' | 'low'; label: string }[] = [
                          { key: 'high', label: 'High criticality' },
                          { key: 'medium', label: 'Medium criticality' },
                          { key: 'low', label: 'Low criticality' },
                        ];
                        return orderedBuckets.map(({ key, label }) => {
                          const items = buckets[key];
                          if (items.length === 0) return null;
                          return (
                            <div key={key} className="space-y-2">
                              <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                                {label}
                                <span className="text-[11px] font-normal text-muted-foreground/80">
                                  ({items.length} task{items.length === 1 ? '' : 's'})
                                </span>
                              </h3>
                              {items.map(({ entry, index }) => {
                                const categoryLabel = getEntryCategoryLabel(entry);
                                const crit = getEntryCriticality(entry);
                                const critLabel = crit >= 3 ? 'High' : crit <= 1 ? 'Low' : 'Medium';
                                const frequencyLabel =
                                  entry.type === 'template'
                                    ? `Every ${entry.template.frequency_days} days`
                                    : CUSTOM_TASK_FREQUENCIES.find((f) => f.days === (entry as PlanCustomItem).frequency_days)
                                        ?.label ?? `${(entry as PlanCustomItem).frequency_days} days`;
                                return (
                                  <Card key={`${key}-${index}`} className="border-primary/15 hover:border-primary/30 transition-colors">
                                    <CardContent className="py-3 px-4 flex items-center justify-between gap-2">
                                      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 flex-1 min-w-0">
                                        <span className="text-sm truncate flex-1 min-w-0">
                                          {entry.title}
                                          {entry.type === 'custom' && (
                                            <span className="text-muted-foreground ml-1">
                                              (custom · {frequencyLabel})
                                            </span>
                                          )}
                                        </span>
                                        <div className="text-[11px] text-muted-foreground shrink-0 sm:text-right">
                                          <div className="truncate">{categoryLabel}</div>
                                          <div className="truncate">
                                            {critLabel} · {frequencyLabel}
                                          </div>
                                        </div>
                                      </div>
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
                                );
                              })}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No tasks in your plan. Go back to add templates or custom tasks.</p>
                  )}
                  {doNotSaveCheckbox}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-6 py-3 border-t bg-muted/30">
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
