import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface MarketTicker {
  group: string;
  name: string;
  value: string;
  change: string;
  up: boolean;
  symbol?: string;
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

export interface WatchlistItem {
  symbol: string;
  name: string;
  market: 'KR' | 'US';
  query?: string;
}

export interface StockFundamentals {
  earnings_date: string;
  earnings_is_confirmed?: boolean;
  quarter_period: string;
  quarter_revenue: string;
  quarter_op_profit: string;
  quarter_net_income: string;
  annual_period: string;
  annual_revenue: string;
  annual_op_profit: string;
  target_price: string;
  investment_opinion: string;
  market_cap: string;
  trading_volume: string;
  day_range: string;
  week52_high: string;
  week52_low: string;
  week52_pos: number;
  per: string;
  eps: string;
  pbr: string;
  dividend_yield: string;
  foreign_rate: string;
  investor_trend: string;
}

export interface StockReport {
  symbol: string;
  name: string;
  market: 'KR' | 'US' | string;
  value: string;
  change: string;
  up: boolean;
  signal: 'BULL' | 'BEAR' | string;
  analysis_headline: string;
  key_points: string[];
  analysis_paragraphs: string[];
  fundamentals?: StockFundamentals;
  related_articles: Article[];
}

export const DEFAULT_WATCHLIST: WatchlistItem[] = [
  {
    symbol: '005930.KS',
    name: '삼성전자',
    market: 'KR',
    query: '삼성전자 주가 OR 반도체 OR 실적',
  },
  {
    symbol: '000660.KS',
    name: 'SK하이닉스',
    market: 'KR',
    query: 'SK하이닉스 HBM OR 주가 OR 실적',
  },
  {
    symbol: '000500.KS',
    name: '가온전선',
    market: 'KR',
    query: '가온전선 주가 OR 전력망 OR 전선',
  },
  {
    symbol: '036930.KQ',
    name: '주성엔지니어링',
    market: 'KR',
    query: '주성엔지니어링 주가 OR 반도체 장비 OR 실적',
  },
  {
    symbol: '009150.KS',
    name: '삼성전기',
    market: 'KR',
    query: '삼성전기 MLCC OR 기판 OR 주가',
  },
  {
    symbol: '003670.KS',
    name: '포스코퓨처엠',
    market: 'KR',
    query: '포스코퓨처엠 양극재 OR 이차전지 OR 주가',
  },
  {
    symbol: '006400.KS',
    name: '삼성SDI',
    market: 'KR',
    query: '삼성SDI 배터리 OR 전고체 OR 주가',
  },
  {
    symbol: '181710.KS',
    name: 'NHN',
    market: 'KR',
    query: 'NHN 클라우드 OR 게임 OR 주가',
  },
  {
    symbol: '053800.KQ',
    name: '안랩',
    market: 'KR',
    query: '안랩 보안 OR 사이버보안 OR 주가',
  },
  {
    symbol: '180640.KS',
    name: '한진칼',
    market: 'KR',
    query: '한진칼 주가 OR 지배구조 OR 대한항공',
  },
  {
    symbol: '003490.KS',
    name: '대한항공',
    market: 'KR',
    query: '대한항공 주가 OR 항공 화물 OR 합병',
  },
  {
    symbol: '010950.KS',
    name: 'S-Oil',
    market: 'KR',
    query: 'S-Oil 에쓰오일 정제마진 OR 유가 OR 주가',
  },
  {
    symbol: '096770.KS',
    name: 'SK이노베이션',
    market: 'KR',
    query: 'SK이노베이션 정유 OR 배터리 OR 주가',
  },
  {
    symbol: '002680.KQ',
    name: '한탑',
    market: 'KR',
    query: '한탑 사료 OR 곡물 OR 주가',
  },
  {
    symbol: '124500.KQ',
    name: '아이티센글로벌',
    market: 'KR',
    query: '아이티센글로벌 OR 아이티센 금거래소 OR 주가',
  },
];

interface BookmarkState {
  bookmarks: Article[];
  watchlist: WatchlistItem[];
  githubToken: string;
  selectedEditionFile: string | null;
  selectedEditionLabel: string | null;
  addBookmark: (article: Article) => void;
  removeBookmark: (link: string) => void;
  isBookmarked: (link: string) => boolean;
  addWatchlistItem: (item: WatchlistItem) => void;
  removeWatchlistItem: (symbol: string) => void;
  setGithubToken: (token: string) => void;
  setSelectedEdition: (file: string | null, label: string | null) => void;
}

export async function syncWatchlistToGithubRepo(
  stocks: WatchlistItem[],
  githubToken: string
): Promise<{ ok: boolean; message: string }> {
  const token = githubToken.trim();
  if (!token) {
    return {
      ok: false,
      message: '로컬에 저장되었습니다. (GitHub 토큰 입력 시 다음 파이프라인과 자동 동기화됩니다)',
    };
  }

  const repoPath = 'faith-walk-together/headline-briefing';
  const filePath = 'pipeline/watchlist.json';
  const apiUrl = `https://api.github.com/repos/${repoPath}/contents/${filePath}`;

  try {
    const getResp = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
    });

    let sha: string | undefined;
    if (getResp.ok) {
      const existing = await getResp.json();
      sha = existing.sha;
    }

    const jsonStr = JSON.stringify({ stocks }, null, 2);
    // UTF-8 safe base64 encoding
    const utf8Bytes = encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    );
    const contentBase64 = btoa(utf8Bytes);

    const putResp = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'chore: update watchlist.json from mobile app [skip ci]',
        content: contentBase64,
        ...(sha ? { sha } : {}),
      }),
    });

    if (putResp.ok) {
      return {
        ok: true,
        message: '파이프라인 설정(watchlist.json)에 동기화 완료!',
      };
    }
    return {
      ok: false,
      message: `GitHub 동기화 실패 (${putResp.status}). 토큰 권한(Contents: Read/Write)을 확인해주세요.`,
    };
  } catch {
    return {
      ok: false,
      message: '네트워크 오류로 로컬에만 저장되었습니다.',
    };
  }
}

