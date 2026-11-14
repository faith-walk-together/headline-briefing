import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import { EditionEntry } from '@/hooks/useNews';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Fonts } from '@/constants/theme';

interface EditionPickerModalProps {
  visible: boolean;
  onClose: () => void;
  editions: EditionEntry[];
  selectedEditionFile: string | null;
  currentEditionLabel: string;
  onSelectEdition: (file: string | null, label: string | null) => void;
}

export function EditionPickerModal({
  visible,
  onClose,
  editions,
  selectedEditionFile,
  currentEditionLabel,
  onSelectEdition,
}: EditionPickerModalProps) {
  const backgroundColor = useThemeColor({}, 'background');
  const chromeColor = useThemeColor({}, 'chrome');
  const textColor = useThemeColor({}, 'text');
  const subtextColor = useThemeColor({}, 'subtext');
  const borderColor = useThemeColor({}, 'border');
  const accentColor = useThemeColor({}, 'accent');

  // 아카이브 목록이 비어 있거나 아직 최신본만 있을 때 기본 항목 보장
  const listData: EditionEntry[] =
    editions.length > 0
      ? editions
      : [
          {
            id: 'latest',
            edition: currentEditionLabel,
            last_updated: new Date().toISOString(),
            file: '',
          },
        ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropTouch}
          activeOpacity={1}
          onPress={onClose}
        />

        <View
          style={[
            styles.sheet,
            { backgroundColor: chromeColor, borderColor },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: borderColor }]}>
            <View>
              <Text style={[styles.title, { color: textColor }]}>
                브리핑 회차 선택
              </Text>
              <Text style={[styles.subtitle, { color: subtextColor }]}>
                매일 07:00(AM) · 19:00(PM) 발행본 아카이브
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { borderColor }]}
            >
              <Text style={[styles.closeBtnText, { color: textColor }]}>닫기</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={listData}
            keyExtractor={(item, idx) => `${item.id}-${idx}`}
            style={styles.list}
            renderItem={({ item, index }) => {
              const isLatest = index === 0;
              const isSelected = isLatest
                ? !selectedEditionFile || selectedEditionFile === item.file
                : selectedEditionFile === item.file;

              return (
                <TouchableOpacity
                  style={[
                    styles.itemRow,
                    { borderBottomColor: borderColor },
                    isSelected && { backgroundColor },
                  ]}
                  activeOpacity={0.75}
                  onPress={() => {
                    if (isLatest) {
                      onSelectEdition(null, null);
                    } else {
                      onSelectEdition(item.file, item.edition);
                    }
                    onClose();
                  }}
                >
                  <View style={styles.itemLeft}>
                    <View style={styles.editionRow}>
                      <Text
                        style={[
                          styles.editionLabel,
                          { color: isSelected ? accentColor : textColor },
                        ]}
                      >
                        {item.edition}
                      </Text>
                      {isLatest ? (
                        <View
                          style={[
                            styles.latestBadge,
                            { backgroundColor: accentColor },
                          ]}
                        >
                          <Text style={styles.latestBadgeText}>LATEST</Text>
                        </View>
                      ) : null}
                    </View>
                    {item.article_count ? (
                      <Text style={[styles.countText, { color: subtextColor }]}>
                        매거진 {item.article_count}건 · 증시 {item.stock_count ?? 0}건
                      </Text>
                    ) : null}
                  </View>

                  <Text
                    style={[
                      styles.selectIndicator,
                      { color: isSelected ? accentColor : subtextColor },
                    ]}
                  >
                    {isSelected ? '✓ 현재 열람 중' : '보기 →'}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  backdropTouch: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  sheet: {
    width: '100%',
    maxHeight: '72%',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontFamily: Fonts?.serif,
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  closeBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  list: {
    flexGrow: 0,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemLeft: {
    gap: 3,
  },
  editionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editionLabel: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  latestBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  latestBadgeText: {
    color: '#09090B',
    fontSize: 10,
    fontWeight: '800',
  },
  countText: {
    fontSize: 12,
  },
  selectIndicator: {
    fontSize: 12,
    fontWeight: '700',
  },
});

