import React from 'react';
import { View, StyleSheet, FlatList, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useBookmarkStore } from '@/store/useBookmarkStore';
import { NewsCard } from '@/components/NewsCard';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Fonts } from '@/constants/theme';

export default function BookmarksScreen() {
  const bookmarks = useBookmarkStore((state) => state.bookmarks);

  const backgroundColor = useThemeColor({}, 'background');
  const chromeColor = useThemeColor({}, 'chrome');
  const textColor = useThemeColor({}, 'text');
  const subtextColor = useThemeColor({}, 'subtext');
  const borderColor = useThemeColor({}, 'border');

  if (bookmarks.length === 0) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor }]} edges={['top']}>
        <Text style={[styles.emptyText, { color: textColor }]}>스크랩한 지면이 없습니다.</Text>
        <Text style={[styles.subText, { color: subtextColor }]}>
          매거진과 주식 탭에서 관심 있는 기사를 스크랩해보세요!
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: chromeColor, borderBottomColor: borderColor }]}>
        <Text style={[styles.headerTitle, { color: textColor }]}>
          스크랩 아카이브 ({bookmarks.length})
        </Text>
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
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontFamily: Fonts?.serif,
    fontSize: 20,
    fontWeight: '800',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    fontFamily: Fonts?.serif,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  subText: {
    fontSize: 14,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 24,
  },
});
