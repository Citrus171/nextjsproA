export const QUERY_KEYS = {
  posts: () => ["posts"] as const,
  postsInfinite: () => ["posts", "infinite"] as const,
  sightings: (postId: string) => ["sightings", postId] as const,
  sighting: (sightingId: string) => ["sighting", sightingId] as const,
  conversations: () => ["conversations"] as const,
  conversation: (id: string) => ["conversation", id] as const,
  messages: (id: string) => ["messages", id] as const,
  unreadCount: () => ["unread-count"] as const,
} as const;
