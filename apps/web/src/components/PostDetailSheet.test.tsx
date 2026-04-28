import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";
import type { PostResponseDto } from "../../../../packages/api-client/src/index";
import PostDetailSheet from "./PostDetailSheet";

vi.mock("../api/orvalClient", () => ({
  useApiClient: () => ({
    findSightingsByPost: vi.fn().mockResolvedValue([]),
  }),
}));

const basePost: PostResponseDto = {
  id: "post-1",
  userId: "user-1",
  authorNickname: "テスト投稿者",
  createdAt: "2026-04-23T00:00:00.000Z",
  updatedAt: "2026-04-23T00:00:00.000Z",
  lostDate: "2026-04-22T00:00:00.000Z",
  description: "茶トラのオス猫です",
  status: "lost",
  postType: "cat",
  title: "レオを探しています",
  images: [],
  petDetail: null,
  location: null,
};

const postWithDetail: PostResponseDto = {
  ...basePost,
  images: [
    {
      id: "img-1",
      postId: "post-1",
      url: "https://example.com/cat.jpg",
      createdAt: "2026-04-23T00:00:00.000Z",
    },
  ],
  petDetail: {
    id: "pd-1",
    name: "レオ",
    color: "茶トラ",
    age: "3歳",
    features: "右耳にV字カット",
    gender: "male",
    size: "中型",
    breed: "日本猫",
    collar: "赤い革製",
    microchip: false,
    neutered: true,
  },
  location: {
    id: "loc-1",
    address: "北沢2丁目",
    city: "世田谷区",
    prefecture: "東京都",
    lat: 35.66,
    lng: 139.67,
  },
};

function renderSheet(
  props: Partial<Parameters<typeof PostDetailSheet>[0]> = {}
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <PostDetailSheet
        isOpen={true}
        onClose={() => {}}
        post={basePost}
        markerType="post"
        isLoading={false}
        {...props}
      />
    </QueryClientProvider>
  );
}

