import { useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEnhancedAchievements } from '@/hooks/useEnhancedAchievements';
import {
  ACHIEVEMENT_SHELF_LABELS,
  achievementProgress,
  type AchievementShelf,
} from '@/constants/achievementDefinitions';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Trophy,
  Home,
  Paintbrush,
  Droplet,
  Zap,
  Calendar,
  TrendingUp,
  Star,
  Award,
  Medal,
  Grid3x3,
  Repeat,
  Layers,
  Camera,
  ClipboardList,
  Hammer,
  Check,
  type LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Trophy,
  Home,
  Paintbrush,
  Droplet,
  Zap,
  Calendar,
  TrendingUp,
  Star,
  Award,
  Medal,
  Grid3x3,
  Repeat,
  Layers,
  Camera,
  ClipboardList,
  Hammer,
};

const SHELVES: Array<AchievementShelf | 'all'> = [
  'all',
  'volume',
  'trade',
  'peak',
  'cadence',
  'evidence',
  'stewardship',
];

const SHORT_SHELF_LABELS: Record<AchievementShelf | 'all', string> = {
  all: 'All',
  volume: 'Volume',
  trade: 'Trade',
  peak: 'Peak',
  cadence: 'Cadence',
  evidence: 'Evidence',
  stewardship: 'Upkeep',
};

function isPeakAchievement(category: string, points: number): boolean {
  return category === 'peak' || points >= 180;
}

function LevelGauge({ level, progress }: { level: number; progress: number }) {
  const size = 72;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, progress));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="relative h-[72px] w-[72px] shrink-0"
      role="img"
      aria-label={`Level ${level}, ${Math.round(clamped)} percent to next level`}
    >
      <svg className="h-full w-full -rotate-90" viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-achievement-track"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-achievement-accent transition-[stroke-dashoffset] duration-achievement motion-reduce:transition-none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="font-display text-[10px] font-semibold uppercase text-achievement-muted">
          LVL
        </span>
        <span className="font-achievement-display text-[28px] font-bold tabular-nums text-achievement-foreground">
          {level}
        </span>
      </div>
    </div>
  );
}

function StatusTag({ children, peak = false }: { children: ReactNode; peak?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 shrink-0 items-center rounded-[4px] border px-1.5 font-display text-[11px] font-medium',
        peak
          ? 'border-achievement-accent/50 bg-achievement-accent-soft text-achievement-accent'
          : 'border-achievement-border bg-achievement-surface text-achievement-muted'
      )}
    >
      {children}
    </span>
  );
}

