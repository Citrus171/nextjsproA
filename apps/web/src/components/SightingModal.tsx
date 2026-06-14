import { useEffect, useState } from "react";
import { MapPin, LocateFixed } from "lucide-react";
import { useApiClient } from "../api/orvalClient";
import { reverseGeocode } from "../lib/reverseGeocode";
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
  location?: string;
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
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [hasLocation, setHasLocation] = useState(false);

  useEffect(() => {
    if (!pickedLocation) return;
    setLat(String(pickedLocation.lat));
    setLng(String(pickedLocation.lng));
    setHasLocation(true);
    if (pickedLocation.address !== undefined)
      setAddress(pickedLocation.address);
    if (pickedLocation.geocodeError) setError(pickedLocation.geocodeError);
  }, [pickedLocation]);

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("このブラウザでは現在地を取得できません");
      return;
    }
    setIsLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLat(String(latitude));
        setLng(String(longitude));
        setHasLocation(true);
        const result = await reverseGeocode(latitude, longitude);
        if ("address" in result) setAddress(result.address);
        else setError(result.geocodeError);
        setIsLocating(false);
      },
      () => {
        setError("現在地の取得に失敗しました");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const validate = (): boolean => {
    const errors: FormErrors = {};
    if (!lat || !lng) errors.location = "位置情報を指定してください";
    if (!sightedAt) errors.sightedAt = "目撃日時を入力してください";
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
    setHasLocation(false);
    setIsLocating(false);
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
            {/* 位置情報（プライマリアクション） */}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-bold text-foreground">
                位置情報 <span className="text-destructive">*</span>
              </span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  aria-label="地図から選択"
                  onClick={onSelectFromMap}
                  className="min-h-[52px] rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all"
                >
                  <MapPin size={16} aria-hidden="true" />
                  地図から選択
                </button>
                <button
                  type="button"
                  aria-label="現在地を使う"
                  onClick={handleCurrentLocation}
                  disabled={isLocating}
                  className="min-h-[52px] rounded-xl border border-primary text-primary font-bold text-sm flex items-center justify-center gap-2 hover:bg-accent disabled:opacity-50 active:scale-[0.98] transition-all"
                >
                  <LocateFixed size={16} aria-hidden="true" />
                  {isLocating ? "取得中…" : "現在地を使う"}
                </button>
              </div>
              {hasLocation && lat && lng && (
                <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-xl text-sm">
                  <MapPin
                    size={14}
                    className="text-primary shrink-0"
                    aria-hidden="true"
                  />
                  <span className="text-foreground truncate">
                    {address ||
                      `${parseFloat(lat).toFixed(5)}, ${parseFloat(lng).toFixed(5)}`}
                  </span>
                </div>
              )}
              {fieldErrors.location && (
                <p className="text-xs text-destructive">
                  {fieldErrors.location}
                </p>
              )}
            </div>

            {/* 目撃日時 */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="sighting-sightedAt"
                className="text-sm font-bold text-foreground"
              >
                目撃日時 <span className="text-destructive">*</span>
              </label>
              <input
                id="sighting-sightedAt"
                aria-label="目撃日時"
                type="datetime-local"
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

            {/* 住所（任意） */}
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

            {/* コメント（任意） */}
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
