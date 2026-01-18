// Environment bindings
export interface Env {
  DB: D1Database;
  IMAGES: R2Bucket;
  CACHE: KVNamespace;
  AI: Ai;
  HF_API_KEY: string;
  GEMINI_API_KEY: string;
  CLAUDE_API_KEY?: string;  // Optional for deep review
  ENVIRONMENT: string;
  DEBUG_IMAGES: string;
}

// Classification result from HuggingFace
export interface HFClassification {
  label: string;
  score: number;
}

// Gemini response
export interface GeminiResponse {
  item: string;
  bin: string;
  reason: string;
  confidence: number;
  fun_fact?: string;  // Dad joke or fun fact
}

// Final classification result
export interface ClassificationResult {
  item: string;
  bin: BinType;
  binInfo: BinInfo;
  reason: string;
  confidence: number;
  source: 'huggingface' | 'gemini';
  dadJoke?: string;  // AI-generated dad joke
}

// Bin types for Iceland
export type BinType = 'paper' | 'plastic' | 'food' | 'mixed' | 'recycling_center';

// Municipality types
export type Municipality = 'reykjavik' | 'kopavogur' | 'hafnarfjordur' | 'gardabaer' | 'akureyri' | 'other';

export interface BinInfo {
  name_is: string;
  color: string;
  icon: string;
}

// Language type
export type Language = 'is' | 'en';

// API Request/Response
export interface IdentifyRequest {
  image: string;  // base64
  lat?: number;
  lng?: number;
  userHash?: string;
  language?: Language;  // Default: 'is'
  region?: string;      // Default: 'sorpa'
}

export interface IdentifyResponse {
  success: boolean;
  item: string;
  bin: BinType;
  binInfo: BinInfo;
  reason: string;
  confidence: number;
  points: number;
  streak: number;
  funFact?: string;    // Random fun fact from DB
  dadJoke?: string;    // AI-generated dad joke
  imageKey?: string;
  error?: string;
}

// User stats
export interface UserStats {
  user_hash: string;
  total_scans: number;
  total_points: number;
  current_streak: number;
  best_streak: number;
  last_scan_date: string | null;
}

// Scan record
export interface ScanRecord {
  id: string;
  created_at: number;
  user_hash: string;
  item: string;
  bin: string;
  confidence: number;
  sveitarfelag: string;
  image_key: string | null;
  lat: number | null;
  lng: number | null;
}
