import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Article } from '@/store/useBookmarkStore';
import { useThemeColor } from '@/hooks/use-theme-color';

interface NewsCardProps {
  article: Article;
  onPress: (article: Article) => void;
}

export function NewsCard({ article, onPress }: NewsCardProps) {
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const subtextColor = useThemeColor({}, 'subtext');
  const primaryColor = useThemeColor({}, 'primary');
  
  // Format the date simply
  const formattedDate = new Date(article.pub_date).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: cardColor }]} 
      onPress={() => onPress(article)} 
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.categoryText, { color: primaryColor }]}>{article.category}</Text>
          <Text style={[styles.dot, { color: subtextColor }]}>•</Text>
          <Text style={[styles.outlet, { color: subtextColor }]}>{article.outlet}</Text>
        </View>
        <Text style={[styles.date, { color: subtextColor }]}>{formattedDate}</Text>
      </View>
      <Text style={[styles.title, { color: textColor }]} numberOfLines={2}>
        {article.title}
      </Text>
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
});
