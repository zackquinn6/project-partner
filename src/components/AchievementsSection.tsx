import { useAuth } from '@/contexts/AuthContext';
import { useEnhancedAchievements } from '@/hooks/useEnhancedAchievements';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Trophy,
  Home,
  Paintbrush,
  Droplet,
  Wrench,
  Zap,
  Calendar,
  TrendingUp,
  Star,
  Award,
  Medal,
  Network,
  Grid3x3,
  Repeat,
  Layers,
  Camera,
  ClipboardList,
  Link2,
  PiggyBank,
  Shield,
  Lock,
} from 'lucide-react';

const iconMap: Record<string, any> = {
  Trophy,
  Home,
  Paintbrush,
  Droplet,
  Wrench,
  Zap,
  Calendar,
  TrendingUp,
  Star,
  Award,
  Medal,
  Network,
  Grid3x3,
  Repeat,
  Layers,
  Camera,
  ClipboardList,
  Link2,
  PiggyBank,
  Shield,
};

export function AchievementsSection() {
  const { user } = useAuth();
  const {
    achievements,
    userAchievements,
    loading,
    totalXP,
    totalPoints,
    level,
    xpForNextLevel,
  } = useEnhancedAchievements(user?.id);

  const unlockedIds = new Set(userAchievements.map((ua) => ua.achievement_id));
  const unlockedCount = userAchievements.length;
  const totalCount = achievements.length;
  const completionPercentage = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

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
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            My Achievements
          </CardTitle>
          <CardDescription>
            Track your DIY journey and unlock badges
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Level</p>
              <p className="text-3xl font-bold text-primary">{level}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total XP</p>
              <p className="text-3xl font-bold text-accent">{totalXP.toLocaleString()}</p>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  {xpForNextLevel - totalXP} XP to level {level + 1}
                </p>
                <Progress 
                  value={((totalXP % xpForNextLevel) / xpForNextLevel) * 100} 
                  className="h-2" 
                />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Points</p>
              <p className="text-3xl font-bold">{totalPoints}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Achievements</p>
              <p className="text-3xl font-bold">
                {unlockedCount} / {totalCount}
              </p>
              <Progress value={completionPercentage} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Achievements Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All achievements</CardTitle>
          <CardDescription>Browse every badge and your unlock progress</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {achievements.map((achievement) => {
                const isUnlocked = unlockedIds.has(achievement.id);
                const IconComponent = iconMap[achievement.icon] || Trophy;
                const userAchievement = userAchievements.find(
                  (ua) => ua.achievement_id === achievement.id
                );

                return (
                  <Card
                    key={achievement.id}
                    className={`transition-all ${
                      isUnlocked
                        ? 'border-primary shadow-md'
                        : 'opacity-60 grayscale'
                    }`}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div
                          className={`p-3 rounded-lg ${
                            isUnlocked
                              ? 'bg-primary/10 text-primary'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {isUnlocked ? (
                            <IconComponent className="h-6 w-6" />
                          ) : (
                            <Lock className="h-6 w-6" />
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {achievement.points} pts
                        </Badge>
                      </div>

                      <div className="space-y-1">
                        <h3 className="font-semibold text-sm">{achievement.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {achievement.description}
                        </p>
                      </div>

                      {isUnlocked && userAchievement && (
                        <p className="text-xs text-primary">
                          Unlocked {new Date(userAchievement.unlocked_at).toLocaleDateString()}
                        </p>
                      )}

                      {!isUnlocked && (
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground italic">
                            Locked - Keep building to unlock!
                          </p>
                        </div>
                      )}
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
