import React from 'react';
import { ScrollView, Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface CategoryTabsProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export function CategoryTabs({ categories, selectedCategory, onSelectCategory }: CategoryTabsProps) {
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
                    : { color: subtextColor, fontWeight: '500' },
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 6,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  tabText: {
    fontSize: 13,
  },
});
