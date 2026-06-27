import { create } from 'zustand';
import { Article } from './useBookmarkStore';

interface UIState {
  selectedArticle: Article | null;
  setSelectedArticle: (article: Article | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedArticle: null,
  setSelectedArticle: (article) => set({ selectedArticle: article }),
}));
