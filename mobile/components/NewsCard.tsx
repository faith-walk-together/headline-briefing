import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Article } from '@/store/useBookmarkStore';

interface NewsCardProps {
  article: Article;
  onPress: (article: Article) => void;
}

export function NewsCard({ article, onPress }: NewsCardProps) {
  // Format the date simply
  const formattedDate = new Date(article.pub_date).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(article)} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{article.category}</Text>
        </View>
        <Text style={styles.outlet}>{article.outlet}</Text>
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {article.title}
      </Text>
      <Text style={styles.date}>{formattedDate}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
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
    marginBottom: 8,
  },
  badge: {
    backgroundColor: '#F0F4F8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  badgeText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '600',
  },
  outlet: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 22,
    marginBottom: 12,
  },
  date: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
