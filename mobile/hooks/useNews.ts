import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { Article, MarketTicker } from '@/store/useBookmarkStore';

// Development / Offline fallback data
const localNewsData = require('@/assets/data/latest_news.json');

export interface NewsResponse {
  last_updated: string;
  edition?: string;
  market_tickers?: MarketTicker[];
  articles: Article[];
  stock_articles?: Article[];
}

export function useNews() {
  return useQuery<NewsResponse, Error>({
    queryKey: ['news'],
    queryFn: async () => {
      const apiUrl = Constants.expoConfig?.extra?.apiUrl;

      if (apiUrl) {
        try {
          // Add timestamp query param and no-cache headers to bypass GitHub Pages CDN & OS HTTP cache
          const response = await fetch(`${apiUrl}?t=${new Date().getTime()}`, {
            headers: {
              'Cache-Control': 'no-cache',
              Pragma: 'no-cache',
            },
          });
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          const data: NewsResponse = await response.json();
          // Ensure backward compatibility if remote JSON has not yet run v2.0 pipeline
          return {
            ...localNewsData,
            ...data,
            market_tickers: data.market_tickers?.length
              ? data.market_tickers
              : localNewsData.market_tickers,
            stock_articles: data.stock_articles?.length
              ? data.stock_articles
              : localNewsData.stock_articles,
          };
        } catch (error) {
          console.warn('Failed to fetch from remote URL, falling back to local data.', error);
          return localNewsData;
        }
      }

      return localNewsData;
    },
    staleTime: 5 * 60 * 1000,
  });
}
