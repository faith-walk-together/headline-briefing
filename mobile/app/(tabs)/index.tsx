import React, { useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNews } from '@/hooks/useNews';
import { CategoryTabs } from '@/components/CategoryTabs';
import { NewsCard } from '@/components/NewsCard';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Fonts } from '@/constants/theme';

export default function HomeScreen() {
  const { data, isLoading, isError, refetch, isRefetching } = useNews();
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');

  const backgroundColor = useThemeColor({}, 'background');
  const chromeColor = useThemeColor({}, 'chrome');
  const textColor = useThemeColor({}, 'text');
  const subtextColor = useThemeColor({}, 'subtext');
  const borderColor = useThemeColor({}, 'border');
  const accentColor = useThemeColor({}, 'accent');

  const categories = useMemo(() => {
    if (!data?.articles) return ['전체'];
    const uniqueCategories = Array.from(new Set(data.articles.map((a) => a.category)));
    return ['전체', ...uniqueCategories];
  }, [data]);

  const filteredArticles = useMemo(() => {
    if (!data?.articles) return [];
    if (selectedCategory === '전체') return data.articles;
    return data.articles.filter((a) => a.category === selectedCategory);
  }, [data, selectedCategory]);

  const editionText = useMemo(() => {
    if (data?.edition) return data.edition;
    const hour = new Date().getHours();
    return hour >= 7 && hour < 19 ? '07:00 조간 브리핑' : '19:00 석간 브리핑';
  }, [data?.edition]);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor }]}>
        <ActivityIndicator size="large" color={textColor} />
        <Text style={[styles.loadingText, { color: subtextColor }]}>
          매거진 지면을 불러오는 중입니다...
        </Text>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={[styles.center, { backgroundColor }]}>
        <Text style={styles.errorText}>뉴스를 불러오는데 실패했습니다.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
      {/* 매거진 제호 (Masthead) */}
      <View style={[styles.masthead, { backgroundColor: chromeColor, borderBottomColor: borderColor }]}>
        <Text style={[styles.mastheadTitle, { color: textColor }]}>THE BRIEFING</Text>
        <Text style={[styles.editionBadge, { color: accentColor }]}>{editionText}</Text>
      </View>

      {/* 카테고리 섹션 인덱스 */}
      <CategoryTabs
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* 풀폭 에디토리얼 연속 스크롤 지면 */}
      <FlatList
        data={filteredArticles}
        keyExtractor={(item, index) => `${item.link}-${index}`}
        renderItem={({ item }) => <NewsCard article={item} />}
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
  masthead: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  mastheadTitle: {
    fontFamily: Fonts?.serif,
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  editionBadge: {
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
  listContent: {
    paddingBottom: 24,
  },
});
