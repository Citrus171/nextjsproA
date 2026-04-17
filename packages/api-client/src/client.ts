import axios, { type AxiosError } from "axios";
import type { InternalAxiosRequestConfig, AxiosResponse } from "axios";
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
  mapControllerGetMarkers,
} from "./index";

export type ClientOptions = {
  baseURL?: string;
  getToken?: () => Promise<string | null> | string | null;
  setToken?: (t: string | null) => void;
  onUnauthorized?: () => void;
};

export function createClient(options: ClientOptions) {
  if (options.baseURL) axios.defaults.baseURL = options.baseURL;

  const reqId = axios.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    try {
      const token = options.getToken ? await options.getToken() : null;
      if (token) {
        (config.headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
      }
    } catch (e) {}
    return config;
  });

  let isRefreshing = false;
  let refreshQueue: Array<(value: string | null) => void> = [];

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

  const resId = axios.interceptors.response.use(
    (res: AxiosResponse) => res,
    async (err: AxiosError) => {
      const original = err?.config;
      if (!original) return Promise.reject(err);
      if (err?.response?.status === 401 && !(original as InternalAxiosRequestConfig & { _retry?: boolean })._retry) {
        (original as InternalAxiosRequestConfig & { _retry?: boolean })._retry = true;
        const newToken = await doRefresh();
        if (newToken) {
          original.headers = original.headers || {};
          (original.headers as Record<string, string>)["Authorization"] = `Bearer ${newToken}`;
          return axios(original);
        }
      }
      return Promise.reject(err);
    },
  );

  return {
    dispose: () => {
      axios.interceptors.request.eject(reqId);
      axios.interceptors.response.eject(resId);
    },
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
    listPosts: async (page = 1, perPage = 10) => {
      const r = await postsControllerList({ params: { page, perPage } });
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
      const r = await postsControllerUpdate(id, { ...data, image });
      return r.data;
    },
    deletePost: async (id: string) => {
      const r = await postsControllerRemove(id);
      return r.data;
    },
    getMapMarkers: async () => {
      const r = await mapControllerGetMarkers();
      return r.data;
    },
  };
}

export default createClient;
