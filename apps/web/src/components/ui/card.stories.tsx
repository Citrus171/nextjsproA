import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./card";
import { Button } from "./button";

const meta: Meta<typeof Card> = {
  title: "UI/Card",
  component: Card,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">Card content area.</p>
      </CardContent>
      <CardFooter>
        <Button size="sm">Action</Button>
      </CardFooter>
    </Card>
  ),
};

export const Minimal: Story = {
  render: () => (
    <Card className="w-80">
      <CardContent className="pt-6">
        <p className="text-sm">Minimal card with content only.</p>
      </CardContent>
    </Card>
  ),
};
