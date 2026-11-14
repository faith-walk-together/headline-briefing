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
            <Text style={[styles.tickerName, { color: subtextColor }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.tickerValue, { color: textColor }]} numberOfLines={1}>
              {item.value}
            </Text>
            <Text
              style={[
                styles.tickerChange,
                { color: item.up ? bullColor : bearColor },
              ]}
              numberOfLines={1}
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
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 6,
  },
  tickerCard: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 7,
    borderWidth: 1,
  },
  tickerName: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  tickerValue: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 1,
  },
  tickerChange: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});

