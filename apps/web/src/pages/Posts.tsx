import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "../api/orvalClient";
import { Link } from "react-router-dom";

export default function Posts() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["posts", 1],
    queryFn: () => api.listPosts(1),
  });

  if (isLoading) return <div>Loading...</div>;
  return (
    <div>
      <h2>Posts</h2>
      <div style={{ marginBottom: 12 }}>
        <Link to="/create">New Post</Link>
      </div>
      {data?.items?.map((p: any) => (
        <div
          key={p.id}
          style={{ borderBottom: "1px solid #ddd", padding: "8px 0" }}
        >
          <h3>{p.title}</h3>
          <p>{p.content}</p>
          <div>
            <Link to={`/edit/${p.id}`}>Edit</Link>{" "}
            <button
              onClick={async () => {
                if (confirm("Delete this post?")) {
                  try {
                    await api.deletePost(p.id);
                    queryClient.invalidateQueries({ queryKey: ["posts"] });
                  } catch (e) {
                    alert("Delete failed");
                  }
                }
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
      <div>Total: {data?.total}</div>
    </div>
  );
}
