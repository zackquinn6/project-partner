/**
 * Stage 3: writing the applied risk list for one run.
 *
 * This is where the three layers meet. Stage 1 is what the template authored: PFMEA failure
 * modes for quality, register risks for safety, schedule, and budget. Stage 2 is the rules
 * that move occurrence and detection for this particular user. Stage 3 is the result, written
 * to `project_run_risks` in plain language.
 *
 * Two invariants hold on every re-evaluation:
 *
 * 1. A row the user created is never touched. Those rows have no `template_risk_id` and no
 *    `source`, which is what distinguishes them from derived rows.
 * 2. Only the baseline scoring columns are rewritten. Mitigation progress, notes, and a
 *    `hidden_from_register` choice belong to the user and survive re-evaluation.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database, Json } from '@/integrations/supabase/types';
import { fetchActionPriorityTable, type ActionPriorityTable } from '@/utils/actionPriorityTable';
import {
  evaluateKeyCharacteristic,
  fetchOccurrenceDriverTable,
  resolveKcItemLabel,
  type KeyCharacteristicRow,
  type OccurrenceDriver,
  type RiskItemKind,
  type StepItemSource,
} from '@/utils/keyCharacteristics';
import {
  maxPfmeaSeverityForFailureMode,
  minPfmeaDetectionScoreForFailureMode,
} from '@/utils/pfmeaRiskMetrics';
import {
  evaluateProjectRiskLogic,
  loadProjectRiskRules,
  type AppliedRiskItem,
  type ProjectRiskRule,
  type RiskLogicItem,
} from '@/utils/projectRiskLogic';
import { resolveRiskSignals } from '@/utils/riskSignals';
import {
  RISK_DIMENSIONS,
  isRegisterRiskDimension,
  isActionPriority,
  isRiskDimension,
  type ActionPriority,
  type RiskDimension,
} from '@/utils/riskDimensions';
import { rollupRiskComponents, type RiskComponentRollup } from '@/utils/riskProfileRollup';

/** Plain-language text for one applied quality item, built at write time. */
interface QualityTranslation {
  title: string;
  description: string;
}

const TITLE_MAX_LENGTH = 160;

