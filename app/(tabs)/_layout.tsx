import { Tabs } from 'expo-router';
import { C } from '../../constants/colors';
import { Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthModal } from '../components/AuthModal';
import { supabase } from '../../lib/supabase';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
    return (
        <Text style={{ fontSize: focused ? 26 : 22, opacity: focused ? 1 : 0.5 }}>
            {emoji}
        </Text>
    );
}

function CustomTabButton(props: any) {
    const { show } = useAuthModal();
    const handlePress = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) props.onPress?.();
        else show({ onSuccess: () => props.onPress?.() });
    };
    return (
        <TouchableOpacity {...props} onPress={handlePress} />
    );
}

export default function TabLayout() {
    const insets = useSafeAreaInsets();
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: C.card,
                    borderTopColor: C.border,
                    borderTopWidth: 1,
                    height: 60 + insets.bottom,
                    paddingBottom: insets.bottom + 4,
                },
                tabBarActiveTintColor: C.gold,
                tabBarInactiveTintColor: C.muted,
                tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Play',
                    tabBarIcon: ({ focused }) => <TabIcon emoji="🎮" focused={focused} />,
                }}
            />
            <Tabs.Screen
                name="leaderboard"
                options={{
                    title: 'Ranks',
                    tabBarIcon: ({ focused }) => <TabIcon emoji="🏆" focused={focused} />,
                }}
            />
            <Tabs.Screen
                name="store"
                options={{
                    title: 'Store',
                    tabBarIcon: ({ focused }) => <TabIcon emoji="🛍️" focused={focused} />,
                    tabBarButton: (props: any) => <CustomTabButton {...props} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
                    tabBarButton: (props: any) => <CustomTabButton {...props} />,
                }}
            />

            {/* Hidden screens - accessible via navigation from Play */}
            <Tabs.Screen
                name="maze"
                options={{ href: null }}
            />
            <Tabs.Screen
                name="battle"
                options={{ href: null }}
            />
            <Tabs.Screen
                name="battle-room"
                options={{ href: null }}
            />
            <Tabs.Screen
                name="cards"
                options={{ href: null }}
            />
        </Tabs>
    );
}
