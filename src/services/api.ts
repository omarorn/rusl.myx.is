const API_BASE = import.meta.env.PROD 
  ? 'https://trash.myx.is' 
  : 'http://localhost:8787';

export interface BinInfo {
  name_is: string;
  color: string;
  icon: string;
}

// Detected object in wide shots
export interface DetectedObject {
  item: string;
  bin: string;
  reason: string;
  confidence: number;
  is_trash: boolean;
  funny_comment?: string;
  crop_box?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
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
  dadJoke?: string;
  imageKey?: string;
  error?: string;
  // Multi-object detection for wide shots
  isWideShot?: boolean;
  allObjects?: DetectedObject[];
  funnyComments?: string[];
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

export type Language = 'is' | 'en';
export type Region = 'sorpa' | 'kalka' | 'akureyri';

// Get settings from localStorage
function getSettings(): { language: Language; region: Region } {
  try {
    const language = (localStorage.getItem('rusl_language') || 'is') as Language;
    const region = (localStorage.getItem('rusl_region') || 'sorpa') as Region;
    return { language, region };
  } catch {
    return { language: 'is', region: 'sorpa' };
  }
}

export async function identifyItem(imageBase64: string): Promise<IdentifyResponse> {
  const { language, region } = getSettings();

  const response = await fetch(`${API_BASE}/api/identify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: imageBase64,
      userHash: getUserHash(),
      language,
      region,
    }),
  });
  return response.json();
}

export async function getStats(): Promise<UserStats> {
  const response = await fetch(`${API_BASE}/api/stats?userHash=${getUserHash()}`);
  return response.json();
}

// Generate cartoon icon from an image
export async function generateItemIcon(
  imageBase64: string,
  itemName: string
): Promise<{ success: boolean; iconImage?: string; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/api/image/icon`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageBase64, itemName }),
    });
    return response.json();
  } catch (err) {
    return { success: false, error: 'Network error' };
  }
}

// Quiz API
export interface QuizQuestion {
  id: string;
  imageUrl: string;
  iconUrl?: string; // Cartoon icon version (if available)
  imageKey: string;
  iconKey?: string;
  item: string;
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

export async function deleteQuizScores(password: string): Promise<{ success: boolean; message?: string; error?: string }> {
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

export interface SpeakResponse {
  success: boolean;
  description: string;
  audio?: string; // base64 audio data
  mimeType?: string;
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

// Combined describe + TTS using Gemini 2.5 Flash Preview TTS
export async function speakImage(imageBase64: string): Promise<SpeakResponse> {
  const response = await fetch(`${API_BASE}/api/describe/speak`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageBase64 }),
  });
  return response.json();
}

