import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Article } from '@/store/useBookmarkStore';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useBookmarkStore } from '@/store/useBookmarkStore';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface NewsCardProps {
  article: Article;
  onPress?: (article: Article) => void;
}

export function NewsCard({ article, onPress }: NewsCardProps) {
  const [expanded, setExpanded] = useState(false);

  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const subtextColor = useThemeColor({}, 'subtext');
  const primaryColor = useThemeColor({}, 'primary');
  const borderColor = useThemeColor({}, 'border');
  const backgroundColor = useThemeColor({}, 'background');

  const isBookmarked = useBookmarkStore((state) => state.isBookmarked(article.link));
  const addBookmark = useBookmarkStore((state) => state.addBookmark);
  const removeBookmark = useBookmarkStore((state) => state.removeBookmark);

  // Format the date simply
  const formattedDate = new Date(article.pub_date).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
    if (onPress && !expanded) {
      onPress(article);
    }
  };

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
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: cardColor }]} 
      onPress={toggleExpand} 
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.categoryText, { color: primaryColor }]}>{article.category}</Text>
          <Text style={[styles.dot, { color: subtextColor }]}>•</Text>
          <Text style={[styles.outlet, { color: subtextColor }]}>{article.outlet}</Text>
        </View>
        <Text style={[styles.date, { color: subtextColor }]}>{formattedDate}</Text>
      </View>
      <Text style={[styles.title, { color: textColor }]} numberOfLines={expanded ? undefined : 2}>
        {article.title}
      </Text>

      {expanded && (
        <View style={styles.expandedContent}>
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
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dot: {
    fontSize: 12,
    marginHorizontal: 6,
  },
  outlet: {
    fontSize: 12,
    fontWeight: '500',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  date: {
    fontSize: 12,
  },
  expandedContent: {
    marginTop: 4,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  summaryContainer: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  outlineButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  outlineButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
