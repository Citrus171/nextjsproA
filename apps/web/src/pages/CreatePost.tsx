import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApiClient } from "../api/orvalClient";

export default function CreatePost() {
  const api = useApiClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createPost(title, content);
      navigate("/");
    } catch (err) {
      alert("Failed to create post");
    }
  };

  return (
    <form onSubmit={submit}>
      <h2>Create Post</h2>
      <div>
        <input
          placeholder="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div>
        <textarea
          placeholder="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>
      <button type="submit">Create</button>
    </form>
  );
}
