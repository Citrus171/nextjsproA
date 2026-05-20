import type { Meta, StoryObj } from "@storybook/react-vite";
import { RadioGroup, RadioGroupItem } from "./radio-group";
import { Label } from "./label";

const meta: Meta<typeof RadioGroup> = {
  title: "UI/RadioGroup",
  component: RadioGroup,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof RadioGroup>;

export const Default: Story = {
  render: () => (
    <RadioGroup defaultValue="option-1">
      <div className="flex items-center gap-2">
        <RadioGroupItem value="option-1" id="r1" />
        <Label htmlFor="r1">Option 1</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="option-2" id="r2" />
        <Label htmlFor="r2">Option 2</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="option-3" id="r3" />
        <Label htmlFor="r3">Option 3</Label>
      </div>
    </RadioGroup>
  ),
};

export const Disabled: Story = {
  render: () => (
    <RadioGroup defaultValue="option-1">
      <div className="flex items-center gap-2">
        <RadioGroupItem value="option-1" id="rd1" />
        <Label htmlFor="rd1">Enabled</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="option-2" id="rd2" disabled />
        <Label htmlFor="rd2">Disabled</Label>
      </div>
    </RadioGroup>
  ),
};
