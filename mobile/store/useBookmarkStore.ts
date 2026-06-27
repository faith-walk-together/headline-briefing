import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Article {
  category: string;
  outlet: string;
  title: string;
  link: string;
  summary: string;
  pub_date: string;
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
      name: 'headline-bookmarks', // unique name
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
