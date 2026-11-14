import { create } from 'zustand';
import { Article } from './useBookmarkStore';

interface UIState {
  selectedArticle: Article | null;
  isScrolling: boolean;
  setSelectedArticle: (article: Article | null) => void;
  setIsScrolling: (isScrolling: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedArticle: null,
  isScrolling: false,
  setSelectedArticle: (article) => set({ selectedArticle: article }),
  setIsScrolling: (isScrolling) =>
    set((state) => (state.isScrolling === isScrolling ? state : { isScrolling })),
}));
