import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useUIStore } from '@/store/useUIStore';
import { useBookmarkStore } from '@/store/useBookmarkStore';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function ArticleDetailScreen() {
  const router = useRouter();
  const article = useUIStore((state) => state.selectedArticle);
  
  const isBookmarked = useBookmarkStore((state) => 
    article ? state.isBookmarked(article.link) : false
  );
  const addBookmark = useBookmarkStore((state) => state.addBookmark);
  const removeBookmark = useBookmarkStore((state) => state.removeBookmark);

  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const subtextColor = useThemeColor({}, 'subtext');
  const primaryColor = useThemeColor({}, 'primary');
  const borderColor = useThemeColor({}, 'border');
  const backgroundColor = useThemeColor({}, 'background');

  if (!article) {
    return (
      <View style={[styles.center, { backgroundColor: cardColor }]}>
        <Text style={[styles.errorText, { color: subtextColor }]}>기사 정보를 찾을 수 없습니다.</Text>
      </View>
    );
  }

  const handleToggleBookmark = () => {
    if (isBookmarked) {
      removeBookmark(article.link);
    } else {
      addBookmark(article);
    }
  };

  const handleOpenOriginal = () => {
    Linking.openURL(article.link);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: cardColor }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerInfo}>
          <Text style={[styles.category, { color: primaryColor }]}>{article.category}</Text>
          <Text style={[styles.dot, { color: subtextColor }]}>•</Text>
          <Text style={[styles.outlet, { color: subtextColor }]}>{article.outlet}</Text>
        </View>
        
        <Text style={[styles.title, { color: textColor }]}>{article.title}</Text>
        <Text style={[styles.date, { color: subtextColor }]}>
          {new Date(article.pub_date).toLocaleString('ko-KR')}
        </Text>

        <View style={[styles.divider, { backgroundColor: borderColor }]} />

        <View style={[styles.summaryContainer, { backgroundColor, borderColor }]}>
          <Text style={[styles.summaryLabel, { color: textColor }]}>💡 AI 3줄 요약</Text>
          <Text style={[styles.summaryText, { color: textColor }]}>{article.summary}</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.outlineButton, { borderColor }]} onPress={handleOpenOriginal}>
            <Text style={[styles.outlineButtonText, { color: textColor }]}>원문 보러가기</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.primaryButton, 
              isBookmarked ? { backgroundColor: cardColor, borderColor: textColor } : { backgroundColor: textColor, borderColor: textColor }
            ]} 
            onPress={handleToggleBookmark}
          >
            <Text style={[
              styles.primaryButtonText, 
              isBookmarked ? { color: textColor } : { color: cardColor }
            ]}>
              {isBookmarked ? '북마크 해제' : '북마크 저장'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  errorText: {
    fontSize: 16,
  },
  scrollContent: {
    padding: 20,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  category: {
    fontSize: 14,
    fontWeight: '600',
  },
  dot: {
    fontSize: 14,
    marginHorizontal: 8,
  },
  outlet: {
    fontSize: 14,
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 32,
    marginBottom: 12,
  },
  date: {
    fontSize: 14,
  },
  divider: {
    height: 1,
    marginVertical: 24,
  },
  summaryContainer: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 32,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 28,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  outlineButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  outlineButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