describe("PostDetailSheet", () => {
  it("isOpen=true の時、ダイアログが表示されること", () => {
    renderSheet();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("isLoading=true の時、ローディングが表示されること", () => {
    renderSheet({ isLoading: true });
    expect(screen.getByText("読み込み中…")).toBeInTheDocument();
  });

  it("status=lost の時、迷子バッジが表示されること", () => {
    renderSheet({ post: { ...basePost, status: "lost" } });
    expect(screen.getByText("迷子")).toBeInTheDocument();
  });

  it("status=resolved の時、解決済みバッジが表示されること", () => {
    renderSheet({ post: { ...basePost, status: "resolved" } });
    expect(screen.getByText("解決済み")).toBeInTheDocument();
  });

  it("markerType=post の時、迷い猫投稿タイトルが表示されること", () => {
    renderSheet({ markerType: "post" });
    expect(
      screen.getByRole("heading", { name: "迷い猫投稿" })
    ).toBeInTheDocument();
  });

  it("markerType=sighting の時、目撃情報タイトルが表示されること", () => {
    renderSheet({ markerType: "sighting" });
    expect(
      screen.getByRole("heading", { name: "目撃情報" })
    ).toBeInTheDocument();
  });

  it("petDetail がある時、詳細情報が表示されること", () => {
    renderSheet({ post: postWithDetail });
    expect(screen.getByText("右耳にV字カット")).toBeInTheDocument();
    expect(screen.getByText("茶トラ")).toBeInTheDocument();
  });

  it("petDetail が null の時、特徴セクションが表示されないこと", () => {
    renderSheet({ post: { ...basePost, petDetail: null } });
    expect(screen.queryByText("特徴・性格")).not.toBeInTheDocument();
  });

  it("location がある時、住所が表示されること", () => {
    renderSheet({ post: postWithDetail });
    expect(screen.getByText("東京都世田谷区北沢2丁目")).toBeInTheDocument();
  });

  it("location が null の時、場所セクションが表示されないこと", () => {
    renderSheet({ post: { ...basePost, location: null } });
    expect(screen.queryByText("最後に目撃された場所")).not.toBeInTheDocument();
  });

  it("画像がある時、1枚目の画像が表示されること", () => {
    renderSheet({ post: postWithDetail });
    expect(screen.getByRole("img", { name: "投稿画像1" })).toHaveAttribute(
      "src",
      "https://example.com/cat.jpg"
    );
  });

  it("画像がない時、プレースホルダーが表示されること", () => {
    renderSheet({ post: { ...basePost, images: [] } });
    expect(screen.getByText("画像なし")).toBeInTheDocument();
  });

  it("画像が複数枚ある時、すべての画像がカルーセルとして表示されること", () => {
    const postWithMultipleImages: PostResponseDto = {
      ...postWithDetail,
      images: [
        {
          id: "img-1",
          postId: "post-1",
          url: "https://example.com/cat1.jpg",
          createdAt: "2026-04-23T00:00:00.000Z",
        },
        {
          id: "img-2",
          postId: "post-1",
          url: "https://example.com/cat2.jpg",
          createdAt: "2026-04-23T00:00:00.000Z",
        },
        {
          id: "img-3",
          postId: "post-1",
          url: "https://example.com/cat3.jpg",
          createdAt: "2026-04-23T00:00:00.000Z",
        },
      ],
    };
    renderSheet({ post: postWithMultipleImages });
    expect(screen.getByAltText("投稿画像1")).toBeInTheDocument();
    expect(screen.getByAltText("投稿画像2")).toBeInTheDocument();
    expect(screen.getByAltText("投稿画像3")).toBeInTheDocument();
  });

  it("画像が1枚のみの時、ドットインジケーターが表示されないこと", () => {
    renderSheet({ post: postWithDetail });
    const dots = document.querySelectorAll(
      "[class*='w-1.5 h-1.5 rounded-full']"
    );
    expect(dots.length).toBe(0);
  });

  it("画像が複数枚の時、ドットインジケーターが表示されること", () => {
    const postWithTwoImages: PostResponseDto = {
      ...postWithDetail,
      images: [
        {
          id: "img-1",
          postId: "post-1",
          url: "https://example.com/cat1.jpg",
          createdAt: "2026-04-23T00:00:00.000Z",
        },
        {
          id: "img-2",
          postId: "post-1",
          url: "https://example.com/cat2.jpg",
          createdAt: "2026-04-23T00:00:00.000Z",
        },
      ],
    };
    renderSheet({ post: postWithTwoImages });
    const dots = document.querySelectorAll(
      "[class*='w-1.5 h-1.5 rounded-full']"
    );
    expect(dots.length).toBe(2);
  });

  it("閉じるボタンを押した時、onClose が呼ばれること", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderSheet({ onClose });
    await user.click(screen.getByRole("button", { name: "閉じる" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  describe("目撃を報告するボタン", () => {
    it("markerType=post かつ他者のPost の時、ボタンが表示されること", () => {
      renderSheet({
        markerType: "post",
        currentUserId: "user-2",
        post: { ...basePost, userId: "user-1" },
        onReportSighting: vi.fn(),
      });
      expect(
        screen.getByRole("button", { name: "目撃を報告する" })
      ).toBeInTheDocument();
    });

    it("未認証（currentUserId=null）の時、ボタンが表示されること", () => {
      renderSheet({
        markerType: "post",
        currentUserId: null,
        post: { ...basePost, userId: "user-1" },
        onReportSighting: vi.fn(),
      });
      expect(
        screen.getByRole("button", { name: "目撃を報告する" })
      ).toBeInTheDocument();
    });

    it("自分がPost投稿者の時、ボタンが非表示であること", () => {
      renderSheet({
        markerType: "post",
        currentUserId: "user-1",
        post: { ...basePost, userId: "user-1" },
        onReportSighting: vi.fn(),
      });
      expect(
        screen.queryByRole("button", { name: "目撃を報告する" })
      ).not.toBeInTheDocument();
    });

    it("markerType=sighting の時、ボタンが非表示であること", () => {
      renderSheet({
        markerType: "sighting",
        currentUserId: "user-2",
        post: { ...basePost, userId: "user-1" },
        onReportSighting: vi.fn(),
      });
      expect(
        screen.queryByRole("button", { name: "目撃を報告する" })
      ).not.toBeInTheDocument();
    });

    it("ボタンを押した時、onReportSighting が postId で呼ばれること", async () => {
      const user = userEvent.setup();
      const onReportSighting = vi.fn();
      renderSheet({
        markerType: "post",
        currentUserId: "user-2",
        post: { ...basePost, userId: "user-1" },
        onReportSighting,
      });
      await user.click(screen.getByRole("button", { name: "目撃を報告する" }));
      expect(onReportSighting).toHaveBeenCalledWith("post-1");
    });
  });

  describe("メッセージを送るボタン", () => {
    const baseSightingProps = {
      markerType: "sighting" as const,
      sightingId: "sighting-1",
      sightingUserId: "user-2",
    };

    it("投稿者（user-1）が目撃マーカーを見ている時、ボタンが表示されること", () => {
      renderSheet({
        ...baseSightingProps,
        currentUserId: "user-1",
        post: { ...basePost, userId: "user-1" },
      });
      expect(
        screen.getByRole("button", { name: "メッセージを送る" })
      ).toBeInTheDocument();
    });

    it("目撃者（user-2）が自分の目撃マーカーを見ている時、ボタンが表示されること", () => {
      renderSheet({
        ...baseSightingProps,
        currentUserId: "user-2",
        post: { ...basePost, userId: "user-1" },
      });
      expect(
        screen.getByRole("button", { name: "メッセージを送る" })
      ).toBeInTheDocument();
    });

    it("currentUserIdが未指定（未ログイン）の時、ボタンが非表示であること", () => {
      renderSheet({
        ...baseSightingProps,
        currentUserId: undefined,
        post: { ...basePost, userId: "user-1" },
      });
      expect(
        screen.queryByRole("button", { name: "メッセージを送る" })
      ).not.toBeInTheDocument();
    });

    it("投稿者と目撃者が同一人物の時（自分の投稿に自分で目撃）、ボタンが非表示であること", () => {
      renderSheet({
        ...baseSightingProps,
        currentUserId: "user-1",
        sightingUserId: "user-1",
        post: { ...basePost, userId: "user-1" },
      });
      expect(
        screen.queryByRole("button", { name: "メッセージを送る" })
      ).not.toBeInTheDocument();
    });

    it("第三者（投稿者でも目撃者でもない）の時、ボタンが非表示であること", () => {
      renderSheet({
        ...baseSightingProps,
        currentUserId: "user-3",
        post: { ...basePost, userId: "user-1" },
      });
      expect(
        screen.queryByRole("button", { name: "メッセージを送る" })
      ).not.toBeInTheDocument();
    });

    it("markerType=postの時、ボタンが非表示であること", () => {
      renderSheet({
        ...baseSightingProps,
        markerType: "post",
        currentUserId: "user-1",
        post: { ...basePost, userId: "user-1" },
      });
      expect(
        screen.queryByRole("button", { name: "メッセージを送る" })
      ).not.toBeInTheDocument();
    });

    it("ボタンを押した時、onSendMessageが呼ばれること", async () => {
      const user = userEvent.setup();
      const onSendMessage = vi.fn();
      renderSheet({
        ...baseSightingProps,
        currentUserId: "user-1",
        post: { ...basePost, userId: "user-1" },
        onSendMessage,
      });
      await user.click(
        screen.getByRole("button", { name: "メッセージを送る" })
      );
      expect(onSendMessage).toHaveBeenCalledWith("post-1", "sighting-1");
    });
  });

  describe("編集ボタン", () => {
    it("markerType=post かつ自分の投稿の時、編集ボタンが表示されること", () => {
      const onEdit = vi.fn();
      renderSheet({
        markerType: "post",
        currentUserId: "user-1",
        post: { ...basePost, userId: "user-1" },
        onEdit,
      });
      expect(
        screen.getByRole("button", { name: "編集する" })
      ).toBeInTheDocument();
    });

    it("他人の投稿の時、編集ボタンが非表示であること", () => {
      renderSheet({
        markerType: "post",
        currentUserId: "user-2",
        post: { ...basePost, userId: "user-1" },
      });
      expect(
        screen.queryByRole("button", { name: "編集する" })
      ).not.toBeInTheDocument();
    });

    it("編集ボタンをクリックした時、onEdit が postId で呼ばれること", async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();
      renderSheet({
        markerType: "post",
        currentUserId: "user-1",
        post: { ...basePost, userId: "user-1" },
        onEdit,
      });
      await user.click(screen.getByRole("button", { name: "編集する" }));
      expect(onEdit).toHaveBeenCalledWith("post-1");
    });
  });
});
