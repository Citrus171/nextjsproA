import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { PostsControllerCreateBodyPostType } from "../../../../packages/api-client/src/index";
import { useApiClient } from "../api/orvalClient";
import {
  POST_TYPE_OPTIONS,
  POST_TYPE_SELECT_ID,
} from "../constants/postTypeOptions";

export default function CreatePost() {
  const api = useApiClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [lostDate, setLostDate] = useState("");
  const [postType, setPostType] = useState<PostsControllerCreateBodyPostType>(
    POST_TYPE_OPTIONS[0].value
  );
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createPost({ title, description, lostDate, postType });
      navigate("/");
    } catch (err) {
      alert("Failed to create post");
    }
  };

  return (
    <form onSubmit={submit}>
      <h2>Create Post</h2>
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
      <div>
        <input
          type="date"
          placeholder="lostDate"
          value={lostDate}
          onChange={(e) => setLostDate(e.target.value)}
        />
      </div>
      <button type="submit">Create</button>
    </form>
  );
}
