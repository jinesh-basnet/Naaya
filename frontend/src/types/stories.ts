export interface Story {
  _id: string;
  author: {
    _id: string;
    username: string;
    fullName: string;
    profilePicture?: string;
  };
  content?: string;
  media?: {
    type: string;
    url: string;
  };
  createdAt: string;
  hasViewed?: boolean;
  viewsCount: number;
}

export interface StoriesFeedResponse {
  message: string;
  stories: Story[];
  unseenCount?: { [authorId: string]: number };
}

export interface DisplayStoryItem {
  id?: string;
  author: {
    _id?: string;
    username: string;
    fullName: string;
    profilePicture?: string;
  };
  isOwn?: boolean;
  stories?: Story[];
  hasUnseen?: boolean;
  unseenCount?: number;
}
