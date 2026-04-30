import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";
import SightingList from "./SightingList";
import type { SightingResponseDto } from "../../../../packages/api-client/src/index";

const mockFindSightingsByPost = vi.fn();
const mockDeleteSighting = vi.fn();

vi.mock("../api/orvalClient", () => ({
  useApiClient: () => ({
    findSightingsByPost: mockFindSightingsByPost,
    deleteSighting: mockDeleteSighting,
  }),
}));

const sighting1: SightingResponseDto = {
  id: "s-1",
  userId: "user-1",
  lat: 35.9,
  lng: 139.6,
  address: "埼玉県さいたま市浦和区",
  sightedAt: "2026-04-20T10:00:00.000Z",
  comment: "公園で目撃しました",
  createdAt: "2026-04-20T11:00:00.000Z",
};

const sighting2: SightingResponseDto = {
  id: "s-2",
  userId: "user-2",
  lat: 35.9,
  lng: 139.6,
  address: "埼玉県川口市",
  sightedAt: "2026-04-21T12:00:00.000Z",
  comment: null,
  createdAt: "2026-04-21T13:00:00.000Z",
};

const sighting3: SightingResponseDto = {
  id: "s-3",
  userId: "user-1",
  lat: 35.9,
  lng: 139.6,
  address: "埼玉県熊谷市",
  sightedAt: "2026-04-22T09:00:00.000Z",
  comment: null,
  createdAt: "2026-04-22T10:00:00.000Z",
};

function renderSightingList(
  props: Partial<Parameters<typeof SightingList>[0]> = {}
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SightingList
        postId="post-1"
        currentUserId={null}
        onSightingDeleted={() => {}}
        {...props}
      />
    </QueryClientProvider>
  );
}

describe("SightingList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ローディング中は読み込み中テキストが表示されること", () => {
    mockFindSightingsByPost.mockReturnValue(new Promise(() => {}));
    renderSightingList();
    expect(screen.getByText("読み込み中…")).toBeInTheDocument();
  });

  it("Sightingが0件の時、空状態メッセージが表示されること", async () => {
    mockFindSightingsByPost.mockResolvedValue([]);
    renderSightingList();
    await waitFor(() =>
      expect(screen.getByText("まだ目撃情報はありません")).toBeInTheDocument()
    );
  });

  it("Sighting一覧にsightedAt・address・commentが表示されること", async () => {
    mockFindSightingsByPost.mockResolvedValue([sighting1]);
    renderSightingList();
    await waitFor(() =>
      expect(screen.getByText("埼玉県さいたま市浦和区")).toBeInTheDocument()
    );
    expect(screen.getByText("公園で目撃しました")).toBeInTheDocument();
  });

  it("自分のSightingにのみ削除ボタンが表示されること", async () => {
    mockFindSightingsByPost.mockResolvedValue([sighting1, sighting2]);
    renderSightingList({ currentUserId: "user-1" });
    await waitFor(() =>
      expect(screen.getByText("埼玉県さいたま市浦和区")).toBeInTheDocument()
    );
    const deleteButtons = screen.getAllByRole("button", { name: "削除" });
    expect(deleteButtons).toHaveLength(1);
  });

  it("他人のSightingには削除ボタンが表示されないこと", async () => {
    mockFindSightingsByPost.mockResolvedValue([sighting2]);
    renderSightingList({ currentUserId: "user-1" });
    await waitFor(() =>
      expect(screen.getByText("埼玉県川口市")).toBeInTheDocument()
    );
    expect(
      screen.queryByRole("button", { name: "削除" })
    ).not.toBeInTheDocument();
  });

  it("削除ボタン押下でAlertDialogが表示されること", async () => {
    const user = userEvent.setup();
    mockFindSightingsByPost.mockResolvedValue([sighting1]);
    renderSightingList({ currentUserId: "user-1" });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "削除" })).toBeInTheDocument()
    );
    await user.click(screen.getByRole("button", { name: "削除" }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("AlertDialog確認でdeleteSightingが呼ばれること", async () => {
    const user = userEvent.setup();
    mockFindSightingsByPost.mockResolvedValue([sighting1]);
    mockDeleteSighting.mockResolvedValue(undefined);
    renderSightingList({ currentUserId: "user-1" });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "削除" })).toBeInTheDocument()
    );
    await user.click(screen.getByRole("button", { name: "削除" }));
    await user.click(screen.getByRole("button", { name: "削除する" }));
    await waitFor(() => expect(mockDeleteSighting).toHaveBeenCalledWith("s-1"));
  });

  it("削除成功後にonSightingDeletedコールバックが呼ばれること", async () => {
    const user = userEvent.setup();
    const onSightingDeleted = vi.fn();
    mockFindSightingsByPost.mockResolvedValue([sighting1]);
    mockDeleteSighting.mockResolvedValue(undefined);
    renderSightingList({ currentUserId: "user-1", onSightingDeleted });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "削除" })).toBeInTheDocument()
    );
    await user.click(screen.getByRole("button", { name: "削除" }));
    await user.click(screen.getByRole("button", { name: "削除する" }));
    await waitFor(() => expect(onSightingDeleted).toHaveBeenCalledTimes(1));
  });

  it("削除処理中は確認ダイアログの削除ボタンが無効化されること", async () => {
    const user = userEvent.setup();
    mockFindSightingsByPost.mockResolvedValue([sighting1, sighting3]);
    mockDeleteSighting.mockReturnValue(new Promise(() => {}));
    renderSightingList({ currentUserId: "user-1" });
    const deleteButtons = await screen.findAllByRole("button", {
      name: "削除",
    });
    expect(deleteButtons).toHaveLength(2);
    await user.click(deleteButtons[0]);
    await user.click(screen.getByRole("button", { name: "削除する" }));
    await user.click(deleteButtons[1]);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "削除する" })).toBeDisabled()
    );
  });

  it("削除APIが失敗した時、エラーメッセージが表示されること", async () => {
    const user = userEvent.setup();
    mockFindSightingsByPost.mockResolvedValue([sighting1]);
    mockDeleteSighting.mockRejectedValue(new Error("サーバーエラー"));
    renderSightingList({ currentUserId: "user-1" });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "削除" })).toBeInTheDocument()
    );
    await user.click(screen.getByRole("button", { name: "削除" }));
    await user.click(screen.getByRole("button", { name: "削除する" }));
    await waitFor(() =>
      expect(screen.getByText("削除に失敗しました")).toBeInTheDocument()
    );
  });
});
