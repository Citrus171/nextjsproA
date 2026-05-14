import axios, { type AxiosError } from "axios";
import type { InternalAxiosRequestConfig, AxiosResponse } from "axios";
import {
  authControllerLogin,
  authControllerRefresh,
  authControllerLogout,
  type PostsControllerCreateBody,
  type UpdatePostDto,
  type AddImagesResponseDto,
  postsControllerList,
  postsControllerCreate,
  postsControllerUpdate,
  postsControllerGet,
  postsControllerRemove,
  postsControllerAddImages,
  postsControllerRemoveImage,
  usersControllerRegister,
  mapControllerGetMarkers,
  conversationsControllerFindAll,
  conversationsControllerCreate,
  conversationsControllerFindOne,
  conversationsControllerFindMessages,
  conversationsControllerCreateMessage,
  conversationsControllerMarkAsRead,
  type ConversationsControllerCreateMessageBodyOne,
  type PostsControllerListParams,
  sightingsControllerCreate,
  sightingsControllerFindByPost,
  sightingsControllerFindOne,
  sightingsControllerRemove,
  conversationsControllerGetUnreadCount,
} from "./index";

export type CreateSightingInput = {
  lat: number;
  lng: number;
  sightedAt: string;
  postId?: string;
  address?: string;
  comment?: string;
};

export type ClientOptions = {
  baseURL?: string;
  getToken?: () => Promise<string | null> | string | null;
  setToken?: (t: string | null) => void;
  onUnauthorized?: () => void;
  /** AuthProvider の refresh 関数を注入して refresh 競合を防ぐ */
  refreshToken?: () => Promise<string | null>;
};

export function createClient(options: ClientOptions) {
  if (options.baseURL) axios.defaults.baseURL = options.baseURL;
  axios.defaults.withCredentials = true;

  const reqId = axios.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      try {
        const token = options.getToken ? await options.getToken() : null;
        if (token) {
          (config.headers as Record<string, string>)["Authorization"] =
            `Bearer ${token}`;
        }
      } catch (e) {}
      return config;
    }
  );

  let isRefreshing = false;
  let refreshQueue: Array<(value: string | null) => void> = [];

  async function doRefresh() {
    if (isRefreshing) {
      return new Promise<string | null>((res) => refreshQueue.push(res));
    }
    isRefreshing = true;
    try {
      let t: string | null;
      if (options.refreshToken) {
        // AuthProvider 経由で refresh — AuthProvider が token 保存とミューテックスを管理
        t = await options.refreshToken();
      } else {
        const r = await authControllerRefresh();
        t = r?.data?.accessToken ?? null;
        if (t && options.setToken) options.setToken(t);
      }
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
      if (
        err?.response?.status === 401 &&
        !(original as InternalAxiosRequestConfig & { _retry?: boolean })
          ._retry &&
        !original.url?.includes("/auth/refresh")
      ) {
        (original as InternalAxiosRequestConfig & { _retry?: boolean })._retry =
          true;
        const newToken = await doRefresh();
        if (newToken) {
          original.headers = original.headers || {};
          (original.headers as Record<string, string>)["Authorization"] =
            `Bearer ${newToken}`;
          return axios(original);
        }
      }
      return Promise.reject(err);
    }
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
      password: string
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
    listPosts: async (page = 1, perPage = 10, mine?: boolean) => {
      const params: Partial<PostsControllerListParams> & {
        page?: number;
        perPage?: number;
      } = { page, perPage };
      if (mine) params.mine = "true";
      const r = await postsControllerList(params as PostsControllerListParams);
      return r.data;
    },
    createPost: async (data: PostsControllerCreateBody) => {
      const r = await postsControllerCreate(data);
      return r.data;
    },
    getPost: async (id: string) => {
      const r = await postsControllerGet(id);
      return r.data;
    },
    updatePost: async (id: string, data: UpdatePostDto) => {
      const r = await postsControllerUpdate(id, data);
      return r.data;
    },
    deletePost: async (id: string) => {
      const r = await postsControllerRemove(id);
      return r.data;
    },
    addImages: async (
      id: string,
      images: File[]
    ): Promise<AddImagesResponseDto> => {
      const r = await postsControllerAddImages(id, { images });
      return r.data;
    },
    deleteImage: async (id: string, imageId: string) => {
      await postsControllerRemoveImage(id, imageId);
    },
    getMapMarkers: async (params?: {
      minLat?: number;
      maxLat?: number;
      minLng?: number;
      maxLng?: number;
    }) => {
      const r = await mapControllerGetMarkers(params);
      return r.data;
    },
    listConversations: async () => {
      const r = await conversationsControllerFindAll();
      return r.data;
    },
    createConversation: async (postId: string, sightingId: string) => {
      const r = await conversationsControllerCreate({ postId, sightingId });
      return r.data;
    },
    getConversation: async (id: string) => {
      const r = await conversationsControllerFindOne(id);
      return r.data;
    },
    getMessages: async (id: string) => {
      const r = await conversationsControllerFindMessages(id);
      return r.data;
    },
    sendMessage: async (
      id: string,
      body: ConversationsControllerCreateMessageBodyOne
    ) => {
      if (body.image) {
        const formData = new FormData();
        if (body.body) formData.append("body", body.body);
        formData.append("image", body.image);
        const r = await axios.post(
          `/api/conversations/${id}/messages`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        return r.data;
      }
      const r = await conversationsControllerCreateMessage(id, body);
      return r.data;
    },
    markAsRead: async (id: string) => {
      await conversationsControllerMarkAsRead(id);
    },
    getUnreadCount: async () => {
      const r = await conversationsControllerGetUnreadCount();
      return r.data;
    },
    getSighting: async (id: string) => {
      const r = await sightingsControllerFindOne(id);
      return r.data;
    },
    createSighting: async (data: CreateSightingInput) => {
      const r = await sightingsControllerCreate(data);
      return r.data;
    },
    findSightingsByPost: async (postId: string) => {
      const r = await sightingsControllerFindByPost({ postId });
      return r.data;
    },
    deleteSighting: async (id: string) => {
      await sightingsControllerRemove(id);
    },
  };
}

export default createClient;
