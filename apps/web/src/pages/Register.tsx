import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "../../../../packages/api-client/src/client";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const client = createClient({
        getToken: async () => null,
      });
      const res = await client.register(name || undefined, email, password);
      const r: any = res;
      if (r?.error || r?.message) {
        alert(r.error || r.message || "Register failed");
        return;
      }
      if (r?.id) {
        navigate("/login");
        return;
      }
      alert(JSON.stringify(res) || "Register failed");
    } catch (err) {
      alert((err as any)?.message || "Register failed");
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
