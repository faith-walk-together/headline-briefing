import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.tint,
        tabBarInactiveTintColor: palette.tabIconDefault,
        tabBarStyle: {
          backgroundColor: palette.chrome,
          borderTopColor: palette.border,
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '매거진',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="book.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="stock"
        options={{
          title: '주식·마켓',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="chart.line.uptrend.xyaxis" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookmarks"
        options={{
          title: '스크랩',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="bookmark.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
