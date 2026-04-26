import { useState } from "react";
import { useApiClient } from "../api/orvalClient";
import { Sheet, SheetContent, SheetTitle } from "./ui/sheet";

interface SightingModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId?: string;
  onSuccess: () => void;
}

export default function SightingModal({
  isOpen,
  onClose,
  postId,
  onSuccess,
}: SightingModalProps) {
  const api = useApiClient();
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [sightedAt, setSightedAt] = useState("");
  const [address, setAddress] = useState("");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (!lat || !lng || !sightedAt || isNaN(latNum) || isNaN(lngNum)) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await api.createSighting({
        lat: latNum,
        lng: lngNum,
        sightedAt: new Date(sightedAt).toISOString(),
        ...(postId ? { postId } : {}),
        ...(address ? { address } : {}),
        ...(comment ? { comment } : {}),
      });
      onSuccess();
      onClose();
    } catch {
      setError("送信に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="h-[80vh] p-0 overflow-hidden"
        aria-label="目撃を報告する"
      >
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3" />

        <div className="h-full overflow-y-auto px-6 pb-8">
          <div className="flex items-center justify-between mt-4 mb-4">
            <SheetTitle asChild>
              <h2 className="text-xl font-black text-slate-900">
                目撃を報告する
              </h2>
            </SheetTitle>
            <button
              type="button"
              aria-label="閉じる"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="sighting-lat"
                className="text-sm font-bold text-slate-700"
              >
                緯度
              </label>
              <input
                id="sighting-lat"
                aria-label="緯度"
                type="number"
                step="any"
                required
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm"
                placeholder="例: 35.9062"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="sighting-lng"
                className="text-sm font-bold text-slate-700"
              >
                経度
              </label>
              <input
                id="sighting-lng"
                aria-label="経度"
                type="number"
                step="any"
                required
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm"
                placeholder="例: 139.6236"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="sighting-sightedAt"
                className="text-sm font-bold text-slate-700"
              >
                目撃日時
              </label>
              <input
                id="sighting-sightedAt"
                aria-label="目撃日時"
                type="datetime-local"
                required
                value={sightedAt}
                onChange={(e) => setSightedAt(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="sighting-address"
                className="text-sm font-bold text-slate-700"
              >
                住所（任意）
              </label>
              <input
                id="sighting-address"
                aria-label="住所"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm"
                placeholder="例: 埼玉県さいたま市"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="sighting-comment"
                className="text-sm font-bold text-slate-700"
              >
                コメント（任意）
              </label>
              <textarea
                id="sighting-comment"
                aria-label="コメント"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm resize-none"
                rows={3}
                placeholder="目撃時の状況など"
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              aria-label="送信"
              disabled={isSubmitting}
              className="w-full py-3 rounded-2xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "送信中..." : "送信"}
            </button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
