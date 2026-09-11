import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Plus, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RiskRegisterListRisk {
  id: string;
  risk: string;
  likelihood: 'low' | 'medium' | 'high';
  severity?: 'low' | 'medium' | 'high' | null;
  schedule_impact_days: number | null;
  budget_impact_dollars: number | null;
  mitigation: string | null;
  mitigation_actions?: { action: string; benefit?: string | null; completed?: boolean }[] | null;
  benefit?: string | null;
  status?: 'open' | 'mitigated' | 'closed' | 'monitoring';
  is_template_risk?: boolean;
  template_risk_id?: string | null;
  from_standard_foundation?: boolean;
  hidden_from_register?: boolean;
}

function scheduleBudgetParts(risk: RiskRegisterListRisk): { schedule: string | null; budget: string | null } {
  const s = risk.schedule_impact_days;
  const b = risk.budget_impact_dollars;
  const schedule =
    s != null && Number(s) > 0
      ? `${s} day${Number(s) === 1 ? '' : 's'} delay`
      : null;
  const budget =
    b != null && Number(b) > 0 ? `$${Number(b).toLocaleString()} budget impact` : null;
  return { schedule, budget };
}

function ImpactIfItDoesContent({ risk }: { risk: RiskRegisterListRisk }) {
  const { schedule, budget } = scheduleBudgetParts(risk);
  const narrative = typeof risk.benefit === 'string' ? risk.benefit.trim() : '';
  if (!narrative && !schedule && !budget) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <div className="space-y-1 text-sm">
      {narrative ? <p className="whitespace-pre-wrap break-words leading-relaxed">{narrative}</p> : null}
      {schedule ? <div>{schedule}</div> : null}
      {budget ? <div>{budget}</div> : null}
    </div>
  );
}

function riskFocusLevelValue(risk: RiskRegisterListRisk): 'low' | 'medium' | 'high' {
  const s = risk.severity?.toLowerCase();
  if (s === 'high' || s === 'low' || s === 'medium') return s;
  return 'medium';
}

function isUserAddedRisk(risk: RiskRegisterListRisk): boolean {
  return !risk.from_standard_foundation && !risk.template_risk_id && !risk.is_template_risk;
}

function currentRiskLevelBadgeClass(level: 'low' | 'medium' | 'high') {
  switch (level) {
    case 'high':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'low':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    default:
      return 'bg-amber-100 text-amber-900 border-amber-300';
  }
}

function riskFocusSeveritySelectTriggerClass(level: 'low' | 'medium' | 'high'): string {
  switch (level) {
    case 'high':
      return 'border-red-300 bg-red-50/90 text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200';
    case 'low':
      return 'border-emerald-300 bg-emerald-50/90 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200';
    default:
      return 'border-amber-300 bg-amber-50/90 text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200';
  }
}

function riskFocusSeveritySelectItemClass(level: 'high' | 'medium' | 'low'): string {
  switch (level) {
    case 'high':
      return 'text-red-800 focus:bg-red-50 focus:text-red-900 dark:text-red-300 dark:focus:bg-red-950/50 dark:focus:text-red-200';
    case 'low':
      return 'text-emerald-800 focus:bg-emerald-50 focus:text-emerald-900 dark:text-emerald-300 dark:focus:bg-emerald-950/40 dark:focus:text-emerald-200';
    default:
      return 'text-amber-900 focus:bg-amber-50 focus:text-amber-950 dark:text-amber-300 dark:focus:bg-amber-950/40 dark:focus:text-amber-200';
  }
}

