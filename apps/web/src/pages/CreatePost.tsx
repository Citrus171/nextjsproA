import React, { useEffect, useRef, useState } from "react";
import type { CheckedState } from "@radix-ui/react-checkbox";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useApiClient } from "../api/orvalClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import {
  Camera,
  MapPin,
  Plus,
  Cat,
  Calendar,
  ChevronLeft,
  Upload,
} from "lucide-react";

// Leaflet デフォルトアイコン修正
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

interface FormErrors {
  name?: string;
  color?: string;
  age?: string;
  features?: string;
  description?: string;
  lostDate?: string;
  city?: string;
  address?: string;
  latLng?: string;
}

export default function CreatePost() {
  const api = useApiClient();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // PetDetail
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

  // Post
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [lostDate, setLostDate] = useState("");

  // Location
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [pinPos, setPinPos] = useState<LatLng | null>(null);

  // Images
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  // UI
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview));
    };
  }, [previews]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const remaining = MAX_IMAGES - images.length;
    const toAdd = files.slice(0, remaining);
    setImages((prev) => [...prev, ...toAdd]);
    const newPreviews = toAdd.map((f) => URL.createObjectURL(f));
    setPreviews((prev) => [...prev, ...newPreviews]);
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = (): boolean => {
    const errs: FormErrors = {};
    if (!name.trim()) errs.name = "お名前を入力してください";
    if (!color.trim()) errs.color = "毛色を入力してください";
    if (!age.trim()) errs.age = "年齢を入力してください";
    if (!features.trim()) errs.features = "特徴を入力してください";
    if (!description.trim()) errs.description = "説明を入力してください";
    if (!lostDate) errs.lostDate = "いなくなった日時を入力してください";
    if (!city.trim()) errs.city = "市区町村を入力してください";
    if (!address.trim()) errs.address = "住所・目印を入力してください";
    if (!pinPos) errs.latLng = "地図でピンを指定してください";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const normalizedLostDate = new Date(lostDate).toISOString();

    setSubmitting(true);
    try {
      await api.createPost({
        title: title.trim() || undefined,
        description: description.trim(),
        lostDate: normalizedLostDate,
        postType: "cat",
        petDetail: JSON.stringify({
          name: name.trim(),
          color: color.trim(),
          age: age.trim(),
          features: features.trim(),
          gender,
          breed: breed.trim() || undefined,
          microchip,
          neutered,
        }),
        location: JSON.stringify({
          prefecture: "saitama",
          city: city.trim(),
          address: address.trim(),
          lat: pinPos!.lat,
          lng: pinPos!.lng,
        }),
        images: images.length > 0 ? images : undefined,
      });
      navigate("/posts");
    } catch {
      alert("投稿に失敗しました。もう一度お試しください。");
    } finally {
      setSubmitting(false);
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
        <h1 className="text-3xl font-black tracking-tight text-slate-900">
          迷子猫の情報を登録
        </h1>
      </div>

      <form onSubmit={submit} className="space-y-12">
        {/* 1. お写真 */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Camera className="text-blue-600" size={20} />
            <h2 className="text-lg font-black text-slate-800">
              お写真（最大{MAX_IMAGES}枚）
            </h2>
          </div>
          <Card className="border-none bg-slate-50 rounded-[2rem] overflow-hidden">
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-3">
                {previews.map((src, i) => (
                  <div key={i} className="relative aspect-square">
                    <img
                      src={src}
                      alt={`プレビュー${i + 1}`}
                      className="w-full h-full object-cover rounded-2xl"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      aria-label={`画像${i + 1}を削除`}
                      className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {images.length < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 bg-white flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors"
                  >
                    <Upload size={24} className="text-slate-400 mb-1" />
                    <span className="text-[10px] font-bold text-slate-400">
                      追加
                    </span>
                  </button>
                )}
                {Array.from({
                  length: Math.max(0, MAX_IMAGES - images.length - 1),
                }).map((_, i) => (
                  <div
                    key={`placeholder-${i}`}
                    className="aspect-square rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300"
                  >
                    <Plus size={20} />
                  </div>
                ))}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                className="hidden"
                onChange={handleImageSelect}
              />
              <p className="mt-4 text-[10px] font-medium text-slate-400 text-center">
                ※全身、顔、特徴的な模様がわかる写真を推奨します。
              </p>
            </CardContent>
          </Card>
        </section>

        {/* 2. ねこちゃんの情報 */}
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <Cat className="text-blue-600" size={20} />
            <h2 className="text-lg font-black text-slate-800">
              ねこちゃんの情報
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 ml-1">
                お名前 <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="例：レオ"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 border-none bg-slate-50 rounded-2xl px-4 focus-visible:ring-2 focus-visible:ring-blue-500"
              />
              {errors.name && (
                <p className="text-xs text-red-500 ml-1">{errors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 ml-1">
                種類
              </Label>
              <Input
                placeholder="例：日本猫、スコティッシュ等"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                className="h-12 border-none bg-slate-50 rounded-2xl px-4 focus-visible:ring-2 focus-visible:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs font-bold text-slate-500 ml-1">
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
                  className="flex items-center space-x-2 bg-slate-50 px-4 py-2 rounded-full"
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
              <Label className="text-xs font-bold text-slate-500 ml-1">
                年齢（推定可）<span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="例：推定2歳"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="h-12 border-none bg-slate-50 rounded-2xl px-4 focus-visible:ring-2 focus-visible:ring-blue-500"
              />
              {errors.age && (
                <p className="text-xs text-red-500 ml-1">{errors.age}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 ml-1">
                毛色 <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="例：茶トラ、白黒ハチワレ"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-12 border-none bg-slate-50 rounded-2xl px-4 focus-visible:ring-2 focus-visible:ring-blue-500"
              />
              {errors.color && (
                <p className="text-xs text-red-500 ml-1">{errors.color}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 ml-1">
              特徴（しっぽの形、鳴き声、性格など）
              <span className="text-red-500">*</span>
            </Label>
            <Textarea
              placeholder="例：かぎしっぽです。少し人見知りですが、おやつを見せると寄ってきます。"
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              className="min-h-[100px] border-none bg-slate-50 rounded-2xl p-4 focus-visible:ring-2 focus-visible:ring-blue-500 resize-none"
            />
            {errors.features && (
              <p className="text-xs text-red-500 ml-1">{errors.features}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 ml-1">
              詳しい説明 <span className="text-red-500">*</span>
            </Label>
            <Textarea
              placeholder="例：首輪なし。人懐こい性格で、名前を呼ぶと振り向きます。"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px] border-none bg-slate-50 rounded-2xl p-4 focus-visible:ring-2 focus-visible:ring-blue-500 resize-none"
            />
            {errors.description && (
              <p className="text-xs text-red-500 ml-1">{errors.description}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="flex items-center space-x-3 bg-slate-50 p-4 rounded-2xl">
              <Checkbox
                id="microchip"
                checked={microchip}
                onCheckedChange={(v: CheckedState) => setMicrochip(v === true)}
              />
              <Label htmlFor="microchip" className="text-sm font-bold">
                マイクロチップあり
              </Label>
            </div>
            <div className="flex items-center space-x-3 bg-slate-50 p-4 rounded-2xl">
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

        {/* 3. いつ・どこで？ */}
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <MapPin className="text-blue-600" size={20} />
            <h2 className="text-lg font-black text-slate-800">
              いつ・どこで？
            </h2>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 ml-1">
              いなくなった日時 <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Calendar
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <Input
                type="datetime-local"
                value={lostDate}
                onChange={(e) => setLostDate(e.target.value)}
                className="h-12 border-none bg-slate-50 rounded-2xl pl-12 focus-visible:ring-2 focus-visible:ring-blue-500"
              />
            </div>
            {errors.lostDate && (
              <p className="text-xs text-red-500 ml-1">{errors.lostDate}</p>
            )}
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 ml-1">
                  都道府県
                </Label>
                <Select defaultValue="saitama" disabled>
                  <SelectTrigger className="h-12 border-none bg-slate-50 rounded-2xl px-4">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="saitama">埼玉県</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 ml-1">
                  市区町村 <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="例：さいたま市"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="h-12 border-none bg-slate-50 rounded-2xl px-4 focus-visible:ring-2 focus-visible:ring-blue-500"
                />
                {errors.city && (
                  <p className="text-xs text-red-500 ml-1">{errors.city}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 ml-1">
                それ以降の住所・目印 <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="例：〇〇1-2-3 〇〇公園付近"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="h-12 border-none bg-slate-50 rounded-2xl px-4 focus-visible:ring-2 focus-visible:ring-blue-500"
              />
              {errors.address && (
                <p className="text-xs text-red-500 ml-1">{errors.address}</p>
              )}
            </div>
          </div>

          {/* Leaflet 地図 */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 ml-1">
              地図でピンを指定 <span className="text-red-500">*</span>
            </Label>
            <div className="relative h-64 rounded-[2rem] overflow-hidden">
              <MapContainer
                center={DEFAULT_CENTER}
                zoom={11}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapClickHandler onMapClick={setPinPos} />
                {pinPos && <Marker position={[pinPos.lat, pinPos.lng]} />}
              </MapContainer>
              {!pinPos && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                    <MapPin
                      size={16}
                      className="text-red-500"
                      fill="currentColor"
                    />
                    <span className="text-xs font-bold text-slate-700">
                      地図をタップしてピンを移動
                    </span>
                  </div>
                </div>
              )}
            </div>
            {pinPos && (
              <p className="text-xs text-slate-400 ml-1">
                緯度: {pinPos.lat.toFixed(5)} / 経度: {pinPos.lng.toFixed(5)}
              </p>
            )}
            {errors.latLng && (
              <p className="text-xs text-red-500 ml-1">{errors.latLng}</p>
            )}
          </div>

          {/* タイトル（任意） */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 ml-1">
              投稿タイトル（任意・最大100文字）
            </Label>
            <Input
              placeholder="例：白猫のミケを探しています"
              value={title}
              maxLength={100}
              onChange={(e) => setTitle(e.target.value)}
              className="h-12 border-none bg-slate-50 rounded-2xl px-4 focus-visible:ring-2 focus-visible:ring-blue-500"
            />
          </div>
        </section>

        {/* 送信ボタン */}
        <div className="pt-6 pb-12">
          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white text-lg font-black rounded-full shadow-2xl shadow-blue-500/20 active:scale-[0.98] transition-all"
          >
            {submitting ? "送信中…" : "この内容で報告する"}
          </Button>
          <p className="mt-4 text-center text-[10px] font-medium text-slate-400">
            ボタンを押すと近隣のボランティアと「ねこさがし」ユーザーに通知が届きます。情報は公開されます。
          </p>
        </div>
      </form>
    </div>
  );
}
