import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useUIStore } from '@/store/useUIStore';
import { useBookmarkStore } from '@/store/useBookmarkStore';

export default function ArticleDetailScreen() {
  const router = useRouter();
  const article = useUIStore((state) => state.selectedArticle);
  
  const isBookmarked = useBookmarkStore((state) => 
    article ? state.isBookmarked(article.link) : false
  );
  const addBookmark = useBookmarkStore((state) => state.addBookmark);
  const removeBookmark = useBookmarkStore((state) => state.removeBookmark);

  if (!article) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>기사 정보를 찾을 수 없습니다.</Text>
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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerInfo}>
          <Text style={styles.category}>{article.category}</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.outlet}>{article.outlet}</Text>
        </View>
        
        <Text style={styles.title}>{article.title}</Text>
        <Text style={styles.date}>
          {new Date(article.pub_date).toLocaleString('ko-KR')}
        </Text>

        <View style={styles.divider} />

        <View style={styles.summaryContainer}>
          <Text style={styles.summaryLabel}>💡 AI 3줄 요약</Text>
          <Text style={styles.summaryText}>{article.summary}</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.outlineButton} onPress={handleOpenOriginal}>
            <Text style={styles.outlineButtonText}>원문 보러가기</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.primaryButton, isBookmarked && styles.bookmarkedButton]} 
            onPress={handleToggleBookmark}
          >
            <Text style={[styles.primaryButtonText, isBookmarked && styles.bookmarkedButtonText]}>
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
    backgroundColor: '#ffffff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
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
    color: '#3B82F6',
    fontWeight: '600',
  },
  dot: {
    fontSize: 14,
    color: '#9CA3AF',
    marginHorizontal: 8,
  },
  outlet: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 32,
    marginBottom: 12,
  },
  date: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 24,
  },
  summaryContainer: {
    backgroundColor: '#F8FAFC',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 32,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 16,
    color: '#334155',
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
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  outlineButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#111827',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#111827',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  bookmarkedButton: {
    backgroundColor: '#ffffff',
    borderColor: '#111827',
  },
  bookmarkedButtonText: {
    color: '#111827',
  },
});
