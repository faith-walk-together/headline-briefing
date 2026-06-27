import React, { useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useNews } from '@/hooks/useNews';
import { CategoryTabs } from '@/components/CategoryTabs';
import { NewsCard } from '@/components/NewsCard';
import { useUIStore } from '@/store/useUIStore';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function HomeScreen() {
  const router = useRouter();
  const { data, isLoading, isError } = useNews();
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const setSelectedArticle = useUIStore((state) => state.setSelectedArticle);
  
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const subtextColor = useThemeColor({}, 'subtext');

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

  const handlePressArticle = (article: any) => {
    setSelectedArticle(article);
    router.push('/article/detail');
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor }]}>
        <ActivityIndicator size="large" color={textColor} />
        <Text style={[styles.loadingText, { color: subtextColor }]}>최신 뉴스를 불러오는 중입니다...</Text>
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
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <CategoryTabs
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />
      <FlatList
        data={filteredArticles}
        keyExtractor={(item, index) => item.link + index}
        renderItem={({ item }) => <NewsCard article={item} onPress={handlePressArticle} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
