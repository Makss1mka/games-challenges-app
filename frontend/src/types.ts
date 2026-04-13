export type UserDto = {
  id: string;
  username: string;
  email: string;
  role: string;
  status: string;
  createdAtUtc: string;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  expiresAtUtc: string;
  user: UserDto;
};

export type GameDto = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  developer?: string | null;
  publisher?: string | null;
  releaseDate?: string | null;
  imageUrl?: string | null;
  tags: string[];
};

export type TagDto = {
  id: string;
  name: string;
};

export type LibraryItemDto = {
  userId: string;
  gameId: string;
  gameTitle: string;
  gameSlug: string;
  source: string;
  status: string;
  addedAtUtc: string;
};

export type ImportResult = {
  provider: string;
  requestedProfileId: string;
  resolvedProfileId: string;
  displayName?: string | null;
  importedGamesCount: number;
  addedToLibraryCount: number;
  alreadyInLibraryCount: number;
  games: Array<{
    gameId: string;
    title: string;
    slug: string;
    externalGameId: string;
    addedToLibrary: boolean;
  }>;
};

export type Challenge = {
  id: string;
  user_id: string;
  name: string;
  card_description: string;
  card_picture_url: string;
  tags: string[];
  game: {
    id: string;
    name: string;
    author_name: string;
  };
  status: string;
  likes_count: number;
  dislikes_count: number;
  comments_count: number;
  description?: Array<{
    type: "text" | "picture" | "link";
    content: string;
    order: number;
    text?: string;
    alt_text?: string;
  }>;
  author_name: string;
};

export type ChallengeListResponse = {
  data: Challenge[];
  current_page: number;
  page_size: number;
  total_pages: number;
};

export type ChallengeComment = {
  id: string;
  challenge_id: string;
  user_id: string;
  author_name: string;
  message: string;
  attachments: string[];
  created_at: string;
};

export type ChallengeCommentsResponse = {
  data: ChallengeComment[];
  current_page: number;
  page_size: number;
  total_pages: number;
};

export type ChallengeReaction = {
  likes_count: number;
  dislikes_count: number;
};
