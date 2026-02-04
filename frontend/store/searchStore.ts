import { create } from 'zustand';

type SortMode = 'new' | 'popular';

interface SearchState {
  query: string;
  hashtag: string | null;
  sort: SortMode;

  setQuery: (q: string) => void;
  setHashtag: (tag: string | null) => void;
  setSort: (sort: SortMode) => void;
  reset: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  hashtag: null,
  sort: 'new',

  setQuery: (q) => set({ query: q, hashtag: null }),
  setHashtag: (tag) => set({ hashtag: tag, query: '' }),
  setSort: (sort) => set({ sort }),
  reset: () => set({ query: '', hashtag: null, sort: 'new' }),
}));
