import axios from "axios";
import {
  authControllerLogin,
  authControllerRefresh,
  authControllerLogout,
  postsControllerList,
  postsControllerCreate,
  postsControllerUpdate,
  postsControllerGet,
  postsControllerRemove,
  usersControllerRegister,
} from "./index";

export type ClientOptions = {
  baseURL?: string;
  getToken?: () => Promise<string | null> | string | null;
  setToken?: (t: string | null) => void;
  onUnauthorized?: () => void;
};

export function createClient(options: ClientOptions) {
  if (options.baseURL) axios.defaults.baseURL = options.baseURL;

  axios.interceptors.request.use(async (config) => {
    try {
      const token = options.getToken ? await options.getToken() : null;
      if (token) {
        config.headers = config.headers || {};
        // @ts-ignore
        config.headers["Authorization"] = `Bearer ${token}`;
      }
    } catch (e) {}
    return config;
  });

  let isRefreshing = false;
  let refreshQueue: Array<(token?: string | null) => void> = [];

  async function doRefresh() {
    if (isRefreshing) {
      return new Promise<string | null>((res) => refreshQueue.push(res));
    }
    isRefreshing = true;
    try {
      const r = await authControllerRefresh();
      const t = r?.data?.accessToken ?? null;
      if (t && options.setToken) options.setToken(t);
      refreshQueue.forEach((cb) => cb(t));
      refreshQueue = [];
      return t;
    } catch (e) {
      refreshQueue.forEach((cb) => cb(null));
      refreshQueue = [];
      if (options.onUnauthorized) options.onUnauthorized();
      return null;
    } finally {
      isRefreshing = false;
    }
  }

  axios.interceptors.response.use(
    (res) => res,
    async (err) => {
      const original = err?.config;
      if (!original) return Promise.reject(err);
      if (err?.response?.status === 401 && !original._retry) {
        original._retry = true;
        const newToken = await doRefresh();
        if (newToken) {
          original.headers = original.headers || {};
          original.headers["Authorization"] = `Bearer ${newToken}`;
          return axios(original);
        }
      }
      return Promise.reject(err);
    },
  );

  return {
    login: async (email: string, password: string) => {
      const r = await authControllerLogin({ email, password });
      const token = r?.data?.accessToken;
      if (token && options.setToken) options.setToken(token);
      return r.data;
    },
    register: async (
      name: string | undefined,
      email: string,
      password: string,
    ) => {
      const r = await usersControllerRegister({ name, email, password });
      return r.data;
    },
    logout: async () => {
      await authControllerLogout();
      if (options.setToken) options.setToken(null);
    },
    refresh: async () => {
      return doRefresh();
    },
    listPosts: async () => {
      const r = await postsControllerList();
      return r.data;
    },
    createPost: async (title: string, content: string, image?: Blob) => {
      const r = await postsControllerCreate({ title, content, image });
      return r.data;
    },
    getPost: async (id: string) => {
      const r = await postsControllerGet(id);
      return r.data;
    },
    updatePost: async (id: string, data: { title?: string; content?: string }, image?: Blob) => {
      const formData = new FormData();
      if (data.title !== undefined) formData.append('title', data.title);
      if (data.content !== undefined) formData.append('content', data.content);
      if (image) formData.append('image', image);
      const r = await axios.put(`/api/posts/${id}`, formData);
      return r.data;
    },
    deletePost: async (id: string) => {
      const r = await postsControllerRemove(id);
      return r.data;
    },
  };
}

export default createClient;
