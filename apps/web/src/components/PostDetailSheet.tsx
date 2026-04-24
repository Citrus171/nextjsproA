import type { PostResponseDto } from "../../../../packages/api-client/src/index";
import { Sheet, SheetContent, SheetTitle } from "./ui/sheet";

interface PostDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  post: PostResponseDto | null;
  markerType: "post" | "sighting";
  isLoading: boolean;
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
}: PostDetailSheetProps) {
  const title = markerType === "post" ? "迷い猫投稿" : "目撃情報";

  return (
    <Sheet open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="h-[90vh] p-0 overflow-hidden"
        aria-label={title}
      >
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3" />

        <div className="h-full overflow-y-auto px-6 pb-8">
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

          {isLoading ? (
            <p className="text-slate-500 mt-6">読み込み中…</p>
          ) : post ? (
            <>
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
                        {post.petDetail.neutered ? "済み" : "未"} /{" "}
                        {post.petDetail.microchip ? "有り" : "無し"}
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
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
