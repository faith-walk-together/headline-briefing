import React from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNews } from '@/hooks/useNews';
import { MarketTickerBar } from '@/components/MarketTickerBar';
import { NewsCard } from '@/components/NewsCard';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Fonts } from '@/constants/theme';

export default function StockScreen() {
  const { data, isLoading, isError, refetch, isRefetching } = useNews();

  const backgroundColor = useThemeColor({}, 'background');
  const chromeColor = useThemeColor({}, 'chrome');
  const textColor = useThemeColor({}, 'text');
  const subtextColor = useThemeColor({}, 'subtext');
  const borderColor = useThemeColor({}, 'border');
  const accentColor = useThemeColor({}, 'accent');

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor }]}>
        <ActivityIndicator size="large" color={textColor} />
        <Text style={[styles.loadingText, { color: subtextColor }]}>
          마켓 지표와 증시 브리핑을 불러오는 중입니다...
        </Text>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={[styles.center, { backgroundColor }]}>
        <Text style={styles.errorText}>마켓 데이터를 불러오는데 실패했습니다.</Text>
      </View>
    );
  }

  const stockArticles = data.stock_articles ?? [];
  const marketTickers = data.market_tickers ?? [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
      {/* 주식·마켓 상단 헤더 */}
      <View style={[styles.header, { backgroundColor: chromeColor, borderBottomColor: borderColor }]}>
        <Text style={[styles.headerTitle, { color: textColor }]}>마켓 & 증시 웹진</Text>
        <Text style={[styles.headerSub, { color: accentColor }]}>
          최근 12시간 호재·악재 브리핑
        </Text>
      </View>

      {/* 풀폭 에디토리얼 연속 스크롤 (상단 지수·환율·유가3종·금 전광판 포함) */}
      <FlatList
        data={stockArticles}
        keyExtractor={(item, index) => `${item.link}-${index}`}
        ListHeaderComponent={<MarketTickerBar tickers={marketTickers} />}
        renderItem={({ item }) => <NewsCard article={item} />}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={[styles.emptyText, { color: subtextColor }]}>
              표시할 증시 브리핑 기사가 없습니다.
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onRefresh={refetch}
        refreshing={isRefetching}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontFamily: Fonts?.serif,
    fontSize: 20,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 11,
    fontWeight: '700',
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
  emptyBox: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 24,
  },
});

