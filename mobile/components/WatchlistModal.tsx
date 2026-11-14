import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import {
  WatchlistItem,
  useBookmarkStore,
  syncWatchlistToGithubRepo,
} from '@/store/useBookmarkStore';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Fonts } from '@/constants/theme';

const PRESET_STOCKS: WatchlistItem[] = [
  { symbol: '005930.KS', name: '삼성전자', market: 'KR', query: '삼성전자 주가 OR 반도체 OR 실적' },
  { symbol: '000660.KS', name: 'SK하이닉스', market: 'KR', query: 'SK하이닉스 HBM OR 주가 OR 실적' },
  { symbol: '000500.KS', name: '가온전선', market: 'KR', query: '가온전선 주가 OR 전력망 OR 전선' },
  { symbol: '036930.KQ', name: '주성엔지니어링', market: 'KR', query: '주성엔지니어링 주가 OR 반도체 장비 OR 실적' },
  { symbol: '009150.KS', name: '삼성전기', market: 'KR', query: '삼성전기 MLCC OR 기판 OR 주가' },
  { symbol: '003670.KS', name: '포스코퓨처엠', market: 'KR', query: '포스코퓨처엠 양극재 OR 이차전지 OR 주가' },
  { symbol: '006400.KS', name: '삼성SDI', market: 'KR', query: '삼성SDI 배터리 OR 전고체 OR 주가' },
  { symbol: '181710.KS', name: 'NHN', market: 'KR', query: 'NHN 클라우드 OR 게임 OR 주가' },
  { symbol: '053800.KQ', name: '안랩', market: 'KR', query: '안랩 보안 OR 사이버보안 OR 주가' },
  { symbol: '180640.KS', name: '한진칼', market: 'KR', query: '한진칼 주가 OR 지배구조 OR 대한항공' },
  { symbol: '003490.KS', name: '대한항공', market: 'KR', query: '대한항공 주가 OR 항공 화물 OR 합병' },
  { symbol: '010950.KS', name: 'S-Oil', market: 'KR', query: 'S-Oil 에쓰오일 정제마진 OR 유가 OR 주가' },
  { symbol: '096770.KS', name: 'SK이노베이션', market: 'KR', query: 'SK이노베이션 정유 OR 배터리 OR 주가' },
  { symbol: '002680.KQ', name: '한탑', market: 'KR', query: '한탑 사료 OR 곡물 OR 주가' },
  { symbol: '124500.KQ', name: '아이티센글로벌', market: 'KR', query: '아이티센글로벌 OR 아이티센 금거래소 OR 주가' },
  { symbol: '005380.KS', name: '현대차', market: 'KR', query: '현대차 주가 OR 수출 OR 실적' },
  { symbol: 'NVDA', name: '엔비디아', market: 'US', query: 'NVIDIA stock OR Blackwell OR AI chip' },
  { symbol: 'TSLA', name: '테슬라', market: 'US', query: 'Tesla stock OR EV OR FSD' },
  { symbol: 'AAPL', name: '애플', market: 'US', query: 'Apple stock OR iPhone OR Apple Intelligence' },
];

interface WatchlistModalProps {
  visible: boolean;
  onClose: () => void;
}

