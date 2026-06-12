import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, it, expect, vi } from "vitest";

import ErrorState from "./ErrorState";

describe("ErrorState", () => {
  it("メッセージが role=alert の領域に表示されること", () => {
    render(<ErrorState message="エラーが発生しました" />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("エラーが発生しました");
  });

  it("メッセージが destructive スタイルで表示されること", () => {
    render(<ErrorState message="エラーが発生しました" />);

    const message = screen.getByText("エラーが発生しました");
    expect(message).toHaveClass("text-destructive");
    expect(message).toHaveClass("text-sm");
  });

  it("description を渡すと説明文が表示されること", () => {
    render(
      <ErrorState
        message="エラーが発生しました"
        description="時間をおいて再度お試しください"
      />
    );

    expect(
      screen.getByText("時間をおいて再度お試しください")
    ).toBeInTheDocument();
  });

  it("onRetry を渡すと再試行ボタンが表示され、クリックで呼ばれること", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorState message="エラーが発生しました" onRetry={onRetry} />);

    await user.click(screen.getByRole("button", { name: "再試行" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("onRetry を渡さない場合は再試行ボタンが表示されないこと", () => {
    render(<ErrorState message="エラーが発生しました" />);

    expect(
      screen.queryByRole("button", { name: "再試行" })
    ).not.toBeInTheDocument();
  });

  it("className が追加で適用されること", () => {
    render(<ErrorState message="エラーが発生しました" className="mt-12" />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveClass("mt-12");
    expect(alert).toHaveClass("text-center");
  });
});
