import type { Meta, StoryObj } from "@storybook/react-vite";
import { Cat, MessagesSquare } from "lucide-react";
import EmptyState from "./EmptyState";
import { Button } from "./ui/button";

const meta: Meta<typeof EmptyState> = {
  title: "Components/EmptyState",
  component: EmptyState,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
  args: {
    title: "まだ迷い猫投稿はありません",
  },
};

export const WithIcon: Story = {
  args: {
    icon: Cat,
    title: "まだ迷い猫投稿はありません",
  },
};

export const WithDescriptionAndAction: Story = {
  args: {
    icon: MessagesSquare,
    title: "会話はまだありません",
    description: "投稿にメッセージを送ると会話が始まります",
    action: <Button variant="outline">マップを見る</Button>,
  },
};