// Text-to-speech only using Gemini 2.5 Flash Preview TTS
export async function textToSpeech(text: string): Promise<{ success: boolean; audio?: string; mimeType?: string; error?: string }> {
  const response = await fetch(`${API_BASE}/api/describe/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
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

// Admin API
export interface AdminImage {
  id: string;
  image_key: string;
  icon_key?: string; // Cartoon icon version
  item: string;
  bin: string;
  reason: string;
  confidence: number;
  submitted_by: string;
  approved: number;
  times_shown: number;
  times_correct: number;
  created_at: number;
}

export interface AdminImagesResponse {
  success: boolean;
  images: AdminImage[];
  counts: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  };
  pagination: { limit: number; offset: number };
  error?: string;
}

export interface AdminStatsResponse {
  success: boolean;
  images: {
    total_images: number;
    approved: number;
    pending: number;
    rejected: number;
    total_plays: number;
    total_correct: number;
  };
  users: {
    total_users: number;
    total_scans: number;
  };
  recentScans: Array<{
    item: string;
    bin: string;
    confidence: number;
    created_at: number;
  }>;
}

let adminPassword: string | null = null;

export function setAdminPassword(password: string): void {
  adminPassword = password;
}

export function clearAdminPassword(): void {
  adminPassword = null;
}

export async function getAdminImages(
  status: 'all' | 'approved' | 'pending' | 'rejected' = 'all',
  limit = 50,
  offset = 0
): Promise<AdminImagesResponse> {
  if (!adminPassword) {
    return { success: false, images: [], counts: { total: 0, approved: 0, pending: 0, rejected: 0 }, pagination: { limit, offset }, error: 'Ekki innskráður' };
  }
  const response = await fetch(`${API_BASE}/api/admin/images?status=${status}&limit=${limit}&offset=${offset}`, {
    headers: { 'Authorization': `Bearer ${adminPassword}` },
  });
  return response.json();
}

export async function updateAdminImage(
  id: string,
  updates: { approved?: number; item?: string; bin?: string; reason?: string }
): Promise<{ success: boolean; message?: string; error?: string }> {
  if (!adminPassword) {
    return { success: false, error: 'Ekki innskráður' };
  }
  const response = await fetch(`${API_BASE}/api/admin/images/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminPassword}`,
    },
    body: JSON.stringify(updates),
  });
  return response.json();
}

export async function deleteAdminImage(id: string): Promise<{ success: boolean; message?: string; error?: string }> {
  if (!adminPassword) {
    return { success: false, error: 'Ekki innskráður' };
  }
  const response = await fetch(`${API_BASE}/api/admin/images/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${adminPassword}` },
  });
  return response.json();
}

export async function batchAdminImages(
  ids: string[],
  action: 'approve' | 'reject' | 'delete'
): Promise<{ success: boolean; message?: string; error?: string }> {
  if (!adminPassword) {
    return { success: false, error: 'Ekki innskráður' };
  }
  const response = await fetch(`${API_BASE}/api/admin/images/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminPassword}`,
    },
    body: JSON.stringify({ ids, action }),
  });
  return response.json();
}

export async function getAdminStats(): Promise<AdminStatsResponse> {
  if (!adminPassword) {
    return {
      success: false,
      images: { total_images: 0, approved: 0, pending: 0, rejected: 0, total_plays: 0, total_correct: 0 },
      users: { total_users: 0, total_scans: 0 },
      recentScans: [],
    };
  }
  const response = await fetch(`${API_BASE}/api/admin/stats`, {
    headers: { 'Authorization': `Bearer ${adminPassword}` },
  });
  return response.json();
}

export function getQuizImageUrl(imageKey: string): string {
  return `${API_BASE}/api/quiz/image/${imageKey}`;
}

// Generate missing icons for quiz images
export async function generateMissingIcons(
  password: string,
  limit: number = 5
): Promise<{ success: boolean; message?: string; results?: Array<{ id: string; item: string; success: boolean; error?: string; iconKey?: string }>; error?: string }> {
  const response = await fetch(`${API_BASE}/api/quiz/generate-missing-icons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, limit }),
  });
  return response.json();
}

// Get quiz images missing icons
export async function getMissingIcons(): Promise<{ success: boolean; images?: Array<{ id: string; image_key: string; item: string; bin: string }>; total?: number; error?: string }> {
  const response = await fetch(`${API_BASE}/api/quiz/missing-icons`);
  return response.json();
}

// Joke of the day API
export interface JokeOfTheDay {
  joke: string;
  basedOn: string[];
  generatedAt: string;
}

export async function getJokeOfTheDay(): Promise<JokeOfTheDay> {
  const response = await fetch(`${API_BASE}/api/stats/joke`);
  return response.json();
}

// Image generation API
export interface CartoonResponse {
  success: boolean;
  cartoonImage?: string;
  error?: string;
}

export interface CropResponse {
  success: boolean;
  croppedImage?: string;
  error?: string;
}

export async function generateCartoon(
  imageBase64: string,
  style: 'cute' | 'comic' | 'anime' = 'cute'
): Promise<CartoonResponse> {
  const response = await fetch(`${API_BASE}/api/image/cartoon`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageBase64, style }),
  });
  return response.json();
}