export type RiskRegisterListProps<T extends RiskRegisterListRisk = RiskRegisterListRisk> = {
  risksToShow: T[];
  risksTotalCount: number;
  hideStandardRisks: boolean;
  usePlanningToolShell: boolean;
  planningStepEmptyMessage: string;
  riskFocusRun: boolean;
  riskFocusEasyMode: boolean;
  readOnly: boolean;
  mode: 'template' | 'run';
  variant: string;
  friendlyRiskRadarRegisterUi: boolean;
  advancedMode: boolean;
  wfTableAdvanced: boolean;
  wfTableFriendly: boolean;
  getRiskLevelColor: (
    likelihood: string,
    scheduleImpact: number | null,
    budgetImpact: number | null
  ) => string;
  getStatusColor: (status: string) => string;
  onOpenDetails: (risk: T) => void;
  onEditRisk: (risk: T) => void;
  onDeleteRisk: (risk: T) => void;
  onUpdateStatus: (risk: T, value: 'open' | 'mitigated' | 'closed' | 'monitoring') => void;
  onMitigationActionCompletedToggle: (risk: T, idx: number) => void;
  onMitigationActionTextBlur: (risk: T, idx: number, value: string) => void;
  onAppendMitigationAction: (risk: T) => void;
  onUpdateCurrentRiskLevel: (risk: T, value: 'low' | 'medium' | 'high') => void;
};

