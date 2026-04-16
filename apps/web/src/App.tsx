import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import Login from "./pages/LoginWithAuth";
import Register from "./pages/Register";
import Posts from "./pages/Posts";
import CreatePost from "./pages/CreatePost";
import EditPost from "./pages/EditPost";
import { useAuth } from "./auth/AuthProvider";

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
        <Route path="/create" element={<CreatePost />} />
        <Route path="/edit/:id" element={<EditPost />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </>
  );
}
