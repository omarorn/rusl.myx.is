import { useState, useEffect, useCallback } from 'react';
import {
  getAdminImages,
  updateAdminImage,
  deleteAdminImage,
  batchAdminImages,
  getAdminStats,
  setAdminPassword,
  clearAdminPassword,
  getQuizImageUrl,
  type AdminImage,
  type AdminStatsResponse,
} from '../services/api';

interface AdminProps {
  onClose: () => void;
}

const BIN_OPTIONS = [
  { value: 'paper', label: 'Pappír', icon: '📦', color: 'bg-blue-500' },
  { value: 'plastic', label: 'Plast', icon: '🥤', color: 'bg-green-500' },
  { value: 'food', label: 'Matur', icon: '🍎', color: 'bg-amber-600' },
  { value: 'mixed', label: 'Blandað', icon: '🗑️', color: 'bg-gray-500' },
  { value: 'recycling_center', label: 'Endurvinnslustöð', icon: '♻️', color: 'bg-purple-500' },
];

type StatusFilter = 'all' | 'approved' | 'pending' | 'rejected';

export function Admin({ onClose }: AdminProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [images, setImages] = useState<AdminImage[]>([]);
  const [counts, setCounts] = useState({ total: 0, approved: 0, pending: 0, rejected: 0 });
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [showStats, setShowStats] = useState(false);

  const [editingImage, setEditingImage] = useState<AdminImage | null>(null);
  const [editForm, setEditForm] = useState({ item: '', bin: '', reason: '' });
  const [lightboxImage, setLightboxImage] = useState<AdminImage | null>(null);

  const loadImages = useCallback(async () => {
    setLoading(true);
    const result = await getAdminImages(statusFilter);
    if (result.success) {
      setImages(result.images);
      setCounts(result.counts);
    } else {
      setError(result.error || 'Villa við að sækja myndir');
    }
    setLoading(false);
  }, [statusFilter]);

  const loadStats = async () => {
    const result = await getAdminStats();
    if (result.success) {
      setStats(result);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadImages();
      loadStats();
    }
  }, [isLoggedIn, loadImages]);

  const handleLogin = async () => {
    setError('');
    setAdminPassword(password);
    const result = await getAdminImages('pending', 1);
    if (result.error) {
      clearAdminPassword();
      setError('Rangt lykilorð');
    } else {
      setIsLoggedIn(true);
    }
  };

  const handleLogout = () => {
    clearAdminPassword();
    setIsLoggedIn(false);
    setPassword('');
    setImages([]);
  };

  const handleApprove = async (id: string) => {
    const result = await updateAdminImage(id, { approved: 1 });
    if (result.success) {
      loadImages();
    }
  };

  const handleReject = async (id: string) => {
    const result = await updateAdminImage(id, { approved: -1 });
    if (result.success) {
      loadImages();
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Ertu viss um að þú viljir eyða þessari mynd?')) {
      const result = await deleteAdminImage(id);
      if (result.success) {
        loadImages();
      }
    }
  };

  const handleBatchAction = async (action: 'approve' | 'reject' | 'delete') => {
    if (selectedIds.size === 0) return;
    if (action === 'delete' && !confirm(`Eyða ${selectedIds.size} myndum?`)) return;

    const result = await batchAdminImages(Array.from(selectedIds), action);
    if (result.success) {
      setSelectedIds(new Set());
      loadImages();
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === images.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(images.map((img) => img.id)));
    }
  };

  const openEdit = (image: AdminImage) => {
    setEditingImage(image);
    setEditForm({ item: image.item, bin: image.bin, reason: image.reason });
  };

  const saveEdit = async () => {
    if (!editingImage) return;
    const result = await updateAdminImage(editingImage.id, editForm);
    if (result.success) {
      setEditingImage(null);
      loadImages();
    }
  };

  // Login screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col">
        <header className="bg-gray-800 p-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">🔐 Stjórnborð</h1>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
            ×
          </button>
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-4 text-center">Innskráning</h2>

            {error && (
              <div className="bg-red-500/20 text-red-400 p-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <input
              type="password"
              placeholder="Lykilorð"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full bg-gray-700 rounded-lg px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-green-500"
            />

            <button
              onClick={handleLogin}
              className="w-full bg-green-600 hover:bg-green-500 py-3 rounded-lg font-bold transition-colors"
            >
              Skrá inn
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main admin panel
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">🛠️ Stjórnborð</h1>
          <button
            onClick={() => setShowStats(!showStats)}
            className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded"
          >
            {showStats ? 'Sýna myndir' : 'Tölfræði'}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-white"
          >
            Útskrá
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl ml-2">
            ×
          </button>
        </div>
      </header>

      {/* Stats view */}
      {showStats && stats && (
        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Myndir" value={stats.images.total_images} icon="🖼️" />
            <StatCard label="Samþykktar" value={stats.images.approved} icon="✅" />
            <StatCard label="Í bið" value={stats.images.pending} icon="⏳" color="text-yellow-400" />
            <StatCard label="Hafnað" value={stats.images.rejected} icon="❌" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <StatCard label="Notendur" value={stats.users.total_users} icon="👥" />
            <StatCard label="Skannanir" value={stats.users.total_scans} icon="📷" />
            <StatCard
              label="Quiz nákvæmni"
              value={stats.images.total_plays > 0
                ? `${Math.round((stats.images.total_correct / stats.images.total_plays) * 100)}%`
                : '—'}
              icon="🎯"
            />
          </div>

          <h3 className="text-lg font-bold mb-3">Nýlegar skannanir</h3>
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            {stats.recentScans.map((scan, i) => (
              <div key={i} className="flex items-center justify-between p-3 border-b border-gray-700 last:border-0">
                <span>{scan.item}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">{scan.bin}</span>
                  <span className="text-sm text-gray-500">{Math.round(scan.confidence * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Images view */}
      {!showStats && (
        <>
          {/* Filter tabs */}
          <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center gap-2 overflow-x-auto">
            <FilterTab
              active={statusFilter === 'pending'}
              onClick={() => setStatusFilter('pending')}
              label={`Í bið (${counts.pending})`}
              color="bg-yellow-500"
            />
            <FilterTab
              active={statusFilter === 'approved'}
              onClick={() => setStatusFilter('approved')}
              label={`Samþykktar (${counts.approved})`}
              color="bg-green-500"
            />
            <FilterTab
              active={statusFilter === 'rejected'}
              onClick={() => setStatusFilter('rejected')}
              label={`Hafnað (${counts.rejected})`}
              color="bg-red-500"
            />
            <FilterTab
              active={statusFilter === 'all'}
              onClick={() => setStatusFilter('all')}
              label={`Allar (${counts.total})`}
              color="bg-gray-500"
            />
          </div>

          {/* Batch actions */}
          {selectedIds.size > 0 && (
            <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center gap-2">
              <span className="text-sm text-gray-400">{selectedIds.size} valdar</span>
              <button
                onClick={() => handleBatchAction('approve')}
                className="text-sm bg-green-600 hover:bg-green-500 px-3 py-1 rounded"
              >
                Samþykkja
              </button>
              <button
                onClick={() => handleBatchAction('reject')}
                className="text-sm bg-yellow-600 hover:bg-yellow-500 px-3 py-1 rounded"
              >
                Hafna
              </button>
              <button
                onClick={() => handleBatchAction('delete')}
                className="text-sm bg-red-600 hover:bg-red-500 px-3 py-1 rounded"
              >
                Eyða
              </button>
            </div>
          )}

          {/* Images grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="text-center text-gray-400 py-10">Hleður...</div>
            ) : images.length === 0 ? (
              <div className="text-center text-gray-400 py-10">Engar myndir</div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={selectAll}
                    className="text-sm text-gray-400 hover:text-white"
                  >
                    {selectedIds.size === images.length ? 'Afvelja allt' : 'Velja allt'}
                  </button>
                  <button
                    onClick={loadImages}
                    className="text-sm text-gray-400 hover:text-white"
                  >
                    🔄 Endurnýja
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {images.map((image) => (
                    <ImageCard
                      key={image.id}
                      image={image}
                      selected={selectedIds.has(image.id)}
                      onSelect={() => toggleSelect(image.id)}
                      onView={() => setLightboxImage(image)}
                      onApprove={() => handleApprove(image.id)}
                      onReject={() => handleReject(image.id)}
                      onDelete={() => handleDelete(image.id)}
                      onEdit={() => openEdit(image)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Edit modal */}
      {editingImage && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Breyta mynd</h3>

            <div className="mb-4">
              <img
                src={getQuizImageUrl(editingImage.image_key)}
                alt={editingImage.item}
                className="w-full h-48 object-cover rounded-lg"
              />
            </div>

            <div className="mb-3">
              <label className="block text-sm text-gray-400 mb-1">Hlutur</label>
              <input
                type="text"
                value={editForm.item}
                onChange={(e) => setEditForm({ ...editForm, item: e.target.value })}
                className="w-full bg-gray-700 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="mb-3">
              <label className="block text-sm text-gray-400 mb-1">Tunna</label>
              <div className="grid grid-cols-2 gap-2">
                {BIN_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setEditForm({ ...editForm, bin: opt.value })}
                    className={`p-2 rounded flex items-center gap-2 ${
                      editForm.bin === opt.value
                        ? `${opt.color} text-white`
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    <span>{opt.icon}</span>
                    <span className="text-sm">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">Ástæða</label>
              <textarea
                value={editForm.reason}
                onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                className="w-full bg-gray-700 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 h-20 resize-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setEditingImage(null)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded"
              >
                Hætta við
              </button>
              <button
                onClick={saveEdit}
                className="flex-1 bg-green-600 hover:bg-green-500 py-2 rounded font-bold"
              >
                Vista
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox modal for viewing full-size images */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300"
          >
            ×
          </button>
          <div className="max-w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <img
              src={getQuizImageUrl(lightboxImage.image_key)}
              alt={lightboxImage.item}
              className="max-w-full max-h-[80vh] object-contain rounded-xl"
            />
          </div>
          <div className="mt-4 text-center text-white">
            <div className="text-xl font-bold">{lightboxImage.item}</div>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className={`px-2 py-1 rounded text-sm ${BIN_OPTIONS.find(b => b.value === lightboxImage.bin)?.color || 'bg-gray-600'}`}>
                {BIN_OPTIONS.find(b => b.value === lightboxImage.bin)?.icon} {BIN_OPTIONS.find(b => b.value === lightboxImage.bin)?.label || lightboxImage.bin}
              </span>
              <span className="text-gray-400">{Math.round(lightboxImage.confidence * 100)}%</span>
            </div>
            <p className="text-sm text-gray-400 mt-2 max-w-md">{lightboxImage.reason}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color = 'text-white',
}: {
  label: string;
  value: string | number;
  icon: string;
  color?: string;
}) {
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-1">
        <span>{icon}</span>
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function FilterTab({
  active,
  onClick,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${
        active ? `${color} text-white` : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      }`}
    >
      {label}
    </button>
  );
}

function ImageCard({
  image,
  selected,
  onSelect,
  onView,
  onApprove,
  onReject,
  onDelete,
  onEdit,
}: {
  image: AdminImage;
  selected: boolean;
  onSelect: () => void;
  onView: () => void;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const bin = BIN_OPTIONS.find((b) => b.value === image.bin);

  return (
    <div
      className={`bg-gray-800 rounded-lg overflow-hidden ${
        selected ? 'ring-2 ring-green-500' : ''
      }`}
    >
      <div className="relative">
        <img
          src={getQuizImageUrl(image.image_key)}
          alt={image.item}
          className="w-full h-40 object-cover cursor-zoom-in hover:opacity-90 transition-opacity"
          onClick={onView}
          title="Smelltu til að stækka"
        />
        <input
          type="checkbox"
          checked={selected}
          onChange={onSelect}
          className="absolute top-2 left-2 w-5 h-5 cursor-pointer"
        />
        <div
          className={`absolute top-2 right-2 px-2 py-1 rounded text-xs ${
            image.approved === 1
              ? 'bg-green-500'
              : image.approved === -1
              ? 'bg-red-500'
              : 'bg-yellow-500'
          }`}
        >
          {image.approved === 1 ? '✓' : image.approved === -1 ? '✗' : '?'}
        </div>
      </div>

      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium truncate">{image.item}</span>
          <span className="text-sm text-gray-400">{Math.round(image.confidence * 100)}%</span>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span
            className={`px-2 py-1 rounded text-xs ${bin?.color || 'bg-gray-600'}`}
          >
            {bin?.icon} {bin?.label || image.bin}
          </span>
          <span className="text-xs text-gray-500">
            {image.times_shown} sýnd / {image.times_correct} rétt
          </span>
        </div>

        <div className="flex gap-1">
          {image.approved !== 1 && (
            <button
              onClick={onApprove}
              className="flex-1 bg-green-600 hover:bg-green-500 py-1 rounded text-sm"
            >
              ✓
            </button>
          )}
          {image.approved !== -1 && (
            <button
              onClick={onReject}
              className="flex-1 bg-yellow-600 hover:bg-yellow-500 py-1 rounded text-sm"
            >
              ✗
            </button>
          )}
          <button
            onClick={onEdit}
            className="flex-1 bg-blue-600 hover:bg-blue-500 py-1 rounded text-sm"
          >
            ✏️
          </button>
          <button
            onClick={onDelete}
            className="bg-red-600 hover:bg-red-500 py-1 px-2 rounded text-sm"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}
