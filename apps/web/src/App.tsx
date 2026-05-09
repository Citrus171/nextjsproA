import React, { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./auth/AuthProvider";
import { Sonner } from "./components/ui/sonner";

const Map = React.lazy(() => import("./pages/Map"));
const Posts = React.lazy(() => import("./pages/Posts"));
const CreatePost = React.lazy(() => import("./pages/CreatePost"));
const EditPost = React.lazy(() => import("./pages/EditPost"));
const Conversations = React.lazy(() => import("./pages/Conversations"));
const ConversationChat = React.lazy(
  () => import("./pages/ConversationChat")
);
const Login = React.lazy(() => import("./pages/LoginWithAuth"));
const Register = React.lazy(() => import("./pages/Register"));

function PageFallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token, isRestoring } = useAuth();
  if (isRestoring) return null;
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <>
      <Sonner position="top-center" richColors />
      <Suspense fallback={<PageFallback />}>
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
      </Suspense>
    </>
  );
}
