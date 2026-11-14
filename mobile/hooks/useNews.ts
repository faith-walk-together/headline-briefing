import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { Article, MarketTicker, useBookmarkStore } from '@/store/useBookmarkStore';

// Development / Offline fallback data
const localNewsData = require('@/assets/data/latest_news.json');
const localArchiveIndex = require('@/assets/data/archive_index.json');

export interface NewsResponse {
  last_updated: string;
  edition?: string;
  edition_id?: string;
  market_tickers?: MarketTicker[];
  articles: Article[];
  stock_articles?: Article[];
}

export interface EditionEntry {
  id: string;
  edition: string;
  last_updated: string;
  file: string;
  article_count?: number;
  stock_count?: number;
}

export interface ArchiveIndexResponse {
  editions: EditionEntry[];
}

function getBaseRemoteUrl(): string | null {
  const apiUrl = Constants.expoConfig?.extra?.apiUrl;
  if (!apiUrl || typeof apiUrl !== 'string') return null;
  const idx = apiUrl.lastIndexOf('/');
  return idx !== -1 ? apiUrl.slice(0, idx) : null;
}

export function useArchiveIndex() {
  return useQuery<ArchiveIndexResponse, Error>({
    queryKey: ['archive_index'],
    queryFn: async () => {
      const baseUrl = getBaseRemoteUrl();
      if (baseUrl) {
        try {
          const response = await fetch(`${baseUrl}/archive_index.json?t=${new Date().getTime()}`, {
            headers: {
              'Cache-Control': 'no-cache',
              Pragma: 'no-cache',
            },
          });
          if (response.ok) {
            const data: ArchiveIndexResponse = await response.json();
            if (data?.editions?.length) {
              return data;
            }
          }
        } catch {
          // Silently fall back to bundled archive_index.json
        }
      }
      return localArchiveIndex;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useNews() {
  const selectedEditionFile = useBookmarkStore((state) => state.selectedEditionFile);

  return useQuery<NewsResponse, Error>({
    queryKey: ['news', selectedEditionFile ?? 'latest'],
    queryFn: async () => {
      const apiUrl = Constants.expoConfig?.extra?.apiUrl;
      const baseUrl = getBaseRemoteUrl();

      const targetUrl =
        selectedEditionFile && baseUrl
          ? `${baseUrl}/${selectedEditionFile}`
          : apiUrl;

      if (targetUrl) {
        try {
          // Add timestamp query param and no-cache headers to bypass GitHub Pages CDN & OS HTTP cache
          const response = await fetch(`${targetUrl}?t=${new Date().getTime()}`, {
            headers: {
              'Cache-Control': 'no-cache',
              Pragma: 'no-cache',
            },
          });
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          const data: NewsResponse = await response.json();
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
