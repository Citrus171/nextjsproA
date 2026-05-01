import { useEffect, useState } from "react";
import { useApiClient } from "../api/orvalClient";
import { Sheet, SheetContent, SheetTitle } from "./ui/sheet";
import { toast } from "sonner";

interface PickedLocation {
  lat: number;
  lng: number;
  address?: string;
  geocodeError?: string;
}

interface SightingModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId?: string;
  onSuccess: () => void;
  onSelectFromMap?: () => void;
  pickedLocation?: PickedLocation | null;
  forceMount?: true;
}

interface FormErrors {
  lat?: string;
  lng?: string;
  sightedAt?: string;
}

export default function SightingModal({
  isOpen,
  onClose,
  postId,
  onSuccess,
  onSelectFromMap,
  pickedLocation,
  forceMount,
}: SightingModalProps) {
  const api = useApiClient();
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [sightedAt, setSightedAt] = useState("");
  const [address, setAddress] = useState("");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [hasLocationFromMap, setHasLocationFromMap] = useState(false);

  useEffect(() => {
    if (!pickedLocation) return;
    setLat(String(pickedLocation.lat));
    setLng(String(pickedLocation.lng));
    setHasLocationFromMap(true);
    if (pickedLocation.address !== undefined)
      setAddress(pickedLocation.address);
    if (pickedLocation.geocodeError) setError(pickedLocation.geocodeError);
  }, [pickedLocation]);

  const validate = (): boolean => {
    const errors: FormErrors = {};
    if (!lat.trim()) errors.lat = "緯度を入力してください";
    if (!lng.trim()) errors.lng = "経度を入力してください";
    if (!sightedAt) errors.sightedAt = "目撃日時を入力してください";
    if (lat.trim() && isNaN(parseFloat(lat)))
      errors.lat = "緯度は正しい数値を入力してください";
    if (lng.trim() && isNaN(parseFloat(lng)))
      errors.lng = "経度は正しい数値を入力してください";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

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
      toast.success("目撃情報を報告しました");
      onSuccess();
      onClose();
    } catch {
      setError("送信に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFieldErrors({});
    setError(null);
    setHasLocationFromMap(false);
    onClose();
  };

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open: boolean) => !open && handleClose()}
    >
      <SheetContent
        side="bottom"
        forceMount={forceMount}
        className="h-[80dvh] p-0 overflow-hidden"
        aria-label="目撃を報告する"
      >
        <div className="w-12 h-1.5 bg-border rounded-full mx-auto mt-3" />

        <div className="h-full overflow-y-auto px-6 pb-[calc(2rem+env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between mt-4 mb-4">
            <SheetTitle asChild>
              <h2 className="text-xl font-extrabold text-foreground">
                目撃を報告する
              </h2>
            </SheetTitle>
            <button
              type="button"
              aria-label="閉じる"
              onClick={handleClose}
              className="text-muted-foreground hover:text-foreground text-2xl leading-none min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-muted"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <button
              type="button"
              aria-label="地図から選択"
              onClick={onSelectFromMap}
              className="w-full min-h-[44px] rounded-xl border border-primary text-primary font-bold text-sm hover:bg-accent"
            >
              地図から選択
            </button>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="sighting-lat"
                className="text-sm font-bold text-foreground"
              >
                緯度
              </label>
              <input
                id="sighting-lat"
                aria-label="緯度"
                type="text"
                inputMode="decimal"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                readOnly={hasLocationFromMap}
                className={`border rounded-lg px-3 py-2 text-sm ${hasLocationFromMap ? "bg-muted text-muted-foreground" : ""} ${fieldErrors.lat ? "border-destructive" : ""}`}
                placeholder="例: 35.9062"
              />
              {fieldErrors.lat && (
                <p className="text-xs text-destructive">{fieldErrors.lat}</p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="sighting-lng"
                className="text-sm font-bold text-foreground"
              >
                経度
              </label>
              <input
                id="sighting-lng"
                aria-label="経度"
                type="text"
                inputMode="decimal"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                readOnly={hasLocationFromMap}
                className={`border rounded-lg px-3 py-2 text-sm ${hasLocationFromMap ? "bg-muted text-muted-foreground" : ""} ${fieldErrors.lng ? "border-destructive" : ""}`}
                placeholder="例: 139.6236"
              />
              {fieldErrors.lng && (
                <p className="text-xs text-destructive">{fieldErrors.lng}</p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="sighting-sightedAt"
                className="text-sm font-bold text-foreground"
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
                className={`border rounded-lg px-3 py-2 text-sm ${fieldErrors.sightedAt ? "border-destructive" : ""}`}
              />
              {fieldErrors.sightedAt && (
                <p className="text-xs text-destructive">
                  {fieldErrors.sightedAt}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="sighting-address"
                className="text-sm font-bold text-foreground"
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
                className="text-sm font-bold text-foreground"
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
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              aria-label="送信"
              disabled={isSubmitting}
              className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? "送信中..." : "送信"}
            </button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
