import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usersControllerRegister } from "../../../../packages/api-client/src/index";
import { useAuth } from "../auth/AuthProvider";
import { useApiClient } from "../api/orvalClient";
import type { AxiosError } from "axios";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const navigate = useNavigate();
  const { setToken } = useAuth();
  const api = useApiClient();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await usersControllerRegister({
        name: name || undefined,
        email,
        password,
      });
      const res = await api.login(email, password);
      if (res?.accessToken) setToken(res.accessToken);
      navigate("/");
    } catch (err) {
      const axiosErr = err as AxiosError<{ error?: string; message?: string }>;
      const msg =
        axiosErr.response?.data?.error ||
        axiosErr.response?.data?.message ||
        axiosErr.message ||
        "Register failed";
      alert(msg);
    }
  };

  return (
    <form onSubmit={submit}>
      <h2>Register</h2>
      <input
        placeholder="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        placeholder="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        placeholder="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit">Register</button>
    </form>
  );
}
