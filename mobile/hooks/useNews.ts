import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { Article } from '@/store/useBookmarkStore';

// Development fallback data
const localNewsData = require('@/assets/data/latest_news.json');

interface NewsResponse {
  last_updated: string;
  articles: Article[];
}

export function useNews() {
  return useQuery<NewsResponse, Error>({
    queryKey: ['news'],
    queryFn: async () => {
      const apiUrl = Constants.expoConfig?.extra?.apiUrl;
      
      if (apiUrl) {
        try {
          const response = await fetch(apiUrl);
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          const data = await response.json();
          return data;
        } catch (error) {
          console.warn('Failed to fetch from remote URL, falling back to local data.', error);
          // Fallback to local data if fetch fails (e.g., GH Pages not deployed yet)
          return localNewsData;
        }
      }

      // If no URL is set, just use local mock data
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(localNewsData);
        }, 800);
      });
    },
    // Refresh every 5 minutes in background
    staleTime: 5 * 60 * 1000,
  });
}