export function RiskRegisterList<T extends RiskRegisterListRisk>({
  risksToShow,
  risksTotalCount,
  hideStandardRisks,
  usePlanningToolShell,
  planningStepEmptyMessage,
  riskFocusRun,
  riskFocusEasyMode,
  readOnly,
  mode,
  variant,
  friendlyRiskRadarRegisterUi,
  advancedMode,
  wfTableAdvanced,
  wfTableFriendly,
  getRiskLevelColor,
  getStatusColor,
  onOpenDetails,
  onEditRisk,
  onDeleteRisk,
  onUpdateStatus,
  onMitigationActionCompletedToggle,
  onMitigationActionTextBlur,
  onAppendMitigationAction,
  onUpdateCurrentRiskLevel,
}: RiskRegisterListProps<T>) {
  return (
    <>
                  {risksToShow.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center">
                      <p className="text-muted-foreground text-sm">
                        {usePlanningToolShell
                          ? planningStepEmptyMessage
                          : risksTotalCount === 0
                            ? 'No risks loaded for this run.'
                            : hideStandardRisks
                              ? 'No risks match the current filters. Turn off Hide standard risks or Show hidden risks to see more.'
                              : 'All predefined risks are hidden. Turn on Show hidden risks in Edit Visibility to see them.'}
                      </p>
                    </div>
                  ) : null}
                  {/* Mobile: Card Layout */}
                  <div
                    className={cn(
                      'min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain md:hidden',
                      risksToShow.length === 0 ? 'hidden' : ''
                    )}
                  >
                    {risksToShow.map((risk) => {
                      return (
                        <Card
                          key={risk.id}
                          className={cn(
                            'p-4',
                            riskFocusRun && 'pb-2',
                            riskFocusRun &&
                              'cursor-pointer transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                          )}
                          tabIndex={riskFocusRun ? 0 : undefined}
                          onClick={riskFocusRun ? () => onOpenDetails(risk) : undefined}
                          onKeyDown={
                            riskFocusRun
                              ? (e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    onOpenDetails(risk);
                                  }
                                }
                              : undefined
                          }
                        >
                          <div className={cn('space-y-3', riskFocusRun && 'space-y-2')}>
                            <div className="flex items-start gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="text-xs text-muted-foreground mb-1">Potential Issue</div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="font-semibold text-sm leading-snug">{risk.risk}</h3>
                                  {riskFocusRun && isUserAddedRisk(risk) ? (
                                    <Badge variant="secondary" className="text-[10px]">
                                      User-Added
                                    </Badge>
                                  ) : null}
                                  {riskFocusRun && risk.hidden_from_register ? (
                                    <Badge variant="secondary" className="text-[10px]">
                                      Hidden
                                    </Badge>
                                  ) : null}
                                </div>
                                {riskFocusEasyMode ? (
                                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                    <span className="text-xs text-muted-foreground">Likelihood:</span>
                                    <Badge
                                      className={getRiskLevelColor(
                                        risk.likelihood,
                                        risk.schedule_impact_days,
                                        risk.budget_impact_dollars
                                      )}
                                    >
                                      {risk.likelihood}
                                    </Badge>
                                  </div>
                                ) : null}
                              </div>
                              {!readOnly && !riskFocusRun ? (
                                <div
                                  className="flex shrink-0 gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => e.stopPropagation()}
                                >
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onEditRisk(risk)}
                                    className="h-11 w-11 p-0"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  {!(mode === 'run' && risk.is_template_risk) ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => onDeleteRisk(risk)}
                                      className="h-11 w-11 p-0 text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                            <div className={cn('space-y-3', riskFocusRun && 'space-y-2')}>
                              {riskFocusRun ? (
                                <>
                                  {!riskFocusEasyMode ? (
                                    <div>
                                      <div className="text-xs text-muted-foreground mb-1">
                                        {friendlyRiskRadarRegisterUi ? 'How likely is it?' : 'Likelihood'}
                                      </div>
                                      <Badge
                                        className={getRiskLevelColor(
                                          risk.likelihood,
                                          risk.schedule_impact_days,
                                          risk.budget_impact_dollars
                                        )}
                                      >
                                        {risk.likelihood}
                                      </Badge>
                                    </div>
                                  ) : null}
                                  {advancedMode ? (
                                    <div className="grid grid-cols-3 gap-3">
                                      <div>
                                        <div className="text-xs text-muted-foreground mb-1">Overall Severity</div>
                                        {risk.severity ? (
                                          <Badge variant="outline">{risk.severity}</Badge>
                                        ) : (
                                          <span className="text-muted-foreground">—</span>
                                        )}
                                      </div>
                                      <div>
                                        <div className="text-xs text-muted-foreground mb-1">Budget Risk</div>
                                        <div className="text-sm tabular-nums">
                                          {risk.budget_impact_dollars != null
                                            ? `$${Number(risk.budget_impact_dollars).toLocaleString()}`
                                            : '—'}
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-xs text-muted-foreground mb-1">Timeline Risk</div>
                                        <div className="text-sm tabular-nums">
                                          {risk.schedule_impact_days != null ? `${Number(risk.schedule_impact_days)} days` : '—'}
                                        </div>
                                      </div>
                                    </div>
                                  ) : null}
                                  <div>
                                    <div className="text-xs text-muted-foreground mb-1">
                                      {friendlyRiskRadarRegisterUi
                                        ? 'If it happens, then what?'
                                        : 'Impact'}
                                    </div>
                                    <ImpactIfItDoesContent risk={risk} />
                                  </div>
                                </>
                              ) : wfTableAdvanced ? (
                                <>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <div className="text-xs text-muted-foreground mb-1">Severity</div>
                                      {risk.severity ? (
                                        <Badge variant="outline">{risk.severity}</Badge>
                                      ) : (
                                        <span className="text-muted-foreground">—</span>
                                      )}
                                    </div>
                                    <div>
                                      <div className="text-xs text-muted-foreground mb-1">Risk level</div>
                                      <Badge
                                        className={getRiskLevelColor(
                                          risk.likelihood,
                                          risk.schedule_impact_days,
                                          risk.budget_impact_dollars
                                        )}
                                      >
                                        {risk.likelihood}
                                      </Badge>
                                    </div>
                                    <div>
                                      <div className="text-xs text-muted-foreground mb-1">Timeline impact</div>
                                      <div className="text-sm tabular-nums">
                                        {risk.schedule_impact_days != null ? `${Number(risk.schedule_impact_days)} days` : '—'}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-muted-foreground mb-1">Budget impact</div>
                                      <div className="text-sm tabular-nums">
                                        {risk.budget_impact_dollars != null
                                          ? `$${Number(risk.budget_impact_dollars).toLocaleString()}`
                                          : '—'}
                                      </div>
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-muted-foreground mb-1">Impact</div>
                                    <ImpactIfItDoesContent risk={risk} />
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div>
                                    <div className="text-xs text-muted-foreground mb-1">
                                      {wfTableFriendly ? 'How likely is it?' : 'Likelihood'}
                                    </div>
                                    <Badge
                                      className={getRiskLevelColor(
                                        risk.likelihood,
                                        risk.schedule_impact_days,
                                        risk.budget_impact_dollars
                                      )}
                                    >
                                      {risk.likelihood}
                                    </Badge>
                                  </div>
                                  <div>
                                    <div className="text-xs text-muted-foreground mb-1">
                                      {wfTableFriendly ? 'If it happens, then what?' : 'Impact'}
                                    </div>
                                    <ImpactIfItDoesContent risk={risk} />
                                  </div>
                                </>
                              )}
                            </div>
                            {mode === 'run' && variant !== 'risk-focus' && (
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Status</div>
                                {readOnly ? (
                                  <Badge className={getStatusColor(risk.status || 'open')}>
                                    {risk.status || 'open'}
                                  </Badge>
                                ) : (
                                  <Select
                                    value={risk.status || 'open'}
                                    onValueChange={(value) => onUpdateStatus(risk, value as any)}
                                  >
                                    <SelectTrigger className="h-11 text-sm">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="open">Open</SelectItem>
                                      <SelectItem value="mitigated">Mitigated</SelectItem>
                                      <SelectItem value="monitoring">Monitoring</SelectItem>
                                      <SelectItem value="closed">Closed</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>
                            )}
                            {riskFocusRun ? (
                              <>
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => e.stopPropagation()}
                                >
                                  <div className="text-xs text-muted-foreground mb-1">
                                    {friendlyRiskRadarRegisterUi
                                      ? 'What can we do to prevent it?'
                                      : 'Mitigation'}
                                  </div>
                                  {(risk.mitigation_actions?.length ?? 0) > 0 ? (
                                    <ul className="space-y-2 text-sm">
                                      {risk.mitigation_actions!.map((ma, idx) => (
                                        <li key={idx} className="flex items-start gap-2">
                                          {!readOnly && String(ma.action).trim() ? (
                                            <Checkbox
                                              className="mt-0.5 h-3 w-3 shrink-0 rounded-sm border-[1.5px] [&_svg]:h-2.5 [&_svg]:w-2.5"
                                              checked={Boolean(ma.completed)}
                                              onCheckedChange={() => void onMitigationActionCompletedToggle(risk, idx)}
                                              aria-label={`Done: ${ma.action}`}
                                            />
                                          ) : null}
                                          <div className="min-w-0 flex-1">
                                            {!readOnly && !String(ma.action).trim() ? (
                                              <Input
                                                className="h-9 text-sm"
                                                placeholder="Describe this mitigation"
                                                defaultValue=""
                                                onBlur={(e) => void onMitigationActionTextBlur(risk, idx, e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                onKeyDown={(e) => e.stopPropagation()}
                                              />
                                            ) : (
                                              <span>
                                                <span className="font-medium">{ma.action}</span>
                                                {ma.benefit ? (
                                                  <span className="text-muted-foreground"> – {ma.benefit}</span>
                                                ) : null}
                                              </span>
                                            )}
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : risk.mitigation ? (
                                    <p className="text-sm">{risk.mitigation}</p>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">No mitigation steps yet.</p>
                                  )}
                                  {!readOnly ? (
                                    <div className="mt-2 flex justify-center">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                                        aria-label="Add mitigation"
                                        onClick={() => void onAppendMitigationAction(risk)}
                                      >
                                        <Plus className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ) : null}
                                </div>
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => e.stopPropagation()}
                                >
                                  <div className="text-xs text-muted-foreground mb-1">Whats the new status?</div>
                                  {readOnly ? (
                                    <Badge className={currentRiskLevelBadgeClass(riskFocusLevelValue(risk))}>
                                      {riskFocusLevelValue(risk) === 'high'
                                        ? 'High'
                                        : riskFocusLevelValue(risk) === 'low'
                                          ? 'Low'
                                          : 'Med'}
                                    </Badge>
                                  ) : (
                                    <Select
                                      value={riskFocusLevelValue(risk)}
                                      onValueChange={(value) =>
                                        onUpdateCurrentRiskLevel(risk, value as 'low' | 'medium' | 'high')
                                      }
                                    >
                                      <SelectTrigger
                                        className={cn(
                                          'h-11 text-sm',
                                          riskFocusSeveritySelectTriggerClass(riskFocusLevelValue(risk))
                                        )}
                                      >
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="high" className={riskFocusSeveritySelectItemClass('high')}>
                                          High
                                        </SelectItem>
                                        <SelectItem value="medium" className={riskFocusSeveritySelectItemClass('medium')}>
                                          Med
                                        </SelectItem>
                                        <SelectItem value="low" className={riskFocusSeveritySelectItemClass('low')}>
                                          Low
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>
                              </>
                            ) : (
                              <>
                                {(risk.mitigation_actions && risk.mitigation_actions.length > 0) && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => e.stopPropagation()}
                                  >
                                    <div className="text-xs text-muted-foreground mb-1">
                                      What can we do to prevent it?
                                    </div>
                                    <ul className="space-y-2 text-sm">
                                      {risk.mitigation_actions.map((ma, idx) => (
                                        <li key={idx} className="flex items-start gap-2">
                                          <span>
                                            <span className="font-medium">{ma.action}</span>
                                            {ma.benefit ? (
                                              <span className="text-muted-foreground"> – {ma.benefit}</span>
                                            ) : null}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {!risk.mitigation_actions?.length && risk.mitigation && (
                                  <div>
                                    <div className="text-xs text-muted-foreground mb-1">
                                      What can we do to prevent it?
                                    </div>
                                    <p className="text-sm">{risk.mitigation}</p>
                                  </div>
                                )}
                              </>
                            )}
                            {!(mode === 'run' && variant === 'risk-focus') ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => onOpenDetails(risk)}
                              >
                                <Info className="w-4 h-4 mr-2" />
                                More details
                              </Button>
                            ) : null}
                          </div>
                        </Card>
                    );
                    })}
                  </div>

                  {/* Desktop: Table Layout — fills remaining height */}
                  <div
                    className={cn(
                      'hidden min-h-0 flex-1 flex-col overflow-hidden md:flex',
                      risksToShow.length === 0 ? 'md:hidden' : ''
                    )}
                  >
                    <div className="min-h-0 flex-1 overflow-auto rounded-md border border-border/60">
                      <Table
                        wrapperClassName="overflow-visible"
                        className={cn(
                          riskFocusRun &&
                            '[&_td]:!px-3 [&_td]:!py-1.5 [&_td]:!pb-1 [&_th]:!px-3 [&_th]:align-bottom [&_th]:pb-2 [&_th]:pt-2.5'
                        )}
                      >
                      <TableHeader className="sticky top-0 z-20 border-b bg-background shadow-sm [&_tr]:border-b-0">
                        <TableRow className="border-b-0 bg-background hover:bg-background">
                          <TableHead
                            className={cn(
                              'bg-background align-bottom font-semibold text-foreground',
                              riskFocusRun
                                ? riskFocusEasyMode
                                  ? 'w-[16%] min-w-[7.5rem] max-w-[11rem]'
                                  : 'w-[14%] min-w-[7rem] max-w-[10rem]'
                                : 'min-w-[180px] max-w-[240px]'
                            )}
                          >
                            {riskFocusRun ? 'Potential Issue' : 'Risk'}
                          </TableHead>
                          {riskFocusRun ? (
                            <>
                              {!riskFocusEasyMode ? (
                                <TableHead className="w-[100px] bg-background align-bottom font-semibold text-foreground">
                                  {friendlyRiskRadarRegisterUi ? 'How likely is it?' : 'Likelihood'}
                                </TableHead>
                              ) : null}
                              {advancedMode ? (
                                <TableHead className="w-[120px] bg-background align-bottom font-semibold text-foreground">
                                  Overall Severity
                                </TableHead>
                              ) : null}
                              {advancedMode ? (
                                <TableHead className="w-[120px] bg-background align-bottom font-semibold text-foreground">
                                  Budget Risk
                                </TableHead>
                              ) : null}
                              {advancedMode ? (
                                <TableHead className="w-[120px] bg-background align-bottom font-semibold text-foreground">
                                  Timeline Risk
                                </TableHead>
                              ) : null}
                            </>
                          ) : wfTableAdvanced ? (
                            <>
                              <TableHead className="w-[100px] bg-background align-bottom font-semibold text-foreground">
                                Severity
                              </TableHead>
                              <TableHead className="w-[120px] bg-background align-bottom font-semibold text-foreground">
                                Timeline impact
                              </TableHead>
                              <TableHead className="w-[120px] bg-background align-bottom font-semibold text-foreground">
                                Budget impact
                              </TableHead>
                              <TableHead className="w-[120px] bg-background align-bottom font-semibold text-foreground">
                                Risk level
                              </TableHead>
                            </>
                          ) : (
                            <TableHead className="w-[100px] bg-background align-bottom font-semibold text-foreground">
                              {wfTableFriendly ? 'How likely is it?' : 'Likelihood'}
                            </TableHead>
                          )}
                          <TableHead
                            className={cn(
                              'bg-background align-bottom font-semibold text-foreground',
                              riskFocusRun
                                ? 'w-[28%] min-w-[12rem] max-w-[22rem]'
                                : 'min-w-[140px] max-w-[200px]'
                            )}
                          >
                            {wfTableFriendly || friendlyRiskRadarRegisterUi
                              ? 'If it happens, then what?'
                              : 'Impact'}
                          </TableHead>
                          <TableHead
                            className={cn(
                              'bg-background align-bottom font-semibold text-foreground',
                              riskFocusRun ? 'min-w-[18rem] w-[44%]' : 'min-w-[200px]'
                            )}
                          >
                            {wfTableFriendly || friendlyRiskRadarRegisterUi
                              ? 'What can we do to prevent it?'
                              : 'Mitigation'}
                          </TableHead>
                          {mode === 'run' && variant === 'risk-focus' ? (
                            <TableHead className="w-[5.75rem] max-w-[5.75rem] bg-background align-bottom font-semibold leading-tight text-foreground">
                              Whats the new status?
                            </TableHead>
                          ) : null}
                          {mode === 'run' && variant !== 'risk-focus' ? (
                            <TableHead className="w-[120px] bg-background align-bottom font-semibold text-foreground">
                              Status
                            </TableHead>
                          ) : null}
                          {!riskFocusRun ? (
                            <TableHead className="w-[120px] bg-background align-bottom font-semibold text-foreground">
                              Actions
                            </TableHead>
                          ) : null}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {risksToShow.map((risk) => (
                          <TableRow
                            key={risk.id}
                            className={cn(
                              riskFocusRun &&
                                'cursor-pointer hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                            )}
                            tabIndex={riskFocusRun ? 0 : undefined}
                            onClick={riskFocusRun ? () => onOpenDetails(risk) : undefined}
                            onKeyDown={
                              riskFocusRun
                                ? (e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      onOpenDetails(risk);
                                    }
                                  }
                                : undefined
                            }
                          >
                            <TableCell className="font-medium">
                              <div className="space-y-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span>{risk.risk}</span>
                                  {riskFocusRun && isUserAddedRisk(risk) ? (
                                    <Badge variant="secondary" className="text-[10px]">
                                      User-Added
                                    </Badge>
                                  ) : null}
                                  {riskFocusRun && risk.hidden_from_register ? (
                                    <Badge variant="secondary" className="text-[10px]">
                                      Hidden
                                    </Badge>
                                  ) : null}
                                </div>
                                {riskFocusEasyMode ? (
                                  <div className="flex flex-wrap items-center gap-2 text-sm">
                                    <span className="text-muted-foreground">Likelihood:</span>
                                    <Badge
                                      className={getRiskLevelColor(
                                        risk.likelihood,
                                        risk.schedule_impact_days,
                                        risk.budget_impact_dollars
                                      )}
                                    >
                                      {risk.likelihood}
                                    </Badge>
                                  </div>
                                ) : null}
                              </div>
                            </TableCell>
                            {riskFocusRun ? (
                              <>
                                {!riskFocusEasyMode ? (
                                  <TableCell>
                                    <Badge
                                      className={getRiskLevelColor(
                                        risk.likelihood,
                                        risk.schedule_impact_days,
                                        risk.budget_impact_dollars
                                      )}
                                    >
                                      {risk.likelihood}
                                    </Badge>
                                  </TableCell>
                                ) : null}
                                {advancedMode ? (
                                  <TableCell>
                                    {risk.severity ? (
                                      <Badge variant="outline">{risk.severity}</Badge>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </TableCell>
                                ) : null}
                                {advancedMode ? (
                                  <TableCell className="tabular-nums">
                                    {risk.budget_impact_dollars != null ? (
                                      `$${Number(risk.budget_impact_dollars).toLocaleString()}`
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </TableCell>
                                ) : null}
                                {advancedMode ? (
                                  <TableCell className="tabular-nums">
                                    {risk.schedule_impact_days != null ? (
                                      `${Number(risk.schedule_impact_days)}`
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </TableCell>
                                ) : null}
                              </>
                            ) : wfTableAdvanced ? (
                              <>
                                <TableCell>
                                  {risk.severity ? (
                                    <Badge variant="outline">{risk.severity}</Badge>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="tabular-nums">
                                  {risk.schedule_impact_days != null ? (
                                    `${Number(risk.schedule_impact_days)}`
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="tabular-nums">
                                  {risk.budget_impact_dollars != null ? (
                                    `$${Number(risk.budget_impact_dollars).toLocaleString()}`
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge className={getRiskLevelColor(risk.likelihood, risk.schedule_impact_days, risk.budget_impact_dollars)}>
                                    {risk.likelihood}
                                  </Badge>
                                </TableCell>
                              </>
                            ) : (
                              <TableCell>
                                <Badge className={getRiskLevelColor(risk.likelihood, risk.schedule_impact_days, risk.budget_impact_dollars)}>
                                  {risk.likelihood}
                                </Badge>
                              </TableCell>
                            )}
                            <TableCell
                              className={cn(
                                'text-sm align-top',
                                riskFocusRun && 'max-w-[12.5rem]'
                              )}
                            >
                              <ImpactIfItDoesContent risk={risk} />
                            </TableCell>
                            <TableCell
                              className={cn(
                                'text-sm text-muted-foreground align-top',
                                riskFocusRun && 'min-w-[16rem]'
                              )}
                              onClick={riskFocusRun ? (e) => e.stopPropagation() : undefined}
                            >
                              {riskFocusRun ? (
                                <div className="space-y-2">
                                  {(risk.mitigation_actions?.length ?? 0) > 0 ? (
                                    risk.mitigation_actions!.map((ma, idx) => (
                                      <div key={idx} className="flex items-start gap-2">
                                        {!readOnly && String(ma.action).trim() ? (
                                          <Checkbox
                                            className="mt-0.5"
                                            checked={Boolean(ma.completed)}
                                            onCheckedChange={() => void onMitigationActionCompletedToggle(risk, idx)}
                                            aria-label={`Done: ${ma.action}`}
                                          />
                                        ) : null}
                                        <div className="flex min-w-0 flex-1 flex-col">
                                          {!readOnly && !String(ma.action).trim() ? (
                                            <Input
                                              className="h-8 text-xs"
                                              placeholder="Describe this mitigation"
                                              defaultValue=""
                                              onBlur={(e) => void onMitigationActionTextBlur(risk, idx, e.target.value)}
                                              onClick={(e) => e.stopPropagation()}
                                              onKeyDown={(e) => e.stopPropagation()}
                                            />
                                          ) : (
                                            <>
                                              <span className="font-medium">{ma.action}</span>
                                              {ma.benefit ? (
                                                <span className="text-xs text-muted-foreground">{ma.benefit}</span>
                                              ) : null}
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    ))
                                  ) : risk.mitigation ? (
                                    <p className="text-sm">{risk.mitigation}</p>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                  {!readOnly ? (
                                    <div className="flex justify-center pt-0.5">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                                        aria-label="Add mitigation"
                                        onClick={() => void onAppendMitigationAction(risk)}
                                      >
                                        <Plus className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  ) : null}
                                </div>
                              ) : risk.mitigation_actions && risk.mitigation_actions.length > 0 ? (
                                <div className="space-y-2">
                                  {risk.mitigation_actions.map((ma, idx) => (
                                    <div key={idx} className="flex items-start gap-2">
                                      <div className="flex min-w-0 flex-col">
                                        <span className="font-medium">{ma.action}</span>
                                        {ma.benefit ? (
                                          <span className="text-xs text-muted-foreground">{ma.benefit}</span>
                                        ) : null}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                risk.mitigation || '-'
                              )}
                            </TableCell>
                            {mode === 'run' && variant === 'risk-focus' && (
                              <TableCell
                                className="w-[5.75rem] max-w-[5.75rem] align-top"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {readOnly ? (
                                  <Badge className={currentRiskLevelBadgeClass(riskFocusLevelValue(risk))}>
                                    {riskFocusLevelValue(risk) === 'high'
                                      ? 'High'
                                      : riskFocusLevelValue(risk) === 'low'
                                        ? 'Low'
                                        : 'Med'}
                                  </Badge>
                                ) : (
                                  <Select
                                    value={riskFocusLevelValue(risk)}
                                    onValueChange={(value) =>
                                      onUpdateCurrentRiskLevel(risk, value as 'low' | 'medium' | 'high')
                                    }
                                  >
                                    <SelectTrigger
                                      className={cn(
                                        'h-8 w-full text-xs',
                                        riskFocusSeveritySelectTriggerClass(riskFocusLevelValue(risk))
                                      )}
                                    >
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="high" className={riskFocusSeveritySelectItemClass('high')}>
                                        High
                                      </SelectItem>
                                      <SelectItem value="medium" className={riskFocusSeveritySelectItemClass('medium')}>
                                        Med
                                      </SelectItem>
                                      <SelectItem value="low" className={riskFocusSeveritySelectItemClass('low')}>
                                        Low
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              </TableCell>
                            )}
                            {mode === 'run' && variant !== 'risk-focus' && (
                              <TableCell>
                                {readOnly ? (
                                  <Badge className={getStatusColor(risk.status || 'open')}>
                                    {risk.status || 'open'}
                                  </Badge>
                                ) : (
                                  <Select
                                    value={risk.status || 'open'}
                                    onValueChange={(value) => onUpdateStatus(risk, value as any)}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="open">Open</SelectItem>
                                      <SelectItem value="mitigated">Mitigated</SelectItem>
                                      <SelectItem value="monitoring">Monitoring</SelectItem>
                                      <SelectItem value="closed">Closed</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              </TableCell>
                            )}
                            {!riskFocusRun ? (
                              <TableCell
                                className="align-top"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex flex-wrap gap-1">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onOpenDetails(risk)}
                                    className="h-7 px-2 text-[10px]"
                                  >
                                    Details
                                  </Button>
                                  {!readOnly && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onEditRisk(risk)}
                                        className="h-7 w-7 p-0"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </Button>
                                      {!(mode === 'run' && risk.is_template_risk) ? (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => onDeleteRisk(risk)}
                                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                      ) : null}
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            ) : null}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    </div>
                  </div>
    </>
  );
}
