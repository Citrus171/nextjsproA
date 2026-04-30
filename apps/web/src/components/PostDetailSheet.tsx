import type {
  PostResponseDto,
  SightingResponseDto,
} from "../../../../packages/api-client/src/index";
import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetTitle } from "./ui/sheet";
import SightingList from "./SightingList";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PREFECTURE_LABELS } from "../lib/constants";
import { useApiClient } from "../api/orvalClient";

interface PostDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  post: PostResponseDto | null;
  markerType: "post" | "sighting";
  isLoading: boolean;
  currentUserId?: string | null;
  sightingId?: string | null;
  sightingUserId?: string | null;
  onSendMessage?: (postId: string, sightingId: string) => void;
  onReportSighting?: (postId: string) => void;
  onSightingDeleted?: () => void;
  onEdit?: (postId: string) => void;
}

const STATUS_LABEL: Record<string, string> = {
  lost: "迷子",
  resolved: "解決済み",
};

const STATUS_COLOR: Record<string, string> = {
  lost: "bg-destructive text-destructive-foreground",
  resolved: "bg-muted-foreground text-primary-foreground",
};

export default function PostDetailSheet({
  isOpen,
  onClose,
  post,
  markerType,
  isLoading,
  currentUserId,
  sightingId,
  sightingUserId,
  onSendMessage,
  onReportSighting,
  onSightingDeleted,
  onEdit,
}: PostDetailSheetProps) {
  const api = useApiClient();
  const title =
    markerType === "post" ? post?.title || "迷い猫投稿" : "目撃情報";

  const { data: sightingDetail } = useQuery({
    queryKey: ["sighting", sightingId],
    queryFn: () => api.getSighting(sightingId!),
    enabled: markerType === "sighting" && !!sightingId,
  });

  const showMessageButton =
    markerType === "sighting" &&
    !!currentUserId &&
    !!sightingUserId &&
    (currentUserId === post?.userId || currentUserId === sightingUserId) &&
    post?.userId !== sightingUserId;

  const showReportSightingButton =
    markerType === "post" && !!post && currentUserId !== post.userId;

  const showEditButton =
    markerType === "post" &&
    !!post &&
    !!currentUserId &&
    currentUserId === post.userId;

  const [activeIdx, setActiveIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const idx = Math.round(
      scrollRef.current.scrollLeft / scrollRef.current.offsetWidth
    );
    setActiveIdx(idx);
  };

  const scrollToImage = (idx: number) => {
    if (!scrollRef.current || !post?.images.length) return;
    scrollRef.current.scrollTo({
      left: idx * scrollRef.current.offsetWidth,
      behavior: "smooth",
    });
    setActiveIdx(idx);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="h-[90dvh] p-0 overflow-hidden"
        aria-label={title}
      >
        <div className="w-12 h-1.5 bg-border rounded-full mx-auto mt-3" />

        <div className="h-full overflow-y-auto px-6 pb-[calc(2rem+env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between mt-4 mb-2">
            <SheetTitle asChild>
              <h2 className="text-xl font-extrabold text-foreground">
                {title}
              </h2>
            </SheetTitle>
            <button
              type="button"
              aria-label="閉じる"
              onClick={onClose}
              className="flex items-center justify-center w-11 h-11 text-muted-foreground hover:text-foreground text-2xl leading-none rounded-full hover:bg-muted transition-colors"
            >
              ×
            </button>
          </div>

          {showEditButton && post && (
            <div className="mt-4">
              <button
                type="button"
                aria-label="編集する"
                onClick={() => onEdit?.(post.id)}
                className="w-full py-3 rounded-2xl bg-muted text-foreground font-bold text-sm hover:bg-accent"
              >
                編集する
              </button>
            </div>
          )}

          {showReportSightingButton && (
            <div className="mt-4">
              <button
                type="button"
                aria-label="目撃を報告する"
                onClick={() => onReportSighting?.(post.id)}
                className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90"
              >
                目撃を報告する
              </button>
            </div>
          )}

          {markerType === "post" && post && !isLoading && (
            <SightingList
              postId={post.id}
              currentUserId={currentUserId ?? null}
              postOwnerId={post.userId}
              onSightingDeleted={onSightingDeleted ?? (() => {})}
              onSendMessage={(sightingId) =>
                onSendMessage?.(post.id, sightingId)
              }
            />
          )}

          {showMessageButton && post && sightingId && (
            <div className="mt-4">
              <button
                type="button"
                aria-label="メッセージを送る"
                onClick={() => onSendMessage?.(post.id, sightingId)}
                className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90"
              >
                メッセージを送る
              </button>
            </div>
          )}

          {isLoading ? (
            <p className="text-muted-foreground mt-6">読み込み中…</p>
          ) : post ? (
            <>
              {/* タイトル */}
              {post.title && (
                <p className="text-muted-foreground text-sm font-medium mb-2">
                  {post.title}
                </p>
              )}

              {/* ステータスバッジ */}
              {post.status && (
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${STATUS_COLOR[post.status] ?? "bg-muted"}`}
                >
                  {STATUS_LABEL[post.status] ?? post.status}
                </span>
              )}

              {/* メイン画像カルーセル */}
              <div className="mt-4">
                {post.images.length > 0 ? (
                  <>
                    <div className="relative group">
                      <div
                        ref={scrollRef}
                        onScroll={handleScroll}
                        className="flex overflow-x-auto snap-x snap-mandatory rounded-2xl"
                        style={{ scrollbarWidth: "none" }}
                      >
                        {post.images.map((img, i) => (
                          <div
                            key={img.url}
                            className="min-w-full aspect-[4/3] shrink-0 snap-center bg-muted"
                          >
                            <img
                              src={img.url}
                              alt={`投稿画像${i + 1}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        ))}
                      </div>
                      {post.images.length > 1 && (
                        <>
                          <button
                            type="button"
                            aria-label="前の画像"
                            onClick={() =>
                              scrollToImage(
                                (activeIdx - 1 + post.images.length) %
                                  post.images.length
                              )
                            }
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <ChevronLeft size={18} />
                          </button>
                          <button
                            type="button"
                            aria-label="次の画像"
                            onClick={() =>
                              scrollToImage(
                                (activeIdx + 1) % post.images.length
                              )
                            }
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <ChevronRight size={18} />
                          </button>
                        </>
                      )}
                    </div>
                    {post.images.length > 1 && (
                      <div className="flex items-center justify-center gap-1.5 mt-2">
                        {post.images.map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            aria-label={`画像${i + 1}を表示`}
                            onClick={() => scrollToImage(i)}
                            className={`block w-1.5 h-1.5 rounded-full transition-colors ${
                              i === activeIdx
                                ? "bg-primary"
                                : "bg-border hover:bg-muted-foreground"
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-muted flex items-center justify-center">
                    <span className="text-muted-foreground text-sm">
                      画像なし
                    </span>
                  </div>
                )}
              </div>

              {/* petDetail セクション */}
              {post.petDetail && (
                <>
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="bg-muted p-3 rounded-xl">
                      <span className="text-xs font-bold text-muted-foreground uppercase">
                        毛色
                      </span>
                      <p className="text-sm font-bold text-foreground mt-0.5">
                        {post.petDetail.color}
                      </p>
                    </div>
                    <div className="bg-muted p-3 rounded-xl">
                      <span className="text-xs font-bold text-muted-foreground uppercase">
                        年齢
                      </span>
                      <p className="text-sm font-bold text-foreground mt-0.5">
                        {post.petDetail.age}
                      </p>
                    </div>
                    <div className="bg-muted p-3 rounded-xl">
                      <span className="text-xs font-bold text-muted-foreground uppercase">
                        去勢 / チップ
                      </span>
                      <p className="text-sm font-bold text-foreground mt-0.5">
                        {post.petDetail.neutered === true
                          ? "済み"
                          : post.petDetail.neutered === false
                            ? "未"
                            : "不明"}{" "}
                        /{" "}
                        {post.petDetail.microchip === true
                          ? "有り"
                          : post.petDetail.microchip === false
                            ? "無し"
                            : "不明"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h3 className="text-base font-extrabold text-foreground mb-2 flex items-center gap-2">
                      <span className="w-1 h-5 bg-primary rounded-full inline-block" />
                      特徴・性格
                    </h3>
                    <p className="text-sm leading-relaxed text-foreground bg-muted p-4 rounded-2xl">
                      {post.petDetail.features}
                    </p>
                  </div>
                </>
              )}

              {/* location セクション */}
              {post.location && (
                <div className="mt-6">
                  <h3 className="text-base font-extrabold text-foreground mb-2 flex items-center gap-2">
                    <span className="w-1 h-5 bg-primary rounded-full inline-block" />
                    最後に目撃された場所
                  </h3>
                  <div className="flex items-center gap-2 bg-muted p-4 rounded-2xl">
                    <span className="text-primary text-lg">📍</span>
                    <span className="text-sm font-bold text-foreground">
                      {PREFECTURE_LABELS[post.location.prefecture] ??
                        post.location.prefecture}
                      {post.location.city}
                      {post.location.address}
                    </span>
                  </div>
                </div>
              )}

              {/* 目撃詳細セクション */}
              {markerType === "sighting" && sightingDetail && (
                <SightingDetailSection sighting={sightingDetail} />
              )}
            </>
          ) : (
            <p className="text-muted-foreground mt-6">
              詳細情報を取得できませんでした
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SightingDetailSection({
  sighting,
}: {
  sighting: SightingResponseDto;
}) {
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="mt-6">
      <h3 className="text-base font-extrabold text-foreground mb-2 flex items-center gap-2">
        <span className="w-1 h-5 bg-primary rounded-full inline-block" />
        この目撃について
      </h3>
      <div className="bg-muted rounded-2xl p-4 space-y-3">
        {sighting.address && (
          <div className="flex items-center gap-2">
            <span className="text-primary text-sm">📍</span>
            <span className="text-sm font-bold text-foreground">
              {sighting.address}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs font-bold w-16 shrink-0">
            日時
          </span>
          <span className="text-sm text-foreground">
            {formatDate(sighting.sightedAt)}
          </span>
        </div>
        {sighting.comment && (
          <div>
            <span className="text-muted-foreground text-xs font-bold">
              コメント
            </span>
            <p className="text-sm text-foreground mt-1">{sighting.comment}</p>
          </div>
        )}
        {sighting.nickname && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs font-bold w-16 shrink-0">
              報告者
            </span>
            <span className="text-sm text-foreground">{sighting.nickname}</span>
          </div>
        )}
      </div>
    </div>
  );
}
