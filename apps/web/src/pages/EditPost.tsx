import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApiClient } from "../api/orvalClient";

export default function EditPost() {
  const api = useApiClient();
  const { id } = useParams<{ id: string }>();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await api.getPost(id);
        setTitle(data.title || "");
        setDescription(data.description || "");
      } catch (err) {
        alert("Failed to load post");
      }
    })();
  }, [id, api]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await api.updatePost(id, { title, description });
      navigate("/");
    } catch (err) {
      alert("Failed to update post");
    }
  };

  const remove = async () => {
    if (!id) return;
    if (!confirm("Delete this post?")) return;
    try {
      await api.deletePost(id);
      navigate("/");
    } catch (err) {
      alert("Failed to delete post");
    }
  };

  return (
    <form onSubmit={submit}>
      <h2>Edit Post</h2>
      <div>
        <input
          placeholder="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div>
        <textarea
          placeholder="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <button type="submit">Save</button>
      <button type="button" onClick={remove} style={{ marginLeft: 8 }}>
        Delete
      </button>
    </form>
  );
}
