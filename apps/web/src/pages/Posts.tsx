import { useState, useEffect } from "react";
import type { PostResponseDto } from "../../../../packages/api-client/src/index";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useApiClient } from "../api/orvalClient";
import { Link } from "react-router-dom";

const PER_PAGE = 5;

export default function Posts() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["posts", page],
    queryFn: () => api.listPosts(page, PER_PAGE),
    placeholderData: keepPreviousData,
  });

  const totalPages = data ? Math.ceil(data.total / PER_PAGE) : 1;

  useEffect(() => {
    if (page < totalPages) {
      queryClient.prefetchQuery({
        queryKey: ["posts", page + 1],
        queryFn: () => api.listPosts(page + 1, PER_PAGE),
      });
    }
  }, [page, totalPages, queryClient, api]);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Posts</h2>
      <div style={{ marginBottom: 12 }}>
        <Link to="/create">New Post</Link>
      </div>

      <div style={{ opacity: isFetching ? 0.5 : 1 }}>
        {data?.items?.map((p: PostResponseDto) => (
          <div
            key={p.id}
            style={{ borderBottom: "1px solid #ddd", padding: "8px 0" }}
          >
            <h3>{p.title}</h3>
            <p>{p.content}</p>
            {p.image && (
              <img
                src={`http://localhost:3000/${p.image}`}
                alt="Post image"
                style={{ maxWidth: "300px", maxHeight: "200px" }}
              />
            )}
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
      </div>

      <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => setPage((p: number) => Math.max(1, p - 1))} disabled={page === 1}>
          Prev
        </button>
        <span>
          {page} / {totalPages}
        </span>
        <button onClick={() => setPage((p: number) => p + 1)} disabled={page >= totalPages}>
          Next
        </button>
        <span style={{ marginLeft: 8, color: "#888" }}>Total: {data?.total}</span>
      </div>
    </div>
  );
}