function trimToLength(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 3).trimEnd()}...`;
}

function sentence(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean === '') return '';
  return /[.!?]$/.test(clean) ? clean : `${clean}.`;
}

/**
 * Turns a PFMEA line into something a DIYer reads without knowing what a failure mode is.
 * Translation happens here, on write, so no consumer of the risk list ever joins to a
 * `pfmea_*` table and those tables keep their admin-only policies.
 */
function translateQualityItem(input: {
  failureMode: string;
  requirementText: string;
  stepTitle: string | null;
  effectDescriptions: readonly string[];
  rationales: readonly string[];
}): QualityTranslation {
  const { failureMode, requirementText, stepTitle, effectDescriptions, rationales } = input;

  const title = stepTitle
    ? trimToLength(`${stepTitle}: ${failureMode}`, TITLE_MAX_LENGTH)
    : trimToLength(failureMode, TITLE_MAX_LENGTH);

  const parts: string[] = [sentence(`This step has to end up ${requirementText}`)];
  if (effectDescriptions.length > 0) {
    parts.push(sentence(`Get it wrong and ${effectDescriptions.join(', ')}`));
  }
  for (const rationale of rationales) {
    parts.push(sentence(rationale));
  }

  return { title, description: parts.filter((part) => part !== '').join(' ') };
}

/**
 * One thing a Key Characteristic could be about, before the test is applied.
 *
 * Quality contributes one per cause, because the driver and the implicated item are properties
 * of the cause rather than of the failure mode. The register contributes exactly one per risk,
 * since those rows have no cause model.
 */
interface KcCandidateSource {
  occurrenceDriver: string | null;
  isMistakeProofed: boolean;
  itemKind: RiskItemKind | null;
  itemId: string | null;
  /** The cause text for quality, null for the register where the title carries the what. */
  causeDescription: string | null;
}

interface Stage1Load {
  items: RiskLogicItem[];
  /** Per failure mode, the text needed to write the applied row. */
  qualityContext: Map<
    string,
    { failureMode: string; requirementText: string; stepTitle: string | null; effectDescriptions: string[] }
  >;
  /** Register items keep their authored title, so only the template risk id is needed. */
  registerTitleById: Map<string, string>;
  /** Keyed `${targetKind}:${targetId}`, so the KC pass can join to the applied rows. */
  kcSources: Map<string, KcCandidateSource[]>;
  operationStepIds: string[];
  /** Prevention controls with no strength recorded, so mistake-proofing is unknown. */
  unclassifiedControlStrengthCount: number;
}

/** Worst occurrence across the causes that have been scored, or null when none have been. */
function worstOccurrence(causes: readonly { occurrence_score: number | null }[]): number | null {
  const scored = causes
    .map((cause) => cause.occurrence_score)
    .filter((score): score is number => score != null);
  return scored.length > 0 ? Math.max(...scored) : null;
}

async function loadStage1(
  pfmeaProjectId: string,
  templateRootIdForRisks: string
): Promise<Stage1Load> {
  const [failureModeResult, requirementResult, registerResult] = await Promise.all([
    supabase
      .from('pfmea_failure_modes')
      .select(
        'id, failure_mode, operation_step_id, requirement_id, severity_score, pfmea_potential_effects(effect_description, severity_score), pfmea_potential_causes(id, cause_description, occurrence_score, occurrence_driver, implicated_item_kind, implicated_item_id), pfmea_controls(control_type, control_strength, cause_id, detection_score)'
      )
      .eq('project_id', pfmeaProjectId),
    supabase
      .from('pfmea_requirements')
      .select('id, requirement_text')
      .eq('project_id', pfmeaProjectId),
    supabase
      .from('project_risks')
      .select(
        'id, risk_title, risk_dimension, severity_score, occurrence_score, detection_score, operation_step_id, occurrence_driver, prevention_strength, implicated_item_kind, implicated_item_id'
      )
      .eq('project_id', templateRootIdForRisks),
  ]);

  for (const [label, result] of [
    ['pfmea_failure_modes', failureModeResult],
    ['pfmea_requirements', requirementResult],
    ['project_risks', registerResult],
  ] as const) {
    if (result.error) {
      throw new Error(`Applied risk list could not read ${label}: ${result.error.message}`);
    }
  }

  const failureModes = failureModeResult.data ?? [];
  const requirementTextById = new Map(
    (requirementResult.data ?? []).map((row) => [row.id, row.requirement_text])
  );

  const stepIds = Array.from(
    new Set([
      ...failureModes.map((fm) => fm.operation_step_id),
      ...(registerResult.data ?? [])
        .map((risk) => risk.operation_step_id)
        .filter((id): id is string => typeof id === 'string'),
    ])
  );

  const stepTitleById = new Map<string, string>();
  if (stepIds.length > 0) {
    const { data, error } = await supabase
      .from('operation_steps')
      .select('id, step_title')
      .in('id', stepIds);
    if (error) {
      throw new Error(`Applied risk list could not read operation_steps: ${error.message}`);
    }
    for (const step of data ?? []) {
      stepTitleById.set(step.id, step.step_title);
    }
  }

  const items: RiskLogicItem[] = [];
  const qualityContext: Stage1Load['qualityContext'] = new Map();
  const kcSources: Stage1Load['kcSources'] = new Map();
  let unclassifiedControlStrengthCount = 0;

  for (const fm of failureModes) {
    const requirementText = requirementTextById.get(fm.requirement_id);
    if (requirementText === undefined) {
      throw new Error(
        `Failure mode ${fm.id} points at requirement ${fm.requirement_id}, which does not exist.`
      );
    }

    items.push({
      targetKind: 'pfmea_failure_mode',
      targetId: fm.id,
      dimension: 'quality',
      operationStepId: fm.operation_step_id,
      severityScore: maxPfmeaSeverityForFailureMode({
        id: fm.id,
        operation_step_id: fm.operation_step_id,
        severity_score: fm.severity_score,
        pfmea_potential_effects: fm.pfmea_potential_effects ?? [],
        pfmea_potential_causes: fm.pfmea_potential_causes ?? [],
        pfmea_controls: fm.pfmea_controls ?? [],
      }),
      occurrenceScore: worstOccurrence(fm.pfmea_potential_causes ?? []),
      detectionScore: minPfmeaDetectionScoreForFailureMode({
        id: fm.id,
        operation_step_id: fm.operation_step_id,
        severity_score: fm.severity_score,
        pfmea_potential_effects: fm.pfmea_potential_effects ?? [],
        pfmea_potential_causes: fm.pfmea_potential_causes ?? [],
        pfmea_controls: fm.pfmea_controls ?? [],
      }),
    });

    qualityContext.set(fm.id, {
      failureMode: fm.failure_mode,
      requirementText,
      stepTitle: stepTitleById.get(fm.operation_step_id) ?? null,
      effectDescriptions: (fm.pfmea_potential_effects ?? [])
        .map((effect) => effect.effect_description)
        .filter((text): text is string => typeof text === 'string' && text.trim() !== ''),
    });

    const controls = fm.pfmea_controls ?? [];
    for (const control of controls) {
      if (control.control_type === 'prevention' && control.control_strength === null) {
        unclassifiedControlStrengthCount += 1;
      }
    }

    // A cause is mistake-proofed when a prevention control scoped to it removes the
    // opportunity for the error. Controls attached to the failure mode rather than to a cause
    // cover every cause of it, which is how the authoring grid writes a blanket control.
    const mistakeProofedCauseIds = new Set<string>();
    let mistakeProofedWholeFailureMode = false;
    for (const control of controls) {
      if (control.control_type !== 'prevention') continue;
      if (control.control_strength !== 'mistake_proof') continue;
      if (control.cause_id) {
        mistakeProofedCauseIds.add(control.cause_id);
      } else {
        mistakeProofedWholeFailureMode = true;
      }
    }

    kcSources.set(
      `pfmea_failure_mode:${fm.id}`,
      (fm.pfmea_potential_causes ?? []).map((cause) => ({
        occurrenceDriver: cause.occurrence_driver,
        isMistakeProofed: mistakeProofedWholeFailureMode || mistakeProofedCauseIds.has(cause.id),
        itemKind: cause.implicated_item_kind,
        itemId: cause.implicated_item_id,
        causeDescription: cause.cause_description,
      }))
    );
  }

  const registerTitleById = new Map<string, string>();
  for (const risk of registerResult.data ?? []) {
    // A register risk with no component was authored before the four components existed. It
    // still reaches the run through the existing sync; it just has no priority to apply.
    if (!isRegisterRiskDimension(risk.risk_dimension)) continue;

    registerTitleById.set(risk.id, risk.risk_title);
    items.push({
      targetKind: 'template_risk',
      targetId: risk.id,
      dimension: risk.risk_dimension,
      operationStepId: risk.operation_step_id ?? null,
      severityScore: risk.severity_score ?? null,
      occurrenceScore: risk.occurrence_score ?? null,
      detectionScore: risk.detection_score ?? null,
    });

    kcSources.set(`template_risk:${risk.id}`, [
      {
        occurrenceDriver: risk.occurrence_driver,
        isMistakeProofed: risk.prevention_strength === 'mistake_proof',
        itemKind: risk.implicated_item_kind,
        itemId: risk.implicated_item_id,
        causeDescription: null,
      },
    ]);
  }

  return {
    items,
    qualityContext,
    registerTitleById,
    kcSources,
    operationStepIds: stepIds,
    unclassifiedControlStrengthCount,
  };
}

function auditJson(item: AppliedRiskItem): Json {
  return JSON.parse(
    JSON.stringify({
      evaluatedAt: new Date().toISOString(),
      baselineOccurrence: item.occurrenceScore,
      baselineDetection: item.detectionScore,
      rules: item.audit,
    })
  ) as Json;
}

/** The columns Stage 3 owns. Everything else on the row belongs to the user. */
function appliedScoringFields(item: AppliedRiskItem) {
  return {
    risk_dimension: item.dimension,
    operation_step_id: item.operationStepId,
    severity_score: item.severityScore,
    occurrence_score: item.appliedOccurrenceScore,
    detection_score: item.appliedDetectionScore,
    action_priority: item.actionPriority,
    rpn: item.rpn,
    excluded_by_customization: !item.included,
    applied_rule_audit: auditJson(item),
  };
}

/** Repair rows that still lack likelihood/severity after scoring writes. */
async function fillMissingRunRiskLevels(projectRunId: string): Promise<void> {
  const { error: severityError } = await supabase
    .from('project_run_risks')
    .update({ severity: 'medium' })
    .eq('project_run_id', projectRunId)
    .is('severity', null);
  if (severityError) {
    throw new Error(`Applied risk list could not default missing severity: ${severityError.message}`);
  }

  const { error: likelihoodError } = await supabase
    .from('project_run_risks')
    .update({ likelihood: 'medium' })
    .eq('project_run_id', projectRunId)
    .is('likelihood', null);
  if (likelihoodError) {
    throw new Error(`Applied risk list could not default missing likelihood: ${likelihoodError.message}`);
  }
}

/**
 * Rebuilds the applied risk list for a run and its per-component profile.
 *
 * Throws on any failure. The caller at run creation deletes the run when this throws, because
 * a run whose risk list is half written would show the user a safer project than they have.
 */
export async function applyProjectRiskLogicToRun(
  projectRunId: string,
  templateRootIdForRisks: string
): Promise<void> {
  const { data: run, error: runError } = await supabase
    .from('project_runs')
    .select('id, user_id, project_id')
    .eq('id', projectRunId)
    .maybeSingle();

  if (runError) {
    throw new Error(`Applied risk list could not read the run: ${runError.message}`);
  }
  if (!run) {
    throw new Error(`Project run ${projectRunId} not found for risk evaluation.`);
  }
  if (!run.project_id) {
    throw new Error(`Project run ${projectRunId} has no template, so its risk cannot be applied.`);
  }

  const stage1 = await loadStage1(run.project_id, templateRootIdForRisks);
  if (stage1.items.length === 0) {
    // Nothing scored anywhere in this template. The profile and the KC register still get
    // rebuilt so a stale result from an earlier evaluation cannot linger.
    await fillMissingRunRiskLevels(projectRunId);
    await recomputeProjectRunRiskProfile(projectRunId);
    await clearProjectRunKeyCharacteristics(projectRunId);
    return;
  }

  const [actionPriorityTable, signals, rootRules, versionRules] = await Promise.all([
    fetchActionPriorityTable(),
    resolveRiskSignals({
      userId: run.user_id,
      projectRunId,
      templateProjectId: templateRootIdForRisks,
      operationStepIds: stage1.operationStepIds,
    }),
    loadProjectRiskRules(templateRootIdForRisks),
    run.project_id === templateRootIdForRisks
      ? Promise.resolve<ProjectRiskRule[]>([])
      : loadProjectRiskRules(run.project_id),
  ]);

  const applied = evaluateProjectRiskLogic({
    items: stage1.items,
    rules: [...rootRules, ...versionRules],
    signals,
    actionPriorityTable,
  });

  for (const item of applied) {
    if (item.targetKind === 'pfmea_failure_mode') {
      await writeQualityRow(projectRunId, item, stage1);
      continue;
    }
    await writeRegisterRow(projectRunId, item);
  }

  await fillMissingRunRiskLevels(projectRunId);
  await recomputeProjectRunRiskProfile(projectRunId);
  await recomputeProjectRunKeyCharacteristics(projectRunId, stage1, actionPriorityTable);
}

/**
 * Re-evaluates a run when the caller only has the run id.
 *
 * Stage 2 is not a one-shot at run creation: the user's tools, spaces, and history change, so
 * the picture is rebuilt when they open a risk surface and after a run completes, which is what
 * makes the next run start from what actually happened on this one.
 */
export async function reevaluateProjectRunRiskLogic(projectRunId: string): Promise<void> {
  const { data: run, error: runError } = await supabase
    .from('project_runs')
    .select('project_id')
    .eq('id', projectRunId)
    .maybeSingle();

  if (runError) {
    throw new Error(`Risk re-evaluation could not read the run: ${runError.message}`);
  }
  if (!run?.project_id) {
    throw new Error(`Project run ${projectRunId} has no template to re-evaluate against.`);
  }

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, parent_project_id')
    .eq('id', run.project_id)
    .maybeSingle();

  if (projectError) {
    throw new Error(`Risk re-evaluation could not read the template: ${projectError.message}`);
  }
  if (!project) {
    throw new Error(`Template ${run.project_id} not found for risk re-evaluation.`);
  }

  // Register risks live on the root template; revisions point at it through parent_project_id.
  const templateRootIdForRisks = project.parent_project_id ?? project.id;
  await applyProjectRiskLogicToRun(projectRunId, templateRootIdForRisks);
}

async function writeQualityRow(
  projectRunId: string,
  item: AppliedRiskItem,
  stage1: Stage1Load
): Promise<void> {
  const context = stage1.qualityContext.get(item.targetId);
  if (!context) {
    throw new Error(`No requirement text was loaded for failure mode ${item.targetId}.`);
  }

  const translation = translateQualityItem({
    failureMode: context.failureMode,
    requirementText: context.requirementText,
    stepTitle: context.stepTitle,
    effectDescriptions: context.effectDescriptions,
    rationales: item.rationales,
  });

  const { data: existing, error: existingError } = await supabase
    .from('project_run_risks')
    .select('id')
    .eq('project_run_id', projectRunId)
    .eq('source', 'pfmea')
    .eq('source_template_id', item.targetId)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Applied risk list could not read the run's risks: ${existingError.message}`);
  }

  if (existing) {
    const { error } = await supabase
      .from('project_run_risks')
      .update({
        risk_title: translation.title,
        risk_description: translation.description,
        ...appliedScoringFields(item),
      })
      .eq('id', existing.id);
    if (error) {
      throw new Error(`Applied risk list could not update a quality risk: ${error.message}`);
    }
    return;
  }

  const { error } = await supabase.from('project_run_risks').insert({
    project_run_id: projectRunId,
    source: 'pfmea',
    source_template_id: item.targetId,
    risk_title: translation.title,
    risk_description: translation.description,
    likelihood: 'medium',
    severity: 'medium',
    ...appliedScoringFields(item),
  });
  if (error) {
    throw new Error(`Applied risk list could not add a quality risk: ${error.message}`);
  }
}

