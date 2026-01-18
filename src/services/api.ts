const API_BASE = import.meta.env.PROD 
  ? 'https://trash.myx.is' 
  : 'http://localhost:8787';

export interface BinInfo {
  name_is: string;
  color: string;
  icon: string;
}

export interface IdentifyResponse {
  success: boolean;
  item: string;
  bin: string;
  binInfo: BinInfo;
  reason: string;
  confidence: number;
  points: number;
  streak: number;
  funFact?: string;
  imageKey?: string;
  error?: string;
}

export interface UserStats {
  user_hash: string;
  total_scans: number;
  total_points: number;
  current_streak: number;
  best_streak: number;
}

function getUserHash(): string {
  let hash = localStorage.getItem('trash_user_hash');
  if (!hash) {
    hash = 'user_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('trash_user_hash', hash);
  }
  return hash;
}

export async function identifyItem(imageBase64: string): Promise<IdentifyResponse> {
  const response = await fetch(`${API_BASE}/api/identify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: imageBase64,
      userHash: getUserHash(),
    }),
  });
  return response.json();
}

export async function getStats(): Promise<UserStats> {
  const response = await fetch(`${API_BASE}/api/stats?userHash=${getUserHash()}`);
  return response.json();
}

// Quiz API
export interface QuizQuestion {
  id: string;
  imageUrl: string;
  imageKey: string;
  options: Array<{
    bin: string;
    name: string;
    icon: string;
    color: string;
  }>;
}

export interface QuizAnswer {
  correct: boolean;
  correctAnswer: string;
  correctBinInfo: BinInfo;
  item: string;
  reason: string;
  points: number;
}

export interface QuizScore {
  user_hash: string;
  score: number;
  total_questions: number;
  mode: string;
  created_at: number;
}

export async function getQuizQuestion(): Promise<QuizQuestion> {
  const response = await fetch(`${API_BASE}/api/quiz/random`);
  return response.json();
}

export async function submitQuizAnswer(questionId: string, answer: string): Promise<QuizAnswer> {
  const response = await fetch(`${API_BASE}/api/quiz/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      questionId,
      answer,
      userHash: getUserHash(),
    }),
  });
  return response.json();
}

export async function submitQuizScore(score: number, totalQuestions: number, mode: string, timeSeconds?: number): Promise<void> {
  await fetch(`${API_BASE}/api/quiz/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userHash: getUserHash(),
      score,
      totalQuestions,
      mode,
      timeSeconds,
    }),
  });
}

export async function getQuizLeaderboard(mode: string = 'timed'): Promise<{ mode: string; scores: QuizScore[] }> {
  const response = await fetch(`${API_BASE}/api/quiz/leaderboard?mode=${mode}`);
  return response.json();
}

export async function deleteQuizScores(password: string): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${API_BASE}/api/quiz/scores`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  return response.json();
}

export async function deleteQuizImages(password: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const response = await fetch(`${API_BASE}/api/quiz/images`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  return response.json();
}

export async function getQuizDuplicates(): Promise<{ success: boolean; duplicates: Array<{ item: string; bin: string; count: number }>; total: number }> {
  const response = await fetch(`${API_BASE}/api/quiz/duplicates`);
  return response.json();
}

export async function deleteQuizDuplicates(password: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const response = await fetch(`${API_BASE}/api/quiz/duplicates`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  return response.json();
}

// Live description API
export interface DescribeResponse {
  success: boolean;
  description: string;
  error?: string;
}

export async function describeImage(imageBase64: string): Promise<DescribeResponse> {
  const response = await fetch(`${API_BASE}/api/describe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageBase64 }),
  });
  return response.json();
}

export { getUserHash };

// Ads API
export type AdPlacement = 'result_banner' | 'stats_card' | 'quiz_reward' | 'splash';

export interface SponsorAd {
  type: 'sponsor';
  campaign_id: string;
  sponsor: {
    name: string;
    name_is: string;
    logo_url: string;
    website_url: string;
  };
  creative: {
    headline_is: string;
    body_is?: string;
    cta_text_is: string;
    cta_url?: string;
    image_url?: string;
  };
}

export interface AdSenseAd {
  type: 'adsense';
  slot_id: string;
  format: 'banner' | 'rectangle' | 'native';
}

export type Ad = SponsorAd | AdSenseAd;

export interface AdResponse {
  success: boolean;
  ad?: Ad;
  impression_id?: string;
  fallback_to_adsense?: boolean;
}

export interface Sponsor {
  id: string;
  name: string;
  name_is: string;
  logo_url: string;
  website_url: string;
  category: string;
}

export async function getAd(placement: AdPlacement, context?: { bin?: string; item?: string }): Promise<AdResponse> {
  const params = new URLSearchParams({
    placement,
    userHash: getUserHash(),
  });
  if (context?.bin) params.append('bin', context.bin);
  if (context?.item) params.append('item', context.item);

  const response = await fetch(`${API_BASE}/api/ads?${params}`);
  return response.json();
}

export async function recordAdClick(impressionId: string): Promise<void> {
  await fetch(`${API_BASE}/api/ads/click`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      impression_id: impressionId,
      userHash: getUserHash(),
    }),
  });
}

export async function getSponsors(): Promise<{ success: boolean; sponsors: Sponsor[] }> {
  const response = await fetch(`${API_BASE}/api/ads/sponsors`);
  return response.json();
}
