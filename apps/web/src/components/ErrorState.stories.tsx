import type { Meta, StoryObj } from "@storybook/react-vite";
import ErrorState from "./ErrorState";

const meta: Meta<typeof ErrorState> = {
  title: "Components/ErrorState",
  component: ErrorState,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof ErrorState>;

export const Default: Story = {
  args: {
    message: "エラーが発生しました",
  },
};

export const WithRetry: Story = {
  args: {
    message: "会話の取得に失敗しました",
    onRetry: () => {},
  },
};

export const WithDescription: Story = {
  args: {
    message: "メッセージの取得に失敗しました",
    description: "時間をおいて再度お試しください",
    onRetry: () => {},
  },
};
