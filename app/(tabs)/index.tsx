import { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Animated,
    Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthModal } from '../components/AuthModal';
import { C } from '../../constants/colors';

const { width } = Dimensions.get('window');

const MODES = [
    {
        id: 'cards',
        title: 'Card Collection',
        subtitle: 'View, collect and learn about\nAdinkra symbol cards.',
        tag: 'COLLECT',
        tagColor: C.epic,
        tagBg: '#2d1a4a',
        cardBg: '#1a0d35',
        borderColor: C.epic,
        glowColor: '#a855f740',
        icon: '🃏',
        stat: '150+ cards',
        route: '/cards',
    },
    {
        id: 'maze',
        title: 'Maze Quest',
        subtitle: 'Find your way through Adinkra\nmazes and collect treasures!',
        tag: 'QUEST',
        tagColor: C.gold,
        tagBg: '#2a1a00',
        cardBg: '#1a1000',
        borderColor: C.goldDark,
        glowColor: '#FFD70040',
        icon: '🌀',
        stat: '8 mazes',
        route: '/(tabs)/maze',
    },
    {
        id: 'battle',
        title: 'Battle Arena',
        subtitle: 'Challenge players and prove\nyour Adinkra mastery!',
        tag: 'BATTLE',
        tagColor: C.mythic,
        tagBg: '#3a0a0a',
        cardBg: '#1a0505',
        borderColor: C.mythic,
        glowColor: '#ef444440',
        icon: '⚔️',
        stat: 'Live battles',
        route: '/(tabs)/battle',
    },
];

function ModeCard({ mode, index }: { mode: typeof MODES[0]; index: number }) {
    const router = useRouter();
    const { show } = useAuthModal();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(40)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                delay: index * 180,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 500,
                delay: index * 180,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.97,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 4,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Animated.View
            style={[
                styles.cardWrapper,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
                },
            ]}
        >
            <TouchableOpacity
                activeOpacity={1}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={async () => {
                    // check auth, if signed in navigate, otherwise show login modal and navigate on success
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) router.push(mode.route as any);
                    else show({ onSuccess: () => router.push(mode.route as any) });
                }}
                style={[
                    styles.card,
                    {
                        backgroundColor: mode.cardBg,
                        borderColor: mode.borderColor,
                        shadowColor: mode.glowColor,
                    },
                ]}
            >
                <View style={[styles.cardGlow, { backgroundColor: mode.glowColor }]} />

                <View style={[styles.iconBox, { borderColor: mode.borderColor + '60' }]}>
                    <Text style={styles.iconEmoji}>{mode.icon}</Text>
                    <View style={styles.patternRow}>
                        {[...Array(3)].map((_, i) => (
                            <View
                                key={i}
                                style={[styles.dot, { backgroundColor: mode.borderColor + '80' }]}
                            />
                        ))}
                    </View>
                </View>

                <View style={styles.cardContent}>
                    <View style={styles.titleRow}>
                        <Text style={[styles.cardTitle, { color: C.text }]}>{mode.title}</Text>
                        <View style={[styles.tag, { backgroundColor: mode.tagBg, borderColor: mode.tagColor }]}>
                            <Text style={[styles.tagText, { color: mode.tagColor }]}>{mode.tag}</Text>
                        </View>
                    </View>
                    <Text style={styles.cardSubtitle}>{mode.subtitle}</Text>
                    <View style={styles.cardFooter}>
                        <Text style={[styles.statText, { color: mode.tagColor }]}>★ {mode.stat}</Text>
                    </View>
                </View>

                <View style={[styles.arrowBtn, { borderColor: mode.borderColor }]}>
                    <Text style={[styles.arrowText, { color: mode.tagColor }]}>›</Text>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

export default function PlayScreen() {
    const headerFade = useRef(new Animated.Value(0)).current;
    const headerSlide = useRef(new Animated.Value(-20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(headerFade, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(headerSlide, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]).start();
    }, []);


    return (
        <View style={styles.container}>
            <View style={styles.bgPattern}>
                {[...Array(6)].map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.bgCircle,
                            {
                                width: 120 + i * 40,
                                height: 120 + i * 40,
                                top: -30 + i * 60,
                                right: -60 + i * 20,
                                opacity: 0.03 + i * 0.005,
                                borderColor: C.gold,
                            },
                        ]}
                    />
                ))}
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <Animated.View
                    style={[styles.header, { opacity: headerFade, transform: [{ translateY: headerSlide }] }]}
                >
                    <Text style={styles.headerLabel}>GAME MODES</Text>
                    <Text style={styles.headerTitle}>PLAY</Text>
                    <View style={styles.dividerRow}>
                        <View style={styles.dividerLine} />
                        <View style={styles.dividerDiamond} />
                        <View style={styles.dividerLine} />
                    </View>
                    <Text style={styles.headerSubtitle}>Choose Your Adventure</Text>
                    <Text style={styles.headerCaption}>Select a game mode and test your skills</Text>
                </Animated.View>

                <View style={styles.cardsContainer}>
                    {MODES.map((mode, index) => (
                        <ModeCard key={mode.id} mode={mode} index={index} />
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    bgPattern: { position: 'absolute', top: 0, right: 0, width: '100%', height: '100%', pointerEvents: 'none' },
    bgCircle: { position: 'absolute', borderRadius: 999, borderWidth: 1 },
    scroll: { paddingBottom: 40 },
    header: { alignItems: 'center', paddingTop: 60, paddingBottom: 32, paddingHorizontal: 24 },
    headerLabel: { color: C.gold, fontSize: 11, fontWeight: '700', letterSpacing: 4, marginBottom: 4 },
    headerTitle: { color: C.gold, fontSize: 52, fontWeight: '900', letterSpacing: 8, lineHeight: 60 },
    dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 12 },
    dividerLine: { height: 1, width: 40, backgroundColor: C.goldDark },
    dividerDiamond: { width: 6, height: 6, backgroundColor: C.gold, transform: [{ rotate: '45deg' }] },
    headerSubtitle: { color: C.text, fontSize: 22, fontWeight: '700', marginBottom: 4 },
    headerCaption: { color: C.muted, fontSize: 13, fontWeight: '400' },
    cardsContainer: { paddingHorizontal: 16, gap: 16 },
    cardWrapper: { width: '100%' },
    card: {
        borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center',
        padding: 16, gap: 14, overflow: 'hidden',
        shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 20, elevation: 8,
    },
    cardGlow: { position: 'absolute', top: -30, left: -30, width: 120, height: 120, borderRadius: 60 },
    iconBox: { width: 80, height: 80, borderRadius: 14, borderWidth: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff08', gap: 6 },
    iconEmoji: { fontSize: 32 },
    patternRow: { flexDirection: 'row', gap: 4 },
    dot: { width: 4, height: 4, borderRadius: 2 },
    cardContent: { flex: 1, gap: 6 },
    titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
    cardTitle: { fontSize: 16, fontWeight: '800', flexShrink: 1 },
    tag: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
    tagText: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
    cardSubtitle: { color: C.muted, fontSize: 12, lineHeight: 18 },
    cardFooter: { flexDirection: 'row', alignItems: 'center' },
    statText: { fontSize: 12, fontWeight: '700' },
    arrowBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
    arrowText: { fontSize: 22, fontWeight: '300', lineHeight: 26 },
});
