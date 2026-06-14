import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SightingModal from "./SightingModal";

const mockCreateSighting = vi.fn();
const mockGetCurrentPosition = vi.fn();
const { mockReverseGeocode } = vi.hoisted(() => ({
  mockReverseGeocode:
    vi.fn<
      (
        lat: number,
        lng: number
      ) => Promise<{ address?: string; geocodeError?: string }>
    >(),
}));

vi.mock("../api/orvalClient", () => ({
  useApiClient: () => ({
    createSighting: mockCreateSighting,
  }),
}));

vi.mock("../lib/reverseGeocode", () => ({
  reverseGeocode: mockReverseGeocode,
}));

function renderModal(props: Partial<Parameters<typeof SightingModal>[0]> = {}) {
  return render(
    <SightingModal
      isOpen={true}
      onClose={() => {}}
      onSuccess={() => {}}
      {...props}
    />
  );
}

describe("SightingModal", () => {
  beforeEach(() => {
    mockCreateSighting.mockReset();
    mockCreateSighting.mockResolvedValue(undefined);
    mockReverseGeocode.mockReset();
    mockReverseGeocode.mockResolvedValue({ address: "埼玉県さいたま市" });
    mockGetCurrentPosition.mockReset();
    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: mockGetCurrentPosition },
    });
  });

  it("isOpen=true の時、フォームが表示されること", () => {
    renderModal();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "地図から選択" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "現在地を使う" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("目撃日時")).toBeInTheDocument();
  });

  it("postId が渡された時、postId フィールドが非表示であること", () => {
    renderModal({ postId: "post-1" });
    expect(screen.queryByLabelText("投稿ID")).not.toBeInTheDocument();
  });

  it("必須項目を入力して送信すると、createSighting が正しく呼ばれること", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    renderModal({
      postId: "post-1",
      onSuccess,
      pickedLocation: { lat: 35.9, lng: 139.6, address: "埼玉県さいたま市" },
    });

    await user.type(screen.getByLabelText("目撃日時"), "2026-04-26T10:00");
    await user.click(screen.getByRole("button", { name: "送信" }));

    await waitFor(() => {
      expect(mockCreateSighting).toHaveBeenCalledWith(
        expect.objectContaining({
          lat: 35.9,
          lng: 139.6,
          postId: "post-1",
          sightedAt: expect.stringContaining("2026-04-26"),
        })
      );
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("必須項目未入力で送信しても、createSighting が呼ばれないこと", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole("button", { name: "送信" }));

    expect(mockCreateSighting).not.toHaveBeenCalled();
  });

  it("位置情報未指定で送信すると「位置情報を指定してください」エラーが表示されること", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText("目撃日時"), "2026-04-26T10:00");
    await user.click(screen.getByRole("button", { name: "送信" }));

    expect(
      await screen.findByText("位置情報を指定してください")
    ).toBeInTheDocument();
    expect(mockCreateSighting).not.toHaveBeenCalled();
  });

  it("postId なしで送信すると、postId を含まずに createSighting が呼ばれること", async () => {
    const user = userEvent.setup();
    renderModal({
      pickedLocation: { lat: 35.9, lng: 139.6 },
    });

    await user.type(screen.getByLabelText("目撃日時"), "2026-04-26T10:00");
    await user.click(screen.getByRole("button", { name: "送信" }));

    await waitFor(() => {
      expect(mockCreateSighting).toHaveBeenCalledWith(
        expect.not.objectContaining({ postId: expect.anything() })
      );
    });
  });

  it("閉じるボタンを押した時、onClose が呼ばれること", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModal({ onClose });

    await user.click(screen.getByRole("button", { name: "閉じる" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  describe("地図から選択", () => {
    it("「地図から選択」ボタンが表示されること（postId あり・なし両方）", () => {
      const { rerender } = renderModal();
      expect(
        screen.getByRole("button", { name: "地図から選択" })
      ).toBeInTheDocument();

      rerender(
        <SightingModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          postId="post-1"
        />
      );
      expect(
        screen.getByRole("button", { name: "地図から選択" })
      ).toBeInTheDocument();
    });

    it("「地図から選択」クリックで onSelectFromMap が呼ばれること", async () => {
      const user = userEvent.setup();
      const onSelectFromMap = vi.fn();
      renderModal({ onSelectFromMap });

      await user.click(screen.getByRole("button", { name: "地図から選択" }));
      expect(onSelectFromMap).toHaveBeenCalledTimes(1);
    });

    it("pickedLocation が更新された時、選択位置の表示が更新されること", async () => {
      const { rerender } = renderModal();

      rerender(
        <SightingModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          pickedLocation={{
            lat: 35.9,
            lng: 139.6,
            address: "埼玉県さいたま市",
          }}
        />
      );

      expect(await screen.findByText("埼玉県さいたま市")).toBeInTheDocument();
    });

    it("pickedLocation に geocodeError がある時、エラーメッセージが表示されること", async () => {
      const { rerender } = renderModal();

      rerender(
        <SightingModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          pickedLocation={{
            lat: 35.9,
            lng: 139.6,
            geocodeError:
              "住所の自動取得に失敗しました。手動で入力してください",
          }}
        />
      );

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "住所の自動取得に失敗しました。手動で入力してください"
      );
    });

    it("forceMount 時、isOpen=false になった後も isOpen=true に戻るとコメント等フォーム値が保持されること", async () => {
      const user = userEvent.setup();
      const { rerender } = renderModal({ forceMount: true });

      await user.type(screen.getByLabelText("コメント"), "テストコメント");

      rerender(
        <SightingModal
          isOpen={false}
          forceMount={true}
          onClose={() => {}}
          onSuccess={() => {}}
        />
      );
      rerender(
        <SightingModal
          isOpen={true}
          forceMount={true}
          onClose={() => {}}
          onSuccess={() => {}}
        />
      );

      expect(screen.getByLabelText("コメント")).toHaveValue("テストコメント");
    });
  });

  describe("現在地を使う", () => {
    it("「現在地を使う」クリックで geolocation が呼ばれ、位置が表示されること", async () => {
      const user = userEvent.setup();
      mockGetCurrentPosition.mockImplementation((success: PositionCallback) => {
        success({
          coords: {
            latitude: 35.92,
            longitude: 139.62,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
            toJSON: () => ({}),
          },
          timestamp: Date.now(),
          toJSON: () => ({}),
        });
      });

      renderModal();
      await user.click(screen.getByRole("button", { name: "現在地を使う" }));

      expect(await screen.findByText("埼玉県さいたま市")).toBeInTheDocument();
      expect(mockReverseGeocode).toHaveBeenCalledWith(35.92, 139.62);
    });

    it("geolocation 失敗時、エラーメッセージが表示されること", async () => {
      const user = userEvent.setup();
      mockGetCurrentPosition.mockImplementation(
        (_: unknown, error: PositionErrorCallback) => {
          error({
            code: 1,
            message: "denied",
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          });
        }
      );

      renderModal();
      await user.click(screen.getByRole("button", { name: "現在地を使う" }));

      expect(
        await screen.findByText("現在地の取得に失敗しました")
      ).toBeInTheDocument();
    });
  });
});
