// src/types/trip.ts
export type SorpaBinType =
  | 'pappir' | 'pappi' | 'plast_mjukt' | 'plast_hardt'
  | 'malmar' | 'gler' | 'raftaeki_smaa' | 'raftaeki_stor'
  | 'spilliefni' | 'textill' | 'gardur' | 'byggingar' | 'blandadur';

export type TripStatus = 'loading' | 'ready' | 'in_progress' | 'completed';

export interface SorpaStation {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  type: string;
  traffic_flow: string;
}

export interface StationRamp {
  id: string;
  station_id: string;
  ramp_number: number;
  bins: SorpaBinType[];
}

export interface SorpaTrip {
  id: string;
  user_hash: string;
  station_id: string | null;
  status: TripStatus;
  created_at: number;
  completed_at: number | null;
}

export interface TripItem {
  id: string;
  trip_id: string;
  item_name: string;
  home_bin: string;
  sorpa_bin: SorpaBinType;
  ramp_number: number | null;
  confidence: number | null;
  scan_mode: string;
  scanned_at: number;
}

export interface SorpaBinInfo {
  type: SorpaBinType;
  name_is: string;
  icon: string;
  typical_ramp: number | null;
}
