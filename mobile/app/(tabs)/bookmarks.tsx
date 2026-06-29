import React from 'react';
import { View, StyleSheet, FlatList, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useBookmarkStore } from '@/store/useBookmarkStore';
import { NewsCard } from '@/components/NewsCard';
import { useUIStore } from '@/store/useUIStore';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function BookmarksScreen() {
  const router = useRouter();
  const bookmarks = useBookmarkStore((state) => state.bookmarks);
  const setSelectedArticle = useUIStore((state) => state.setSelectedArticle);
  
  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const subtextColor = useThemeColor({}, 'subtext');
  const borderColor = useThemeColor({}, 'border');

  if (bookmarks.length === 0) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor }]}>
        <Text style={[styles.emptyText, { color: textColor }]}>저장된 북마크가 없습니다.</Text>
        <Text style={[styles.subText, { color: subtextColor }]}>관심있는 기사를 북마크해보세요!</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <View style={[styles.header, { backgroundColor: cardColor, borderBottomColor: borderColor }]}>
        <Text style={[styles.headerTitle, { color: textColor }]}>북마크</Text>
      </View>
      <FlatList
        data={bookmarks}
        keyExtractor={(item) => item.link}
        renderItem={({ item }) => <NewsCard article={item} />}
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
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  subText: {
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 24,
    paddingTop: 8,
  },
});