export function WatchlistModal({ visible, onClose }: WatchlistModalProps) {
  const watchlist = useBookmarkStore((state) => state.watchlist);
  const addWatchlistItem = useBookmarkStore((state) => state.addWatchlistItem);
  const removeWatchlistItem = useBookmarkStore((state) => state.removeWatchlistItem);
  const githubToken = useBookmarkStore((state) => state.githubToken);
  const setGithubToken = useBookmarkStore((state) => state.setGithubToken);

  const [customName, setCustomName] = useState('');
  const [customSymbol, setCustomSymbol] = useState('');
  const [showSyncConfig, setShowSyncConfig] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const backgroundColor = useThemeColor({}, 'background');
  const chromeColor = useThemeColor({}, 'chrome');
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const subtextColor = useThemeColor({}, 'subtext');
  const borderColor = useThemeColor({}, 'border');
  const accentColor = useThemeColor({}, 'accent');
  const bullColor = useThemeColor({}, 'bull');

  const handleAddCustom = () => {
    const trimmedName = customName.trim();
    let trimmedSymbol = customSymbol.trim().toUpperCase();
    if (!trimmedName || !trimmedSymbol) return;

    // 6자리 숫자만 입력한 경우 한국거래소(.KS) 자동 보정
    if (/^\d{6}$/.test(trimmedSymbol)) {
      trimmedSymbol = `${trimmedSymbol}.KS`;
    }
    const isKr = trimmedSymbol.endsWith('.KS') || trimmedSymbol.endsWith('.KQ');

    addWatchlistItem({
      symbol: trimmedSymbol,
      name: trimmedName,
      market: isKr ? 'KR' : 'US',
      query: isKr ? `${trimmedName} 주가 OR 실적` : `${trimmedName} ${trimmedSymbol} stock`,
    });

    setCustomName('');
    setCustomSymbol('');
  };

  const handleManualSync = async () => {
    setSyncStatus('파이프라인 설정 동기화 중...');
    const res = await syncWatchlistToGithubRepo(watchlist, githubToken);
    setSyncStatus(res.message);
  };

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
          {/* 모달 헤더 */}
          <View style={[styles.header, { borderBottomColor: borderColor }]}>
            <View>
              <Text style={[styles.title, { color: textColor }]}>
                관심 종목 관리
              </Text>
              <Text style={[styles.subtitle, { color: subtextColor }]}>
                상단 티커에 표시하고 등락 분석을 받아볼 종목을 설정합니다
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { borderColor }]}
            >
              <Text style={[styles.closeBtnText, { color: textColor }]}>닫기</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. 현재 등록된 관심종목 목록 (삭제 가능) */}
            <Text style={[styles.sectionTitle, { color: accentColor }]}>
              등록된 관심 종목 ({watchlist.length})
            </Text>

            {watchlist.length === 0 ? (
              <View style={[styles.emptyBox, { borderColor, backgroundColor: cardColor }]}>
                <Text style={[styles.emptyText, { color: subtextColor }]}>
                  등록된 관심 종목이 없습니다. 아래에서 종목을 추가해주세요.
                </Text>
              </View>
            ) : (
              <View style={[styles.listBox, { borderColor, backgroundColor: cardColor }]}>
                {watchlist.map((item, idx) => (
                  <View
                    key={item.symbol}
                    style={[
                      styles.stockRow,
                      idx < watchlist.length - 1 && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: borderColor,
                      },
                    ]}
                  >
                    <View style={styles.stockInfo}>
                      <View
                        style={[
                          styles.marketBadge,
                          {
                            backgroundColor:
                              item.market === 'KR'
                                ? 'rgba(245, 158, 11, 0.16)'
                                : 'rgba(59, 130, 246, 0.16)',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.marketBadgeText,
                            { color: item.market === 'KR' ? '#F59E0B' : '#60A5FA' },
                          ]}
                        >
                          {item.market}
                        </Text>
                      </View>
                      <Text style={[styles.stockName, { color: textColor }]}>
                        {item.name}
                      </Text>
                      <Text style={[styles.stockSymbol, { color: subtextColor }]}>
                        {item.symbol}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => removeWatchlistItem(item.symbol)}
                      style={[styles.deleteBtn, { borderColor }]}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={[styles.deleteBtnText, { color: bullColor }]}>
                        삭제
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* 2. 직접 종목 입력 추가 */}
            <Text style={[styles.sectionTitle, { color: accentColor, marginTop: 18 }]}>
              직접 종목 추가
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                value={customName}
                onChangeText={setCustomName}
                placeholder="종목명 (예: 기아, 팔란티어)"
                placeholderTextColor={subtextColor}
                style={[
                  styles.inputField,
                  { color: textColor, borderColor, backgroundColor },
                ]}
              />
              <TextInput
                value={customSymbol}
                onChangeText={setCustomSymbol}
                placeholder="티커/코드 (예: 000270, PLTR)"
                placeholderTextColor={subtextColor}
                autoCapitalize="characters"
                style={[
                  styles.inputField,
                  { color: textColor, borderColor, backgroundColor },
                ]}
              />
              <TouchableOpacity
                onPress={handleAddCustom}
                style={[styles.addBtn, { backgroundColor: accentColor }]}
                activeOpacity={0.8}
              >
                <Text style={styles.addBtnText}>+ 추가</Text>
              </TouchableOpacity>
            </View>

            {/* 3. 주요 인기 종목 원터치 추가 */}
            <Text style={[styles.sectionTitle, { color: accentColor, marginTop: 18 }]}>
              인기 종목 빠른 추가 / 해제
            </Text>
            <View style={styles.presetGrid}>
              {PRESET_STOCKS.map((preset) => {
                const isAdded = watchlist.some(
                  (w) => w.symbol.toUpperCase() === preset.symbol.toUpperCase()
                );
                return (
                  <TouchableOpacity
                    key={preset.symbol}
                    activeOpacity={0.78}
                    onPress={() => {
                      if (isAdded) {
                        removeWatchlistItem(preset.symbol);
                      } else {
                        addWatchlistItem(preset);
                      }
                    }}
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor: isAdded ? backgroundColor : cardColor,
                        borderColor: isAdded ? accentColor : borderColor,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        { color: isAdded ? accentColor : textColor },
                      ]}
                    >
                      {isAdded ? '✓ ' : '+ '}
                      {preset.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 4. 파이프라인 원격 연동 설정 (선택) */}
            <TouchableOpacity
              onPress={() => setShowSyncConfig((prev) => !prev)}
              style={[styles.syncToggleRow, { borderColor }]}
            >
              <Text style={[styles.syncToggleText, { color: subtextColor }]}>
                {showSyncConfig ? '▾' : '▸'} 다음 파이프라인(GitHub Actions) 연동 설정
              </Text>
            </TouchableOpacity>

            {showSyncConfig && (
              <View style={[styles.syncBox, { borderColor, backgroundColor: cardColor }]}>
                <Text style={[styles.syncDesc, { color: subtextColor }]}>
                  GitHub Token(Contents 읽기/쓰기 권한)을 입력하면 종목 추가·삭제 시 저장소의 pipeline/watchlist.json이 자동 갱신되어 다음 브리핑 생성 시 반영됩니다.
                </Text>
                <View style={styles.inputRow}>
                  <TextInput
                    value={githubToken}
                    onChangeText={setGithubToken}
                    placeholder="ghp_... 또는 github_pat_..."
                    placeholderTextColor={subtextColor}
                    secureTextEntry
                    autoCapitalize="none"
                    style={[
                      styles.inputField,
                      { color: textColor, borderColor, backgroundColor },
                    ]}
                  />
                  <TouchableOpacity
                    onPress={handleManualSync}
                    style={[styles.addBtn, { backgroundColor: accentColor }]}
                  >
                    <Text style={styles.addBtnText}>동기화</Text>
                  </TouchableOpacity>
                </View>
                {syncStatus ? (
                  <Text style={[styles.syncStatusText, { color: accentColor }]}>
                    {syncStatus}
                  </Text>
                ) : null}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
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
    maxHeight: '82%',
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
    fontSize: 11,
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
  scrollArea: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  emptyBox: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
  },
  listBox: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  marketBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  marketBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  stockName: {
    fontSize: 14,
    fontWeight: '700',
  },
  stockSymbol: {
    fontSize: 12,
  },
  deleteBtn: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 5,
    borderWidth: 1,
  },
  deleteBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inputField: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
  },
  addBtn: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#09090B',
    fontSize: 12,
    fontWeight: '800',
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  syncToggleRow: {
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  syncToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  syncBox: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  syncDesc: {
    fontSize: 11,
    lineHeight: 16,
  },
  syncStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
});