export function AchievementsSection() {
  const { user } = useAuth();
  const {
    achievements,
    userAchievements,
    loading,
    totalXP,
    level,
    xpForNextLevel,
    progressStats,
    completedProjects,
  } = useEnhancedAchievements(user?.id);

  const [shelfFilter, setShelfFilter] = useState<AchievementShelf | 'all'>('all');

  const unlockedIds = useMemo(
    () =>
      new Set(
        userAchievements.filter((ua) => ua.achievement).map((ua) => ua.achievement_id)
      ),
    [userAchievements]
  );

  const unlockedCount = unlockedIds.size;
  const totalCount = achievements.length;
  const xpIntoLevel = Math.max(0, totalXP - Math.pow(level - 1, 2) * 100);
  const xpSpan = Math.max(1, xpForNextLevel - Math.pow(level - 1, 2) * 100);
  const levelProgress = Math.min(100, (xpIntoLevel / xpSpan) * 100);
  const xpToNext = Math.max(0, xpForNextLevel - totalXP);

  const recentUnlocks = useMemo(() => {
    return [...userAchievements]
      .filter((ua) => ua.achievement)
      .sort((a, b) => new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime())
      .slice(0, 6);
  }, [userAchievements]);

  const filteredAchievements = useMemo(() => {
    if (shelfFilter === 'all') return achievements;
    return achievements.filter((a) => a.category === shelfFilter);
  }, [achievements, shelfFilter]);

  if (loading) {
    return (
      <div
        className="space-y-4 animate-pulse"
        aria-busy="true"
        aria-label="Loading achievements"
      >
        <div className="h-28 rounded-lg bg-achievement-raised" />
        <div className="flex gap-2 border-y border-achievement-border py-2">
          <div className="h-10 w-14 rounded-md bg-achievement-raised" />
          <div className="h-10 w-16 rounded-md bg-achievement-raised" />
          <div className="h-10 w-16 rounded-md bg-achievement-raised" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="h-36 rounded-lg bg-achievement-raised" />
          <div className="h-36 rounded-lg bg-achievement-raised" />
          <div className="h-36 rounded-lg bg-achievement-raised" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 text-achievement-foreground sm:space-y-5">
      <section className="rounded-lg border border-achievement-border bg-achievement-raised p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
          <div className="flex min-w-0 flex-1 items-start gap-3.5 sm:items-center sm:gap-4">
            <LevelGauge level={level} progress={levelProgress} />
            <div className="min-w-0 flex-1 space-y-1.5">
              <h2 className="font-achievement-display text-[22px] font-bold leading-tight tracking-tight sm:text-2xl">
                Achievements
              </h2>
              <p className="font-display text-[13px] leading-snug text-achievement-muted">
                <span className="font-achievement-display text-[13px] font-bold tabular-nums text-achievement-accent sm:text-sm">
                  {totalXP.toLocaleString()} XP
                </span>
                <span className="mx-1.5 text-achievement-border" aria-hidden>
                  ·
                </span>
                <span className="font-medium tabular-nums">
                  {xpToNext.toLocaleString()} XP to Level {level + 1}
                </span>
              </p>
            </div>
          </div>

          <div className="shrink-0 self-end text-right sm:self-center sm:pl-2">
            <p className="font-achievement-display text-[28px] font-bold leading-none tabular-nums sm:text-[32px]">
              {unlockedCount}
              <span className="text-achievement-muted"> / {totalCount}</span>
            </p>
            <p className="mt-1 font-display text-[10px] font-semibold uppercase text-achievement-muted sm:text-[11px]">
              Completed
            </p>
          </div>
        </div>

        <Progress
          value={levelProgress}
          className="mt-4 h-[5px] rounded-sm border-0 bg-achievement-track shadow-none"
          indicatorClassName="rounded-sm bg-achievement-accent transition-transform duration-achievement motion-reduce:transition-none"
          aria-label="Level progress"
        />
      </section>

      {recentUnlocks.length > 0 ? (
        <section className="space-y-2.5">
          <h3 className="font-display text-[11px] font-semibold uppercase text-achievement-muted">
            Recently unlocked
          </h3>
          <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {recentUnlocks.map((ua) => {
              const def = ua.achievement;
              if (!def) return null;
              const Icon = iconMap[def.icon] || Trophy;
              const peak = isPeakAchievement(def.category, def.points);
              return (
                <div
                  key={ua.id}
                  className={cn(
                    'w-[9.75rem] shrink-0 snap-start rounded-lg border bg-achievement-raised p-3.5 transition-[border-color,transform] duration-achievement motion-reduce:transition-colors sm:w-[10.5rem]',
                    peak
                      ? 'border-achievement-accent/55'
                      : 'border-achievement-border hover:border-achievement-muted/50'
                  )}
                >
                  <div className="mb-2.5 flex h-11 w-11 items-center justify-center rounded-md bg-achievement-accent-soft text-achievement-accent">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <p className="line-clamp-2 font-achievement-display text-[13px] font-bold leading-5 text-achievement-foreground">
                    {def.name}
                  </p>
                  <p className="mt-1.5 font-display text-[11px] text-achievement-muted">
                    {new Date(ua.unlocked_at).toLocaleDateString()}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <div
          role="toolbar"
          aria-label="Achievement filters"
          className="-mx-4 flex gap-2 overflow-x-auto border-y border-achievement-border bg-achievement-surface px-4 py-2 sm:-mx-5 sm:px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {SHELVES.map((shelf) => {
            const active = shelfFilter === shelf;
            return (
              <Button
                key={shelf}
                type="button"
                size="sm"
                variant="ghost"
                aria-pressed={active}
                onClick={() => setShelfFilter(shelf)}
                className={cn(
                  'h-10 min-h-[40px] shrink-0 rounded-md border px-3 font-display text-[11px] font-semibold transition-colors duration-achievement motion-reduce:transition-none sm:h-9 sm:min-h-[36px] sm:text-xs',
                  'focus-visible:ring-2 focus-visible:ring-achievement-accent focus-visible:ring-offset-2 focus-visible:ring-offset-achievement-surface',
                  active
                    ? 'border-achievement-accent bg-achievement-accent text-achievement-accent-foreground hover:bg-achievement-accent hover:text-achievement-accent-foreground'
                    : 'border-achievement-border bg-transparent text-achievement-muted hover:bg-achievement-raised hover:text-achievement-foreground'
                )}
              >
                {SHORT_SHELF_LABELS[shelf]}
              </Button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-4">
          {filteredAchievements.map((achievement) => {
            const unlocked = unlockedIds.has(achievement.id);
            const Icon = iconMap[achievement.icon] || Trophy;
            const userAchievement = userAchievements.find(
              (ua) => ua.achievement_id === achievement.id
            );
            const peak = isPeakAchievement(achievement.category, achievement.points);
            const progress = achievementProgress(
              achievement.criteria,
              completedProjects,
              progressStats
            );
            const inProgress =
              !unlocked && progress !== null && progress.current > 0 && progress.target > 0;
            const progressPct = unlocked
              ? 100
              : progress && progress.target > 0
                ? Math.min(100, (progress.current / progress.target) * 100)
                : 0;
            const progressCurrent =
              unlocked && progress
                ? progress.target
                : progress
                  ? Math.min(progress.current, progress.target)
                  : null;
            const progressTarget = progress?.target ?? null;

            return (
              <article
                key={achievement.id}
                className={cn(
                  'grid grid-rows-[auto_auto_auto] gap-3 rounded-lg border bg-achievement-raised p-4 transition-[border-color,transform] duration-achievement motion-reduce:transition-colors',
                  'hover:-translate-y-px motion-reduce:hover:translate-y-0',
                  unlocked
                    ? peak
                      ? 'border-achievement-accent/60'
                      : 'border-achievement-accent/45'
                    : peak
                      ? 'border-achievement-accent/35'
                      : 'border-achievement-border hover:border-achievement-muted/45'
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded-md transition-colors duration-achievement sm:h-12 sm:w-12',
                      unlocked || inProgress
                        ? 'bg-achievement-accent-soft text-achievement-accent'
                        : 'bg-achievement-surface text-achievement-muted'
                    )}
                  >
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="min-w-0 font-achievement-display text-[15px] font-bold leading-5 text-achievement-foreground sm:text-base">
                        {achievement.name}
                      </h3>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {peak ? <StatusTag peak>Peak</StatusTag> : null}
                        {unlocked ? (
                          <span className="inline-flex items-center gap-1 font-display text-[11px] font-semibold text-achievement-accent">
                            <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                            Unlocked
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-1.5">
                      <StatusTag>{ACHIEVEMENT_SHELF_LABELS[achievement.category]}</StatusTag>
                    </p>
                  </div>
                </div>

                <p
                  className={cn(
                    'min-h-[36px] font-display text-xs leading-[18px] sm:text-[13px]',
                    unlocked || inProgress
                      ? 'line-clamp-2 text-achievement-muted'
                      : 'line-clamp-2 text-achievement-muted/85'
                  )}
                >
                  {achievement.description}
                </p>

                <div className="space-y-1.5">
                  {unlocked && userAchievement ? (
                    <p className="font-display text-[11px] font-medium text-achievement-muted">
                      {new Date(userAchievement.unlocked_at).toLocaleDateString()}
                    </p>
                  ) : null}

                  {progressCurrent !== null && progressTarget !== null ? (
                    <div className="flex items-baseline justify-between gap-2 font-achievement-display text-[11px] font-semibold tabular-nums sm:text-xs">
                      <span className="text-achievement-foreground">
                        {progressCurrent} / {progressTarget}{' '}
                        <span className="font-display font-medium text-achievement-muted">
                          completed
                        </span>
                      </span>
                      <span className="text-achievement-muted">{Math.round(progressPct)}%</span>
                    </div>
                  ) : null}

                  {unlocked || progress !== null ? (
                    <Progress
                      value={progressPct}
                      className="h-[5px] rounded-sm border-0 bg-achievement-track shadow-none"
                      indicatorClassName={cn(
                        'rounded-sm transition-transform duration-achievement motion-reduce:transition-none',
                        progressPct > 0 ? 'bg-achievement-accent' : 'bg-transparent'
                      )}
                    />
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
