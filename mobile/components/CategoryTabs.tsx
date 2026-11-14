import React from 'react';
import { ScrollView, Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface CategoryTabsProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  rightText?: string;
}

export function CategoryTabs({
  categories,
  selectedCategory,
  onSelectCategory,
  rightText,
}: CategoryTabsProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';

  const chromeColor = useThemeColor({}, 'chrome');
  const textColor = useThemeColor({}, 'text');
  const subtextColor = useThemeColor({}, 'subtext');
  const borderColor = useThemeColor({}, 'border');
  const accentColor = useThemeColor({}, 'accent');

  return (
    <View style={[styles.container, { backgroundColor: chromeColor, borderBottomColor: borderColor }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
      >
        {categories.map((category) => {
          const isActive = selectedCategory === category;
          return (
            <TouchableOpacity
              key={category}
              style={[
                styles.tab,
                isActive
                  ? { backgroundColor: isDark ? accentColor : textColor }
                  : { backgroundColor: 'transparent' },
              ]}
              onPress={() => onSelectCategory(category)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.tabText,
                  isActive
                    ? { color: isDark ? '#09090B' : '#F6F2EA', fontWeight: '700' }
                    : { color: subtextColor, fontWeight: '600' },
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {rightText ? (
        <Text style={[styles.editionText, { color: accentColor }]} numberOfLines={1}>
          {rightText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  scrollArea: {
    flex: 1,
    marginRight: 14,
  },
  scrollContent: {
    alignItems: 'center',
    gap: 3,
  },
  tab: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  tabText: {
    fontSize: 13,
  },
  editionText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    flexShrink: 0,
  },
});
