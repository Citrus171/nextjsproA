import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import {
  DrawerRoot,
  DrawerContent,
  DrawerTitle,
  DrawerHandle,
  DrawerClose,
} from "./drawer";
import React from "react";

describe("Drawer", () => {
  it("open=trueの時、子要素が表示されること", () => {
    render(
      <DrawerRoot open={true} onOpenChange={() => {}}>
        <DrawerContent>
          <DrawerTitle>テストタイトル</DrawerTitle>
          <p>コンテンツ</p>
        </DrawerContent>
      </DrawerRoot>
    );
    expect(screen.getByText("テストタイトル")).toBeInTheDocument();
    expect(screen.getByText("コンテンツ")).toBeInTheDocument();
  });

  it("open=falseの時、子要素が表示されないこと", () => {
    render(
      <DrawerRoot open={false} onOpenChange={() => {}}>
        <DrawerContent>
          <DrawerTitle>テストタイトル</DrawerTitle>
          <p>コンテンツ</p>
        </DrawerContent>
      </DrawerRoot>
    );
    expect(screen.queryByText("テストタイトル")).not.toBeInTheDocument();
  });

  it("snapPointsが反映されること", () => {
    render(
      <DrawerRoot
        open={true}
        onOpenChange={() => {}}
        snapPoints={[0.15, 0.5, 0.9]}
      >
        <DrawerContent>
          <p>コンテンツ</p>
        </DrawerContent>
      </DrawerRoot>
    );
    expect(screen.getByText("コンテンツ")).toBeInTheDocument();
  });

  it("Closeコンポーネントがクリックされた時onOpenChangeが呼ばれること", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(
      <DrawerRoot open={true} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerClose asChild>
            <button type="button" aria-label="閉じる">
              ×
            </button>
          </DrawerClose>
          <p>コンテンツ</p>
        </DrawerContent>
      </DrawerRoot>
    );
    await user.click(screen.getByRole("button", { name: "閉じる" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
