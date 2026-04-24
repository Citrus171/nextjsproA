import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PostResponseDto } from "../../../../packages/api-client/src/index";
import PostDetailSheet from "./PostDetailSheet";

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
  return render(
    <PostDetailSheet
      isOpen={true}
      onClose={() => {}}
      post={basePost}
      markerType="post"
      isLoading={false}
      {...props}
    />
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
    expect(screen.getByRole("img", { name: "投稿画像" })).toHaveAttribute(
      "src",
      "https://example.com/cat.jpg"
    );
  });

  it("画像がない時、プレースホルダーが表示されること", () => {
    renderSheet({ post: { ...basePost, images: [] } });
    expect(screen.getByText("画像なし")).toBeInTheDocument();
  });

  it("閉じるボタンを押した時、onClose が呼ばれること", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderSheet({ onClose });
    await user.click(screen.getByRole("button", { name: "閉じる" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