/**
 * A register risk already reached the run through the template sync, so this only lays the
 * scoring on top of the row that is there.
 */
async function writeRegisterRow(projectRunId: string, item: AppliedRiskItem): Promise<void> {
  const { data, error } = await supabase
    .from('project_run_risks')
    .update({ source: 'register', source_template_id: item.targetId, ...appliedScoringFields(item) })
    .eq('project_run_id', projectRunId)
    .eq('template_risk_id', item.targetId)
    .select('id');

  if (error) {
    throw new Error(`Applied risk list could not score a register risk: ${error.message}`);
  }
  if (!data || data.length === 0) {
    throw new Error(
      `Template risk ${item.targetId} is scored but has no row on run ${projectRunId}. ` +
        'The template risk sync must run before risk logic is applied.'
    );
  }
}

export type RunRiskComponentProfile = RiskComponentRollup;

/**
 * Rebuilds the per-component rollup from whatever is currently on the run, so mitigation
 * progress and hidden steps are reflected without re-running the rules.
 *
 * Unscored items are counted separately rather than being treated as Low, so "no Highs" means
 * the analysis says so, not that nobody scored it.
 */
export async function recomputeProjectRunRiskProfile(
  projectRunId: string
): Promise<RunRiskComponentProfile[]> {
  const { data, error } = await supabase
    .from('project_run_risks')
    .select('risk_dimension, action_priority, excluded_by_customization, hidden_from_register')
    .eq('project_run_id', projectRunId);

  if (error) {
    throw new Error(`Run risk profile could not read the run's risks: ${error.message}`);
  }

  const rollups = rollupRiskComponents(data ?? []);
  const rows = RISK_DIMENSIONS.map((dimension) => rollups[dimension]);

  const { error: upsertError } = await supabase.from('project_run_risk_profile').upsert(
    rows.map((profile) => ({
      project_run_id: projectRunId,
      dimension: profile.dimension,
      worst_action_priority: profile.worstActionPriority,
      high_count: profile.highCount,
      medium_count: profile.mediumCount,
      low_count: profile.lowCount,
      unscored_count: profile.unscoredCount,
      computed_at: new Date().toISOString(),
    })),
    { onConflict: 'project_run_id,dimension' }
  );

  if (upsertError) {
    throw new Error(`Run risk profile could not be saved: ${upsertError.message}`);
  }

  return rows;
}

