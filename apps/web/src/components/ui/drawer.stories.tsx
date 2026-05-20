import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  DrawerRoot,
  DrawerTrigger,
  DrawerContent,
  DrawerHandle,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "./drawer";
import { Button } from "./button";

const meta: Meta<typeof DrawerRoot> = {
  title: "UI/Drawer",
  component: DrawerRoot,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof DrawerRoot>;

export const Default: Story = {
  render: () => (
    <DrawerRoot>
      <DrawerTrigger asChild>
        <Button variant="outline">Open Drawer</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHandle />
        <div className="p-4 pb-8">
          <DrawerTitle>ドロワー タイトル</DrawerTitle>
          <DrawerDescription className="mt-1">
            詳細情報をここに表示します。
          </DrawerDescription>
          <div className="mt-4">
            <DrawerClose asChild>
              <Button size="sm">閉じる</Button>
            </DrawerClose>
          </div>
        </div>
      </DrawerContent>
    </DrawerRoot>
  ),
};
