import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEnhancedAchievements } from '@/hooks/useEnhancedAchievements';
import {
  ACHIEVEMENT_SHELF_LABELS,
  achievementProgress,
  type AchievementShelf,
} from '@/constants/achievementDefinitions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
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

function shelfLabel(shelf: AchievementShelf | 'all'): string {
  if (shelf === 'all') return 'All';
  return ACHIEVEMENT_SHELF_LABELS[shelf];
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

  const unlockedIds = new Set(
    userAchievements.filter((ua) => ua.achievement).map((ua) => ua.achievement_id)
  );
  const unlockedCount = unlockedIds.size;
  const totalCount = achievements.length;
  const completionPercentage = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;
  const xpIntoLevel = Math.max(0, totalXP - Math.pow(level - 1, 2) * 100);
  const xpSpan = Math.max(1, xpForNextLevel - Math.pow(level - 1, 2) * 100);
  const levelProgress = Math.min(100, (xpIntoLevel / xpSpan) * 100);

  const recentTrophies = useMemo(() => {
    return [...userAchievements]
      .filter((ua) => ua.achievement)
      .sort((a, b) => new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime())
      .slice(0, 4);
  }, [userAchievements]);

  const filteredAchievements = useMemo(() => {
    if (shelfFilter === 'all') return achievements;
    return achievements.filter((a) => a.category === shelfFilter);
  }, [achievements, shelfFilter]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Achievements</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading achievements...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            Trophy case
          </CardTitle>
          <CardDescription>Craft milestones from finished work, trade practice, and upkeep</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Level</p>
              <p className="text-3xl font-bold text-primary">{level}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total XP</p>
              <p className="text-3xl font-bold">{totalXP.toLocaleString()}</p>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  {Math.max(0, xpForNextLevel - totalXP)} XP to level {level + 1}
                </p>
                <Progress value={levelProgress} className="h-2" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Unlocked</p>
              <p className="text-3xl font-bold">
                {unlockedCount} / {totalCount}
              </p>
              <Progress value={completionPercentage} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {recentTrophies.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Recent trophies
          </h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {recentTrophies.map((ua) => {
              const def = ua.achievement;
              if (!def) return null;
              const IconComponent = iconMap[def.icon] || Trophy;
              const isPeak = def.category === 'peak' || def.points >= 180;
              return (
                <div
                  key={ua.id}
                  className={`rounded-xl border border-primary/40 bg-primary/5 p-3 ${
                    isPeak ? 'shadow-md' : ''
                  }`}
                >
                  <div
                    className={`mb-2 inline-flex rounded-lg bg-primary/15 p-2 text-primary ${
                      isPeak ? 'p-3' : ''
                    }`}
                  >
                    <IconComponent className={isPeak ? 'h-7 w-7' : 'h-5 w-5'} />
                  </div>
                  <p className="text-sm font-semibold leading-snug">{def.name}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {new Date(ua.unlocked_at).toLocaleDateString()}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <Card>
        <CardHeader className="space-y-3">
          <div>
            <CardTitle className="text-lg">Collection</CardTitle>
            <CardDescription>Browse by craft shelf — locked badges show the requirement</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {SHELVES.map((shelf) => (
              <Button
                key={shelf}
                type="button"
                size="sm"
                variant={shelfFilter === shelf ? 'default' : 'outline'}
                onClick={() => setShelfFilter(shelf)}
              >
                {shelfLabel(shelf)}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredAchievements.map((achievement) => {
                const isUnlocked = unlockedIds.has(achievement.id);
                const IconComponent = iconMap[achievement.icon] || Trophy;
                const userAchievement = userAchievements.find(
                  (ua) => ua.achievement_id === achievement.id
                );
                const isPeak =
                  achievement.category === 'peak' || achievement.points >= 180;
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
                  <Card
                    key={achievement.id}
                    className={`transition-all ${
                      isUnlocked
                        ? isPeak
                          ? 'border-primary shadow-md bg-primary/5'
                          : 'border-primary/70 shadow-sm'
                        : 'opacity-80'
                    }`}
                  >
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className={`rounded-lg p-3 ${
                            isUnlocked
                              ? 'bg-primary/10 text-primary'
                              : 'bg-muted text-muted-foreground'
                          } ${isPeak ? 'p-3.5' : ''}`}
                        >
                          <IconComponent
                            className={`${isPeak ? 'h-7 w-7' : 'h-6 w-6'} ${
                              isUnlocked ? '' : 'opacity-50'
                            }`}
                          />
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="outline" className="text-xs">
                            {ACHIEVEMENT_SHELF_LABELS[achievement.category as AchievementShelf] ??
                              achievement.category}
                          </Badge>
                          {isPeak ? (
                            <Badge className="text-[10px]" variant="secondary">
                              Peak
                            </Badge>
                          ) : null}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-sm font-semibold">{achievement.name}</h3>
                        <p className="text-xs text-muted-foreground">{achievement.description}</p>
                      </div>

                      {isUnlocked && userAchievement ? (
                        <p className="text-xs text-primary">
                          Unlocked {new Date(userAchievement.unlocked_at).toLocaleDateString()}
                        </p>
                      ) : null}

                      {!isUnlocked && progress ? (
                        <div className="space-y-1.5 border-t pt-2">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              {Math.min(progress.current, progress.target)} / {progress.target}
                            </span>
                            <span>{Math.round(progressPct)}%</span>
                          </div>
                          <Progress value={progressPct} className="h-1.5" />
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
