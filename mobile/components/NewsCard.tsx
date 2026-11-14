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

  const summaryText = useMemo(() => {
    if (article.summary_lines && article.summary_lines.length > 0) {
      return article.summary_lines
        .map((s) => s.trim())
        .filter(Boolean)
        .join(' ');
    }
    return (article.summary || '요약 정보를 불러왔습니다.')
      .replace(/\s*\n+\s*/g, ' ')
      .trim();
  }, [article.summary, article.summary_lines]);

  const isBull = article.signal === 'BULL' || article.category.startsWith('호재');
  const isBear = article.signal === 'BEAR' || article.category.startsWith('악재');

  const badgeBgColor = isBull
    ? '#DC2626'
    : isBear
      ? '#2563EB'
      : 'rgba(28, 25, 23, 0.78)';

  const ruleColor = isBull ? bullColor : isBear ? bearColor : accentColor;

  const badgeLabel = (article.signal_label || article.category).replace(/^[🔴🔵]\s*/, '');
  const categoryTextColor = isBull
    ? '#F87171'
    : isBear
      ? '#60A5FA'
      : '#FFFFFF';
  const imageUrl =
    article.image_url ||
    FALLBACK_IMAGES[article.category] ||
    FALLBACK_IMAGES.default;

  // 타이틀이 길어져서 1줄 축소 시 폰트가 15px 이하로 작아질 경우(약 25자 이상) 18px 2줄로 표시
  const isTwoLineTitle = (article.title || '').trim().length >= 25;

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

        {/* 이미지 하단 오버레이: 좌측 카테고리/언론사/시간(투명 배경), 우측 스크랩 아이콘 */}
        <View style={styles.heroBottomRow}>
          <View style={styles.leftTagGroup}>
            <Text style={[styles.categoryBadgeText, { color: categoryTextColor }]}>
              {badgeLabel}
            </Text>
            <Text style={styles.outletBadgeText}>{article.outlet}</Text>
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>

          <TouchableOpacity
            style={styles.bookmarkBtn}
            onPress={handleToggleBookmark}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text
              style={[
                styles.bookmarkBtnText,
                isBookmarked && { color: '#FBBF24' },
              ]}
            >
              {isBookmarked ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. 매거진 에디토리얼 타이틀 & AI 요약 단락 (메인 화면에서는 영문 원제 숨김) */}
      <View style={styles.editorialBody}>
        <Text
          style={[styles.headlineTitle, { color: textColor }]}
          numberOfLines={isTwoLineTitle ? 2 : 1}
          adjustsFontSizeToFit={!isTwoLineTitle}
          minimumFontScale={isTwoLineTitle ? undefined : 0.86}
        >
          {article.title}
        </Text>

        <Text
          style={[styles.summaryParagraph, { color: subtextColor }]}
          textBreakStrategy="simple"
        >
          {`${summaryText}\n`}
        </Text>
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
    justifyContent: 'flex-end',
    backgroundColor: '#18181B',
    overflow: 'hidden',
  },
  heroImage: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  heroScrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(12, 10, 9, 0.42)',
  },
  heroBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  leftTagGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  outletBadgeText: {
    color: 'rgba(255, 255, 255, 0.92)',
    fontSize: 12,
    fontWeight: '600',
  },
  dateText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontWeight: '500',
  },
  bookmarkBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    backgroundColor: 'transparent',
  },
  bookmarkBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  editorialBody: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 6,
  },
  headlineTitle: {
    fontFamily: Fonts?.serif,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    marginBottom: 8,
    includeFontPadding: false,
  },
  summaryParagraph: {
    fontSize: 14,
    lineHeight: 22,
    includeFontPadding: false,
  },
});
