import type { PostResponseDto } from "../../../../packages/api-client/src/index";
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
  lost: "bg-red-600 text-white",
  resolved: "bg-slate-400 text-white",
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

  return (
    <Sheet open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="h-[90dvh] p-0 overflow-hidden"
        aria-label={title}
      >
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3" />

        <div className="h-full overflow-y-auto px-6 pb-[calc(2rem+env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between mt-4 mb-2">
            <SheetTitle asChild>
              <h2 className="text-xl font-black text-slate-900">{title}</h2>
            </SheetTitle>
            <button
              type="button"
              aria-label="閉じる"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
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
                className="w-full py-3 rounded-2xl bg-slate-100 text-slate-800 font-bold text-sm hover:bg-slate-200"
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
                className="w-full py-3 rounded-2xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700"
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
                className="w-full py-3 rounded-2xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700"
              >
                メッセージを送る
              </button>
            </div>
          )}

          {isLoading ? (
            <p className="text-slate-500 mt-6">読み込み中…</p>
          ) : post ? (
            <>
              {/* タイトル */}
              {post.title && (
                <p className="text-slate-600 text-sm font-medium mb-2">
                  {post.title}
                </p>
              )}

              {/* ステータスバッジ */}
              {post.status && (
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${STATUS_COLOR[post.status] ?? "bg-slate-200"}`}
                >
                  {STATUS_LABEL[post.status] ?? post.status}
                </span>
              )}

              {/* メイン画像 */}
              <div className="mt-4 aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 flex items-center justify-center">
                {post.images.length > 0 ? (
                  <img
                    src={post.images[0].url}
                    alt="投稿画像"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-slate-400 text-sm">画像なし</span>
                )}
              </div>

              {/* petDetail セクション */}
              {post.petDetail && (
                <>
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-3 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        毛色
                      </span>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">
                        {post.petDetail.color}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        年齢
                      </span>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">
                        {post.petDetail.age}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        去勢 / チップ
                      </span>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">
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
                    <h3 className="text-base font-black text-slate-900 mb-2 flex items-center gap-2">
                      <span className="w-1 h-5 bg-blue-600 rounded-full inline-block" />
                      特徴・性格
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-600 bg-slate-50 p-4 rounded-2xl">
                      {post.petDetail.features}
                    </p>
                  </div>
                </>
              )}

              {/* location セクション */}
              {post.location && (
                <div className="mt-6">
                  <h3 className="text-base font-black text-slate-900 mb-2 flex items-center gap-2">
                    <span className="w-1 h-5 bg-blue-600 rounded-full inline-block" />
                    最後に目撃された場所
                  </h3>
                  <div className="flex items-center gap-2 bg-slate-50 p-4 rounded-2xl">
                    <span className="text-blue-600 text-lg">📍</span>
                    <span className="text-sm font-bold text-slate-700">
                      {post.location.prefecture}
                      {post.location.city}
                      {post.location.address}
                    </span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-slate-500 mt-6">
              詳細情報を取得できませんでした
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
