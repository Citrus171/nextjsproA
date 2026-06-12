import { useRef, useEffect, useCallback } from "react";
import type { PostResponseDto } from "../../../../packages/api-client/src/index";
import {
  useInfiniteQuery,
  useQueryClient,
  useMutation,
} from "@tanstack/react-query";
import { useApiClient } from "../api/orvalClient";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "../components/ui/alert-dialog";
import { toast } from "sonner";
import { MapPinned } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import BottomNav from "../components/BottomNav";
import { QUERY_KEYS } from "../lib/queryKeys";

const PER_PAGE = 5;

export default function Posts() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { userId, nickname } = useAuth();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: QUERY_KEYS.postsInfinite(),
    queryFn: ({ pageParam }: { pageParam: number }) =>
      api.listPosts(pageParam, PER_PAGE, true),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce(
        (sum, page) => sum + (page.items?.length ?? 0),
        0
      );
      if (totalFetched >= (lastPage.total ?? 0)) return undefined;
      return allPages.length + 1;
    },
  });

  const allItems = data?.pages.flatMap((page) => page.items ?? []) ?? [];

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await api.deletePost(id);
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.posts() });
        toast.success("削除しました");
      } catch (e) {
        toast.error("削除に失敗しました");
      }
    },
    [api, queryClient]
  );

  const resolveMutation = useMutation({
    mutationFn: (id: string) => api.updatePost(id, { status: "resolved" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast.success("解決済みにしました");
    },
    onError: () => {
      toast.error("解決済みへの変更に失敗しました");
    },
  });

  useEffect(() => {
    if (!sentinelRef.current) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0 }
    );

    observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div
          data-testid="posts-loading-spinner"
          className="h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-primary"
        />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-screen items-center justify-center text-destructive bg-background">
        エラーが発生しました
      </div>
    );
  }

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("ja-JP");

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-6 pb-24">
        {/* ヘッダー */}
        <div className="mb-6 flex items-center justify-between">
          {nickname && (
            <span className="text-sm font-semibold text-foreground">
              {nickname}様の投稿
            </span>
          )}
        </div>

        {/* カードグリッド */}
        <div className="grid gap-4 md:grid-cols-2">
          {allItems.map((p: PostResponseDto) => (
            <div
              key={p.id}
              className="overflow-hidden rounded-3xl bg-card shadow-sm"
            >
              {/* 画像サムネイル */}
              <div className="relative h-48 w-full bg-muted">
                {p.images && p.images.length > 0 ? (
                  <img
                    src={p.images[0].url}
                    alt={p.petDetail?.name ?? "投稿画像"}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    画像がありません
                  </div>
                )}
              </div>

              {/* カード本文 */}
              <div className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="text-lg font-bold text-foreground">
                    {p.petDetail?.name ?? "名前不明"}
                  </h3>
                  {p.status === "lost" ? (
                    <span className="rounded-full bg-destructive-soft px-2 py-0.5 text-xs font-semibold text-destructive">
                      迷子中
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                      解決済み
                    </span>
                  )}
                </div>
                <p className="mb-2 text-sm text-muted-foreground">
                  {p.location?.city ?? ""}
                  {p.location?.address ? `・${p.location.address}` : ""}
                </p>
                <p className="mb-3 text-xs text-muted-foreground">
                  投稿日: {formatDate(p.createdAt)}
                </p>
                <p className="mb-4 line-clamp-2 text-sm text-foreground">
                  {p.description}
                </p>

                {/* アクションボタン */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {userId === p.userId && (
                      <Link
                        to={`/edit/${p.id}`}
                        className="inline-flex items-center text-sm font-semibold text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none rounded min-h-[44px]"
                      >
                        編集
                      </Link>
                    )}
                    {userId === p.userId && p.status === "lost" && (
                      <button
                        type="button"
                        onClick={() => resolveMutation.mutate(p.id)}
                        disabled={resolveMutation.isPending}
                        className="text-sm font-semibold text-success hover:text-success/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none rounded min-h-[44px]"
                      >
                        解決済みにする
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/?postId=${p.id}`)}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      aria-label={`${p.petDetail?.name ?? "投稿"}の位置を開く`}
                    >
                      <MapPinned size={18} aria-hidden="true" />
                    </button>
                    {userId === p.userId && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            type="button"
                            className="text-sm font-semibold text-destructive hover:text-destructive/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none rounded min-h-[44px]"
                          >
                            削除
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              投稿を削除しますか？
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              この操作は取り消せません。関連する会話と目撃情報も削除されます。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>キャンセル</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => {
                                handleDelete(p.id);
                              }}
                            >
                              削除する
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 状態表示 */}
        {isFetchingNextPage && (
          <div className="mt-6 flex justify-center">
            <div
              data-testid="posts-loading-more-spinner"
              className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary"
            />
          </div>
        )}

        {data && !hasNextPage && allItems.length > 0 && (
          <p
            data-testid="posts-no-more"
            className="mt-6 text-center text-sm text-muted-foreground"
          >
            これ以上ありません
          </p>
        )}

        {!hasNextPage && allItems.length === 0 && (
          <p className="mt-12 text-center text-muted-foreground">
            まだ迷い猫投稿はありません
          </p>
        )}

        {/* IntersectionObserver センチネル */}
        <div ref={sentinelRef} className="h-4" />

        <BottomNav currentPath="/posts" />
      </div>
    </div>
  );
}
