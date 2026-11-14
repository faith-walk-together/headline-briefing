import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface MarketTicker {
  group: string;
  name: string;
  value: string;
  change: string;
  up: boolean;
}

export interface Article {
  category: string;
  outlet: string;
  is_foreign?: boolean;
  original_title?: string;
  title: string;
  link: string;
  summary: string;
  summary_lines?: string[];
  full_body?: string[];
  image_url?: string;
  pub_date: string;
  signal?: 'BULL' | 'BEAR' | '';
  signal_label?: string;
}

interface BookmarkState {
  bookmarks: Article[];
  addBookmark: (article: Article) => void;
  removeBookmark: (link: string) => void;
  isBookmarked: (link: string) => boolean;
}

export const useBookmarkStore = create<BookmarkState>()(
  persist(
    (set, get) => ({
      bookmarks: [],
      addBookmark: (article) =>
        set((state) => ({
          bookmarks: state.bookmarks.some((b) => b.link === article.link)
            ? state.bookmarks
            : [...state.bookmarks, article],
        })),
      removeBookmark: (link) =>
        set((state) => ({
          bookmarks: state.bookmarks.filter((b) => b.link !== link),
        })),
      isBookmarked: (link) => get().bookmarks.some((b) => b.link === link),
    }),
    {
      name: 'headline-bookmarks',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
