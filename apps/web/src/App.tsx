import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/LoginWithAuth";
import Register from "./pages/Register";
import Posts from "./pages/Posts";
import CreatePost from "./pages/CreatePost";
import EditPost from "./pages/EditPost";
import Map from "./pages/Map";
import Conversations from "./pages/Conversations";
import ConversationChat from "./pages/ConversationChat";
import { useAuth } from "./auth/AuthProvider";
import { Sonner } from "./components/ui/sonner";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token, isRestoring } = useAuth();
  if (isRestoring) return null;
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <>
      <Sonner position="top-center" richColors />
      <Routes>
        <Route path="/" element={<Map />} />
        <Route
          path="/posts"
          element={
            <PrivateRoute>
              <Posts />
            </PrivateRoute>
          }
        />
        <Route
          path="/create"
          element={
            <PrivateRoute>
              <CreatePost />
            </PrivateRoute>
          }
        />
        <Route
          path="/edit/:id"
          element={
            <PrivateRoute>
              <EditPost />
            </PrivateRoute>
          }
        />
        <Route
          path="/conversations"
          element={
            <PrivateRoute>
              <Conversations />
            </PrivateRoute>
          }
        />
        <Route
          path="/conversations/:id"
          element={
            <PrivateRoute>
              <ConversationChat />
            </PrivateRoute>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </>
  );
}
