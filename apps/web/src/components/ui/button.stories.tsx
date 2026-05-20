import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: ["default", "outline", "ghost"] },
    size: { control: "select", options: ["default", "sm", "lg", "icon"] },
    disabled: { control: "boolean" },
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: { children: "Button", variant: "default" },
};
export const Outline: Story = {
  args: { children: "Button", variant: "outline" },
};
export const Ghost: Story = { args: { children: "Button", variant: "ghost" } };
export const Small: Story = { args: { children: "Button", size: "sm" } };
export const Large: Story = { args: { children: "Button", size: "lg" } };
export const Disabled: Story = { args: { children: "Button", disabled: true } };
