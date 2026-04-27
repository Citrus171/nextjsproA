export default async function globalTeardown() {
  // CI では DB がジョブ毎にリセットされるためクリーンアップ不要。
  // ローカルでテストデータを削除する場合は prisma studio や docker compose down で対応。
}
