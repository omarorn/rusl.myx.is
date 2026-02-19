// Environment bindings
export interface Env {
  DB: D1Database;
  IMAGES: R2Bucket;
  CACHE: KVNamespace;
  AI: Ai;
  ADMIN_PASSWORD?: string;
  HF_API_KEY?: string;  // Deprecated, not currently used
  GEMINI_API_KEY: string;
  CLAUDE_API_KEY?: string;  // Optional for deep review
  ENVIRONMENT: string;
  DEBUG_IMAGES: string;
}

// Classification label result (legacy type, kept for compatibility)
export interface HFClassification {
  label: string;
  score: number;
}

// Single detected object
export interface DetectedObject {
  item: string;
  bin: string;
  reason: string;
  confidence: number;
  is_trash: boolean;
  funny_comment?: string;  // Humorous comment for non-trash items
  crop_box?: {  // Suggested crop area (0-1 normalized coordinates)
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// Gemini response (can have multiple objects for wide shots)
export interface GeminiResponse {
  item: string;
  bin: string;
  reason: string;
  confidence: number;
  fun_fact?: string;  // Dad joke or fun fact
  is_wide_shot?: boolean;  // True if multiple objects detected
  all_objects?: DetectedObject[];  // All detected objects in wide shots
  primary_object_index?: number;  // Index of the main trash item
}

// Final classification result
export interface ClassificationResult {
  item: string;
  bin: BinType;
  binInfo: BinInfo;
  reason: string;
  confidence: number;
  source: 'huggingface' | 'gemini' | 'cloudflare-ai';
  dadJoke?: string;  // AI-generated dad joke
  // Multi-object detection for wide shots
  isWideShot?: boolean;
  allObjects?: DetectedObject[];
  funnyComments?: string[];  // Humor for non-trash objects
}

// Bin types for Iceland
export type BinType = 'paper' | 'plastic' | 'food' | 'mixed' | 'recycling_center' | 'deposit';

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
  // Multi-object detection for wide shots
  isWideShot?: boolean;
  allObjects?: DetectedObject[];
  funnyComments?: string[];  // Humor for non-trash objects
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

// SORPA Bin Types (more granular than home bins)
export type SorpaBinType =
  | 'pappir'        // Paper (books, magazines)
  | 'pappi'         // Cardboard (boxes)
  | 'plast_mjukt'   // Soft plastic (film, bags)
  | 'plast_hardt'   // Hard plastic (containers)
  | 'malmar'        // Metals
  | 'gler'          // Glass
  | 'raftaeki_smaa' // Small electronics
  | 'raftaeki_stor' // Large electronics
  | 'spilliefni'    // Hazardous
  | 'textill'       // Textiles
  | 'gardur'        // Garden waste
  | 'byggingar'     // Construction
  | 'blandadur';    // Mixed (last resort)

// SORPA Station
export interface SorpaStation {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  type: 'endurvinnslustod' | 'grenndarstod';
  opening_hours: string | null;
  aerial_image_url: string | null;
  traffic_flow: 'clockwise' | 'counterclockwise';
  created_at: number;
}

// Station Ramp
export interface StationRamp {
  id: string;
  station_id: string;
  ramp_number: number;
  bins: SorpaBinType[];  // Parsed from JSON
}

// Trip status
export type TripStatus = 'loading' | 'ready' | 'in_progress' | 'completed';

// SORPA Trip
export interface SorpaTrip {
  id: string;
  user_hash: string;
  station_id: string | null;
  status: TripStatus;
  created_at: number;
  completed_at: number | null;
}

// Trip Item
export interface TripItem {
  id: string;
  trip_id: string;
  item_name: string;
  home_bin: BinType;
  sorpa_bin: SorpaBinType;
  ramp_number: number | null;
  confidence: number | null;
  image_key: string | null;
  scan_mode: 'item' | 'batch' | 'voice' | 'continuous';
  scanned_at: number;
}

// SORPA Bin Metadata
export interface SorpaBinInfo {
  type: SorpaBinType;
  name_is: string;
  icon: string;
  typical_ramp: number | null;
}
