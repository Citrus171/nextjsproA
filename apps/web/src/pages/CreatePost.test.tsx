import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { vi } from "vitest";

const mockNavigate = vi.fn();
const mockCreatePost = vi.fn().mockResolvedValue({});
const mockToastError = vi.fn();
let mapClickHandler:
  | ((e: { latlng: { lat: number; lng: number } }) => void)
  | null = null;

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: ReactNode }) => (
    <button
      type="button"
      data-testid="mock-map"
      onClick={() => mapClickHandler?.({ latlng: { lat: 35.91, lng: 139.62 } })}
    >
      {children}
    </button>
  ),
  TileLayer: () => null,
  Marker: () => null,
  useMap: () => ({ flyTo: vi.fn() }),
  useMapEvents: (events: {
    click?: (e: { latlng: { lat: number; lng: number } }) => void;
  }) => {
    mapClickHandler = events.click ?? null;
    return null;
  },
}));

vi.mock("../api/orvalClient", () => ({
  useApiClient: () => ({
    createPost: mockCreatePost,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom"
    );

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import CreatePost from "./CreatePost";

describe("CreatePost", () => {
  beforeEach(() => {
    mapClickHandler = null;
    mockCreatePost.mockClear();
    mockNavigate.mockClear();
    mockToastError.mockClear();
  });

  it("必須項目を入力して送信した時、cat投稿として作成して一覧へ遷移すること", async () => {
    const user = userEvent.setup();
    render(<CreatePost />);

    await user.type(screen.getByPlaceholderText("例：レオ"), "ミケ");
    await user.type(screen.getByPlaceholderText("例：推定2歳"), "2歳");
    await user.type(
      screen.getByPlaceholderText("例：茶トラ、白黒ハチワレ"),
      "白黒"
    );
    await user.type(
      screen.getByPlaceholderText(
        "例：かぎしっぽです。少し人見知りですが、おやつを見せると寄ってきます。"
      ),
      "かぎしっぽ"
    );
    await user.type(
      screen.getByPlaceholderText(
        "例：首輪なし。人懐こい性格で、名前を呼ぶと振り向きます。"
      ),
      "首輪なし"
    );
    const lostDateInput = document.querySelector(
      'input[type="datetime-local"]'
    ) as HTMLInputElement | null;
    expect(lostDateInput).not.toBeNull();
    await user.type(lostDateInput!, "2026-04-21T12:30");
    await user.type(
      screen.getByPlaceholderText("例：さいたま市"),
      "さいたま市"
    );
    await user.type(
      screen.getByPlaceholderText("例：〇〇1-2-3 〇〇公園付近"),
      "中央区1-2-3"
    );

    await user.click(screen.getByTestId("mock-map"));
    await user.type(
      screen.getByPlaceholderText("例：白猫のミケを探しています"),
      "迷い猫の投稿"
    );
    await user.click(
      screen.getByRole("button", { name: "この内容で報告する" })
    );

    await waitFor(() => {
      expect(mockCreatePost).toHaveBeenCalledTimes(1);
    });

    const payload = mockCreatePost.mock.calls[0][0] as {
      title: string;
      description: string;
      lostDate: string;
      postType: string;
      petDetail: string;
      location: string;
    };

    expect(payload.title).toBe("迷い猫の投稿");
    expect(payload.description).toBe("首輪なし");
    expect(payload.postType).toBe("cat");
    expect(payload.lostDate).toBe(new Date("2026-04-21T12:30").toISOString());

    const petDetail = JSON.parse(payload.petDetail) as {
      name: string;
      color: string;
      age: string;
      features: string;
    };
    expect(petDetail.name).toBe("ミケ");
    expect(petDetail.color).toBe("白黒");
    expect(petDetail.age).toBe("2歳");
    expect(petDetail.features).toBe("かぎしっぽ");

    const location = JSON.parse(payload.location) as {
      prefecture: string;
      city: string;
      address: string;
      lat: number;
      lng: number;
    };
    expect(location.prefecture).toBe("saitama");
    expect(location.city).toBe("さいたま市");
    expect(location.address).toBe("中央区1-2-3");
    expect(location.lat).toBe(35.91);
    expect(location.lng).toBe(139.62);

    expect(mockNavigate).toHaveBeenCalledWith("/posts");
  });

  it("投稿APIが失敗した時、エラートーストを表示して遷移しないこと", async () => {
    mockCreatePost.mockRejectedValueOnce(new Error("failed"));
    const user = userEvent.setup();
    render(<CreatePost />);

    await user.type(screen.getByPlaceholderText("例：レオ"), "ミケ");
    await user.type(screen.getByPlaceholderText("例：推定2歳"), "2歳");
    await user.type(
      screen.getByPlaceholderText("例：茶トラ、白黒ハチワレ"),
      "白黒"
    );
    await user.type(
      screen.getByPlaceholderText(
        "例：かぎしっぽです。少し人見知りですが、おやつを見せると寄ってきます。"
      ),
      "かぎしっぽ"
    );
    await user.type(
      screen.getByPlaceholderText(
        "例：首輪なし。人懐こい性格で、名前を呼ぶと振り向きます。"
      ),
      "首輪なし"
    );
    const lostDateInput = document.querySelector(
      'input[type="datetime-local"]'
    ) as HTMLInputElement | null;
    expect(lostDateInput).not.toBeNull();
    await user.type(lostDateInput!, "2026-04-21T12:30");
    await user.type(
      screen.getByPlaceholderText("例：さいたま市"),
      "さいたま市"
    );
    await user.type(
      screen.getByPlaceholderText("例：〇〇1-2-3 〇〇公園付近"),
      "中央区1-2-3"
    );
    await user.click(screen.getByTestId("mock-map"));
    await user.type(
      screen.getByPlaceholderText("例：白猫のミケを探しています"),
      "迷い猫の投稿"
    );
    await user.click(
      screen.getByRole("button", { name: "この内容で報告する" })
    );

    await waitFor(() => {
      expect(mockCreatePost).toHaveBeenCalledTimes(1);
    });
    expect(mockToastError).toHaveBeenCalledWith(
      "投稿に失敗しました。もう一度お試しください。"
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
