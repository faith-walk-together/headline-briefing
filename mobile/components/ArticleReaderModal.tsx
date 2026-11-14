import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Linking,
  Pressable,
} from 'react-native';
import { useUIStore } from '@/store/useUIStore';
import { useBookmarkStore } from '@/store/useBookmarkStore';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Fonts } from '@/constants/theme';

export function ArticleReaderModal() {
  const selectedArticle = useUIStore((state) => state.selectedArticle);
  const setSelectedArticle = useUIStore((state) => state.setSelectedArticle);

  const modalBg = useThemeColor({}, 'modal');
  const cardBg = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const subtextColor = useThemeColor({}, 'subtext');
  const borderColor = useThemeColor({}, 'border');
  const accentColor = useThemeColor({}, 'accent');
  const bullColor = useThemeColor({}, 'bull');
  const bearColor = useThemeColor({}, 'bear');

  const isBookmarked = useBookmarkStore((state) =>
    selectedArticle ? state.isBookmarked(selectedArticle.link) : false
  );
  const addBookmark = useBookmarkStore((state) => state.addBookmark);
  const removeBookmark = useBookmarkStore((state) => state.removeBookmark);

  const formattedDate = useMemo(() => {
    if (!selectedArticle?.pub_date) return '';
    const d = new Date(selectedArticle.pub_date);
    if (isNaN(d.getTime())) return selectedArticle.pub_date;
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [selectedArticle?.pub_date]);

  const bodyParagraphs = useMemo(() => {
    if (!selectedArticle) return [];
    if (selectedArticle.full_body && selectedArticle.full_body.length > 0) {
      return selectedArticle.full_body;
    }
    if (selectedArticle.summary_lines && selectedArticle.summary_lines.length > 0) {
      return selectedArticle.summary_lines;
    }
    return (selectedArticle.summary || '')
      .split(/\n+/)
      .map((p) => p.trim())
      .filter(Boolean);
  }, [selectedArticle]);

  if (!selectedArticle) return null;

  const isBull =
    selectedArticle.signal === 'BULL' || selectedArticle.category.startsWith('호재');
  const isBear =
    selectedArticle.signal === 'BEAR' || selectedArticle.category.startsWith('악재');

  const badgeLabel = (selectedArticle.signal_label || selectedArticle.category).replace(
    /^[🔴🔵]\s*/,
    ''
  );
  const badgeColor = isBull ? bullColor : isBear ? bearColor : accentColor;

  const showOriginalTitle = Boolean(
    selectedArticle.original_title &&
      selectedArticle.original_title.trim().length > 0 &&
      selectedArticle.original_title.trim() !== selectedArticle.title.trim()
  );

  const handleClose = () => {
    setSelectedArticle(null);
  };

  const handleToggleBookmark = () => {
    if (isBookmarked) {
      removeBookmark(selectedArticle.link);
    } else {
      addBookmark(selectedArticle);
    }
  };

  const handleOpenOriginal = () => {
    if (selectedArticle.link) {
      Linking.openURL(selectedArticle.link);
    }
  };

  return (
    <Modal
      visible={Boolean(selectedArticle)}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />

        <View style={[styles.sheetContainer, { backgroundColor: modalBg, borderColor }]}>
          {/* 상단 드래그 핸들 & 헤더 바 */}
          <View style={[styles.sheetHeader, { borderBottomColor: borderColor }]}>
            <View style={[styles.dragHandle, { backgroundColor: borderColor }]} />

            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <View style={[styles.badge, { borderColor: badgeColor }]}>
                  <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeLabel}</Text>
                </View>
                <Text style={[styles.outletText, { color: textColor }]}>
                  {selectedArticle.outlet}
                </Text>
              </View>

              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={[
                    styles.scrapButton,
                    { borderColor: isBookmarked ? accentColor : borderColor },
                  ]}
                  onPress={handleToggleBookmark}
                >
                  <Text
                    style={[
                      styles.scrapButtonText,
                      { color: isBookmarked ? accentColor : subtextColor },
                    ]}
                  >
                    {isBookmarked ? '★ 스크랩됨' : '☆ 스크랩'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                  <Text style={[styles.closeButtonText, { color: subtextColor }]}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* 본문 스크롤 영역 (AI 요약 미표시, 해외뉴스 영문 원제 병기 + 실제 뉴스 본문) */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.titleSection, { borderBottomColor: borderColor }]}>
              <Text style={[styles.pubDateText, { color: subtextColor }]}>{formattedDate}</Text>
              <Text style={[styles.articleTitle, { color: textColor }]}>
                {selectedArticle.title}
              </Text>

              {/* 해외뉴스 영문 원제 병기 (상세보기 모달에서만 노출) */}
              {showOriginalTitle && (
                <View
                  style={[
                    styles.originalTitleBox,
                    { backgroundColor: cardBg, borderColor },
                  ]}
                >
                  <Text style={[styles.originalTitleBadge, { color: accentColor }]}>
                    ORIGINAL TITLE
                  </Text>
                  <Text style={[styles.originalTitleText, { color: subtextColor }]}>
                    {selectedArticle.original_title}
                  </Text>
                </View>
              )}
            </View>

            {/* 기사 이미지 */}
            {selectedArticle.image_url ? (
              <Image
                source={{ uri: selectedArticle.image_url }}
                style={styles.articleImage}
                resizeMode="cover"
              />
            ) : null}

            {/* 실제 뉴스 본문 단락 */}
            <View style={styles.bodySection}>
              {bodyParagraphs.map((paragraph, index) => (
                <Text
                  key={index}
                  style={[styles.bodyParagraph, { color: textColor }]}
                >
                  {paragraph}
                </Text>
              ))}
            </View>

            {/* 하단 원문 링크 */}
            <View style={[styles.bottomBar, { borderTopColor: borderColor }]}>
              <Text style={[styles.sourceLabel, { color: subtextColor }]}>
                출처: {selectedArticle.outlet}
              </Text>
              <TouchableOpacity
                style={[styles.originalLinkBtn, { backgroundColor: cardBg, borderColor }]}
                onPress={handleOpenOriginal}
              >
                <Text style={[styles.originalLinkBtnText, { color: textColor }]}>
                  언론사 원문 보러가기 ↗
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
  },
  sheetContainer: {
    height: '88%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    overflow: 'hidden',
  },
  sheetHeader: {
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  outletText: {
    fontSize: 13,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scrapButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  scrapButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  closeButton: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  titleSection: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  pubDateText: {
    fontSize: 12,
    marginBottom: 6,
  },
  articleTitle: {
    fontFamily: Fonts?.serif,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 31,
  },
  originalTitleBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  originalTitleBadge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  originalTitleText: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 19,
  },
  articleImage: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    marginBottom: 18,
    backgroundColor: '#18181B',
  },
  bodySection: {
    gap: 16,
  },
  bodyParagraph: {
    fontSize: 16,
    lineHeight: 27,
  },
  bottomBar: {
    marginTop: 28,
    paddingTop: 16,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sourceLabel: {
    fontSize: 13,
  },
  originalLinkBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  originalLinkBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});

