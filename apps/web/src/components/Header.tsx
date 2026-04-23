import { Link } from "react-router-dom";

type HeaderProps = {
  token: string | null;
  onLogout: () => void;
};

export default function Header({ token, onLogout }: HeaderProps) {
  return (
    <nav>
      <Link to="/posts">Posts</Link> | <Link to="/create">New Post</Link> |{" "}
      {!token ? (
        <Link to="/login">Login</Link>
      ) : (
        <button onClick={onLogout}>Logout</button>
      )}{" "}
      | <Link to="/register">Register</Link> | <Link to="/">Map</Link>
    </nav>
  );
}
