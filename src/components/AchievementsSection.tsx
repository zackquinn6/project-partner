import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEnhancedAchievements } from '@/hooks/useEnhancedAchievements';
import {
  ACHIEVEMENT_SHELF_LABELS,
  achievementProgress,
  type AchievementShelf,
} from '@/constants/achievementDefinitions';
import { Badge } from '@/components/ui/badge';
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
      <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Loading achievements">
        <div className="h-24 rounded-2xl bg-muted" />
        <div className="flex gap-2">
          <div className="h-8 w-16 rounded-full bg-muted" />
          <div className="h-8 w-16 rounded-full bg-muted" />
          <div className="h-8 w-20 rounded-full bg-muted" />
        </div>
        <div className="space-y-2">
          <div className="h-20 rounded-xl bg-muted" />
          <div className="h-20 rounded-xl bg-muted" />
          <div className="h-20 rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 sm:space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.14] via-background to-amber-500/[0.08] p-4 shadow-sm sm:p-5">
        <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative flex items-center gap-3.5 sm:gap-4">
          <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/25 sm:h-16 sm:w-16">
            <span className="text-[10px] font-medium uppercase tracking-wide opacity-80">Lvl</span>
            <span className="text-xl font-bold leading-none sm:text-2xl">{level}</span>
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="truncate text-lg font-bold tracking-tight sm:text-xl">Achievements</h2>
              <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                {unlockedCount}/{totalCount}
              </span>
            </div>
            <Progress value={levelProgress} className="h-2" />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <span className="tabular-nums font-medium text-foreground/80">
                {totalXP.toLocaleString()} XP
              </span>
              <span className="tabular-nums">
                {xpToNext.toLocaleString()} to level {level + 1}
              </span>
            </div>
          </div>
        </div>
      </section>

      {recentUnlocks.length > 0 ? (
        <section className="space-y-2.5">
          <h3 className="px-0.5 text-sm font-semibold text-foreground">Recent</h3>
          <div className="-mx-1 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {recentUnlocks.map((ua) => {
              const def = ua.achievement;
              if (!def) return null;
              const Icon = iconMap[def.icon] || Trophy;
              const peak = isPeakAchievement(def.category, def.points);
              return (
                <div
                  key={ua.id}
                  className={cn(
                    'w-[9.5rem] shrink-0 snap-start rounded-xl border bg-card p-3 sm:w-[10.5rem]',
                    peak ? 'border-primary/50 bg-primary/[0.06] shadow-sm' : 'border-border/80'
                  )}
                >
                  <div
                    className={cn(
                      'mb-2 inline-flex rounded-lg bg-primary/12 p-2 text-primary',
                      peak && 'bg-primary/18'
                    )}
                  >
                    <Icon className={cn('h-5 w-5', peak && 'h-6 w-6')} />
                  </div>
                  <p className="line-clamp-2 text-sm font-semibold leading-snug">{def.name}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {new Date(ua.unlocked_at).toLocaleDateString()}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SHELVES.map((shelf) => {
            const active = shelfFilter === shelf;
            return (
              <Button
                key={shelf}
                type="button"
                size="sm"
                variant={active ? 'default' : 'outline'}
                onClick={() => setShelfFilter(shelf)}
                className={cn(
                  'h-8 shrink-0 rounded-full px-3.5 text-xs font-medium',
                  !active && 'border-border/70 bg-background/80'
                )}
              >
                {SHORT_SHELF_LABELS[shelf]}
              </Button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
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
            const progressPct =
              progress && progress.target > 0
                ? Math.min(100, (progress.current / progress.target) * 100)
                : 0;

            return (
              <article
                key={achievement.id}
                className={cn(
                  'flex gap-3 rounded-xl border p-3 transition-colors sm:p-3.5',
                  unlocked
                    ? peak
                      ? 'border-primary/45 bg-primary/[0.07] shadow-sm'
                      : 'border-primary/30 bg-card'
                    : 'border-border/70 bg-muted/20'
                )}
              >
                <div
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12',
                    unlocked
                      ? 'bg-primary/12 text-primary'
                      : 'bg-muted text-muted-foreground/70'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5 sm:h-6 sm:w-6',
                      peak && unlocked && 'h-6 w-6 sm:h-7 sm:w-7',
                      !unlocked && 'opacity-55'
                    )}
                  />
                </div>

                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3
                          className={cn(
                            'text-sm font-semibold leading-snug',
                            !unlocked && 'text-foreground/85'
                          )}
                        >
                          {achievement.name}
                        </h3>
                        {peak ? (
                          <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-medium">
                            Peak
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-[11px] text-muted-foreground sm:text-xs">
                        {ACHIEVEMENT_SHELF_LABELS[achievement.category]}
                      </p>
                    </div>
                    {unlocked ? (
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                    ) : null}
                  </div>

                  <p
                    className={cn(
                      'text-xs leading-relaxed text-muted-foreground',
                      unlocked ? 'line-clamp-2' : 'line-clamp-3'
                    )}
                  >
                    {achievement.description}
                  </p>

                  {unlocked && userAchievement ? (
                    <p className="text-[11px] font-medium text-primary/90">
                      {new Date(userAchievement.unlocked_at).toLocaleDateString()}
                    </p>
                  ) : null}

                  {!unlocked && progress ? (
                    <div className="space-y-1 pt-0.5">
                      <div className="flex items-center justify-between text-[11px] tabular-nums text-muted-foreground">
                        <span>
                          {Math.min(progress.current, progress.target)}/{progress.target}
                        </span>
                        <span>{Math.round(progressPct)}%</span>
                      </div>
                      <Progress value={progressPct} className="h-1.5" />
                    </div>
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
