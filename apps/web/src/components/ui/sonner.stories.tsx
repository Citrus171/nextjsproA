import type { Meta, StoryObj } from "@storybook/react-vite";
import { toast } from "sonner";
import { Sonner } from "./sonner";
import { Button } from "./button";

const meta: Meta<typeof Sonner> = {
  title: "UI/Sonner",
  component: Sonner,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <>
        <Story />
        <Sonner />
      </>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof Sonner>;

export const Success: Story = {
  render: () => (
    <Button onClick={() => toast.success("保存しました")}>Success toast</Button>
  ),
};

export const Error: Story = {
  render: () => (
    <Button
      variant="outline"
      onClick={() => toast.error("エラーが発生しました")}
    >
      Error toast
    </Button>
  ),
};
