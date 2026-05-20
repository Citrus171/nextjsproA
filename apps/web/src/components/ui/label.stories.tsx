import type { Meta, StoryObj } from "@storybook/react-vite";
import { Label } from "./label";
import { Input } from "./input";

const meta: Meta<typeof Label> = {
  title: "UI/Label",
  component: Label,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof Label>;

export const Default: Story = { args: { children: "Label text" } };

export const WithInput: Story = {
  render: () => (
    <div className="grid gap-1.5">
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" placeholder="you@example.com" />
    </div>
  ),
};