export async function fetchProjectRunRiskProfile(
  projectRunId: string
): Promise<RunRiskComponentProfile[]> {
  const { data, error } = await supabase
    .from('project_run_risk_profile')
    .select('dimension, worst_action_priority, high_count, medium_count, low_count, unscored_count')
    .eq('project_run_id', projectRunId);

  if (error) {
    throw new Error(`Run risk profile could not be read: ${error.message}`);
  }

  return (data ?? [])
    .filter((row): row is typeof row & { dimension: RiskDimension } =>
      (RISK_DIMENSIONS as readonly string[]).includes(row.dimension)
    )
    .map((row) => ({
      dimension: row.dimension,
      worstActionPriority: isActionPriority(row.worst_action_priority)
        ? row.worst_action_priority
        : null,
      highCount: row.high_count,
      mediumCount: row.medium_count,
      lowCount: row.low_count,
      unscoredCount: row.unscored_count,
      totalCount: row.high_count + row.medium_count + row.low_count + row.unscored_count,
    }));
}

async function clearProjectRunKeyCharacteristics(projectRunId: string): Promise<void> {
  const { error } = await supabase
    .from('project_run_key_characteristics')
    .delete()
    .eq('project_run_id', projectRunId);
  if (error) {
    throw new Error(`Key characteristics could not be cleared: ${error.message}`);
  }
}

