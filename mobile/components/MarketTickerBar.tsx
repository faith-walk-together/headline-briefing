import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { MarketTicker } from '@/store/useBookmarkStore';
import { useThemeColor } from '@/hooks/use-theme-color';

interface MarketTickerBarProps {
  tickers: MarketTicker[];
  selectedSymbol?: string;
  onSelectTicker?: (item: MarketTicker, index: number) => void;
}

export function MarketTickerBar({
  tickers,
  selectedSymbol,
  onSelectTicker,
}: MarketTickerBarProps) {
  const chromeColor = useThemeColor({}, 'chrome');
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const subtextColor = useThemeColor({}, 'subtext');
  const borderColor = useThemeColor({}, 'border');
  const accentColor = useThemeColor({}, 'accent');
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
        {tickers.map((item, idx) => {
          const itemKey = item.symbol || item.name;
          const isSelected = Boolean(
            selectedSymbol &&
              (item.symbol === selectedSymbol || item.name === selectedSymbol)
          );

          const cardInner = (
            <>
              <Text
                style={[
                  styles.tickerName,
                  { color: isSelected ? accentColor : subtextColor },
                ]}
                numberOfLines={1}
              >
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
            </>
          );

          if (onSelectTicker) {
            return (
              <TouchableOpacity
                key={`${itemKey}-${idx}`}
                activeOpacity={0.78}
                onPress={() => onSelectTicker(item, idx)}
                style={[
                  styles.tickerCard,
                  {
                    backgroundColor: cardColor,
                    borderColor: isSelected ? accentColor : borderColor,
                  },
                  isSelected && styles.selectedTickerCard,
                ]}
              >
                {cardInner}
              </TouchableOpacity>
            );
          }

          return (
            <View
              key={`${itemKey}-${idx}`}
              style={[styles.tickerCard, { backgroundColor: cardColor, borderColor }]}
            >
              {cardInner}
            </View>
          );
        })}
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
    borderWidth: 1,
  },
  selectedTickerCard: {
    borderWidth: 1.8,
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
