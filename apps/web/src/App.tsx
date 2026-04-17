import React from "react";
import { Routes, Route, Link, Navigate } from "react-router-dom";
import Login from "./pages/LoginWithAuth";
import Register from "./pages/Register";
import Posts from "./pages/Posts";
import CreatePost from "./pages/CreatePost";
import EditPost from "./pages/EditPost";
import { useAuth } from "./auth/AuthProvider";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  const { token, clearToken } = useAuth();

  return (
    <>
      <nav>
        <Link to="/">Posts</Link> | <Link to="/create">New Post</Link> |{" "}
        {!token ? (
          <Link to="/login">Login</Link>
        ) : (
          <button onClick={clearToken}>Logout</button>
        )}{" "}
        | <Link to="/register">Register</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Posts />} />
        <Route path="/create" element={<PrivateRoute><CreatePost /></PrivateRoute>} />
        <Route path="/edit/:id" element={<PrivateRoute><EditPost /></PrivateRoute>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </>
  );
}
