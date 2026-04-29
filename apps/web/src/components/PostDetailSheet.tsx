import type { PostResponseDto } from "../../../../packages/api-client/src/index";
import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetTitle } from "./ui/sheet";
import SightingList from "./SightingList";

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
  const title = markerType === "post" ? "迷い猫投稿" : "目撃情報";

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
              <h2 className="text-xl font-black text-foreground">{title}</h2>
            </SheetTitle>
            <button
              type="button"
              aria-label="閉じる"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground text-2xl leading-none"
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
              onSightingDeleted={onSightingDeleted ?? (() => {})}
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
                      <div className="flex justify-center gap-1.5 mt-2">
                        {post.images.map((_, i) => (
                          <span
                            key={i}
                            className={`block w-1.5 h-1.5 rounded-full transition-colors ${
                              i === activeIdx ? "bg-primary" : "bg-border"
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
                    <h3 className="text-base font-black text-foreground mb-2 flex items-center gap-2">
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
                  <h3 className="text-base font-black text-foreground mb-2 flex items-center gap-2">
                    <span className="w-1 h-5 bg-primary rounded-full inline-block" />
                    最後に目撃された場所
                  </h3>
                  <div className="flex items-center gap-2 bg-muted p-4 rounded-2xl">
                    <span className="text-primary text-lg">📍</span>
                    <span className="text-sm font-bold text-foreground">
                      {post.location.prefecture}
                      {post.location.city}
                      {post.location.address}
                    </span>
                  </div>
                </div>
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
