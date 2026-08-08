import { api } from '../http';

export interface CommentRow {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  createdAt: string;
}

export const commentsRepository = {
  list: (postId: string) =>
    api.get<CommentRow[]>('/comments', { params: { postId } }),

  create: (input: { postId: string; userId: string; userName: string; userAvatar?: string; content: string }) =>
    api.post<CommentRow>('/comments', input),
};
