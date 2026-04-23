#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/user/nestjsA_begin"
API_DIR="$ROOT/apps/api"

POST_ID="00000000-0000-0000-0000-000000000000"
IMAGE_ID="00000000-0000-0000-0000-000000000001"
SIGHTING_ID="00000000-0000-0000-0000-000000000002"
CONVERSATION_ID="00000000-0000-0000-0000-000000000003"
OWNER_USER_ID="10000000-0000-0000-0000-000000000002"
SIGHTER_USER_ID="10000000-0000-0000-0000-000000000003"

cd "$ROOT"

echo "== 固定IDのテストデータを投入します =="
npm run seed

echo "== 固定IDデータの存在確認 =="
cd "$API_DIR"
node <<'NODE'
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const ids = {
	ownerUserId: "10000000-0000-0000-0000-000000000002",
	sighterUserId: "10000000-0000-0000-0000-000000000003",
	postId: "00000000-0000-0000-0000-000000000000",
	imageId: "00000000-0000-0000-0000-000000000001",
	sightingId: "00000000-0000-0000-0000-000000000002",
	conversationId: "00000000-0000-0000-0000-000000000003",
};

async function main() {
	const checks = [
		["owner_user", () => prisma.user.count({ where: { id: ids.ownerUserId } })],
		["sighter_user", () => prisma.user.count({ where: { id: ids.sighterUserId } })],
		["post", () => prisma.post.count({ where: { id: ids.postId } })],
		["image", () => prisma.image.count({ where: { id: ids.imageId } })],
		["sighting", () => prisma.sighting.count({ where: { id: ids.sightingId } })],
		[
			"conversation",
			() => prisma.conversation.count({ where: { id: ids.conversationId } }),
		],
	];

	let hasMissing = false;
	for (const [name, fn] of checks) {
		const count = await fn();
		console.log(`${name.padEnd(14)} | ${count}`);
		if (count < 1) hasMissing = true;
	}

	if (hasMissing) {
		console.error("固定IDデータの一部が見つかりません。seed結果を確認してください。");
		process.exitCode = 2;
	}
}

main()
	.catch((err) => {
		console.error(err);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
NODE

echo "== 完了: 固定IDデータの投入と確認が終わりました =="
echo "次: scripts/run-schemathesis-auth.sh"
