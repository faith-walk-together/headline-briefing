import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { useNews, useArchiveIndex } from '@/hooks/useNews';
import { useScrollTabVisibility } from '@/hooks/useScrollTabVisibility';
import { MarketTickerBar } from '@/components/MarketTickerBar';
import { EditionPickerModal } from '@/components/EditionPickerModal';
import { WatchlistModal } from '@/components/WatchlistModal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  Article,
  MarketTicker,
  StockFundamentals,
  StockReport,
  WatchlistItem,
  useBookmarkStore,
} from '@/store/useBookmarkStore';
import { useUIStore } from '@/store/useUIStore';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Fonts } from '@/constants/theme';

interface LiveQuote {
  value: string;
  change: string;
  up: boolean;
}

// 테스트용 플래그: true일 때는 리포트 탭 진입 시마다 항상 팝업을 표시하며,
// false로 설정하면 하루에 한 번(todayKey 기준)만 표시됩니다.
const TEST_ALWAYS_SHOW_EARNINGS_POPUP = false;

interface EarningsScheduleItem {
  symbol: string;
  name: string;
  market: 'KR' | 'US';
  dateText: string;
  dDayLabel: string;
  isWithin7Days: boolean;
  sortTimestamp: number;
  opProfit: string;
  revenue: string;
}

function parseEarningsScheduleInfo(rawDateStr?: string): {
  isWithin7Days: boolean;
  dDayLabel: string;
  dateText: string;
  sortTimestamp: number;
} {
  const cleanText = (rawDateStr || '일정 확인 중')
    .replace(/\s*\([1-4]Q[^)]*\)/gi, '')
    .trim();

  if (!rawDateStr || rawDateStr === '-') {
    return {
      isWithin7Days: false,
      dDayLabel: '예정',
      dateText: '일정 확인 중',
      sortTimestamp: Number.MAX_SAFE_INTEGER,
    };
  }

  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  let targetDate: Date | null = null;

  // 1. YYYY.MM.DD 또는 YYYY-MM-DD 형식
  const fullMatch = rawDateStr.match(/(20\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if (fullMatch) {
    const y = parseInt(fullMatch[1], 10);
    const m = parseInt(fullMatch[2], 10) - 1;
    const d = parseInt(fullMatch[3], 10);
    targetDate = new Date(y, m, d);
  }

  // 2. "M월 D일" 형식 (예: "11월 18일 실적발표")
  if (!targetDate) {
    const krMatch = rawDateStr.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
    if (krMatch) {
      const m = parseInt(krMatch[1], 10) - 1;
      const d = parseInt(krMatch[2], 10);
      let y = now.getFullYear();
      if (m < now.getMonth() - 1) {
        y += 1;
      }
      targetDate = new Date(y, m, d);
    }
  }

  // 3. "YYYY.MM 초/중순/하순/말" 형식
  if (!targetDate) {
    const ymPeriodMatch = rawDateStr.match(/(20\d{2})[.\-/](\d{1,2})\s*(초|중순|하순|말)/);
    if (ymPeriodMatch) {
      const y = parseInt(ymPeriodMatch[1], 10);
      const m = parseInt(ymPeriodMatch[2], 10) - 1;
      const periodWord = ymPeriodMatch[3];
      const approxDay =
        periodWord === '초'
          ? 8
          : periodWord === '중순'
            ? 15
            : periodWord === '하순'
              ? 25
              : 28;
      targetDate = new Date(y, m, approxDay);
    }
  }

  if (!targetDate || isNaN(targetDate.getTime())) {
    return {
      isWithin7Days: false,
      dDayLabel: '예정',
      dateText: cleanText,
      sortTimestamp: Number.MAX_SAFE_INTEGER,
    };
  }

  const targetMidnight = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate()
  ).getTime();
  const diffDays = Math.round((targetMidnight - todayMidnight) / (1000 * 60 * 60 * 24));

  return {
    isWithin7Days: diffDays >= 0 && diffDays <= 7,
    dDayLabel: diffDays === 0 ? 'D-Day' : diffDays > 0 ? `D-${diffDays}` : '발표완료',
    dateText: cleanText,
    sortTimestamp: targetMidnight,
  };
}

