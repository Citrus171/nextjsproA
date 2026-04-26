const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";

type ReverseGeocodeResult = { address: string } | { geocodeError: string };

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult> {
  const url = `${NOMINATIM_URL}?lat=${lat}&lon=${lng}&format=json`;
  try {
    const res = await fetch(url, {
      headers: { Referer: window.location.origin },
    });
    if (!res.ok) {
      return {
        geocodeError: "住所の自動取得に失敗しました。手動で入力してください",
      };
    }
    const data = (await res.json()) as { display_name?: string };
    return { address: data.display_name ?? "" };
  } catch {
    return {
      geocodeError: "住所の自動取得に失敗しました。手動で入力してください",
    };
  }
}
