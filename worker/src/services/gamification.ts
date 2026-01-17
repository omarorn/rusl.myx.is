// Gamification service - points, streaks, fun facts

export interface UserStats {
  points_earned: number;
  current_streak: number;
  total_points: number;
}

export async function updateUserStats(db: D1Database, userHash: string): Promise<UserStats> {
  const today = new Date().toISOString().split('T')[0];
  
  // Get or create user
  let user = await db.prepare(
    'SELECT * FROM users WHERE user_hash = ?'
  ).bind(userHash).first<{
    total_scans: number;
    total_points: number;
    current_streak: number;
    best_streak: number;
    last_scan_date: string;
  }>();

  const basePoints = 10;
  let bonusPoints = 0;
  let newStreak = 1;

  if (user) {
    const lastDate = user.last_scan_date;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    if (lastDate === today) {
      // Same day - no streak change
      newStreak = user.current_streak;
    } else if (lastDate === yesterday) {
      // Consecutive day - increase streak
      newStreak = user.current_streak + 1;
      bonusPoints = Math.min(newStreak * 2, 20); // Max 20 bonus
    } else {
      // Streak broken
      newStreak = 1;
    }

    const newBestStreak = Math.max(user.best_streak, newStreak);
    const newTotalPoints = user.total_points + basePoints + bonusPoints;

    await db.prepare(`
      UPDATE users SET
        total_scans = total_scans + 1,
        total_points = ?,
        current_streak = ?,
        best_streak = ?,
        last_scan_date = ?
      WHERE user_hash = ?
    `).bind(newTotalPoints, newStreak, newBestStreak, today, userHash).run();

    return {
      points_earned: basePoints + bonusPoints,
      current_streak: newStreak,
      total_points: newTotalPoints,
    };

  } else {
    // New user
    await db.prepare(`
      INSERT INTO users (user_hash, total_scans, total_points, current_streak, best_streak, last_scan_date, created_at)
      VALUES (?, 1, ?, 1, 1, ?, ?)
    `).bind(userHash, basePoints, today, Date.now()).run();

    return {
      points_earned: basePoints,
      current_streak: 1,
      total_points: basePoints,
    };
  }
}

export async function getRandomFunFact(db: D1Database): Promise<string> {
  const result = await db.prepare(
    'SELECT fact_is FROM fun_facts ORDER BY RANDOM() LIMIT 1'
  ).first<{ fact_is: string }>();

  return result?.fact_is || 'Vissu þú að endurvinnsla sparar orku og náttúruauðlindir?';
}

export async function getUserStats(db: D1Database, userHash: string) {
  return await db.prepare(
    'SELECT total_scans, total_points, current_streak, best_streak FROM users WHERE user_hash = ?'
  ).bind(userHash).first();
}
