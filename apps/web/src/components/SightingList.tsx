import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SightingResponseDto } from "../../../../packages/api-client/src/index";
import { useApiClient } from "../api/orvalClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

interface SightingListProps {
  postId: string;
  currentUserId: string | null;
  onSightingDeleted: () => void;
  postOwnerId?: string | null;
  onSendMessage?: (sightingId: string) => void;
}

function formatSightedAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SightingList({
  postId,
  currentUserId,
  onSightingDeleted,
  postOwnerId,
  onSendMessage,
}: SightingListProps) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: sightings, isLoading } = useQuery({
    queryKey: ["sightings", postId],
    queryFn: () => api.findSightingsByPost(postId),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteSighting(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sightings", postId] });
      onSightingDeleted();
      setDeletingId(null);
      setDeleteError(null);
    },
    onError: () => {
      setDeleteError("削除に失敗しました");
    },
  });

  if (isLoading) {
    return <p className="text-muted-foreground text-sm mt-4">読み込み中…</p>;
  }

  if (!sightings || sightings.length === 0) {
    return (
      <p className="text-muted-foreground text-sm mt-4">
        まだ目撃情報はありません
      </p>
    );
  }

  return (
    <>
      {deleteError && (
        <p className="text-destructive text-sm mt-2">{deleteError}</p>
      )}
      <div className="mt-4 space-y-3">
        {sightings.map((s: SightingResponseDto) => (
          <div key={s.id} className="bg-muted rounded-2xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">
                  {formatSightedAt(s.sightedAt)}
                </p>
                {s.address && (
                  <p className="text-sm font-bold text-foreground flex items-center gap-1">
                    <span className="text-primary">📍</span>
                    {s.address}
                  </p>
                )}
                {s.comment && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {s.comment}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {currentUserId === s.userId && (
                  <button
                    type="button"
                    aria-label="削除"
                    onClick={() => setDeletingId(s.id)}
                    className="text-xs text-destructive hover:text-destructive/80 font-bold min-h-[44px] min-w-[44px] px-3 rounded-lg hover:bg-destructive/10 inline-flex items-center justify-center"
                  >
                    削除
                  </button>
                )}
                {currentUserId &&
                  currentUserId !== s.userId &&
                  postOwnerId === currentUserId &&
                  onSendMessage && (
                    <button
                      type="button"
                      aria-label="メッセージを送る"
                      onClick={() => onSendMessage(s.id)}
                      className="text-xs text-primary hover:text-primary/80 font-bold min-h-[44px] min-w-[44px] px-3 rounded-lg hover:bg-primary/10 inline-flex items-center justify-center"
                    >
                      💬
                    </button>
                  )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <AlertDialog
        open={deletingId !== null}
        onOpenChange={(open: boolean) => !open && setDeletingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>目撃情報を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              disabled={deleteMutation.isPending}
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
