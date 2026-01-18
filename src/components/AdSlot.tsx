import { useState, useEffect } from 'react';
import { getAd, recordAdClick, type AdPlacement, type Ad, type SponsorAd } from '../services/api';

interface AdSlotProps {
  placement: AdPlacement;
  context?: { bin?: string; item?: string };
  className?: string;
}

export function AdSlot({ placement, context, className = '' }: AdSlotProps) {
  const [ad, setAd] = useState<Ad | null>(null);
  const [impressionId, setImpressionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadAd() {
      try {
        const response = await getAd(placement, context);
        if (!cancelled && response.success && response.ad) {
          setAd(response.ad);
          setImpressionId(response.impression_id || null);
        }
      } catch (error) {
        console.error('Failed to load ad:', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAd();
    return () => { cancelled = true; };
  }, [placement, context?.bin, context?.item]);

  const handleClick = async () => {
    if (impressionId) {
      try {
        await recordAdClick(impressionId);
      } catch (error) {
        console.error('Failed to record click:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse bg-gray-700 rounded-lg ${className}`}>
        <div className="h-16" />
      </div>
    );
  }

  if (!ad) {
    return null;
  }

  if (ad.type === 'sponsor') {
    return <SponsorAdDisplay ad={ad} onClick={handleClick} className={className} />;
  }

  // AdSense fallback
  return <AdSensePlaceholder slotId={ad.slot_id} format={ad.format} className={className} />;
}

interface SponsorAdDisplayProps {
  ad: SponsorAd;
  onClick: () => void;
  className?: string;
}

function SponsorAdDisplay({ ad, onClick, className = '' }: SponsorAdDisplayProps) {
  const ctaUrl = ad.creative.cta_url || ad.sponsor.website_url;

  return (
    <a
      href={ctaUrl}
      target="_blank"
      rel="noopener noreferrer sponsored"
      onClick={onClick}
      className={`block bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg overflow-hidden border border-gray-600 hover:border-green-500 transition-colors ${className}`}
    >
      <div className="p-3 flex items-center gap-3">
        {/* Sponsor logo */}
        <div className="flex-shrink-0 w-12 h-12 bg-white rounded-lg p-1 flex items-center justify-center">
          <img
            src={ad.sponsor.logo_url}
            alt={ad.sponsor.name_is}
            className="max-w-full max-h-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="text-white font-semibold text-sm truncate">
            {ad.creative.headline_is}
          </div>
          {ad.creative.body_is && (
            <div className="text-gray-400 text-xs truncate mt-0.5">
              {ad.creative.body_is}
            </div>
          )}
          <div className="text-green-400 text-xs mt-1">
            {ad.creative.cta_text_is} →
          </div>
        </div>

        {/* Optional image */}
        {ad.creative.image_url && (
          <div className="flex-shrink-0 w-16 h-16 rounded overflow-hidden">
            <img
              src={ad.creative.image_url}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>

      {/* Sponsored label */}
      <div className="bg-gray-900/50 px-3 py-1 text-[10px] text-gray-500 flex items-center justify-between">
        <span>Styrkt af {ad.sponsor.name_is}</span>
        <span>Augl.</span>
      </div>
    </a>
  );
}

interface AdSensePlaceholderProps {
  slotId: string;
  format: 'banner' | 'rectangle' | 'native';
  className?: string;
}

function AdSensePlaceholder({ slotId, format, className = '' }: AdSensePlaceholderProps) {
  // In production, this would render actual AdSense code
  // For now, show a placeholder that indicates where AdSense would appear

  const heights: Record<string, string> = {
    banner: 'h-16',
    rectangle: 'h-32',
    native: 'h-24',
  };

  return (
    <div className={`bg-gray-800 rounded-lg border border-gray-700 ${heights[format]} flex items-center justify-center ${className}`}>
      <div className="text-gray-500 text-xs text-center">
        <div>Google AdSense</div>
        <div className="text-[10px] opacity-60">Slot: {slotId}</div>
      </div>
    </div>
  );
}

export default AdSlot;
