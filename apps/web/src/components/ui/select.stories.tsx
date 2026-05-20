import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./select";

const meta: Meta<typeof Select> = {
  title: "UI/Select",
  component: Select,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof Select>;

export const Default: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="選択してください" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana">Banana</SelectItem>
        <SelectItem value="orange">Orange</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Select disabled>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Disabled" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="a">Option A</SelectItem>
      </SelectContent>
    </Select>
  ),
};
