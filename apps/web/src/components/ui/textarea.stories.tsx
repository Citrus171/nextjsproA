import type { Meta, StoryObj } from "@storybook/react-vite";
import { Textarea } from "./textarea";

const meta: Meta<typeof Textarea> = {
  title: "UI/Textarea",
  component: Textarea,
  tags: ["autodocs"],
  argTypes: {
    disabled: { control: "boolean" },
    placeholder: { control: "text" },
    rows: { control: "number" },
  },
};
export default meta;

type Story = StoryObj<typeof Textarea>;

export const Default: Story = { args: { placeholder: "Type here..." } };
export const Disabled: Story = {
  args: { placeholder: "Disabled", disabled: true },
};
export const Tall: Story = { args: { placeholder: "Tall textarea", rows: 8 } };
