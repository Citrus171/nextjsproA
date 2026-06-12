import type { Meta, StoryObj } from "@storybook/react-vite";
import { Skeleton } from "./skeleton";

const meta: Meta<typeof Skeleton> = {
  title: "UI/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof Skeleton>;

export const Default: Story = {
  render: () => <Skeleton className="h-4 w-48" />,
};

export const PostCard: Story = {
  render: () => (
    <div className="w-80 overflow-hidden rounded-2xl bg-card shadow-sm">
      <Skeleton className="h-44 w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  ),
};

export const ConversationList: Story = {
  render: () => (
    <div className="w-96 space-y-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="bg-card rounded-3xl shadow-sm p-4 flex items-center gap-4"
        >
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-3 w-10 shrink-0" />
        </div>
      ))}
    </div>
  ),
};

export const ChatBubbles: Story = {
  render: () => (
    <div className="w-96 space-y-3">
      <Skeleton className="h-12 w-3/5 rounded-[1.25rem] rounded-bl-sm" />
      <Skeleton className="ml-auto h-12 w-1/2 rounded-[1.25rem] rounded-br-sm" />
      <Skeleton className="h-12 w-3/5 rounded-[1.25rem] rounded-bl-sm" />
    </div>
  ),
};
