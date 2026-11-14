import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Article, useBookmarkStore } from '@/store/useBookmarkStore';
import { useUIStore } from '@/store/useUIStore';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Fonts } from '@/constants/theme';

const FALLBACK_IMAGES: Record<string, string> = {
  정치: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1000&q=80',
  경제: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1000&q=80',
  'IT/과학': 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1000&q=80',
  세계: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1000&q=80',
  default: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=1000&q=80',
};

interface NewsCardProps {
  article: Article;
  onPress?: (article: Article) => void;
}

export function NewsCard({ article, onPress }: NewsCardProps) {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const subtextColor = useThemeColor({}, 'subtext');
  const dividerColor = useThemeColor({}, 'divider');
  const accentColor = useThemeColor({}, 'accent');
  const bullColor = useThemeColor({}, 'bull');
  const bearColor = useThemeColor({}, 'bear');

  const isBookmarked = useBookmarkStore((state) => state.isBookmarked(article.link));
  const addBookmark = useBookmarkStore((state) => state.addBookmark);
  const removeBookmark = useBookmarkStore((state) => state.removeBookmark);
  const setSelectedArticle = useUIStore((state) => state.setSelectedArticle);

  const formattedDate = useMemo(() => {
    const d = new Date(article.pub_date);
    if (isNaN(d.getTime())) return article.pub_date;
    return d.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [article.pub_date]);

  const summaryLines = useMemo(() => {
    if (article.summary_lines && article.summary_lines.length > 0) {
      return article.summary_lines.slice(0, 3);
    }
    const split = (article.summary || '')
      .split(/\n+|(?<=\.)\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return split.length > 0 ? split.slice(0, 3) : ['요약 정보를 불러왔습니다.'];
  }, [article.summary, article.summary_lines]);

  const isBull = article.signal === 'BULL' || article.category.startsWith('호재');
  const isBear = article.signal === 'BEAR' || article.category.startsWith('악재');

  const badgeBgColor = isBull
    ? '#DC2626'
    : isBear
      ? '#2563EB'
      : 'rgba(28, 25, 23, 0.78)';

  const ruleColor = isBull ? bullColor : isBear ? bearColor : accentColor;

  const badgeLabel = article.signal_label || article.category;
  const imageUrl =
    article.image_url ||
    FALLBACK_IMAGES[article.category] ||
    FALLBACK_IMAGES.default;

  const handleOpenDetail = () => {
    if (onPress) {
      onPress(article);
    } else {
      setSelectedArticle(article);
    }
  };

  const handleToggleBookmark = () => {
    if (isBookmarked) {
      removeBookmark(article.link);
    } else {
      addBookmark(article);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.spreadContainer, { backgroundColor, borderBottomColor: dividerColor }]}
      onPress={handleOpenDetail}
      activeOpacity={0.88}
    >
      {/* 1. 전면 매거진 화보 이미지 영역 */}
      <View style={styles.heroWrapper}>
        <Image source={{ uri: imageUrl }} style={styles.heroImage} resizeMode="cover" />
        <View style={styles.heroScrim} />

        {/* 상단 배지: 카테고리(또는 호재/악재) & 언론사 */}
        <View style={styles.heroTopRow}>
          <View style={[styles.categoryBadge, { backgroundColor: badgeBgColor }]}>
            <Text style={styles.categoryBadgeText}>
              {isBull && !badgeLabel.startsWith('🔴')
                ? `🔴 ${badgeLabel}`
                : isBear && !badgeLabel.startsWith('🔵')
                  ? `🔵 ${badgeLabel}`
                  : badgeLabel}
            </Text>
          </View>
          <View style={styles.outletBadge}>
            <Text style={styles.outletBadgeText}>{article.outlet}</Text>
          </View>
        </View>

        {/* 하단 메타: 발행시각 & 스크랩 토글 버튼 */}
        <View style={styles.heroBottomRow}>
          <Text style={styles.dateText}>{formattedDate}</Text>
          <TouchableOpacity
            style={[
              styles.bookmarkBtn,
              isBookmarked && { backgroundColor: 'rgba(251, 191, 36, 0.92)' },
            ]}
            onPress={handleToggleBookmark}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text
              style={[
                styles.bookmarkBtnText,
                isBookmarked && { color: '#1C1917', fontWeight: '800' },
              ]}
            >
              {isBookmarked ? '★ 스크랩됨' : '☆ 스크랩'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. 매거진 에디토리얼 타이틀 & 번호형 AI 3줄 요약 (메인 화면에서는 영문 원제 숨김) */}
      <View style={styles.editorialBody}>
        <Text style={[styles.headlineTitle, { color: textColor }]}>{article.title}</Text>

        <View style={styles.ruleRow}>
          <View style={[styles.editorialRule, { backgroundColor: ruleColor }]} />
          <Text style={[styles.ruleCaption, { color: subtextColor }]}>AI 3-LINE BRIEFING</Text>
        </View>

        <View style={styles.summaryList}>
          {summaryLines.map((line, index) => (
            <View key={index} style={styles.summaryRow}>
              <Text style={[styles.summaryIndex, { color: ruleColor }]}>
                0{index + 1}
              </Text>
              <Text style={[styles.summaryText, { color: subtextColor }]}>{line}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footerRow}>
          <Text style={[styles.readMoreText, { color: accentColor }]}>
            뉴스 본문 상세보기 ↑
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  spreadContainer: {
    width: '100%',
    borderBottomWidth: 6,
  },
  heroWrapper: {
    width: '100%',
    height: 196,
    position: 'relative',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#18181B',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12, 10, 9, 0.42)',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  outletBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  outletBadgeText: {
    color: '#F4F4F5',
    fontSize: 12,
    fontWeight: '600',
  },
  heroBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontSize: 12,
    fontWeight: '500',
  },
  bookmarkBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  bookmarkBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  editorialBody: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
  },
  headlineTitle: {
    fontFamily: Fonts?.serif,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
    marginBottom: 12,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  editorialRule: {
    width: 28,
    height: 2.5,
    borderRadius: 2,
  },
  ruleCaption: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  summaryList: {
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  summaryIndex: {
    fontFamily: Fonts?.serif,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 21,
    minWidth: 20,
  },
  summaryText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
  },
  footerRow: {
    marginTop: 14,
    alignItems: 'flex-end',
  },
  readMoreText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
