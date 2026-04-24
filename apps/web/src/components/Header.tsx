import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "../api/orvalClient";
import type { ConversationListItemDto } from "../../../../packages/api-client/src/index";

type HeaderProps = {
  token: string | null;
  onLogout: () => void;
};

export default function Header({ token, onLogout }: HeaderProps) {
  const client = useApiClient();

  const { data: conversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => client.listConversations(),
    refetchInterval: 5000,
    enabled: !!token,
  });

  const totalUnread = conversations
    ? conversations.reduce(
        (sum: number, c: ConversationListItemDto) => sum + c.unreadCount,
        0
      )
    : 0;

  return (
    <nav>
      <Link to="/posts">Posts</Link> | <Link to="/create">New Post</Link> |{" "}
      <Link to="/conversations" aria-label="会話">
        会話{totalUnread > 0 && <span>({totalUnread})</span>}
      </Link>{" "}
      |{" "}
      {!token ? (
        <Link to="/login">Login</Link>
      ) : (
        <button onClick={onLogout}>Logout</button>
      )}{" "}
      | <Link to="/register">Register</Link> | <Link to="/">Map</Link>
    </nav>
  );
}