export async function cropImage(
  imageBase64: string,
  cropBox: { x: number; y: number; width: number; height: number }
): Promise<CropResponse> {
  const response = await fetch(`${API_BASE}/api/image/crop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageBase64, cropBox }),
  });
  return response.json();
}

// ============================================
// Trip API (Ferð á SORPA)
// ============================================

import type { SorpaStation, StationRamp, SorpaTrip, TripItem, SorpaBinInfo } from '../types/trip';

// Stations API
export async function getStations(): Promise<{ stations: SorpaStation[] }> {
  const res = await fetch(`${API_BASE}/api/stations`);
  return res.json();
}

export async function getStation(id: string): Promise<{ station: SorpaStation; ramps: StationRamp[] }> {
  const res = await fetch(`${API_BASE}/api/stations/${id}`);
  return res.json();
}

// Trips API
export async function createTrip(userHash: string, stationId?: string): Promise<{ trip: SorpaTrip }> {
  const res = await fetch(`${API_BASE}/api/trips`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userHash, stationId }),
  });
  return res.json();
}

export async function getTrip(id: string): Promise<{ trip: SorpaTrip; items: TripItem[] }> {
  const res = await fetch(`${API_BASE}/api/trips/${id}`);
  return res.json();
}

export async function getUserTrips(userHash: string, status?: string): Promise<{ trips: SorpaTrip[] }> {
  const params = new URLSearchParams({ userHash });
  if (status) params.append('status', status);
  const res = await fetch(`${API_BASE}/api/trips?${params}`);
  return res.json();
}

export async function addTripItem(
  tripId: string,
  item: { itemName: string; homeBin: string; confidence?: number }
): Promise<{ item: TripItem; sorpaBinInfo: SorpaBinInfo }> {
  const res = await fetch(`${API_BASE}/api/trips/${tripId}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  return res.json();
}

export async function completeTrip(tripId: string): Promise<{ success: boolean; pointsAwarded: number }> {
  const res = await fetch(`${API_BASE}/api/trips/${tripId}/complete`, {
    method: 'PUT',
  });
  return res.json();
}

export async function removeTripItem(tripId: string, itemId: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/api/trips/${tripId}/items/${itemId}`, {
    method: 'DELETE',
  });
  return res.json();
}

// Fun Facts API

export interface FunFact {
  id: number;
  fact_is: string;
  category: string;
  image_key: string | null;
  seen?: boolean;
  seen_at?: number;
}

export interface FunFactsResponse {
  success: boolean;
  facts: FunFact[];
  seen: FunFact[];
  unseen: FunFact[];
  total: number;
  seenCount: number;
  unseenCount: number;
}

export interface FunFactHistoryResponse {
  success: boolean;
  history: Array<{
    id: string;
    seen_at: number;
    fun_fact_id: number;
    fact_is: string;
    category: string;
    image_key: string | null;
  }>;
  count: number;
}

export async function getAllFunFacts(userHash: string): Promise<FunFactsResponse> {
  const res = await fetch(`${API_BASE}/api/funfacts?userHash=${encodeURIComponent(userHash)}`);
  return res.json();
}

export async function getFunFactHistory(userHash: string): Promise<FunFactHistoryResponse> {
  const res = await fetch(`${API_BASE}/api/funfacts/history?userHash=${encodeURIComponent(userHash)}`);
  return res.json();
}

export async function markFunFactSeen(userHash: string, funFactId: number): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/api/funfacts/mark-seen`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userHash, funFactId }),
  });
  return res.json();
}

export async function getRandomFunFact(userHash: string): Promise<{ success: boolean; fact: FunFact; seen: boolean }> {
  const res = await fetch(`${API_BASE}/api/funfacts/random?userHash=${encodeURIComponent(userHash)}`);
  return res.json();
}