export const useBookmarkStore = create<BookmarkState>()(
  persist(
    (set, get) => ({
      bookmarks: [],
      watchlist: DEFAULT_WATCHLIST,
      githubToken: '',
      selectedEditionFile: null,
      selectedEditionLabel: null,
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
      addWatchlistItem: (item) =>
        set((state) => {
          const normalizedSymbol = item.symbol.trim().toUpperCase();
          if (
            state.watchlist.some(
              (w) =>
                w.symbol.toUpperCase() === normalizedSymbol ||
                w.name.trim() === item.name.trim()
            )
          ) {
            return state;
          }
          const updated = [
            ...state.watchlist,
            {
              ...item,
              symbol: normalizedSymbol,
              name: item.name.trim(),
            },
          ];
          if (state.githubToken) {
            syncWatchlistToGithubRepo(updated, state.githubToken);
          }
          return { watchlist: updated };
        }),
      removeWatchlistItem: (symbol) =>
        set((state) => {
          const updated = state.watchlist.filter(
            (w) => w.symbol.toUpperCase() !== symbol.toUpperCase()
          );
          if (state.githubToken) {
            syncWatchlistToGithubRepo(updated, state.githubToken);
          }
          return { watchlist: updated };
        }),
      setGithubToken: (token) => set({ githubToken: token }),
      setSelectedEdition: (file, label) =>
        set({
          selectedEditionFile: file,
          selectedEditionLabel: label,
        }),
    }),
    {
      name: 'headline-bookmarks',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          return {
            ...persistedState,
            watchlist: DEFAULT_WATCHLIST,
          };
        }
        return persistedState;
      },
      partialize: (state) => ({
        bookmarks: state.bookmarks,
        watchlist: state.watchlist,
        githubToken: state.githubToken,
      }),
    }
  )
);
