import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, Animated, Dimensions, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { joinQueue, leaveQueue, tryMatch, subscribeToQueue } from '../../lib/battle';

const { width: SW } = Dimensions.get('window');

export default function BattleScreen() {
    const router = useRouter();
    const [userId, setUserId] = useState<string | null>(null);
    const [username, setUsername] = useState('Player');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [phase, setPhase] = useState<'idle' | 'searching' | 'found'>('idle');
    const [searchSeconds, setSearchSeconds] = useState(0);
    const [opponentName, setOpponentName] = useState('');
    const [roomId, setRoomId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const pulseAnim = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const matchCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const queueSubRef = useRef<any>(null);

    // ── Load user profile ──────────────────────────────────────────────────────
    useEffect(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUserId(user.id);

            const { data: profile } = await supabase
                .from('profiles')
                .select('username, avatar_url')
                .eq('id', user.id)
                .single();

            if (profile) {
                setUsername(profile.username ?? 'Player');
                setAvatarUrl(profile.avatar_url ?? null);
            }
        })();
    }, []);

    // ── Pulse animation while searching ───────────────────────────────────────
    useEffect(() => {
        if (phase === 'searching') {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
                ])
            ).start();
        } else {
            pulseAnim.stopAnimation();
            pulseAnim.setValue(1);
        }
    }, [phase]);

    // ── Fade in on found ───────────────────────────────────────────────────────
    useEffect(() => {
        if (phase === 'found') {
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
            // Navigate to battle room after 2 seconds
            setTimeout(() => {
                if (roomId) {
                    router.push({ pathname: '/(tabs)/battle-room', params: { roomId } });
                }
            }, 2000);
        }
    }, [phase, roomId]);

    // ── Cleanup on unmount ─────────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            clearIntervals();
            if (userId) leaveQueue(userId);
            if (queueSubRef.current) supabase.removeChannel(queueSubRef.current);
        };
    }, [userId]);

    const clearIntervals = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (matchCheckRef.current) clearInterval(matchCheckRef.current);
    };

    // ── Start searching ────────────────────────────────────────────────────────
    const startSearch = async () => {
        if (!userId) return;
        setError(null);
        setSearchSeconds(0);
        setPhase('searching');

        try {
            await joinQueue(userId, username, avatarUrl ?? undefined);

            // Try immediate match
            const room = await tryMatch(userId, username);
            if (room) {
                handleMatched(room.id, room.player1_username === username ? room.player2_username ?? 'Opponent' : room.player1_username);
                return;
            }

            // Start search timer
            timerRef.current = setInterval(() => {
                setSearchSeconds(s => s + 1);
            }, 1000);

            // Poll for match every 3 seconds
            matchCheckRef.current = setInterval(async () => {
                const matched = await tryMatch(userId, username);
                if (matched) {
                    clearIntervals();
                    const opName = matched.player1_id === userId ? matched.player2_username ?? 'Opponent' : matched.player1_username;
                    handleMatched(matched.id, opName);
                }
            }, 3000);

            // Also subscribe to realtime — in case opponent creates the room first
            queueSubRef.current = subscribeToQueue(userId, async (rid) => {
                clearIntervals();
                // Fetch room to get opponent name
                const { data: room } = await supabase
                    .from('battle_rooms')
                    .select('*')
                    .eq('id', rid)
                    .single();

                if (room) {
                    const opName = room.player1_id === userId ? room.player2_username ?? 'Opponent' : room.player1_username;
                    handleMatched(rid, opName);
                }
            });

        } catch (e: any) {
            setError('Could not join queue. Please try again.');
            setPhase('idle');
        }
    };

    const handleMatched = (rid: string, opponentUsername: string) => {
        setRoomId(rid);
        setOpponentName(opponentUsername);
        setPhase('found');
        if (queueSubRef.current) supabase.removeChannel(queueSubRef.current);
    };

    // ── Cancel search ──────────────────────────────────────────────────────────
    const cancelSearch = async () => {
        clearIntervals();
        if (queueSubRef.current) supabase.removeChannel(queueSubRef.current);
        if (userId) await leaveQueue(userId);
        setPhase('idle');
        setSearchSeconds(0);
    };

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60).toString().padStart(2, '0');
        const sec = (s % 60).toString().padStart(2, '0');
        return `${m}:${sec}`;
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0a0a1a" />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerEmoji}>🕷️</Text>
                <Text style={styles.headerTitle}>Ananse's Challenge</Text>
                <Text style={styles.headerSub}>Battle a player in an African story duel</Text>
            </View>

            {/* How to Play */}
            <View style={styles.howToCard}>
                <Text style={styles.howToTitle}>How it works</Text>
                <Text style={styles.howToText}>📖 Ananse tells a Ghanaian story</Text>
                <Text style={styles.howToText}>❓ Answer 5 questions from the story</Text>
                <Text style={styles.howToText}>⚡ Faster correct answers = more points</Text>
                <Text style={styles.howToText}>🏆 Winner earns 50 coins!</Text>
            </View>

            {/* Main Area */}
            <View style={styles.mainArea}>

                {/* IDLE */}
                {phase === 'idle' && (
                    <View style={styles.idleContainer}>
                        <Text style={styles.spiderEmoji}>🕸️</Text>
                        <Text style={styles.idleTitle}>Ready to battle?</Text>
                        <Text style={styles.idleSub}>Tap below to find an opponent</Text>
                        {error && <Text style={styles.errorText}>{error}</Text>}
                        <TouchableOpacity style={styles.findBtn} onPress={startSearch} activeOpacity={0.85}>
                            <Text style={styles.findBtnText}>⚔️  Find Battle</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* SEARCHING */}
                {phase === 'searching' && (
                    <View style={styles.searchingContainer}>
                        <Animated.Text style={[styles.searchEmoji, { transform: [{ scale: pulseAnim }] }]}>
                            🔍
                        </Animated.Text>
                        <Text style={styles.searchTitle}>Searching for opponent...</Text>
                        <Text style={styles.searchTimer}>{formatTime(searchSeconds)}</Text>
                        <ActivityIndicator color="#FFD700" size="large" style={{ marginTop: 16 }} />
                        <Text style={styles.searchHint}>Waiting for another player to join</Text>
                        <TouchableOpacity style={styles.cancelBtn} onPress={cancelSearch} activeOpacity={0.85}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* FOUND */}
                {phase === 'found' && (
                    <Animated.View style={[styles.foundContainer, { opacity: fadeAnim }]}>
                        <Text style={styles.foundEmoji}>⚔️</Text>
                        <Text style={styles.foundTitle}>Opponent Found!</Text>
                        <View style={styles.vsRow}>
                            <View style={styles.playerCard}>
                                <Text style={styles.playerEmoji}>🧑</Text>
                                <Text style={styles.playerName}>{username}</Text>
                                <Text style={styles.playerLabel}>You</Text>
                            </View>
                            <Text style={styles.vsText}>VS</Text>
                            <View style={styles.playerCard}>
                                <Text style={styles.playerEmoji}>🧑</Text>
                                <Text style={styles.playerName}>{opponentName}</Text>
                                <Text style={styles.playerLabel}>Opponent</Text>
                            </View>
                        </View>
                        <Text style={styles.startingText}>Battle starting...</Text>
                        <ActivityIndicator color="#FFD700" size="small" style={{ marginTop: 8 }} />
                    </Animated.View>
                )}

            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a1a',
    },
    header: {
        backgroundColor: '#12122a',
        paddingTop: 48,
        paddingBottom: 20,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#FFD70033',
    },
    headerEmoji: { fontSize: 36, marginBottom: 6 },
    headerTitle: { fontSize: 24, fontWeight: '900', color: '#FFD700', letterSpacing: 1 },
    headerSub: { fontSize: 13, color: '#aaa', marginTop: 4 },

    howToCard: {
        margin: 16,
        backgroundColor: '#1a1a2e',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#FFD70033',
    },
    howToTitle: { fontSize: 14, fontWeight: '700', color: '#FFD700', marginBottom: 8 },
    howToText: { fontSize: 13, color: '#ccc', marginBottom: 4 },

    mainArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },

    // Idle
    idleContainer: { alignItems: 'center' },
    spiderEmoji: { fontSize: 64, marginBottom: 16 },
    idleTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 8 },
    idleSub: { fontSize: 14, color: '#aaa', marginBottom: 24 },
    errorText: { color: '#FF6B6B', fontSize: 13, marginBottom: 12, textAlign: 'center' },
    findBtn: {
        backgroundColor: '#FFD700',
        paddingVertical: 16,
        paddingHorizontal: 48,
        borderRadius: 50,
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    findBtnText: { fontSize: 18, fontWeight: '900', color: '#0a0a1a' },

    // Searching
    searchingContainer: { alignItems: 'center' },
    searchEmoji: { fontSize: 64, marginBottom: 16 },
    searchTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 8 },
    searchTimer: { fontSize: 32, fontWeight: '900', color: '#FFD700' },
    searchHint: { fontSize: 13, color: '#888', marginTop: 12, textAlign: 'center' },
    cancelBtn: {
        marginTop: 24,
        borderWidth: 1,
        borderColor: '#FF6B6B',
        paddingVertical: 10,
        paddingHorizontal: 32,
        borderRadius: 50,
    },
    cancelBtnText: { color: '#FF6B6B', fontSize: 15, fontWeight: '700' },

    // Found
    foundContainer: { alignItems: 'center' },
    foundEmoji: { fontSize: 64, marginBottom: 12 },
    foundTitle: { fontSize: 24, fontWeight: '900', color: '#FFD700', marginBottom: 24 },
    vsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 24,
    },
    playerCard: {
        alignItems: 'center',
        backgroundColor: '#1a1a2e',
        borderRadius: 16,
        padding: 16,
        width: SW * 0.32,
        borderWidth: 1,
        borderColor: '#FFD70055',
    },
    playerEmoji: { fontSize: 36, marginBottom: 6 },
    playerName: { fontSize: 14, fontWeight: '700', color: '#fff', textAlign: 'center' },
    playerLabel: { fontSize: 11, color: '#FFD700', marginTop: 2 },
    vsText: { fontSize: 28, fontWeight: '900', color: '#FF6B6B' },
    startingText: { fontSize: 16, color: '#aaa', fontWeight: '600' },
});
