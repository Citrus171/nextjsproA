import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import SightingModal from "./SightingModal";

const mockCreateSighting = vi.fn();

vi.mock("../api/orvalClient", () => ({
  useApiClient: () => ({
    createSighting: mockCreateSighting,
  }),
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
  });

  it("isOpen=true の時、フォームが表示されること", () => {
    renderModal();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("緯度")).toBeInTheDocument();
    expect(screen.getByLabelText("経度")).toBeInTheDocument();
    expect(screen.getByLabelText("目撃日時")).toBeInTheDocument();
  });

  it("postId が渡された時、postId フィールドが非表示であること", () => {
    renderModal({ postId: "post-1" });
    expect(screen.queryByLabelText("投稿ID")).not.toBeInTheDocument();
  });

  it("必須項目を入力して送信すると、createSighting が正しく呼ばれること", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    renderModal({ postId: "post-1", onSuccess });

    await user.clear(screen.getByLabelText("緯度"));
    await user.type(screen.getByLabelText("緯度"), "35.9");
    await user.clear(screen.getByLabelText("経度"));
    await user.type(screen.getByLabelText("経度"), "139.6");
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

  it("緯度が数値でない時、エラーメッセージが表示されること", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText("緯度"), "abc");
    await user.type(screen.getByLabelText("経度"), "139.6");
    await user.type(screen.getByLabelText("目撃日時"), "2026-04-26T10:00");
    await user.click(screen.getByRole("button", { name: "送信" }));

    expect(
      await screen.findByText("緯度は正しい数値を入力してください")
    ).toBeInTheDocument();
    expect(mockCreateSighting).not.toHaveBeenCalled();
  });

  it("postId なしで送信すると、postId を含まずに createSighting が呼ばれること", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText("緯度"), "35.9");
    await user.type(screen.getByLabelText("経度"), "139.6");
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

    it("pickedLocation が更新された時、lat/lng/address フィールドに反映されること", async () => {
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

      expect(screen.getByLabelText("緯度")).toHaveValue("35.9");
      expect(screen.getByLabelText("経度")).toHaveValue("139.6");
      expect(screen.getByLabelText("住所")).toHaveValue("埼玉県さいたま市");
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
});
