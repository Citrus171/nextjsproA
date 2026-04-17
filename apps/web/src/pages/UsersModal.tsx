/**
 * TanStack Start vs NestJS+React の対比学習用コンポーネント
 *
 * TanStack Start（これだけで完結）:
 *   const users = await getUsers()  // createServerFn が DB に直アクセス
 *
 * NestJS+React（このファイルがやること）:
 *   useQuery → axios → GET /users → Controller → Service → Prisma → DB
 */

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

// ① HTTP 通信の定義（TanStack Start には不要な部分）
async function fetchUsers() {
  const res = await axios.get("http://localhost:3000/api/users");
  return res.data as { id: string; email: string; name: string | null; createdAt: string }[];
}

export default function UsersModal() {
  const [open, setOpen] = useState(false);

  // ② useQuery でデータ取得（enabled: open でモーダルを開いたときだけ実行）
  // TanStack Start なら「await getUsers()」の1行に相当する
  const { data: users, isLoading, isError } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
    enabled: open,
  });

  return (
    <div>
      <button onClick={() => setOpen(true)}>ユーザー一覧を見る</button>

      {open && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{ background: "#fff", padding: 24, borderRadius: 8, minWidth: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>ユーザー一覧</h2>

            {/* ③ ローディング / エラー / データ表示 */}
            {isLoading && <p>読み込み中...</p>}
            {isError && <p style={{ color: "red" }}>取得に失敗しました</p>}
            {users && (
              <ul>
                {users.map((u) => (
                  <li key={u.id}>
                    {u.name ?? "（名前なし）"} — {u.email}
                  </li>
                ))}
              </ul>
            )}

            <button onClick={() => setOpen(false)}>閉じる</button>
          </div>
        </div>
      )}
    </div>
  );
}
