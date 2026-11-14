import React from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import { MarketTicker } from '@/store/useBookmarkStore';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Fonts } from '@/constants/theme';

interface MarketTickerBarProps {
  tickers: MarketTicker[];
}

export function MarketTickerBar({ tickers }: MarketTickerBarProps) {
  const chromeColor = useThemeColor({}, 'chrome');
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const subtextColor = useThemeColor({}, 'subtext');
  const borderColor = useThemeColor({}, 'border');
  const bullColor = useThemeColor({}, 'bull');
  const bearColor = useThemeColor({}, 'bear');

  if (!tickers || tickers.length === 0) return null;

  return (
    <View style={[styles.wrapper, { backgroundColor: chromeColor, borderBottomColor: borderColor }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.headerLabel, { color: subtextColor }]}>
          글로벌 지수 · 환율 · 유가(3종) · 금 시세
        </Text>
        <Text style={[styles.scrollHint, { color: subtextColor }]}>좌우 스크롤 →</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {tickers.map((item, idx) => (
          <View
            key={`${item.name}-${idx}`}
            style={[styles.tickerCard, { backgroundColor: cardColor, borderColor }]}
          >
            <View style={styles.topRow}>
              <Text style={[styles.tickerName, { color: subtextColor }]} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={[styles.groupBadge, { borderColor }]}>
                <Text style={[styles.groupText, { color: subtextColor }]}>{item.group}</Text>
              </View>
            </View>
            <Text style={[styles.tickerValue, { color: textColor }]}>{item.value}</Text>
            <Text
              style={[
                styles.tickerChange,
                { color: item.up ? bullColor : bearColor },
              ]}
            >
              {item.up ? '▲' : '▼'} {item.change}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  scrollHint: {
    fontSize: 11,
    fontFamily: Fonts?.mono,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tickerCard: {
    minWidth: 112,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 4,
  },
  tickerName: {
    fontSize: 11,
    fontWeight: '700',
  },
  groupBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  groupText: {
    fontSize: 9,
    fontWeight: '600',
  },
  tickerValue: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 2,
  },
  tickerChange: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});

