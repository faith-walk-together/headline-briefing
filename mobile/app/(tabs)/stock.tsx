import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Text,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNews, useArchiveIndex } from '@/hooks/useNews';
import { useScrollTabVisibility } from '@/hooks/useScrollTabVisibility';
import { MarketTickerBar } from '@/components/MarketTickerBar';
import { NewsCard } from '@/components/NewsCard';
import { EditionPickerModal } from '@/components/EditionPickerModal';
import { useBookmarkStore } from '@/store/useBookmarkStore';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function StockScreen() {
  const { data, isLoading, isError, refetch, isRefetching } = useNews();
  const { data: archiveIndex } = useArchiveIndex();
  const scrollHandlers = useScrollTabVisibility();

  const selectedEditionFile = useBookmarkStore((state) => state.selectedEditionFile);
  const selectedEditionLabel = useBookmarkStore((state) => state.selectedEditionLabel);
  const setSelectedEdition = useBookmarkStore((state) => state.setSelectedEdition);

  const [pickerVisible, setPickerVisible] = useState(false);

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const subtextColor = useThemeColor({}, 'subtext');

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
      if (data.edition.includes('PM') || data.edition.includes('석간') || data.edition.includes('19:00')) {
        period = 'PM';
      } else if (data.edition.includes('AM') || data.edition.includes('조간') || data.edition.includes('07:00')) {
        period = 'AM';
      }
    }

    return `${yy}-${mm}-${dd} ${period}`;
  }, [data?.last_updated, data?.edition, selectedEditionLabel]);

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
      {/* 상단 고정 지표(Ticker) 바 */}
      <MarketTickerBar tickers={marketTickers} />

      <View style={styles.bodyWrapper}>
        {/* 풀폭 에디토리얼 연속 스크롤 */}
        <FlatList
          data={stockArticles}
          keyExtractor={(item, index) => `${item.link}-${index}`}
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
          {...scrollHandlers}
        />

        {/* Ticker 바로 아래(뉴스 본문 상단 우측)에 오버랩되는 날짜/아카이브 선택 버튼 */}
        <View style={styles.floatingEditionBadge} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.editionPill}
            activeOpacity={0.8}
            onPress={() => setPickerVisible(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.editionPillText} numberOfLines={1}>
              {editionText} ▾
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 이전 브리핑 회차 선택 모달 */}
      <EditionPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        editions={archiveIndex?.editions ?? []}
        selectedEditionFile={selectedEditionFile}
        currentEditionLabel={editionText}
        onSelectEdition={setSelectedEdition}
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
  floatingEditionBadge: {
    position: 'absolute',
    top: 12,
    right: 16,
    zIndex: 20,
  },
  editionPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(12, 10, 9, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  editionPillText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});

