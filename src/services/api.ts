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