export default function ReportScreen() {
  const { data, isLoading, isError, refetch, isRefetching } = useNews();
  const { data: archiveIndex } = useArchiveIndex();
  const scrollHandlers = useScrollTabVisibility();

  const watchlist = useBookmarkStore((state) => state.watchlist);
  const selectedEditionFile = useBookmarkStore((state) => state.selectedEditionFile);
  const selectedEditionLabel = useBookmarkStore((state) => state.selectedEditionLabel);
  const setSelectedEdition = useBookmarkStore((state) => state.setSelectedEdition);
  const lastEarningsPopupDate = useBookmarkStore((state) => state.lastEarningsPopupDate);
  const setLastEarningsPopupDate = useBookmarkStore((state) => state.setLastEarningsPopupDate);
  const setSelectedArticle = useUIStore((state) => state.setSelectedArticle);

  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [watchlistModalVisible, setWatchlistModalVisible] = useState(false);
  const [earningsPopupVisible, setEarningsPopupVisible] = useState(false);
  const [liveQuotes, setLiveQuotes] = useState<Record<string, LiveQuote>>({});
  const isTabFocusedRef = useRef(false);

  const backgroundColor = useThemeColor({}, 'background');
  const chromeColor = useThemeColor({}, 'chrome');
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const subtextColor = useThemeColor({}, 'subtext');
  const borderColor = useThemeColor({}, 'border');
  const dividerColor = useThemeColor({}, 'divider');
  const accentColor = useThemeColor({}, 'accent');
  const bullColor = useThemeColor({}, 'bull');
  const bearColor = useThemeColor({}, 'bear');

  // 기본 선택 종목 유지 및 보정
  useEffect(() => {
    if (watchlist.length > 0) {
      const exists = watchlist.some(
        (w) => w.symbol.toUpperCase() === selectedSymbol.toUpperCase()
      );
      if (!selectedSymbol || !exists) {
        setSelectedSymbol(watchlist[0].symbol);
      }
    } else {
      setSelectedSymbol('');
    }
  }, [watchlist, selectedSymbol]);

  // 앱에서 새로 추가한 종목(파이프라인 실행 전)에 대해 실시간 시세 보조 조회
  useEffect(() => {
    const existingSymbols = new Set(
      (data?.stock_reports ?? []).map((r) => r.symbol.toUpperCase())
    );
    const missingStocks = watchlist.filter(
      (w) =>
        !existingSymbols.has(w.symbol.toUpperCase()) &&
        !liveQuotes[w.symbol.toUpperCase()]
    );

    if (missingStocks.length === 0) return;

    let cancelled = false;
    missingStocks.forEach(async (item: WatchlistItem) => {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
          item.symbol
        )}?interval=1d&range=1d`;
        const resp = await fetch(url);
        if (!resp.ok) return;
        const json = await resp.json();
        const meta = json?.chart?.result?.[0]?.meta;
        if (!meta || cancelled) return;
        const price = Number(meta.regularMarketPrice || 0);
        const prev = Number(meta.chartPreviousClose || meta.previousClose || price);
        if (price > 0 && prev > 0) {
          const pct = ((price - prev) / prev) * 100;
          const sign = pct >= 0 ? '+' : '';
          const valueStr =
            item.market === 'KR'
              ? `${Math.round(price).toLocaleString()}원`
              : `$${price.toFixed(2)}`;
          setLiveQuotes((prevMap) => ({
            ...prevMap,
            [item.symbol.toUpperCase()]: {
              value: valueStr,
              change: `${sign}${pct.toFixed(2)}%`,
              up: pct >= 0,
            },
          }));
        }
      } catch {
        // Ignore live quote fallback error
      }
    });

    return () => {
      cancelled = true;
    };
  }, [watchlist, data?.stock_reports, liveQuotes]);

  // "26-11-14 AM" 형식으로 날짜와 조간/석간(AM/PM) 표시
  const editionText = useMemo(() => {
    if (selectedEditionLabel) return selectedEditionLabel;

    const baseDate = data?.last_updated ? new Date(data.last_updated) : new Date();
    const validDate = isNaN(baseDate.getTime()) ? new Date() : baseDate;

    const yy = String(validDate.getFullYear()).slice(-2);
    const mm = String(validDate.getMonth() + 1).padStart(2, '0');
    const dd = String(validDate.getDate()).padStart(2, '0');

    let period = validDate.getHours() < 15 ? 'AM' : 'PM';
    if (data?.edition) {
      if (
        data.edition.includes('PM') ||
        data.edition.includes('석간') ||
        data.edition.includes('19:00')
      ) {
        period = 'PM';
      } else if (
        data.edition.includes('AM') ||
        data.edition.includes('조간') ||
        data.edition.includes('07:00')
      ) {
        period = 'AM';
      }
    }

    return `${yy}-${mm}-${dd} ${period}`;
  }, [data?.last_updated, data?.edition, selectedEditionLabel]);

  // 관심종목별 리포트 매핑 (파이프라인 데이터 우선 + 신규 추가 종목 즉시 폴백 생성)
  const reportsBySymbol = useMemo(() => {
    const map: Record<string, StockReport> = {};
    for (const r of data?.stock_reports ?? []) {
      map[r.symbol.toUpperCase()] = r;
    }

    const allArticles: Article[] = [
      ...(data?.stock_articles ?? []),
      ...(data?.articles ?? []),
    ];

    for (const w of watchlist) {
      const symKey = w.symbol.toUpperCase();
      if (!map[symKey]) {
        const live = liveQuotes[symKey];
        const val = live?.value ?? (w.market === 'KR' ? '조회 중' : 'Loading');
        const chg = live?.change ?? '+0.00%';
        const up = live?.up ?? true;

        const matchedArticles = allArticles.filter((a) => {
          const haystack = `${a.title} ${a.summary} ${a.category} ${a.original_title || ''}`.toLowerCase();
          const codeOnly = w.symbol.replace(/\.(KS|KQ)$/i, '').toLowerCase();
          return (
            haystack.includes(w.name.toLowerCase()) ||
            (codeOnly.length >= 2 && haystack.includes(codeOnly))
          );
        });

        const fallbackFundamentals: StockFundamentals = {
          earnings_date: '차기 분기 실적발표 예정',
          earnings_is_confirmed: false,
          quarter_period: '3분기(추정)',
          quarter_revenue: '수집 예정',
          quarter_op_profit: '수집 예정',
          quarter_net_income: '수집 예정',
          annual_period: '추정',
          annual_revenue: '수집 예정',
          annual_op_profit: '수집 예정',
          target_price: '-',
          investment_opinion: '-',
          market_cap: '-',
          trading_volume: '-',
          day_range: '-',
          week52_high: '-',
          week52_low: '-',
          week52_pos: 50,
          per: '-',
          eps: '-',
          pbr: '-',
          dividend_yield: '-',
          foreign_rate: '-',
          investor_trend: '다음 파이프라인 실행 시 MTS 상세 지표가 업데이트됩니다.',
        };

        map[symKey] = {
          symbol: w.symbol,
          name: w.name,
          market: w.market,
          value: val,
          change: chg,
          up,
          signal: up ? 'BULL' : 'BEAR',
          analysis_headline: `${w.name}, 최근 시장 수급 및 업황 모멘텀 종합 브리핑`,
          key_points:
            matchedArticles.length > 0
              ? matchedArticles.slice(0, 3).map((m) => m.title)
              : [
                  `${w.name}(${w.symbol}) 종목이 관심 종목에 등록되었습니다.`,
                  '다음 파이프라인(07:00 / 19:00 KST) 실행 시 전용 AI 등락 분석과 뉴스가 정밀 수집됩니다.',
                  '하단 관련 브리핑 뉴스를 탭하면 상세 본문 팝업을 바로 확인하실 수 있습니다.',
                ],
          analysis_paragraphs: [
            `${w.name}(${w.symbol})은 현재 ${val}(${chg}) 흐름을 나타내고 있으며, 글로벌 매크로 환경 및 해당 섹터의 기관·외국인 수급 변화에 연동하여 움직이고 있습니다.`,
            '관심 종목 설정이 완료되었으므로 다음 브리핑 생성 주기부터 해당 종목의 전용 뉴스 스크랩 및 AI 심층 등락 리포트가 자동으로 포함됩니다.',
          ],
          fundamentals: fallbackFundamentals,
          related_articles:
            matchedArticles.length > 0
              ? matchedArticles.slice(0, 5)
              : (data?.stock_articles ?? []).slice(0, 5),
        };
      }
    }

    return map;
  }, [data?.stock_reports, data?.stock_articles, data?.articles, watchlist, liveQuotes]);

  // 상단 Ticker에 표시할 관심종목 수치 배열
  const watchlistTickers: MarketTicker[] = useMemo(() => {
    return watchlist.map((w) => {
      const report = reportsBySymbol[w.symbol.toUpperCase()];
      return {
        group: w.market,
        name: w.name,
        symbol: w.symbol,
        value: report?.value ?? '-',
        change: report?.change ?? '0.00%',
        up: report?.up ?? true,
      };
    });
  }, [watchlist, reportsBySymbol]);

  const activeReport: StockReport | null = useMemo(() => {
    if (!selectedSymbol) return null;
    return reportsBySymbol[selectedSymbol.toUpperCase()] ?? null;
  }, [selectedSymbol, reportsBySymbol]);

  const fData = activeReport?.fundamentals;

  // 관심 종목 전체의 실적발표 일정을 발표일자 순으로 정렬
  const sortedWatchlistEarnings: EarningsScheduleItem[] = useMemo(() => {
    const items = watchlist.map((w) => {
      const report = reportsBySymbol[w.symbol.toUpperCase()];
      const fund = report?.fundamentals;
      const schedule = parseEarningsScheduleInfo(fund?.earnings_date);
      return {
        symbol: w.symbol,
        name: w.name,
        market: w.market,
        dateText: schedule.dateText,
        dDayLabel: schedule.dDayLabel,
        isWithin7Days: schedule.isWithin7Days,
        sortTimestamp: schedule.sortTimestamp,
        opProfit: fund?.quarter_op_profit || '-',
        revenue: fund?.quarter_revenue || '-',
      };
    });

    return items.sort((a, b) => a.sortTimestamp - b.sortTimestamp);
  }, [watchlist, reportsBySymbol]);

  // 리포트 탭 진입 시 실적발표 일정 팝업 표시 (하루 1회 기록 + 현재 테스트 모드로 진입 시마다 표시)
  useFocusEffect(
    useCallback(() => {
      isTabFocusedRef.current = true;
      const now = new Date();
      const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        now.getDate()
      ).padStart(2, '0')}`;

      if (
        watchlist.length > 0 &&
        (TEST_ALWAYS_SHOW_EARNINGS_POPUP || lastEarningsPopupDate !== todayKey)
      ) {
        setEarningsPopupVisible(true);
        setLastEarningsPopupDate(todayKey);
      }

      return () => {
        isTabFocusedRef.current = false;
      };
    }, [watchlist.length, lastEarningsPopupDate, setLastEarningsPopupDate])
  );

  const handleSelectStockSymbol = (sym: string) => {
    setSelectedSymbol(sym);
  };

  const isBull = activeReport ? activeReport.up || activeReport.signal === 'BULL' : true;
  const signalColor = isBull ? bullColor : bearColor;

  const {
    qLabelPrefix,
    qStatusSuffix,
    annualStatusSuffix,
    cleanEarningsDate,
    isEarningsWithin7Days,
    cleanOpinion,
    dayRangeLines,
  } = useMemo(() => {
    const rawQ = fData?.quarter_period || '3분기(추정)';
    const isConfirmedQ = rawQ.includes('확정');
    let qNum = '분기';
    if (rawQ.includes('1분기') || rawQ.includes('.03')) qNum = '1분기';
    else if (rawQ.includes('2분기') || rawQ.includes('.06')) qNum = '2분기';
    else if (rawQ.includes('3분기') || rawQ.includes('.09')) qNum = '3분기';
    else if (rawQ.includes('4분기') || rawQ.includes('.12')) qNum = '4분기';

    const rawA = fData?.annual_period || '추정';
    const isConfirmedA = rawA.includes('확정');

    const scheduleInfo = parseEarningsScheduleInfo(fData?.earnings_date);
    const cleanedDate = (fData?.earnings_date || '')
      .replace(/\s*\([1-4]Q[^)]*\)/gi, '')
      .trim();

    const cleanedOp = (fData?.investment_opinion || '')
      .replace(/\s*\([^)]*\)/g, '')
      .trim();

    const rawDayRange = fData?.day_range || '-';
    const splitLines =
      rawDayRange !== '-'
        ? rawDayRange
            .split('·')
            .map((s) => s.trim())
            .filter(Boolean)
        : ['-'];

    return {
      qLabelPrefix: qNum,
      qStatusSuffix: isConfirmedQ ? '(확정)' : '(추정)',
      annualStatusSuffix: isConfirmedA ? '(확정)' : '(추정)',
      cleanEarningsDate: cleanedDate || '-',
      isEarningsWithin7Days: scheduleInfo.isWithin7Days,
      cleanOpinion: cleanedOp || '-',
      dayRangeLines: splitLines,
    };
  }, [
    fData?.quarter_period,
    fData?.annual_period,
    fData?.earnings_date,
    fData?.investment_opinion,
    fData?.day_range,
  ]);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor }]}>
        <ActivityIndicator size="large" color={textColor} />
        <Text style={[styles.loadingText, { color: subtextColor }]}>
          관심종목 시세와 등락 분석 리포트를 불러오는 중입니다...
        </Text>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={[styles.center, { backgroundColor }]}>
        <Text style={styles.errorText}>리포트 데이터를 불러오는데 실패했습니다.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
      {/* 1. 상단 관심 종목별 수치 Ticker 바 (종목 클릭 시 선택) */}
      {watchlistTickers.length > 0 ? (
        <MarketTickerBar
          tickers={watchlistTickers}
          selectedSymbol={selectedSymbol}
          onSelectTicker={(item) => {
            if (item.symbol) {
              handleSelectStockSymbol(item.symbol);
            }
          }}
        />
      ) : (
        <View style={[styles.emptyTickerBar, { borderBottomColor: borderColor }]}>
          <Text style={[styles.emptyTickerText, { color: subtextColor }]}>
            우측 설정(⚙️) 버튼을 눌러 관심 종목을 추가해주세요.
          </Text>
        </View>
      )}

      <View style={styles.bodyWrapper}>
        {/* 2. Ticker 아래 우측: 날짜(회차) 버튼 + 아이콘 전용 설정 버튼 */}
        <View style={styles.floatingActionRow} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.editionPill}
            activeOpacity={0.8}
            onPress={() => setPickerVisible(true)}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          >
            <Text style={styles.editionPillText} numberOfLines={1}>
              {editionText} ▾
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconSettingPill}
            activeOpacity={0.8}
            onPress={() => setWatchlistModalVisible(true)}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            accessibilityLabel="관심 종목 설정"
          >
            <IconSymbol name="gearshape.fill" size={14} color="#F59E0B" />
          </TouchableOpacity>
        </View>

        {/* 3. 선택된 종목의 등락 분석 · 실적/MTS 요약 카드 · 관련 뉴스 링크 리스트 */}
        {!activeReport ? (
          <View style={styles.emptyBox}>
            <Text style={[styles.emptyText, { color: subtextColor }]}>
              표시할 관심 종목이 없습니다. 우측 상단 ⚙️ 아이콘을 눌러 종목을 추가해보세요.
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
            }
            {...scrollHandlers}
          >
            {/* 종목 요약 헤더 섹션 */}
            <View style={[styles.reportHeaderSection, { borderBottomColor: dividerColor }]}>
              <View style={styles.stockMetaRow}>
                <View
                  style={[
                    styles.signalBadge,
                    {
                      borderColor: signalColor,
                      backgroundColor: isBull
                        ? 'rgba(220, 38, 38, 0.12)'
                        : 'rgba(37, 99, 235, 0.12)',
                    },
                  ]}
                >
                  <Text style={[styles.signalBadgeText, { color: signalColor }]}>
                    {isBull ? '▲ 상승 모멘텀' : '▼ 하락 요인 분석'}
                  </Text>
                </View>
                <Text style={[styles.symbolCodeText, { color: subtextColor }]}>
                  {activeReport.symbol} · {activeReport.market === 'KR' ? 'KRX' : 'US'}
                </Text>
              </View>

              <View style={styles.priceHeadlineRow}>
                <Text style={[styles.stockTitleText, { color: textColor }]}>
                  {activeReport.name}
                </Text>
                <View style={styles.priceRightBox}>
                  <Text style={[styles.priceValueText, { color: textColor }]}>
                    {activeReport.value}
                  </Text>
                  <Text style={[styles.priceChangeText, { color: signalColor }]}>
                    {activeReport.up ? '▲' : '▼'} {activeReport.change}
                  </Text>
                </View>
              </View>

              <Text style={[styles.analysisHeadline, { color: textColor }]}>
                {activeReport.analysis_headline}
              </Text>
            </View>

            {/* 핵심 등락 포인트 (01 · 02 · 03) */}
            {activeReport.key_points && activeReport.key_points.length > 0 && (
              <View style={[styles.sectionBlock, { borderBottomColor: dividerColor }]}>
                <Text style={[styles.sectionLabel, { color: subtextColor }]}>
                  KEY DRIVERS · 핵심 등락 요인
                </Text>
                <View style={styles.keyPointsList}>
                  {activeReport.key_points.map((pt, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.keyPointCard,
                        { backgroundColor: cardColor, borderColor },
                      ]}
                    >
                      <Text style={[styles.keyPointIndex, { color: textColor }]}>
                        {String(idx + 1).padStart(2, '0')}
                      </Text>
                      <Text style={[styles.keyPointText, { color: textColor }]}>
                        {pt}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* AI 등락 심층 분석 단락 */}
            <View style={[styles.sectionBlock, { borderBottomColor: dividerColor }]}>
              <Text style={[styles.sectionLabel, { color: subtextColor }]}>
                MARKET ANALYSIS · 등락 상세 분석
              </Text>
              <View style={styles.paragraphList}>
                {activeReport.analysis_paragraphs.map((para, idx) => (
                  <Text
                    key={idx}
                    style={[styles.analysisParagraph, { color: textColor }]}
                  >
                    {para}
                  </Text>
                ))}
              </View>
            </View>

            {/* 4. 등락 상세 분석 아래: 실적발표 일정 · 추정 실적 · MTS 주가 판단 요약 카드 */}
            {fData && (
              <View style={[styles.sectionBlock, { borderBottomColor: dividerColor }]}>
                <Text style={[styles.sectionLabel, { color: subtextColor }]}>
                  EARNINGS & MTS SUMMARY · 추정 실적 및 투자지표 요약
                </Text>

                <View
                  style={[
                    styles.mtsMasterCard,
                    { backgroundColor: cardColor, borderColor },
                  ]}
                >
                  {/* (1) 실적발표 예정일 / 컨센서스 목표주가 상단 배너 */}
                  <View style={[styles.mtsBannerRow, { borderBottomColor: borderColor }]}>
                    <View style={styles.mtsBannerItem}>
                      <Text
                        style={[styles.mtsSmallLabel, { color: subtextColor }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.85}
                      >
                        4분기 실적발표 일정 {fData.earnings_is_confirmed ? '(기사 명시)' : '(예상)'}
                      </Text>
                      <Text
                        style={[
                          styles.mtsHighlightValue,
                          { color: isEarningsWithin7Days ? accentColor : textColor },
                        ]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.85}
                      >
                        {cleanEarningsDate}
                      </Text>
                    </View>

                    <View style={[styles.mtsVerticalDivider, { backgroundColor: borderColor }]} />

                    <View style={styles.mtsBannerItemRight}>
                      <Text
                        style={[styles.mtsSmallLabel, { color: subtextColor }]}
                        numberOfLines={1}
                      >
                        목표주가 · 투자의견
                      </Text>
                      <Text
                        style={[styles.mtsHighlightValue, { color: textColor }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.85}
                      >
                        {fData.target_price !== '-'
                          ? `${fData.target_price} · ${cleanOpinion}`
                          : '컨센서스 미제공'}
                      </Text>
                    </View>
                  </View>

                  {/* (2) 현재 기준 추정 실적 (분기 / 연간 컨센서스) */}
                  <View style={[styles.consensusSection, { borderBottomColor: borderColor }]}>
                    <View style={styles.consensusHeaderRow}>
                      <Text style={[styles.consensusTitle, { color: textColor }]}>
                        추정 실적 컨센서스
                      </Text>
                    </View>

                    <View style={styles.consensusGrid}>
                      <View style={[styles.consensusCell, { borderColor }]}>
                        <Text
                          style={[styles.consensusCellLabel, { color: subtextColor }]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.75}
                        >
                          {qLabelPrefix} 매출액{qStatusSuffix}
                        </Text>
                        <Text
                          style={[styles.consensusValue, { color: textColor }]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.8}
                        >
                          {fData.quarter_revenue}
                        </Text>
                      </View>

                      <View style={[styles.consensusCell, { borderColor }]}>
                        <Text
                          style={[styles.consensusCellLabel, { color: subtextColor }]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.75}
                        >
                          {qLabelPrefix} 영업이익{qStatusSuffix}
                        </Text>
                        <Text
                          style={[styles.consensusValue, { color: bullColor }]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.8}
                        >
                          {fData.quarter_op_profit}
                        </Text>
                      </View>

                      <View style={[styles.consensusCell, { borderColor }]}>
                        <Text
                          style={[styles.consensusCellLabel, { color: subtextColor }]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.75}
                        >
                          {qLabelPrefix} 순이익{qStatusSuffix}
                        </Text>
                        <Text
                          style={[styles.consensusValue, { color: textColor }]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.8}
                        >
                          {fData.quarter_net_income}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.annualSummaryRow}>
                      <Text style={[styles.annualSummaryText, { color: subtextColor }]}>
                        연간 실적{annualStatusSuffix}: 매출액{' '}
                        <Text style={{ color: textColor, fontWeight: '700' }}>
                          {fData.annual_revenue}
                        </Text>{' '}
                        · 영업이익{' '}
                        <Text style={{ color: textColor, fontWeight: '700' }}>
                          {fData.annual_op_profit}
                        </Text>
                      </Text>
                    </View>
                  </View>

                  {/* (3) 최고/최저 대비 현재가 위치 바 (색상 및 52주 문구 제거) */}
                  {fData.week52_low !== '-' && fData.week52_high !== '-' && (
                    <View style={[styles.week52Section, { borderBottomColor: borderColor }]}>
                      <View style={styles.week52LabelRow}>
                        <Text style={[styles.mtsSmallLabel, { color: subtextColor }]}>
                          최저 {fData.week52_low}
                        </Text>
                        <Text style={[styles.week52PosBadge, { color: textColor }]}>
                          현재 {fData.week52_pos}%
                        </Text>
                        <Text style={[styles.mtsSmallLabel, { color: subtextColor }]}>
                          최고 {fData.week52_high}
                        </Text>
                      </View>
                      <View style={[styles.week52Track, { backgroundColor: borderColor }]}>
                        <View
                          style={[
                            styles.week52Fill,
                            {
                              width: `${Math.max(4, Math.min(100, fData.week52_pos))}%`,
                              backgroundColor: subtextColor,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  )}

                  {/* (4) MTS 주가 판단 요약 지표 (2열 그리드, 시가·고가·저가 세로 나열) */}
                  <View style={styles.mtsGridContainer}>
                    <View style={styles.mtsGridRow}>
                      <View style={styles.mtsGridCell}>
                        <Text style={[styles.mtsSmallLabel, { color: subtextColor }]}>
                          시가총액
                        </Text>
                        <Text style={[styles.mtsCellValue, { color: textColor }]}>
                          {fData.market_cap}
                        </Text>
                      </View>
                      <View style={styles.mtsGridCell}>
                        <Text style={[styles.mtsSmallLabel, { color: subtextColor }]}>
                          거래량 (거래대금)
                        </Text>
                        <Text style={[styles.mtsCellValue, { color: textColor }]}>
                          {fData.trading_volume}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.mtsGridRow}>
                      <View style={styles.mtsGridCell}>
                        <Text style={[styles.mtsSmallLabel, { color: subtextColor }]}>
                          PER (추정 PER)
                        </Text>
                        <Text style={[styles.mtsCellValue, { color: textColor }]}>
                          {fData.per}
                        </Text>
                      </View>
                      <View style={styles.mtsGridCell}>
                        <Text style={[styles.mtsSmallLabel, { color: subtextColor }]}>
                          PBR (BPS)
                        </Text>
                        <Text style={[styles.mtsCellValue, { color: textColor }]}>
                          {fData.pbr}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.mtsGridRow}>
                      <View style={styles.mtsGridCell}>
                        <Text style={[styles.mtsSmallLabel, { color: subtextColor }]}>
                          EPS (추정 EPS)
                        </Text>
                        <Text style={[styles.mtsCellValue, { color: textColor }]}>
                          {fData.eps}
                        </Text>
                      </View>
                      <View style={styles.mtsGridCell}>
                        <Text style={[styles.mtsSmallLabel, { color: subtextColor }]}>
                          배당수익률 (주당배당금)
                        </Text>
                        <Text style={[styles.mtsCellValue, { color: textColor }]}>
                          {fData.dividend_yield}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.mtsGridRow}>
                      <View style={styles.mtsGridCell}>
                        <Text style={[styles.mtsSmallLabel, { color: subtextColor }]}>
                          당일 시가 · 고가 · 저가
                        </Text>
                        <View style={styles.verticalPriceStack}>
                          {dayRangeLines.map((line, lIdx) => (
                            <Text
                              key={lIdx}
                              style={[styles.mtsCellValue, { color: textColor }]}
                            >
                              {line}
                            </Text>
                          ))}
                        </View>
                      </View>
                      <View style={styles.mtsGridCell}>
                        <Text style={[styles.mtsSmallLabel, { color: subtextColor }]}>
                          외국인 보유비중
                        </Text>
                        <Text style={[styles.mtsCellValue, { color: textColor }]}>
                          {fData.foreign_rate}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* (5) 최근 투자자별 수급 동향 */}
                  {fData.investor_trend && fData.investor_trend !== '-' && (
                    <View style={[styles.investorTrendBar, { borderTopColor: borderColor }]}>
                      <Text style={[styles.investorTrendLabel, { color: subtextColor }]}>
                        최근 수급 (순매수)
                      </Text>
                      <Text style={[styles.investorTrendValue, { color: textColor }]}>
                        {fData.investor_trend}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* 관련 뉴스 링크 섹션 ("터치하여 본문 상세보기" 및 "상세 >" 버튼 제거) */}
            <View style={styles.sectionBlock}>
              <View style={styles.relatedHeaderRow}>
                <Text style={[styles.sectionLabel, { color: subtextColor, marginBottom: 0 }]}>
                  RELATED NEWS · 관련 주요 뉴스
                </Text>
              </View>

              <View style={styles.relatedLinksList}>
                {activeReport.related_articles.map((article, idx) => {
                  const artBull =
                    article.signal === 'BULL' || article.category.startsWith('호재');
                  const artBear =
                    article.signal === 'BEAR' || article.category.startsWith('악재');
                  const tagColor = artBull
                    ? bullColor
                    : artBear
                      ? bearColor
                      : accentColor;
                  const cleanLabel = (article.signal_label || article.category).replace(
                    /^[🔴🔵]\s*/,
                    ''
                  );

                  return (
                    <TouchableOpacity
                      key={`${article.link}-${idx}`}
                      activeOpacity={0.78}
                      onPress={() => setSelectedArticle(article)}
                      style={[
                        styles.relatedNewsLinkCard,
                        { backgroundColor: cardColor, borderColor },
                      ]}
                    >
                      <View style={styles.relatedNewsLeft}>
                        <View style={styles.relatedMetaRow}>
                          <Text style={[styles.relatedSignalText, { color: tagColor }]}>
                            {cleanLabel}
                          </Text>
                          <Text style={[styles.relatedOutletText, { color: subtextColor }]}>
                            {article.outlet}
                          </Text>
                        </View>
                        <Text
                          style={[styles.relatedNewsTitle, { color: textColor }]}
                          numberOfLines={2}
                        >
                          {article.title}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        )}
      </View>

      {/* 리포트 탭 진입 시 관심종목 전체의 실적발표 일정을 일자순으로 보여주는 팝업 */}
      <Modal
        visible={earningsPopupVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEarningsPopupVisible(false)}
      >
        <View style={styles.alertBackdrop}>
          <View
            style={[
              styles.alertCard,
              { backgroundColor: chromeColor, borderColor },
            ]}
          >
            <View style={styles.alertTopRow}>
              <Text style={[styles.alertHeaderLabel, { color: subtextColor }]}>
                EARNINGS CALENDAR · 실적발표 일정
              </Text>
              <TouchableOpacity
                onPress={() => setEarningsPopupVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.alertCloseIcon, { color: subtextColor }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scheduleScrollBox}
              contentContainerStyle={styles.scheduleListContent}
              showsVerticalScrollIndicator
            >
              {sortedWatchlistEarnings.map((item, idx) => {
                const rawOp = (item.opProfit || '').trim();
                const hasDigits = /\d/.test(rawOp);
                const isNegativeOp = rawOp.startsWith('-') || rawOp.includes('적자');
                const opProfitColor = !hasDigits
                  ? subtextColor
                  : isNegativeOp
                    ? bearColor
                    : bullColor;

                return (
                  <TouchableOpacity
                    key={item.symbol}
                    activeOpacity={0.78}
                    onPress={() => {
                      setSelectedSymbol(item.symbol);
                      setEarningsPopupVisible(false);
                    }}
                    style={[
                      styles.scheduleRowCard,
                      {
                        backgroundColor: cardColor,
                        borderColor: item.isWithin7Days ? accentColor : borderColor,
                      },
                    ]}
                  >
                    <View style={styles.scheduleRowTop}>
                      <View style={styles.scheduleStockLeft}>
                        <Text style={[styles.scheduleRankNum, { color: subtextColor }]}>
                          {String(idx + 1).padStart(2, '0')}
                        </Text>
                        <Text style={[styles.scheduleStockName, { color: textColor }]}>
                          {item.name}
                        </Text>
                        <Text style={[styles.scheduleStockCode, { color: subtextColor }]}>
                          {item.symbol.replace(/\.(KS|KQ)$/i, '')}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.scheduleDdayBadge,
                          {
                            backgroundColor: 'transparent',
                            borderColor: item.isWithin7Days ? accentColor : borderColor,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.scheduleDdayText,
                            {
                              color: item.isWithin7Days ? accentColor : subtextColor,
                            },
                          ]}
                        >
                          {item.isWithin7Days ? `임박 · ${item.dDayLabel}` : item.dDayLabel}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.scheduleRowBottom}>
                      <Text style={[styles.scheduleDateValue, { color: subtextColor }]}>
                        발표 예정: {item.dateText}
                      </Text>
                      <Text
                        style={[styles.scheduleOpValue, { color: subtextColor }]}
                        numberOfLines={1}
                      >
                        영업이익(추정){' '}
                        <Text style={[styles.scheduleOpHighlight, { color: opProfitColor }]}>
                          {item.opProfit}
                        </Text>
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 이전 브리핑 회차 선택 모달 */}
      <EditionPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        editions={archiveIndex?.editions ?? []}
        selectedEditionFile={selectedEditionFile}
        currentEditionLabel={editionText}
        onSelectEdition={setSelectedEdition}
      />

      {/* 관심 종목 추가/삭제 설정 모달 */}
      <WatchlistModal
        visible={watchlistModalVisible}
        onClose={() => setWatchlistModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bodyWrapper: {
    flex: 1,
    position: 'relative',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
  },
  emptyTickerBar: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  emptyTickerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyBox: {
    paddingVertical: 80,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  floatingActionRow: {
    position: 'absolute',
    top: 12,
    right: 16,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editionPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(12, 10, 9, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  editionPillText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  iconSettingPill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(12, 10, 9, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  reportHeaderSection: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    borderBottomWidth: 6,
  },
  stockMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingRight: 130,
  },
  signalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
  },
  signalBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  symbolCodeText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  priceHeadlineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  stockTitleText: {
    fontFamily: Fonts?.serif,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  priceRightBox: {
    alignItems: 'flex-end',
  },
  priceValueText: {
    fontSize: 19,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  priceChangeText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 2,
  },
  analysisHeadline: {
    fontFamily: Fonts?.serif,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 25,
  },
  sectionBlock: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 6,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  keyPointsList: {
    gap: 8,
  },
  keyPointCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 9,
    borderWidth: 1,
    gap: 10,
  },
  keyPointIndex: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 1,
  },
  keyPointText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },
  paragraphList: {
    gap: 14,
  },
  analysisParagraph: {
    fontSize: 15,
    lineHeight: 25,
  },
  mtsMasterCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  mtsBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  mtsBannerItem: {
    flex: 1,
    gap: 3,
  },
  mtsBannerItemRight: {
    flex: 1,
    gap: 3,
    paddingLeft: 12,
  },
  mtsVerticalDivider: {
    width: 1,
    height: 30,
  },
  mtsSmallLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  mtsHighlightValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  consensusSection: {
    padding: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  consensusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  consensusTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  consensusGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  consensusCell: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 8,
    gap: 3,
  },
  consensusCellLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  consensusValue: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  annualSummaryRow: {
    paddingTop: 2,
  },
  annualSummaryText: {
    fontSize: 12,
  },
  week52Section: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 6,
  },
  week52LabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  week52PosBadge: {
    fontSize: 11,
    fontWeight: '800',
  },
  week52Track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  week52Fill: {
    height: '100%',
    borderRadius: 3,
  },
  mtsGridContainer: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  mtsGridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  mtsGridCell: {
    flex: 1,
    gap: 3,
  },
  verticalPriceStack: {
    flexDirection: 'column',
    gap: 2,
    marginTop: 1,
  },
  mtsCellValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  investorTrendBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  investorTrendLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
  investorTrendValue: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  relatedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  relatedLinksList: {
    gap: 9,
  },
  relatedNewsLinkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  relatedNewsLeft: {
    flex: 1,
    gap: 4,
  },
  relatedMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  relatedSignalText: {
    fontSize: 11,
    fontWeight: '800',
  },
  relatedOutletText: {
    fontSize: 11,
    fontWeight: '600',
  },
  relatedNewsTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  alertBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  alertCard: {
    width: '100%',
    maxHeight: '82%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 10,
  },
  alertTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 2,
  },
  alertHeaderLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  alertCloseIcon: {
    fontSize: 18,
    fontWeight: '700',
  },
  scheduleScrollBox: {
    maxHeight: 440,
    marginTop: 2,
  },
  scheduleListContent: {
    gap: 8,
    paddingBottom: 2,
  },
  scheduleRowCard: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 5,
  },
  scheduleRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scheduleStockLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
  },
  scheduleRankNum: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  scheduleStockName: {
    fontSize: 14,
    fontWeight: '800',
  },
  scheduleStockCode: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  scheduleDdayBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  scheduleDdayText: {
    fontSize: 10,
    fontWeight: '700',
  },
  scheduleRowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  scheduleDateValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  scheduleOpValue: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  scheduleOpHighlight: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
