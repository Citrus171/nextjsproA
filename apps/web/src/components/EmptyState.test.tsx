import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, it, expect } from "vitest";
import { Cat } from "lucide-react";

import EmptyState from "./EmptyState";

describe("EmptyState", () => {
  it("タイトルが表示されること", () => {
    render(<EmptyState title="まだ投稿はありません" />);

    expect(screen.getByText("まだ投稿はありません")).toBeInTheDocument();
  });

  it("description を渡すと説明文が表示されること", () => {
    render(
      <EmptyState
        title="まだ投稿はありません"
        description="最初の投稿を作成しましょう"
      />
    );

    expect(screen.getByText("最初の投稿を作成しましょう")).toBeInTheDocument();
  });

  it("description を渡さない場合は説明文が表示されないこと", () => {
    const { container } = render(<EmptyState title="まだ投稿はありません" />);

    expect(container.querySelectorAll("p")).toHaveLength(1);
  });

  it("icon を渡すとアイコンが装飾として（aria-hidden で）表示されること", () => {
    const { container } = render(
      <EmptyState icon={Cat} title="まだ投稿はありません" />
    );

    const icon = container.querySelector("svg");
    expect(icon).not.toBeNull();
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });

  it("icon を渡さない場合は svg が描画されないこと", () => {
    const { container } = render(<EmptyState title="まだ投稿はありません" />);

    expect(container.querySelector("svg")).toBeNull();
  });

  it("action を渡すとアクション要素が表示されること", () => {
    render(
      <EmptyState
        title="まだ投稿はありません"
        action={<button type="button">投稿を作成</button>}
      />
    );

    expect(
      screen.getByRole("button", { name: "投稿を作成" })
    ).toBeInTheDocument();
  });

  it("className が追加で適用されること", () => {
    const { container } = render(
      <EmptyState title="まだ投稿はありません" className="mt-12" />
    );

    expect(container.firstChild).toHaveClass("mt-12");
    expect(container.firstChild).toHaveClass("text-center");
  });
});
