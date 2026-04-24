import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./pages/LoginWithAuth";
import Register from "./pages/Register";
import Posts from "./pages/Posts";
import CreatePost from "./pages/CreatePost";
import EditPost from "./pages/EditPost";
import Map from "./pages/Map";
import Conversations from "./pages/Conversations";
import { useAuth } from "./auth/AuthProvider";
import Header from "./components/Header";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  const { token, clearToken } = useAuth();
  const location = useLocation();
  const isMapPage = location.pathname === "/";

  return (
    <>
      {!isMapPage && <Header token={token} onLogout={clearToken} />}
      <Routes>
        <Route path="/" element={<Map />} />
        <Route path="/posts" element={<Posts />} />
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
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </>
  );
}
