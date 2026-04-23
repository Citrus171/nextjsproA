import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

const mockNavigate = vi.fn();
const mockCreatePost = vi.fn().mockResolvedValue({});

vi.mock("../api/orvalClient", () => ({
  useApiClient: () => ({
    createPost: mockCreatePost,
  }),
}));

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom"
    );

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import CreatePost from "./CreatePost";

describe("CreatePost", () => {
  it("未選択時は cat を送信する", async () => {
    const user = userEvent.setup();
    render(<CreatePost />);

    expect(screen.getByLabelText("投稿種別")).toHaveValue("cat");

    await user.type(screen.getByPlaceholderText("title"), "迷い猫の投稿");
    await user.type(screen.getByPlaceholderText("description"), "白い猫です");
    await user.type(screen.getByPlaceholderText("lostDate"), "2026-04-21");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(mockCreatePost).toHaveBeenCalledWith({
        title: "迷い猫の投稿",
        description: "白い猫です",
        lostDate: "2026-04-21",
        postType: "cat",
      });
    });

    expect(mockNavigate).toHaveBeenCalledWith("/posts");
  });
});