/** The step JSON the KC pass needs to turn an item id into a name the user recognizes. */
async function loadStepItemSources(
  stepIds: readonly string[]
): Promise<Map<string, StepItemSource>> {
  if (stepIds.length === 0) return new Map();

  const [stepsResult, instructionsResult] = await Promise.all([
    supabase
      .from('operation_steps')
      .select('id, step_title, outputs, process_variables, materials, tools')
      .in('id', [...stepIds]),
    supabase.from('step_instructions').select('step_id, content').in('step_id', [...stepIds]),
  ]);

  if (stepsResult.error) {
    throw new Error(`Key characteristics could not read operation_steps: ${stepsResult.error.message}`);
  }
  if (instructionsResult.error) {
    throw new Error(
      `Key characteristics could not read step_instructions: ${instructionsResult.error.message}`
    );
  }

  // An instruction section can appear at more than one instruction level, so the sections are
  // pooled per step and the first id match wins. The user sees one name either way.
  const sectionsByStepId = new Map<string, unknown[]>();
  for (const row of instructionsResult.data ?? []) {
    const sections = Array.isArray(row.content) ? row.content : [];
    const existing = sectionsByStepId.get(row.step_id);
    if (existing) {
      existing.push(...sections);
    } else {
      sectionsByStepId.set(row.step_id, [...sections]);
    }
  }

  const sources = new Map<string, StepItemSource>();
  for (const step of stepsResult.data ?? []) {
    sources.set(step.id, {
      stepTitle: step.step_title,
      outputs: step.outputs,
      processVariables: step.process_variables,
      materials: step.materials,
      tools: step.tools,
      instructionSections: sectionsByStepId.get(step.id) ?? [],
    });
  }
  return sources;
}

