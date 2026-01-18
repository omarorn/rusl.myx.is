import { useState, useEffect } from 'react';
import { getSponsors, type Sponsor } from '../services/api';

interface SponsorCardProps {
  className?: string;
  title?: string;
}

export function SponsorCard({ className = '', title = 'Styrktaraðilar' }: SponsorCardProps) {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSponsors() {
      try {
        const response = await getSponsors();
        if (response.success) {
          setSponsors(response.sponsors);
        }
      } catch (error) {
        console.error('Failed to load sponsors:', error);
      } finally {
        setLoading(false);
      }
    }

    loadSponsors();
  }, []);

  if (loading) {
    return (
      <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-24 mb-3" />
          <div className="flex gap-4">
            <div className="w-16 h-16 bg-gray-700 rounded-lg" />
            <div className="w-16 h-16 bg-gray-700 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (sponsors.length === 0) {
    return null;
  }

  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
      <h3 className="text-gray-400 text-xs font-medium mb-3 uppercase tracking-wide">
        {title}
      </h3>

      <div className="flex flex-wrap gap-4 items-center">
        {sponsors.map((sponsor) => (
          <a
            key={sponsor.id}
            href={sponsor.website_url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="group flex flex-col items-center"
            title={sponsor.name_is}
          >
            <div className="w-14 h-14 bg-white rounded-lg p-2 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
              <img
                src={sponsor.logo_url}
                alt={sponsor.name_is}
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.parentElement!.innerHTML = `<span class="text-2xl">${getCategoryIcon(sponsor.category)}</span>`;
                }}
              />
            </div>
            <span className="text-gray-400 text-[10px] mt-1 group-hover:text-green-400 transition-colors">
              {sponsor.name_is}
            </span>
          </a>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-700">
        <a
          href="mailto:omar@2076.is?subject=Styrktaraðili%20-%20rusl.myx.is"
          className="text-[10px] text-gray-500 hover:text-green-400 transition-colors"
        >
          Viltu styrkja? Hafðu samband →
        </a>
      </div>
    </div>
  );
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    municipality: '🏛️',
    recycling: '♻️',
    sustainability: '🌱',
    retail: '🏪',
    utility: '⚡',
    nonprofit: '💚',
  };
  return icons[category] || '🏢';
}

export default SponsorCard;
