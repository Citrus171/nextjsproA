import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { PostsControllerCreateBodyPostType } from "../../../../packages/api-client/src/index";
import { useApiClient } from "../api/orvalClient";
import {
  POST_TYPE_OPTIONS,
  POST_TYPE_SELECT_ID,
} from "../constants/postTypeOptions";

export default function EditPost() {
  const api = useApiClient();
  const { id } = useParams<{ id: string }>();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [postType, setPostType] = useState<PostsControllerCreateBodyPostType>(
    POST_TYPE_OPTIONS[0].value
  );
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await api.getPost(id);
        setTitle(data.title || "");
        setDescription(data.description || "");
        setPostType(data.postType ?? POST_TYPE_OPTIONS[0].value);
      } catch (err) {
        alert("Failed to load post");
      }
    })();
  }, [id, api]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await api.updatePost(id, { title, description, postType });
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
        <label htmlFor={POST_TYPE_SELECT_ID}>投稿種別</label>
        <select
          id={POST_TYPE_SELECT_ID}
          value={postType}
          onChange={(e) =>
            setPostType(e.target.value as PostsControllerCreateBodyPostType)
          }
        >
          {POST_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
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
