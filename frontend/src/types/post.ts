export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

export interface User {
  _id: string;
  id?: string;
  name: string;
  username: string;
  profilePicture?: string | {
    url: string;
    publicId: string;
  } | {
    type: null;
    url: string;
  };
}

export interface Reaction {
  type: ReactionType;
  user: User;
}

export interface Comment {
  _id: string;
  id?: string;
  content: string;
  user: User | string;
  createdAt: string;
  reactions?: Reaction[];
  replies?: Comment[];
}

export interface Post {
  _id: string;
  id?: string;
  content: string;
  user: User;
  createdAt: string;
  media?: {
    type: 'image' | 'video';
    url: string;
  };
  likes?: User[];
  reactions?: Reaction[];
  comments?: Comment[];
} 