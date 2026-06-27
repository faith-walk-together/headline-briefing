import React from 'react';
import { View, StyleSheet, FlatList, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useBookmarkStore } from '@/store/useBookmarkStore';
import { NewsCard } from '@/components/NewsCard';
import { useUIStore } from '@/store/useUIStore';

export default function BookmarksScreen() {
  const router = useRouter();
  const bookmarks = useBookmarkStore((state) => state.bookmarks);
  const setSelectedArticle = useUIStore((state) => state.setSelectedArticle);

  const handlePressArticle = (article: any) => {
    setSelectedArticle(article);
    router.push('/article/detail');
  };

  if (bookmarks.length === 0) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.emptyText}>저장된 북마크가 없습니다.</Text>
        <Text style={styles.subText}>관심있는 기사를 북마크해보세요!</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>북마크</Text>
      </View>
      <FlatList
        data={bookmarks}
        keyExtractor={(item) => item.link}
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
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  emptyText: {
    fontSize: 18,
    color: '#4B5563',
    fontWeight: '600',
    marginBottom: 8,
  },
  subText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  listContent: {
    paddingBottom: 24,
    paddingTop: 8,
  },
});
