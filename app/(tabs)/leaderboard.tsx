import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
    View, Text, StyleSheet, Image,
    ActivityIndicator, FlatList,
    TouchableOpacity, Modal, Pressable
} from 'react-native';
import { supabase } from '../../lib/supabase';

const GOLD = '#FFD700';
const SILVER = '#C0C0C0';
const BRONZE = '#cd7f32';
const BG = '#0a0a0a';
const CARD = '#1a1200';
const BORDER = '#3a2a00';
const MUTED = '#9a7a4a';
const TEXT = '#f5e6c8';

type Player = {
    id: string;
    username: string;
    avatar_url: string | null;
    coins: number;
};

function getRankColor(i: number) {
    if (i === 0) return GOLD;
    if (i === 1) return SILVER;
    if (i === 2) return BRONZE;
    return MUTED;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardScreen() {
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [myId, setMyId] = useState<string | null>(null);
    const [selected, setSelected] = useState<{ player: Player; index: number } | null>(null);

    useFocusEffect(useCallback(() => {
        let active = true;
        (async () => {
            setLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user && active) setMyId(user.id);

                const { data } = await supabase
                    .from('profiles')
                    .select('id, username, avatar_url, coins')
                    .order('coins', { ascending: false })
                    .limit(100);

                if (data && active) {
                    setPlayers(data.filter((p: Player) => p.username && p.username.trim() !== ''));
                }
            } catch (e) {
                console.error('Leaderboard error:', e);
            }
            if (active) setLoading(false);
        })();
        return () => { active = false; };
    }, []));

    const renderItem = ({ item, index }: { item: Player; index: number }) => {
        const isMe = item.id === myId;
        const color = getRankColor(index);
        return (
            <TouchableOpacity
                style={[styles.row, { borderColor: index < 3 ? color : BORDER }, isMe && styles.myRow]}
                onPress={() => setSelected({ player: item, index })}
                activeOpacity={0.8}
            >
                {/* Rank */}
                <View style={styles.rankBox}>
                    {index < 3
                        ? <Text style={styles.medal}>{MEDALS[index]}</Text>
                        : <Text style={[styles.rankNum, { color }]}>{index + 1}</Text>
                    }
                </View>

                {/* Avatar */}
                <View style={[styles.avatarRing, { borderColor: color }]}>
                    {item.avatar_url
                        ? <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
                        : <View style={styles.avatarFallback}>
                            <Text style={[styles.avatarLetter, { color }]}>
                                {item.username?.[0]?.toUpperCase() ?? '?'}
                            </Text>
                        </View>
                    }
                </View>

                {/* Name */}
                <Text style={[styles.name, isMe && { color: GOLD }]} numberOfLines={1}>
                    {item.username}{isMe ? ' (You)' : ''}
                </Text>

                {/* Coins */}
                <View style={styles.coinBox}>
                    <Text style={[styles.coins, { color }]}>🪙 {item.coins.toLocaleString()}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.root}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>🏆 Hall of Champions</Text>
                <Text style={styles.sub}>{players.length} Warriors Ranked</Text>
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator color={GOLD} size="large" />
                    <Text style={styles.loadingText}>Loading rankings...</Text>
                </View>
            ) : players.length === 0 ? (
                <View style={styles.centered}>
                    <Text style={styles.emptyText}>No players yet</Text>
                    <Text style={styles.emptySub}>Be the first to earn coins!</Text>
                </View>
            ) : (
                <FlatList
                    data={players}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ListFooterComponent={
                        <Text style={styles.footer}>🌟 Top warriors honoured with champion frames</Text>
                    }
                />
            )}

            {/* Player Modal */}
            <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
                <Pressable style={styles.backdrop} onPress={() => setSelected(null)}>
                    <Pressable style={styles.modalCard} onPress={() => { }}>
                        <TouchableOpacity style={styles.closeBtn} onPress={() => setSelected(null)}>
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>
                        {selected && (() => {
                            const { player, index } = selected;
                            const color = getRankColor(index);
                            return (
                                <>
                                    {/* Avatar */}
                                    <View style={[styles.modalAvatar, { borderColor: color }]}>
                                        {player.avatar_url
                                            ? <Image source={{ uri: player.avatar_url }} style={{ width: '100%', height: '100%' }} />
                                            : <View style={[styles.avatarFallback, { flex: 1 }]}>
                                                <Text style={[styles.avatarLetter, { color, fontSize: 40 }]}>
                                                    {player.username?.[0]?.toUpperCase() ?? '?'}
                                                </Text>
                                            </View>
                                        }
                                    </View>
                                    {index < 3 && <Text style={styles.modalMedal}>{MEDALS[index]}</Text>}
                                    <Text style={[styles.modalName, { color }]}>{player.username}</Text>
                                    <View style={[styles.rankBadge, { borderColor: color }]}>
                                        <Text style={[styles.rankBadgeText, { color }]}>
                                            #{index + 1}  ·  🪙 {player.coins.toLocaleString()} coins
                                        </Text>
                                    </View>
                                    <View style={styles.statsRow}>
                                        <View style={[styles.statBox, { borderColor: color }]}>
                                            <Text style={[styles.statVal, { color }]}>#{index + 1}</Text>
                                            <Text style={styles.statLabel}>Global Rank</Text>
                                        </View>
                                        <View style={[styles.statBox, { borderColor: color }]}>
                                            <Text style={[styles.statVal, { color }]}>🪙 {player.coins.toLocaleString()}</Text>
                                            <Text style={styles.statLabel}>Total Coins</Text>
                                        </View>
                                    </View>
                                </>
                            );
                        })()}
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: BG },
    header: {
        alignItems: 'center',
        paddingTop: 56,
        paddingBottom: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
        backgroundColor: '#0f0800',
    },
    title: { color: GOLD, fontSize: 24, fontWeight: '900', marginBottom: 4 },
    sub: { color: MUTED, fontSize: 13 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { color: MUTED, fontSize: 14 },
    emptyText: { color: GOLD, fontSize: 20, fontWeight: '800' },
    emptySub: { color: MUTED, fontSize: 14 },
    list: { padding: 12, paddingBottom: 40 },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: CARD,
        borderRadius: 14,
        marginBottom: 10,
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderWidth: 1,
    },
    myRow: { backgroundColor: 'rgba(255,215,0,0.07)', borderColor: GOLD, borderWidth: 2 },
    rankBox: { width: 42, alignItems: 'center' },
    medal: { fontSize: 22 },
    rankNum: { fontSize: 17, fontWeight: '900' },
    avatarRing: {
        width: 48, height: 48, borderRadius: 24,
        borderWidth: 2, overflow: 'hidden', marginHorizontal: 10,
    },
    avatar: { width: '100%', height: '100%' },
    avatarFallback: {
        width: '100%', height: '100%',
        backgroundColor: '#2a1500',
        justifyContent: 'center', alignItems: 'center',
    },
    avatarLetter: { fontSize: 20, fontWeight: '900' },
    name: { flex: 1, color: TEXT, fontSize: 15, fontWeight: '700' },
    coinBox: { alignItems: 'flex-end' },
    coins: { fontSize: 14, fontWeight: '800' },
    footer: { color: MUTED, fontSize: 12, textAlign: 'center', marginTop: 8 },

    // Modal
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    modalCard: {
        backgroundColor: '#1a0f00',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        borderTopWidth: 2, borderColor: BORDER,
        paddingTop: 32, paddingBottom: 48, paddingHorizontal: 24,
        alignItems: 'center',
    },
    closeBtn: {
        position: 'absolute', top: 16, right: 20,
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: '#2a1500',
        justifyContent: 'center', alignItems: 'center',
    },
    closeText: { color: MUTED, fontSize: 16, fontWeight: '700' },
    modalAvatar: {
        width: 100, height: 100, borderRadius: 50,
        borderWidth: 3, overflow: 'hidden', marginBottom: 8,
    },
    modalMedal: { fontSize: 28, marginBottom: 4 },
    modalName: { fontSize: 26, fontWeight: '900', marginBottom: 10 },
    rankBadge: {
        borderWidth: 1, borderRadius: 20,
        paddingHorizontal: 20, paddingVertical: 8,
        marginBottom: 24, backgroundColor: 'rgba(0,0,0,0.4)',
    },
    rankBadgeText: { fontSize: 16, fontWeight: '800' },
    statsRow: { flexDirection: 'row', gap: 12, width: '100%' },
    statBox: {
        flex: 1, backgroundColor: '#0a0500',
        borderRadius: 14, paddingVertical: 16,
        alignItems: 'center', borderWidth: 1,
    },
    statVal: { fontSize: 18, fontWeight: '900', marginBottom: 4 },
    statLabel: { color: MUTED, fontSize: 12 },
});
