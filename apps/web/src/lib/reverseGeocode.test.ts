import { describe, it, expect, vi, beforeEach } from "vitest";
import { reverseGeocode } from "./reverseGeocode";

describe("reverseGeocode", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("正常時、Nominatim から住所文字列を返すこと", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        display_name: "埼玉県さいたま市浦和区",
      }),
    } as Response);

    const result = await reverseGeocode(35.9062, 139.6236);
    expect(result).toEqual({ address: "埼玉県さいたま市浦和区" });

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("lat=35.9062"));
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("email="));
  });

  it("HTTP エラー時、geocodeError を返すこと", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    const result = await reverseGeocode(35.9062, 139.6236);
    expect(result).toEqual({
      geocodeError: "住所の自動取得に失敗しました。手動で入力してください",
    });
  });

  it("ネットワークエラー時、geocodeError を返すこと", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("network error"));

    const result = await reverseGeocode(35.9062, 139.6236);
    expect(result).toEqual({
      geocodeError: "住所の自動取得に失敗しました。手動で入力してください",
    });
  });
});
