import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
  SheetClose,
} from "./sheet";
import { Button } from "./button";

const meta: Meta<typeof Sheet> = {
  title: "UI/Sheet",
  component: Sheet,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof Sheet>;

export const Bottom: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Open Sheet (bottom)</Button>
      </SheetTrigger>
      <SheetContent side="bottom">
        <div className="p-4 pb-8">
          <SheetTitle>シート タイトル</SheetTitle>
          <p className="mt-2 text-sm text-muted-foreground">
            シートの本文コンテンツ。
          </p>
          <div className="mt-4">
            <SheetClose asChild>
              <Button size="sm">閉じる</Button>
            </SheetClose>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  ),
};