/** One sentence telling the user what to watch on this item and why it is on the list. */
function attentionReason(source: KcCandidateSource, driver: OccurrenceDriver): string {
  const parts = source.causeDescription
    ? [sentence(source.causeDescription), sentence(driver.description)]
    : [sentence(driver.description)];
  return parts.filter((part) => part !== '').join(' ');
}

/**
 * Rebuilds the run's Key Characteristic register from the applied risk list.
 *
 * The urgency test reads the applied Action Priority on the failure mode or register risk,
 * while the driver and mistake-proofing tests read the cause. So a KC says: this risk needs
 * attention, and this particular cause of it is one the person controls, and nothing makes that
 * error impossible.
 *
 * Rows excluded by a rule or hidden by the user are skipped, matching the rollup: they are not
 * part of this run's work.
 */
export async function recomputeProjectRunKeyCharacteristics(
  projectRunId: string,
  stage1: Stage1Load,
  actionPriorityTable: ActionPriorityTable
): Promise<void> {
  const drivers = await fetchOccurrenceDriverTable();

  const { data: appliedRows, error: appliedError } = await supabase
    .from('project_run_risks')
    .select(
      'id, source, source_template_id, risk_dimension, action_priority, operation_step_id, excluded_by_customization, hidden_from_register'
    )
    .eq('project_run_id', projectRunId)
    .not('source', 'is', null);

  if (appliedError) {
    throw new Error(`Key characteristics could not read the applied risks: ${appliedError.message}`);
  }

  const stepIds = Array.from(
    new Set(
      (appliedRows ?? [])
        .map((row) => row.operation_step_id)
        .filter((id): id is string => typeof id === 'string')
    )
  );
  const stepSources = await loadStepItemSources(stepIds);

  type KcInsert = Database['public']['Tables']['project_run_key_characteristics']['Insert'];
  const inserts: KcInsert[] = [];

  for (const row of appliedRows ?? []) {
    if (row.excluded_by_customization === true || row.hidden_from_register === true) continue;
    if (!isRiskDimension(row.risk_dimension)) continue;
    // A KC has to point at something in the workflow, so a risk with no step cannot be one.
    if (!row.operation_step_id) continue;
    if (!row.source_template_id) continue;

    const targetKind = row.source === 'pfmea' ? 'pfmea_failure_mode' : 'template_risk';
    const sources = stage1.kcSources.get(`${targetKind}:${row.source_template_id}`);
    if (!sources) continue;

    const appliedPriority = isActionPriority(row.action_priority) ? row.action_priority : null;

    for (const source of sources) {
      const verdict = evaluateKeyCharacteristic(
        {
          actionPriority: appliedPriority,
          occurrenceDriver: source.occurrenceDriver,
          isMistakeProofed: source.isMistakeProofed,
        },
        drivers,
        actionPriorityTable
      );
      if (verdict.outcome !== 'key_characteristic') continue;

      // The author marked this as human-variable but never said which item it is about. The
      // step as a whole is the honest answer, not a guessed output.
      const itemKind = source.itemKind ?? 'step';
      const itemId = itemKind === 'step' ? null : source.itemId;
      if (itemKind !== 'step' && itemId === null) {
        throw new Error(
          `A key characteristic on step ${row.operation_step_id} names a ${itemKind} with no id.`
        );
      }

      const stepSource = stepSources.get(row.operation_step_id);
      if (!stepSource) {
        throw new Error(
          `Key characteristics could not load step ${row.operation_step_id} to name its items.`
        );
      }

      inserts.push({
        project_run_id: projectRunId,
        project_run_risk_id: row.id,
        operation_step_id: row.operation_step_id,
        item_kind: itemKind,
        item_id: itemId,
        item_label: resolveKcItemLabel({ kind: itemKind, id: itemId }, stepSource),
        risk_dimension: row.risk_dimension,
        action_priority: verdict.actionPriority,
        occurrence_driver: verdict.driver.driver,
        attention_reason: attentionReason(source, verdict.driver),
      });
    }
  }

  // Delete then insert rather than upsert: a classification change can remove an item from the
  // register, and a leftover row would tell the user to watch something the analysis dropped.
  await clearProjectRunKeyCharacteristics(projectRunId);

  if (inserts.length === 0) return;

  const { error: insertError } = await supabase
    .from('project_run_key_characteristics')
    .insert(inserts);
  if (insertError) {
    throw new Error(`Key characteristics could not be saved: ${insertError.message}`);
  }
}

/** The run's Key Characteristic register, worst priority first. */
export async function fetchProjectRunKeyCharacteristics(
  projectRunId: string
): Promise<KeyCharacteristicRow[]> {
  const { data, error } = await supabase
    .from('project_run_key_characteristics')
    .select(
      'id, project_run_risk_id, operation_step_id, item_kind, item_id, item_label, risk_dimension, action_priority, occurrence_driver, attention_reason'
    )
    .eq('project_run_id', projectRunId);

  if (error) {
    throw new Error(`Key characteristics could not be read: ${error.message}`);
  }

  return (data ?? [])
    .filter(
      (row): row is typeof row & { risk_dimension: RiskDimension; action_priority: ActionPriority } =>
        isRiskDimension(row.risk_dimension) && isActionPriority(row.action_priority)
    )
    .map((row) => ({
      id: row.id,
      projectRunRiskId: row.project_run_risk_id,
      operationStepId: row.operation_step_id,
      itemKind: row.item_kind,
      itemId: row.item_id,
      itemLabel: row.item_label,
      dimension: row.risk_dimension,
      actionPriority: row.action_priority,
      occurrenceDriver: row.occurrence_driver,
      attentionReason: row.attention_reason,
    }));
}
