import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { C } from '../constants/colors';
import AuthModalProvider from './components/AuthModal';

export default function RootLayout() {
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState<any>(null);
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (loading) return;

        const inAuth = segments[0] === '(auth)';

        // If already signed in and in the auth flow, send to tabs.
        // Otherwise don't force users to the login screen on app open —
        // allow the Play tab to be visible even when not signed in.
        if (session && inAuth) {
            router.replace('/(tabs)');
        }
    }, [session, loading, segments]);

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator color={C.gold} size="large" />
            </View>
        );
    }

    return (
        <>
            <StatusBar style="light" />
            {/* Provide auth modal globally so any screen can prompt login */}
            <AuthModalProvider>
                <Slot />
            </AuthModalProvider>
        </>
    );
}