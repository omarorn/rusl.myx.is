// Environment bindings
export interface Env {
  DB: D1Database;
  IMAGES: R2Bucket;
  CACHE: KVNamespace;
  HF_API_KEY: string;
  GEMINI_API_KEY: string;
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
}

// Final classification result
export interface ClassificationResult {
  item: string;
  bin: BinType;
  binInfo: BinInfo;
  reason: string;
  confidence: number;
  source: 'huggingface' | 'gemini';
}

// Bin types for Iceland
export type BinType = 'paper' | 'plastic' | 'food' | 'mixed' | 'recycling_center';

export interface BinInfo {
  name_is: string;
  color: string;
  icon: string;
}

// API Request/Response
export interface IdentifyRequest {
  image: string;  // base64
  lat?: number;
  lng?: number;
  userHash?: string;
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
  funFact?: string;
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
