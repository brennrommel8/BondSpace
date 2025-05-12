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
  id: string;
  _id?: string;
  content: string;
  createdAt: string;
  user: {
    name: string;
    username: string;
    profilePicture: string | { url: string; publicId: string };
  };
  likes: Array<{
    name: string;
    username: string;
    profilePicture: string | { url: string; publicId: string };
  }>;
  comments: Array<{
    id: string;
    _id?: string;
    content: string;
    createdAt: string;
    user: {
      name: string;
      username: string;
      profilePicture: string | { url: string; publicId: string };
    };
    reactions?: Array<{
      type: ReactionType;
      user: {
        _id: string;
        id: string;
        name: string;
        username: string;
        profilePicture: string | { url: string; publicId: string };
      };
    }>;
    replies: Array<{
      id: string;
      _id?: string;
      content: string;
      createdAt: string;
      user: {
        name: string;
        username: string;
        profilePicture: string | { url: string; publicId: string };
      };
      reactions?: Array<{
        type: ReactionType;
        user: {
          _id: string;
          id: string;
          name: string;
          username: string;
          profilePicture: string | { url: string; publicId: string };
        };
      }>;
    }>;
  }>;
  reactions?: Array<{
    type: ReactionType;
    user: {
      _id: string;
      id: string;
      name: string;
      username: string;
      profilePicture: string | { url: string; publicId: string };
    };
  }>;
  media: Array<{
    type: 'image' | 'video';
    url: string;
    publicId?: string;
  }>;
} 