import React, { useEffect, useRef, useState, useCallback } from "react";
import type { CheckedState } from "@radix-ui/react-checkbox";
import { useNavigate, useParams } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ImageResponseDto } from "../../../../packages/api-client/src/index";
import { useApiClient } from "../api/orvalClient";
import { reverseGeocode } from "../lib/reverseGeocode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertCircle,
  Camera,
  Calendar,
  Cat,
  ChevronLeft,
  LocateFixed,
  MapPin,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const DEFAULT_CENTER: [number, number] = [35.9062, 139.6236];
const MAX_IMAGES = 3;

interface LatLng {
  lat: number;
  lng: number;
}

function MapClickHandler({
  onMapClick,
}: {
  onMapClick: (pos: LatLng) => void;
}) {
  useMapEvents({
    click(e) {
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function MapInstanceBridge({
  onReady,
}: {
  onReady: (map: LeafletMap) => void;
}) {
  const map = useMap();
  useEffect(() => {
    onReady(map);
  }, [map, onReady]);
  return null;
}

export default function EditPost() {
  const api = useApiClient();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const apiRef = useRef(api);
  apiRef.current = api;

  // petDetail
  const [name, setName] = useState("");
  const [color, setColor] = useState("");
  const [age, setAge] = useState("");
  const [features, setFeatures] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "unknown">(
    "unknown"
  );
  const [breed, setBreed] = useState("");
  const [microchip, setMicrochip] = useState(false);
  const [neutered, setNeutered] = useState(false);

  // post
  const [description, setDescription] = useState("");
  const [lostDate, setLostDate] = useState("");

  // location
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [pinPos, setPinPos] = useState<LatLng | null>(null);

  // images
  const [existingImages, setExistingImages] = useState<ImageResponseDto[]>([]);
  const [remainingSlots, setRemainingSlots] = useState(MAX_IMAGES);

  // UI
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleMapReady = useCallback((m: LeafletMap) => {
    mapRef.current = m;
  }, []);

  const loadPost = useCallback(async (postId: string) => {
    const post = await apiRef.current.getPost(postId);
    setDescription(post.description ?? "");
    setLostDate(
      post.lostDate ? new Date(post.lostDate).toISOString().slice(0, 16) : ""
    );
    setExistingImages(post.images ?? []);
    setRemainingSlots(MAX_IMAGES - (post.images?.length ?? 0));

    if (post.petDetail) {
      setName(post.petDetail.name ?? "");
      setColor(post.petDetail.color ?? "");
      setAge(post.petDetail.age ?? "");
      setFeatures(post.petDetail.features ?? "");
      setGender(
        (post.petDetail.gender as "male" | "female" | "unknown") ?? "unknown"
      );
      setBreed(post.petDetail.breed ?? "");
      setMicrochip(post.petDetail.microchip ?? false);
      setNeutered(post.petDetail.neutered ?? false);
    }
    if (post.location) {
      setCity(post.location.city ?? "");
      setAddress(post.location.address ?? "");
      setPinPos({ lat: post.location.lat, lng: post.location.lng });
    }
  }, []);

  useEffect(() => {
    if (!id) return;
    loadPost(id).catch(() => setError("投稿の取得に失敗しました"));
  }, [id, loadPost]);

  useEffect(() => {
    if (pinPos && mapRef.current) {
      mapRef.current.flyTo([pinPos.lat, pinPos.lng], 15);
    }
  }, [pinPos]);

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("このブラウザでは現在地を取得できません");
      return;
    }
    setIsLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        setPinPos({ lat, lng });
        mapRef.current?.flyTo([lat, lng], 16, { animate: true });
        const result = await reverseGeocode(lat, lng);
        if ("address" in result) setAddress(result.address);
        else setLocationError(result.geocodeError);
        setIsLocating(false);
      },
      () => {
        setLocationError("現在地の取得に失敗しました");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !id) return;
    e.target.value = "";
    setError(null);
    if (files.length > remainingSlots) {
      setError(`追加できる画像は残り ${remainingSlots} 枚です`);
      return;
    }
    try {
      const result = await api.addImages(id, files);
      setExistingImages(result.images);
      setRemainingSlots(result.remainingSlots);
    } catch {
      setError("画像のアップロードに失敗しました");
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!id) return;
    setError(null);
    try {
      await api.deleteImage(id, imageId);
      setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
      setRemainingSlots((prev) => prev + 1);
    } catch {
      setError("画像の削除に失敗しました");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setSubmitting(true);
    try {
      await api.updatePost(id, {
        description: description.trim(),
        lostDate: lostDate ? new Date(lostDate).toISOString() : undefined,
        petDetail: {
          name: name.trim() || undefined,
          color: color.trim() || undefined,
          age: age.trim() || undefined,
          features: features.trim() || undefined,
          gender,
          breed: breed.trim() || undefined,
          microchip,
          neutered,
        },
        location: pinPos
          ? {
              prefecture: "saitama",
              city: city.trim() || undefined,
              address: address.trim() || undefined,
              lat: pinPos.lat,
              lng: pinPos.lng,
            }
          : undefined,
      });
      navigate("/");
    } catch {
      setError("保存に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!id) return;
    setError(null);
    setDeleting(true);
    try {
      await api.deletePost(id);
      navigate("/");
    } catch {
      setError("削除に失敗しました");
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-8 font-manrope">
      <div className="flex items-center gap-4 mb-8">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft size={24} />
        </Button>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          投稿を編集
        </h1>
      </div>

      {error && (
        <p className="mb-4 text-sm text-destructive bg-destructive/10 p-3 rounded-xl flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {/* 削除確認ダイアログ */}
      {showDeleteDialog && (
        <div
          role="dialog"
          aria-label="投稿を削除しますか？"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        >
          <div className="bg-card rounded-2xl p-6 mx-4 max-w-sm w-full space-y-4">
            <h2 className="text-lg font-extrabold text-foreground">
              投稿を削除しますか？
            </h2>
            <p className="text-sm text-muted-foreground">
              この操作は取り消せません。
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowDeleteDialog(false)}
              >
                キャンセル
              </Button>
              <Button
                type="button"
                className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                onClick={confirmDelete}
                disabled={deleting}
              >
                削除を確定する
              </Button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="space-y-12">
        {/* 画像管理 */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Camera className="text-primary" size={20} />
            <h2 className="text-lg font-extrabold text-foreground">お写真</h2>
          </div>
          <Card className="border-none bg-muted rounded-3xl overflow-hidden">
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-3">
                {existingImages.map((img, i) => (
                  <div key={img.id} className="relative aspect-square">
                    <img
                      src={img.url}
                      alt={`既存画像${i + 1}`}
                      className="w-full h-full object-cover rounded-2xl"
                    />
                    <button
                      type="button"
                      aria-label={`既存画像${i + 1}を削除`}
                      onClick={() => handleDeleteImage(img.id)}
                      className="absolute -top-1.5 -right-1.5 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {remainingSlots > 0 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-2xl border-2 border-dashed border-border bg-card flex flex-col items-center justify-center cursor-pointer hover:bg-accent transition-colors"
                  >
                    <Upload size={24} className="text-muted-foreground mb-1" />
                    <span className="text-xs font-bold text-muted-foreground">
                      追加
                    </span>
                  </button>
                )}
                {Array.from({
                  length: Math.max(0, remainingSlots - 1),
                }).map((_, i) => (
                  <div
                    key={`placeholder-${i}`}
                    className="aspect-square rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground"
                  >
                    <Plus size={20} />
                  </div>
                ))}
              </div>
              {remainingSlots > 0 && (
                <input
                  ref={fileInputRef}
                  data-testid="image-upload-input"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                />
              )}
              <p className="mt-4 text-xs font-medium text-muted-foreground text-center">
                {remainingSlots === 0
                  ? "最大3枚です"
                  : `残り ${remainingSlots} 枚追加できます`}
              </p>
            </CardContent>
          </Card>
        </section>

        {/* ねこちゃんの情報 */}
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <Cat className="text-primary" size={20} />
            <h2 className="text-lg font-extrabold text-foreground">
              ねこちゃんの情報
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground ml-1">
                お名前
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 border-none bg-muted rounded-2xl px-4"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground ml-1">
                種類
              </Label>
              <Input
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                className="h-12 border-none bg-muted rounded-2xl px-4"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs font-bold text-muted-foreground ml-1">
              性別
            </Label>
            <RadioGroup
              value={gender}
              onValueChange={(v: string) =>
                setGender(v as "male" | "female" | "unknown")
              }
              className="flex gap-4"
            >
              {(
                [
                  { value: "male", label: "オス" },
                  { value: "female", label: "メス" },
                  { value: "unknown", label: "不明" },
                ] as const
              ).map((g) => (
                <div
                  key={g.value}
                  className="flex items-center space-x-2 bg-muted px-4 py-2 rounded-full"
                >
                  <RadioGroupItem value={g.value} id={`gender-${g.value}`} />
                  <Label
                    htmlFor={`gender-${g.value}`}
                    className="text-sm font-bold"
                  >
                    {g.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground ml-1">
                年齢
              </Label>
              <Input
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="h-12 border-none bg-muted rounded-2xl px-4"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground ml-1">
                毛色
              </Label>
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-12 border-none bg-muted rounded-2xl px-4"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground ml-1">
              特徴
            </Label>
            <Textarea
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              className="min-h-[80px] border-none bg-muted rounded-2xl p-4 resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground ml-1">
              詳しい説明
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px] border-none bg-muted rounded-2xl p-4 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3 bg-muted p-4 rounded-2xl">
              <Checkbox
                id="microchip"
                checked={microchip}
                onCheckedChange={(v: CheckedState) => setMicrochip(v === true)}
              />
              <Label htmlFor="microchip" className="text-sm font-bold">
                マイクロチップあり
              </Label>
            </div>
            <div className="flex items-center space-x-3 bg-muted p-4 rounded-2xl">
              <Checkbox
                id="neutered"
                checked={neutered}
                onCheckedChange={(v: CheckedState) => setNeutered(v === true)}
              />
              <Label htmlFor="neutered" className="text-sm font-bold">
                避妊去勢済
              </Label>
            </div>
          </div>
        </section>

        {/* いつ・どこで？ */}
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <MapPin className="text-primary" size={20} />
            <h2 className="text-lg font-extrabold text-foreground">
              いつ・どこで？
            </h2>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground ml-1">
              いなくなった日時
            </Label>
            <div className="relative">
              <Calendar
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={18}
              />
              <Input
                type="datetime-local"
                value={lostDate}
                onChange={(e) => setLostDate(e.target.value)}
                className="h-12 border-none bg-muted rounded-2xl pl-12"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground ml-1">
              市区町村
            </Label>
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-12 border-none bg-muted rounded-2xl px-4"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground ml-1">
              住所・目印
            </Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="h-12 border-none bg-muted rounded-2xl px-4"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between ml-1">
              <Label className="text-xs font-bold text-muted-foreground">
                地図でピンを指定
              </Label>
              <button
                type="button"
                onClick={handleCurrentLocation}
                disabled={isLocating}
                className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/80 disabled:opacity-50"
              >
                <LocateFixed size={14} />
                {isLocating ? "取得中…" : "現在地を使う"}
              </button>
            </div>
            {locationError && (
              <p className="text-xs text-destructive ml-1">{locationError}</p>
            )}
            <div className="relative h-64 rounded-3xl overflow-hidden">
              <MapContainer
                center={pinPos ? [pinPos.lat, pinPos.lng] : DEFAULT_CENTER}
                zoom={pinPos ? 15 : 11}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={false}
              >
                <MapInstanceBridge onReady={handleMapReady} />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapClickHandler onMapClick={setPinPos} />
                {pinPos && <Marker position={[pinPos.lat, pinPos.lng]} />}
              </MapContainer>
            </div>
            {pinPos && (
              <p className="text-xs text-muted-foreground ml-1">
                緯度: {pinPos.lat.toFixed(5)} / 経度: {pinPos.lng.toFixed(5)}
              </p>
            )}
          </div>
        </section>

        {/* アクションボタン */}
        <div className="pt-6 pb-12 space-y-4">
          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-16 bg-primary hover:bg-primary/90 text-primary-foreground text-lg font-extrabold rounded-full"
          >
            {submitting ? "保存中…" : "保存する"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 border-destructive/30 text-destructive hover:bg-destructive/10 rounded-full font-bold"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 size={16} className="mr-2" />
            削除する
          </Button>
        </div>
      </form>
    </div>
  );
}
