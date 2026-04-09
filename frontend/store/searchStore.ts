import { create } from 'zustand';

export type SortMode = 'new' | 'popular';

interface SearchState {
  query:    string;
  hashtag:  string | null;
  sort:     SortMode;

  setQuery:   (q: string) => void;
  setHashtag: (tag: string | null) => void;
  setSort:    (sort: SortMode) => void;
  reset:      () => void;
}

const INITIAL: Pick<SearchState, 'query' | 'hashtag' | 'sort'> = {
  query:   '',
  hashtag: null,
  sort:    'new',
};

export const useSearchStore = create<SearchState>((set) => ({
  ...INITIAL,

  setQuery:   (q)    => set({ query: q, hashtag: null }),
  setHashtag: (tag)  => set({ hashtag: tag, query: '' }),
  setSort:    (sort) => set({ sort }),
  reset:      ()     => set({ ...INITIAL }),
}));