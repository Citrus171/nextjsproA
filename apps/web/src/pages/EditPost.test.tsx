import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

const mockNavigate = vi.fn();
const mockGetPost = vi.fn().mockResolvedValue({
  title: "迷い猫の投稿",
  description: "白い猫です",
  postType: "cat",
});
const mockUpdatePost = vi.fn().mockResolvedValue({});

vi.mock("../api/orvalClient", () => ({
  useApiClient: () => ({
    getPost: mockGetPost,
    updatePost: mockUpdatePost,
    deletePost: vi.fn(),
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
    useParams: () => ({ id: "post-1" }),
  };
});

import EditPost from "./EditPost";

describe("EditPost", () => {
  it("取得した postType を表示し、送信時に postType を含める", async () => {
    const user = userEvent.setup();
    render(<EditPost />);

    await waitFor(() => {
      expect(screen.getByLabelText("投稿種別")).toHaveValue("cat");
    });

    expect(screen.getByPlaceholderText("title")).toHaveValue("迷い猫の投稿");
    expect(screen.getByPlaceholderText("description")).toHaveValue(
      "白い猫です"
    );

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(mockUpdatePost).toHaveBeenCalledWith("post-1", {
        title: "迷い猫の投稿",
        description: "白い猫です",
        postType: "cat",
      });
    });

    expect(mockNavigate).toHaveBeenCalledWith("/");
  });
});
