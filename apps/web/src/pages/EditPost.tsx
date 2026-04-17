import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApiClient } from "../api/orvalClient";

export default function EditPost() {
  const api = useApiClient();
  const { id } = useParams<{ id: string }>();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await api.getPost(id);
        setTitle(data.title || "");
        setContent(data.content || "");
        setImage(data.image || null);
      } catch (err) {
        alert("Failed to load post");
      }
    })();
  }, [id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await api.updatePost(id, { title, content }, imageFile ?? undefined);
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
          placeholder="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>
      {image && !imageFile && (
        <div>
          <p>現在の画像:</p>
          <img
            src={`http://localhost:3000/${image}`}
            alt="Post image"
            style={{ maxWidth: "300px", maxHeight: "200px" }}
          />
        </div>
      )}
      {imageFile && (
        <div>
          <p>新しい画像（プレビュー）:</p>
          <img
            src={URL.createObjectURL(imageFile)}
            alt="Preview"
            style={{ maxWidth: "300px", maxHeight: "200px" }}
          />
        </div>
      )}
      <div>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
        />
      </div>
      <button type="submit">Save</button>
      <button type="button" onClick={remove} style={{ marginLeft: 8 }}>
        Delete
      </button>
    </form>
  );
}
