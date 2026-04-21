import { PostsControllerCreateBodyPostType } from "../../../../packages/api-client/src/index";

export const POST_TYPE_OPTIONS = [
  { value: PostsControllerCreateBodyPostType.cat, label: "猫" },
] as const;

export const POST_TYPE_SELECT_ID = "postType";
