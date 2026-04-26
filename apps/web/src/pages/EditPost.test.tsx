import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { vi } from "vitest";

const mockNavigate = vi.fn();
const mockUpdatePost = vi.fn().mockResolvedValue({});
const mockDeletePost = vi.fn().mockResolvedValue({});
const mockAddImages = vi
  .fn()
  .mockResolvedValue({ images: [], remainingSlots: 2 });
const mockDeleteImage = vi.fn().mockResolvedValue(undefined);

const basePost = {
  id: "post-1",
  userId: "user-1",
  title: "レオを探しています",
  description: "白い猫です",
  postType: "cat",
  status: "lost",
  lostDate: "2026-04-22T00:00:00.000Z",
  createdAt: "2026-04-23T00:00:00.000Z",
  updatedAt: "2026-04-23T00:00:00.000Z",
  authorNickname: "テスト",
  images: [],
  petDetail: {
    id: "pd-1",
    name: "レオ",
    color: "茶トラ",
    age: "3歳",
    features: "右耳にV字カット",
    gender: "male",
    size: null,
    breed: "日本猫",
    collar: null,
    microchip: false,
    neutered: true,
  },
  location: {
    id: "loc-1",
    prefecture: "saitama",
    city: "さいたま市",
    address: "大宮区1-2-3",
    lat: 35.9,
    lng: 139.6,
  },
};

const mockGetPost = vi.fn().mockResolvedValue(basePost);

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
    getPost: mockGetPost,
    updatePost: mockUpdatePost,
    deletePost: mockDeletePost,
    addImages: mockAddImages,
    deleteImage: mockDeleteImage,
  }),
}));

vi.mock("../lib/reverseGeocode", () => ({
  reverseGeocode: vi.fn().mockResolvedValue({ address: "埼玉県さいたま市" }),
}));

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom"
    );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: "post-1" }),
  };
});

import EditPost from "./EditPost";

describe("EditPost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPost.mockResolvedValue(basePost);
    mockUpdatePost.mockResolvedValue({});
    mockDeletePost.mockResolvedValue({});
    mockAddImages.mockResolvedValue({ images: [], remainingSlots: 2 });
  });

  it("投稿データ取得後、petDetail を含むフォームに初期値がセットされること", async () => {
    render(<EditPost />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("レオ")).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue("茶トラ")).toBeInTheDocument();
    expect(screen.getByDisplayValue("3歳")).toBeInTheDocument();
    expect(screen.getByDisplayValue("白い猫です")).toBeInTheDocument();
    expect(screen.getByDisplayValue("さいたま市")).toBeInTheDocument();
    expect(screen.getByDisplayValue("大宮区1-2-3")).toBeInTheDocument();
  });

  it("変更して保存した時、updatePost が petDetail/location を含むデータで呼ばれること", async () => {
    const user = userEvent.setup();
    render(<EditPost />);

    await waitFor(() =>
      expect(screen.getByDisplayValue("白い猫です")).toBeInTheDocument()
    );

    const descInput = screen.getByDisplayValue("白い猫です");
    await user.clear(descInput);
    await user.type(descInput, "更新した説明");

    await user.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(mockUpdatePost).toHaveBeenCalledWith(
        "post-1",
        expect.objectContaining({
          description: "更新した説明",
          petDetail: expect.objectContaining({ name: "レオ" }),
          location: expect.objectContaining({ city: "さいたま市" }),
        })
      );
    });
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("削除ボタンをクリックした時、確認ダイアログが表示されること", async () => {
    const user = userEvent.setup();
    render(<EditPost />);

    await waitFor(() =>
      expect(screen.getByDisplayValue("レオ")).toBeInTheDocument()
    );

    await user.click(screen.getByRole("button", { name: "削除する" }));
    expect(
      screen.getByRole("dialog", { name: "投稿を削除しますか？" })
    ).toBeInTheDocument();
  });

  it("削除ダイアログで「削除を確定する」を押した時、deletePost が呼ばれ / にリダイレクトされること", async () => {
    const user = userEvent.setup();
    render(<EditPost />);

    await waitFor(() =>
      expect(screen.getByDisplayValue("レオ")).toBeInTheDocument()
    );

    await user.click(screen.getByRole("button", { name: "削除する" }));
    await user.click(screen.getByRole("button", { name: "削除を確定する" }));

    await waitFor(() => expect(mockDeletePost).toHaveBeenCalledWith("post-1"));
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("削除ダイアログで「キャンセル」を押した時、deletePost が呼ばれないこと", async () => {
    const user = userEvent.setup();
    render(<EditPost />);

    await waitFor(() =>
      expect(screen.getByDisplayValue("レオ")).toBeInTheDocument()
    );

    await user.click(screen.getByRole("button", { name: "削除する" }));
    await user.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(mockDeletePost).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("dialog", { name: "投稿を削除しますか？" })
    ).not.toBeInTheDocument();
  });

  it("既存画像がサムネイル表示されること", async () => {
    const postWithImages = {
      ...basePost,
      images: [
        {
          id: "img-1",
          postId: "post-1",
          url: "https://example.com/cat.jpg",
          createdAt: "2026-04-23T00:00:00.000Z",
        },
      ],
    };
    mockGetPost.mockResolvedValue(postWithImages);
    render(<EditPost />);

    await waitFor(() => {
      expect(screen.getByAltText("既存画像1")).toBeInTheDocument();
    });
  });

  it("既存画像の個別削除ボタンをクリックした時、deleteImage が imageId で呼ばれること", async () => {
    const user = userEvent.setup();
    const postWithImages = {
      ...basePost,
      images: [
        {
          id: "img-1",
          postId: "post-1",
          url: "https://example.com/cat.jpg",
          createdAt: "2026-04-23T00:00:00.000Z",
        },
      ],
    };
    mockGetPost.mockResolvedValue(postWithImages);
    render(<EditPost />);

    await waitFor(() =>
      expect(screen.getByAltText("既存画像1")).toBeInTheDocument()
    );

    await user.click(screen.getByRole("button", { name: "既存画像1を削除" }));
    expect(mockDeleteImage).toHaveBeenCalledWith("post-1", "img-1");
  });

  it("画像追加アップロードで addImages が呼ばれること", async () => {
    const user = userEvent.setup();
    render(<EditPost />);

    await waitFor(() =>
      expect(screen.getByDisplayValue("レオ")).toBeInTheDocument()
    );

    const file = new File(["dummy"], "cat.jpg", { type: "image/jpeg" });
    const input = screen.getByTestId("image-upload-input");
    await user.upload(input, file);

    expect(mockAddImages).toHaveBeenCalledWith("post-1", [file]);
  });

  it("remainingSlots=0 の時、追加アップロードボタンが非表示になること", async () => {
    mockAddImages.mockResolvedValue({ images: [], remainingSlots: 0 });
    const postWithImages = {
      ...basePost,
      images: Array.from({ length: 3 }, (_, i) => ({
        id: `img-${i}`,
        postId: "post-1",
        url: `https://example.com/cat${i}.jpg`,
        createdAt: "2026-04-23T00:00:00.000Z",
      })),
    };
    mockGetPost.mockResolvedValue(postWithImages);
    render(<EditPost />);

    await waitFor(() =>
      expect(screen.getByAltText("既存画像1")).toBeInTheDocument()
    );

    expect(screen.queryByTestId("image-upload-input")).not.toBeInTheDocument();
  });
});
