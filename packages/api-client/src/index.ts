export type TokenGetter = () => string | null | Promise<string | null>;
export type UnauthorizedHandler = () => void;

export function createClient(opts: {
  baseURL: string;
  getToken: TokenGetter;
  setToken?: (t: string | null) => void;
  onUnauthorized?: UnauthorizedHandler;
  debug?: boolean;
}) {
  const envDebug = (() => {
    try {
      // Node env
      if (
        typeof process !== "undefined" &&
        (process as any).env?.DEBUG_API_CLIENT
      )
        return true;
    } catch (e) {}
    // Browser global flag: window.__DEBUG_API_CLIENT = true
    try {
      if (typeof window !== "undefined" && (window as any).__DEBUG_API_CLIENT)
        return true;
    } catch (e) {}
    return false;
  })();
  const debug = !!opts.debug || envDebug;
  let isRefreshing = false;
  let failedQueue: Array<{
    resolve: (v?: any) => void;
    reject: (err: any) => void;
    request: () => Promise<any>;
  }> = [];

  const processQueue = (error: any, token: string | null = null) => {
    if (debug)
      console.debug("api-client: processQueue", {
        error,
        token,
        queueLen: failedQueue.length,
      });
    failedQueue.forEach((p) => {
      if (error) p.reject(error);
      else p.resolve(token);
    });
    failedQueue = [];
  };

  async function doFetch(method: string, path: string, body?: any) {
    const url = `${opts.baseURL}${path}`;
    const token = await opts.getToken();
    if (debug)
      console.debug("api-client: doFetch start", {
        method,
        url,
        token: !!token,
      });
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
      method,
      headers,
      credentials: "include",
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401) {
      if (debug) console.debug("api-client: received 401", { method, path });
      // If there's no access token for this request, it's an unauthenticated
      // endpoint (e.g. login/register) — don't attempt a refresh loop.
      if (!token) {
        if (debug)
          console.debug(
            "api-client: 401 with no token, not attempting refresh",
          );
        if (opts.onUnauthorized) opts.onUnauthorized();
        throw new Error("Unauthorized");
      }
      // handle refresh queue
      if (isRefreshing) {
        if (debug)
          console.debug(
            "api-client: queuing request because refresh in progress",
          );
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: () => resolve(doFetch(method, path, body)),
            reject,
            request: () => doFetch(method, path, body),
          });
        });
      }

      if (debug) console.debug("api-client: starting refresh flow");
      isRefreshing = true;
      try {
        const r = await fetch(`${opts.baseURL}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        if (debug)
          console.debug("api-client: refresh response status", r.status);
        if (!r.ok) throw new Error("refresh failed");
        const data = await r.json();
        const newAccess = data.accessToken;
        if (debug)
          console.debug("api-client: refresh succeeded, newAccess?", {
            hasToken: !!newAccess,
          });
        if (opts.setToken) opts.setToken(newAccess);
        if (debug && opts.setToken)
          console.debug("api-client: setToken called");
        processQueue(null, newAccess);
        isRefreshing = false;
        // retry original
        if (debug)
          console.debug("api-client: retrying original request after refresh");
        return doFetch(method, path, body);
      } catch (err) {
        if (debug) console.debug("api-client: refresh failed", err);
        processQueue(err, null);
        isRefreshing = false;
        if (opts.onUnauthorized) opts.onUnauthorized();
        if (debug && opts.onUnauthorized)
          console.debug("api-client: onUnauthorized called");
        throw err;
      }
    }

    const text = await res.text();
    try {
      const parsed = JSON.parse(text || "null");
      if (debug) console.debug("api-client: response parsed", { parsed });
      return parsed;
    } catch (e) {
      if (debug) console.debug("api-client: response text", { text });
      return text;
    }
  }

  return {
    async login(email: string, password: string) {
      return doFetch("POST", "/auth/login", { email, password });
    },
    async register(name: string | undefined, email: string, password: string) {
      return doFetch("POST", "/users/register", { name, email, password });
    },
    async listPosts(page = 1, perPage = 10) {
      return doFetch("GET", `/posts?page=${page}&perPage=${perPage}`);
    },
    async getPost(id: string) {
      return doFetch("GET", `/posts/${id}`);
    },
    async createPost(title: string, content: string) {
      return doFetch("POST", "/posts", { title, content });
    },
    async updatePost(id: string, data: { title?: string; content?: string }) {
      return doFetch("PUT", `/posts/${id}`, data);
    },
    async deletePost(id: string) {
      return doFetch("DELETE", `/posts/${id}`);
    },
  };
}
