import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Animated,
    Dimensions,
    Modal,
    SafeAreaView,
    StatusBar,
    ActivityIndicator,
    Image,
    Platform,
} from 'react-native';
import { supabase } from '../../lib/supabase';
// AdMob shims (platform-specific files in app/utils)
import {
    BannerAd,
    BannerAdSize,
    InterstitialAd,
    AdEventType,
    RewardedAd,
    RewardedAdEventType,
    TestIds,
} from '../utils/ads';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── AdMob IDs ────────────────────────────────────────────────────────────────
const INTERSTITIAL_ID = Platform.OS !== 'web' && __DEV__
    ? TestIds?.INTERSTITIAL
    : 'ca-app-pub-5377997497697187/4686273515';

const REWARDED_ID = Platform.OS !== 'web' && __DEV__
    ? TestIds?.REWARDED
    : 'ca-app-pub-5377997497697187/9910680034';

const BANNER_ID = Platform.OS !== 'web' && __DEV__
    ? TestIds?.BANNER
    : 'ca-app-pub-5377997497697187/8465577324';

// ─── Adinkra Symbols ──────────────────────────────────────────────────────────
const ADINKRA_SYMBOLS = [
    { id: 1, name: 'Gye Nyame', symbol: '☩', meaning: 'Supremacy of God' },
    { id: 2, name: 'Sankofa', symbol: '♻', meaning: 'Learn from the past' },
    { id: 3, name: 'Denkyem', symbol: '🐊', meaning: 'Adaptability' },
    { id: 4, name: 'Dwennimmen', symbol: '🐏', meaning: 'Humility & Strength' },
    { id: 5, name: 'Funtunfunefu', symbol: '🐍', meaning: 'Democracy & Unity' },
    { id: 6, name: 'Nyansapo', symbol: '✦', meaning: 'Wisdom & Intelligence' },
    { id: 7, name: 'Osrane', symbol: '☾', meaning: 'Patience & Faithfulness' },
    { id: 8, name: 'Aya', symbol: '🌿', meaning: 'Endurance & Resourcefulness' },
    { id: 9, name: 'Akoma', symbol: '❤', meaning: 'Patience & Tolerance' },
    { id: 10, name: 'Ese Ne Tekrema', symbol: '⚡', meaning: 'Friendship' },
    { id: 11, name: 'Owia Kokroko', symbol: '☀', meaning: 'Greatness & Vitality' },
    { id: 12, name: 'Wawa Aba', symbol: '✿', meaning: 'Hardiness & Perseverance' },
    { id: 13, name: 'Fawohodie', symbol: '🔑', meaning: 'Independence & Freedom' },
    { id: 14, name: 'Ananse Ntontan', symbol: '🕸', meaning: 'Wisdom & Creativity' },
    { id: 15, name: 'Bese Saka', symbol: '⬡', meaning: 'Affluence & Power' },
    { id: 16, name: 'Mpatapo', symbol: '⊕', meaning: 'Reconciliation & Peace' },
    { id: 17, name: 'Nkyinkyim', symbol: '∞', meaning: 'Adaptability & Versatility' },
    { id: 18, name: 'Sunsum', symbol: '✶', meaning: 'Spirit & Soul' },
    { id: 19, name: 'Kintinkantan', symbol: '♦', meaning: 'Arrogance is Forbidden' },
    { id: 20, name: 'Hye Won Hye', symbol: '🔥', meaning: 'Imperishability' },
    { id: 21, name: 'Duafe', symbol: '⚘', meaning: 'Beauty & Cleanliness' },
    { id: 22, name: 'Abusua Pa', symbol: '⌂', meaning: 'Good Family' },
    { id: 23, name: 'Akofena', symbol: '⚔', meaning: 'Courage & Valor' },
    { id: 24, name: 'Dame Dame', symbol: '◈', meaning: 'Intelligence & Ingenuity' },
    { id: 25, name: 'Sesa Wo Suban', symbol: '☯', meaning: 'Transformation' },
    { id: 26, name: 'Kramo Bone', symbol: '⌘', meaning: 'Hypocrisy Warning' },
    { id: 27, name: 'Nea Ope Se', symbol: '♁', meaning: 'Service & Humility' },
    { id: 28, name: 'Asase Ye Duru', symbol: '♜', meaning: 'Earth has Weight' },
];

const SYMBOL_COLORS = [
    '#FFD700', '#FF6B35', '#4ECDC4', '#A8E6CF',
    '#FFD93D', '#C5E1A5', '#F48FB1', '#80DEEA',
    '#FFCC02', '#B39DDB', '#80CBC4', '#FFAB40',
    '#E6EE9C', '#90CAF9', '#F48FB1', '#A5D6A7',
];

const LEVEL_COLORS = [
    '#B8860B', '#1565C0', '#6A0DAD', '#1B5E20',
    '#5D3A1A', '#1A237E', '#B71C1C', '#0D47A1',
    '#4A148C', '#1B5E20', '#B8860B', '#1565C0',
    '#6A0DAD', '#1B5E20', '#5D3A1A', '#1A237E',
    '#B71C1C', '#0D47A1', '#4A148C', '#1B5E20',
    '#880E4F', '#004D40', '#BF360C', '#0D47A1',
    '#4E342E', '#283593', '#558B2F', '#6A1B9A',
    '#D84315', '#00695C',
];

// Level cover images — blue for odd levels, purple for even
const LEVEL_COVERS = {
    blue: require('../../assets/images/card-collection-blue.png'),
    purple: require('../../assets/images/card-collection-purple.png'),
};

// Card back image
const CARD_BACK_IMAGE = require('../../assets/images/card-back.png');

// ─── Level Config ─────────────────────────────────────────────────────────────
const LEVELS = Array.from({ length: 30 }, (_, i) => {
    const level = i + 1;
    const pairs =
        level <= 3 ? 3 :
            level <= 6 ? 4 :
                level <= 9 ? 5 :
                    level <= 12 ? 6 :
                        level <= 16 ? 7 :
                            level <= 22 ? 8 :
                                level <= 26 ? 9 : 10;
    // Time DECREASES as levels get harder: starts at 120s, drops to 45s by level 30
    const timeLimit = Math.max(45, Math.round(120 - (level - 1) * 2.6));
    const coinReward = level * 100;

    const startIdx = (i * 3) % ADINKRA_SYMBOLS.length;
    const raw = ADINKRA_SYMBOLS.slice(startIdx, startIdx + pairs);
    const symbols = raw.length < pairs
        ? [...raw, ...ADINKRA_SYMBOLS.slice(0, pairs - raw.length)]
        : raw;

    return { level, pairs, cards: pairs * 2, timeLimit, coinReward, symbols };
});

// ─── Types ────────────────────────────────────────────────────────────────────
interface CardItem {
    id: string;
    symbolId: number;
    name: string;
    symbol: string;
    color: string;
    isFlipped: boolean;
    isMatched: boolean;
}

interface LevelRecord {
    level: number;
    stars: number;
    coins: number;
}

// ─── FlipCard ─────────────────────────────────────────────────────────────────
const FlipCard = ({
    card,
    onPress,
    size,
}: {
    card: CardItem;
    onPress: () => void;
    size: number;
}) => {
    const flipAnim = useRef(new Animated.Value(card.isFlipped || card.isMatched ? 1 : 0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.spring(flipAnim, {
            toValue: card.isFlipped || card.isMatched ? 1 : 0,
            friction: 8,
            tension: 100,
            useNativeDriver: true,
        }).start();
    }, [card.isFlipped, card.isMatched]);

    useEffect(() => {
        if (card.isMatched) {
            Animated.sequence([
                Animated.spring(scaleAnim, { toValue: 1.1, useNativeDriver: true, friction: 5 }),
                Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 5 }),
            ]).start();
        }
    }, [card.isMatched]);

    // Horizontal flip: back goes 0->90, front comes 90->0 (no Y movement)
    const backOpacity = flipAnim.interpolate({ inputRange: [0, 0.49, 0.5, 1], outputRange: [1, 1, 0, 0] });
    const frontOpacity = flipAnim.interpolate({ inputRange: [0, 0.49, 0.5, 1], outputRange: [0, 0, 1, 1] });
    const backRotate = flipAnim.interpolate({ inputRange: [0, 0.5], outputRange: ['0deg', '-90deg'] });
    const frontRotate = flipAnim.interpolate({ inputRange: [0.5, 1], outputRange: ['90deg', '0deg'] });
    const shown = card.isFlipped || card.isMatched;

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={shown}
            activeOpacity={0.85}
            style={{ margin: 3 }}
        >
            <Animated.View style={{ transform: [{ scale: scaleAnim }], width: size, height: size }}>
                {/* Back */}
                <Animated.View style={[
                    styles.cardBack,
                    {
                        width: size, height: size,
                        position: 'absolute',
                        opacity: backOpacity,
                        transform: [{ rotateY: backRotate }],
                    },
                ]}>
                    <Image
                        source={CARD_BACK_IMAGE}
                        style={{ width: '100%', height: '100%', borderRadius: 14 }}
                        resizeMode="cover"
                    />
                </Animated.View>
                {/* Front */}
                <Animated.View style={[
                    styles.cardFront,
                    {
                        width: size, height: size,
                        position: 'absolute',
                        opacity: frontOpacity,
                        transform: [{ rotateY: frontRotate }],
                        borderColor: card.isMatched ? '#FFD700' : card.color,
                        shadowColor: card.isMatched ? '#FFD700' : card.color
                    },
                ]}>
                    <View style={[styles.cardFrontGlow, { backgroundColor: card.color + '22' }]} />
                    <Text style={[styles.cardSymbol, { color: card.color, fontSize: Math.max(20, size * 0.4) }]}>{card.symbol}</Text>
                    <Text style={[styles.cardName, { fontSize: Math.max(8, size * 0.12) }]} numberOfLines={2}>{card.name}</Text>
                    {card.isMatched && (
                        <View style={styles.matchedOverlay}>
                            <Text style={styles.matchedCheck}>✓</Text>
                        </View>
                    )}
                </Animated.View>
            </Animated.View>
        </TouchableOpacity>
    );
};

// ─── GameScreen ───────────────────────────────────────────────────────────────
const GameScreen = ({
    level,
    onComplete,
    onBack,
}: {
    level: typeof LEVELS[0];
    onComplete: (stars: number, coins: number) => void;
    onBack: () => void;
}) => {
    const [cards, setCards] = useState<CardItem[]>([]);
    const [flippedCards, setFlippedCards] = useState<string[]>([]);
    const [moves, setMoves] = useState(0);
    const [matches, setMatches] = useState(0);
    const [timeLeft, setTimeLeft] = useState(level.timeLimit);
    const [gameOver, setGameOver] = useState(false);
    const [won, setWon] = useState(false);
    const [wonStars, setWonStars] = useState(0);
    const [wonCoins, setWonCoins] = useState(0);
    const [rewardedLoaded, setRewardedLoaded] = useState(false);
    const [watchingAd, setWatchingAd] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const processing = useRef(false);
    const totalPairs = level.pairs;

    // ── Rewarded Ad Setup (native only) ───────────────────────────────────────
    const rewardedAdRef = useRef<any>(null);

    useEffect(() => {
        if (Platform.OS === 'web' || !RewardedAd) return;

        const ad = RewardedAd.createForAdRequest(REWARDED_ID, { requestNonPersonalizedAdsOnly: true });
        rewardedAdRef.current = ad;

        const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
            setRewardedLoaded(true);
        });
        const unsubEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
            setWonCoins(prev => prev * 2);
        });
        const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
            setWatchingAd(false);
            setRewardedLoaded(false);
            ad.load();
        });
        const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
            setRewardedLoaded(false);
            setWatchingAd(false);
        });

        ad.load();

        return () => {
            unsubLoaded();
            unsubEarned();
            unsubClosed();
            unsubError();
        };
    }, []);

    const handleWatchAdForCoins = () => {
        if (rewardedLoaded && rewardedAdRef.current) {
            setWatchingAd(true);
            rewardedAdRef.current.show();
        }
    };

    const buildDeck = useCallback((): CardItem[] => {
        const deck: CardItem[] = [];
        level.symbols.forEach((sym, idx) => {
            const color = SYMBOL_COLORS[idx % SYMBOL_COLORS.length];
            deck.push(
                { id: `${sym.id}-a`, symbolId: sym.id, name: sym.name, symbol: sym.symbol, color, isFlipped: false, isMatched: false },
                { id: `${sym.id}-b`, symbolId: sym.id, name: sym.name, symbol: sym.symbol, color, isFlipped: false, isMatched: false },
            );
        });
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }, [level]);

    const startTimer = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current!);
                    setGameOver(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, []);

    useEffect(() => {
        setCards(buildDeck());
        setMoves(0);
        setMatches(0);
        setTimeLeft(level.timeLimit);
        setWon(false);
        setGameOver(false);
        processing.current = false;
        startTimer();
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [level]);

    const handleCardPress = useCallback((cardId: string) => {
        if (processing.current) return;
        if (flippedCards.includes(cardId)) return;
        const cardState = cards.find(c => c.id === cardId);
        if (!cardState || cardState.isMatched || cardState.isFlipped) return;

        setCards(prev => prev.map(c => c.id === cardId ? { ...c, isFlipped: true } : c));

        if (flippedCards.length === 0) {
            setFlippedCards([cardId]);
        } else {
            const fId = flippedCards[0];
            const first = cards.find(c => c.id === fId)!;
            const second = cardState;

            processing.current = true;
            setFlippedCards([fId, cardId]);
            setMoves(m => m + 1);

            if (first.symbolId === second.symbolId) {
                setTimeout(() => {
                    setCards(p => p.map(c =>
                        c.id === fId || c.id === cardId
                            ? { ...c, isMatched: true, isFlipped: true }
                            : c
                    ));
                    setMatches(m => {
                        const next = m + 1;
                        if (next === totalPairs) {
                            clearInterval(timerRef.current!);
                            setTimeLeft(t => {
                                const timeBonus = t / level.timeLimit;
                                const stars = timeBonus > 0.6 ? 3 : timeBonus > 0.3 ? 2 : 1;
                                const coins = Math.round(level.coinReward * (stars / 3));
                                setWonStars(stars);
                                setWonCoins(coins);
                                return t;
                            });
                            setTimeout(() => setWon(true), 600);
                        }
                        return next;
                    });
                    setFlippedCards([]);
                    processing.current = false;
                }, 600);
            } else {
                setTimeout(() => {
                    setCards(p => p.map(c =>
                        c.id === fId || c.id === cardId
                            ? { ...c, isFlipped: false }
                            : c
                    ));
                    setFlippedCards([]);
                    processing.current = false;
                }, 1000);
            }
        }
    }, [flippedCards, cards, totalPairs, level]);

    const handleReplay = () => {
        setWon(false);
        setGameOver(false);
        setMoves(0);
        setMatches(0);
        setTimeLeft(level.timeLimit);
        setFlippedCards([]);
        processing.current = false;
        setCards(buildDeck());
        startTimer();
    };

    // Always 3 columns, square cards, tight fit
    const cols = 3;
    const rows = Math.ceil(level.cards / cols);
    const STATUS_BAR_H = StatusBar.currentHeight ?? 24;
    const GAME_HEADER_H = 68;
    const STATS_ROW_H = 90;
    const GRID_PADDING = 24;
    const BANNER_H = Platform.OS !== 'web' ? 60 : 0;
    const CARD_MARGIN = 3; // margin on each side
    const availableHeight = SCREEN_HEIGHT - STATUS_BAR_H - GAME_HEADER_H - STATS_ROW_H - GRID_PADDING - BANNER_H - 20;
    const availableWidth = SCREEN_WIDTH - 32;
    const cardByWidth = (availableWidth / cols) - (CARD_MARGIN * 2);
    const cardByHeight = (availableHeight / rows) - (CARD_MARGIN * 2);
    const cardSize = Math.min(cardByWidth, cardByHeight, 120);
    const fmt = (s: number) =>
        `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

    return (
        <View style={styles.gameScreen}>
            {/* Header */}
            <View style={styles.gameHeader}>
                <TouchableOpacity style={styles.backBtn} onPress={onBack}>
                    <Text style={styles.backBtnText}>←</Text>
                </TouchableOpacity>
                <View style={styles.gameTitle}>
                    <Text style={styles.gameTitleText}>Adinkra</Text>
                    <Text style={styles.gameTitleSub}>Flip & Match · Level {level.level}</Text>
                </View>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={styles.statIcon}>⏱</Text>
                    <Text style={styles.statLabel}>TIME</Text>
                    <Text style={[styles.statValue, timeLeft <= 10 && { color: '#FF4444' }]}>{fmt(timeLeft)}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statIcon}>⭐</Text>
                    <Text style={styles.statLabel}>MOVES</Text>
                    <Text style={styles.statValue}>{moves}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statIcon}>⏱</Text>
                    <Text style={styles.statLabel}>MATCHES</Text>
                    <Text style={styles.statValue}>{matches}/{totalPairs}</Text>
                </View>
            </View>

            {/* Grid — centered, no scroll */}
            <View style={[styles.gridContainer, { flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
                <View style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: (cardSize + CARD_MARGIN * 2) * cols,
                }}>
                    {cards.map(card => (
                        <FlipCard key={card.id} card={card} onPress={() => handleCardPress(card.id)} size={cardSize} />
                    ))}
                </View>
            </View>

            {/* Win Modal */}
            <Modal visible={won} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.winModal}>
                        <Text style={styles.winTitle}>Level Complete!</Text>
                        <View style={styles.starsRow}>
                            {[1, 2, 3].map(s => (
                                <Text key={s} style={[styles.starIcon, s <= wonStars ? styles.starFilled : styles.starEmpty]}>★</Text>
                            ))}
                        </View>
                        <Text style={styles.winCoins}>🪙 +{wonCoins} Coins Earned</Text>
                        <Text style={styles.winStats}>Moves: {moves}  ·  Time: {fmt(level.timeLimit - timeLeft)}</Text>

                        {/* 2× Coins Rewarded Ad Button — native only */}
                        {Platform.OS !== 'web' && rewardedLoaded && !watchingAd && (
                            <TouchableOpacity style={styles.rewardAdBtn} onPress={handleWatchAdForCoins}>
                                <Text style={styles.rewardAdBtnText}>📺 Watch Ad for 2× Coins</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity style={styles.winBtn} onPress={() => onComplete(wonStars, wonCoins)}>
                            <Text style={styles.winBtnText}>Continue →</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.replayBtn} onPress={handleReplay}>
                            <Text style={styles.replayBtnText}>↺ Play Again</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Game Over Modal */}
            <Modal visible={gameOver && !won} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.gameOverModal}>
                        <Text style={styles.gameOverEmoji}>⌛</Text>
                        <Text style={styles.gameOverTitle}>Time's Up!</Text>
                        <Text style={styles.gameOverSub}>You matched {matches}/{totalPairs} pairs</Text>
                        <TouchableOpacity style={styles.winBtn} onPress={handleReplay}>
                            <Text style={styles.winBtnText}>↺ Try Again</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.replayBtn} onPress={onBack}>
                            <Text style={styles.replayBtnText}>← Back to Levels</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CardsScreen() {
    const [userId, setUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [totalCoins, setTotalCoins] = useState(0);
    const [completedLevels, setCompletedLevels] = useState<Record<number, LevelRecord>>({});
    const [unlockedLevels, setUnlockedLevels] = useState<number[]>([1]);
    const [activeLevel, setActiveLevel] = useState<typeof LEVELS[0] | null>(null);
    const [saving, setSaving] = useState(false);

    // ── Interstitial Ad Setup (native only) ───────────────────────────────────
    const interstitialAdRef = useRef<any>(null);
    const interstitialLoaded = useRef(false);

    useEffect(() => {
        if (Platform.OS === 'web' || !InterstitialAd) return;

        const ad = InterstitialAd.createForAdRequest(INTERSTITIAL_ID, { requestNonPersonalizedAdsOnly: true });
        interstitialAdRef.current = ad;

        const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
            interstitialLoaded.current = true;
        });
        const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
            interstitialLoaded.current = false;
            ad.load();
        });
        const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
            interstitialLoaded.current = false;
        });

        ad.load();

        return () => {
            unsubLoaded();
            unsubClosed();
            unsubError();
        };
    }, []);

    const showInterstitialThenOpen = (lvl: typeof LEVELS[0]) => {
        if (Platform.OS !== 'web' && interstitialLoaded.current && interstitialAdRef.current) {
            interstitialAdRef.current.show();
        }
        setActiveLevel(lvl);
    };

    // ── Load user + progress on mount ─────────────────────────────────────────
    useEffect(() => {
        loadUserData();
    }, []);

    const loadUserData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { setLoading(false); return; }
            setUserId(user.id);

            const { data: profile } = await supabase
                .from('profiles')
                .select('coins')
                .eq('id', user.id)
                .single();
            if (profile) setTotalCoins(profile.coins ?? 0);

            const { data: progress } = await supabase
                .from('card_progress')
                .select('level, unlocked')
                .eq('user_id', user.id);

            if (progress && progress.length > 0) {
                const completedNums = progress.map((p: any) => p.level);
                const maxCompleted = Math.max(...completedNums);
                const unlocked = [1, ...completedNums];
                if (maxCompleted < 30) unlocked.push(maxCompleted + 1);
                setUnlockedLevels([...new Set(unlocked)]);

                const map: Record<number, LevelRecord> = {};
                completedNums.forEach((lvl: number) => {
                    map[lvl] = { level: lvl, stars: 3, coins: lvl * 100 };
                });
                setCompletedLevels(map);
            }
        } catch (e) {
            console.error('loadUserData error:', e);
        } finally {
            setLoading(false);
        }
    };

    // ── Save progress to Supabase ──────────────────────────────────────────────
    const saveProgress = async (level: number, stars: number, coins: number) => {
        if (!userId) return;
        setSaving(true);
        try {
            await supabase
                .from('card_progress')
                .upsert(
                    { user_id: userId, level, unlocked: false, completed_at: new Date().toISOString() },
                    { onConflict: 'user_id,level' }
                );

            const nextLevel = level + 1;
            if (nextLevel <= 30) {
                const { data: existing } = await supabase
                    .from('card_progress')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('level', nextLevel)
                    .maybeSingle();

                if (!existing) {
                    await supabase
                        .from('card_progress')
                        .insert({ user_id: userId, level: nextLevel, unlocked: false });
                }
            }

            const newCoins = totalCoins + coins;
            await supabase
                .from('profiles')
                .update({ coins: newCoins })
                .eq('id', userId);

            setTotalCoins(newCoins);
        } catch (e) {
            console.error('saveProgress error:', e);
        } finally {
            setSaving(false);
        }
    };

    // ── Handle level complete ──────────────────────────────────────────────────
    const handleLevelComplete = async (
        level: typeof LEVELS[0],
        stars: number,
        coins: number
    ) => {
        setCompletedLevels(prev => ({ ...prev, [level.level]: { level: level.level, stars, coins } }));
        const nextLevel = level.level + 1;
        if (nextLevel <= 30) {
            setUnlockedLevels(prev => prev.includes(nextLevel) ? prev : [...prev, nextLevel]);
        }
        setActiveLevel(null);
        await saveProgress(level.level, stars, coins);
    };

    if (loading) {
        return (
            <View style={styles.loadingScreen}>
                <ActivityIndicator size="large" color="#FFD700" />
                <Text style={styles.loadingText}>Loading your progress...</Text>
            </View>
        );
    }

    if (activeLevel) {
        return (
            <GameScreen
                level={activeLevel}
                onComplete={(stars, coins) => handleLevelComplete(activeLevel, stars, coins)}
                onBack={() => setActiveLevel(null)}
            />
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0D0020" />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={styles.headerIconBox}>
                        <Text style={styles.headerIcon}>🃏</Text>
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>ADINKRA</Text>
                        <Text style={styles.headerSubtitle}>Flip & Match</Text>
                        <Text style={styles.headerDesc}>Match symbol pairs to earn coins</Text>
                    </View>
                </View>
                <View style={styles.headerRight}>
                    <View style={styles.coinBadge}>
                        <Text style={styles.coinIcon}>🪙</Text>
                        <Text style={styles.coinCount}>
                            {totalCoins >= 1000 ? `${(totalCoins / 1000).toFixed(1)}K` : totalCoins}
                        </Text>
                    </View>
                    {saving && <ActivityIndicator size="small" color="#FFD700" style={{ marginTop: 4 }} />}
                </View>
            </View>

            {/* Level Grid */}
            <ScrollView contentContainerStyle={styles.levelGrid} showsVerticalScrollIndicator={false}>
                {LEVELS.map(lvl => {
                    const isUnlocked = unlockedLevels.includes(lvl.level);
                    const isCompleted = !!completedLevels[lvl.level];
                    const data = completedLevels[lvl.level];
                    const bgColor = LEVEL_COLORS[(lvl.level - 1) % LEVEL_COLORS.length];
                    const coverImage = lvl.level % 2 !== 0 ? LEVEL_COVERS.blue : LEVEL_COVERS.purple;

                    return (
                        <TouchableOpacity
                            key={lvl.level}
                            style={[
                                styles.levelCard,
                                {
                                    borderColor: isUnlocked ? bgColor : '#2A1A4A',
                                    backgroundColor: isCompleted ? bgColor + 'CC' : isUnlocked ? '#1A0A2E' : '#110820',
                                },
                                isUnlocked && styles.levelCardUnlocked,
                            ]}
                            onPress={() => isUnlocked && showInterstitialThenOpen(lvl)}
                            activeOpacity={isUnlocked ? 0.75 : 1}
                        >
                            {/* Cover Image (unlocked) or dark BG (locked) */}
                            {isUnlocked ? (
                                <Image
                                    source={coverImage}
                                    style={styles.levelCoverImage}
                                    resizeMode="cover"
                                />
                            ) : (
                                <View style={[styles.levelCardBg, { backgroundColor: bgColor + '18' }]}>
                                    <Text style={styles.levelCardBgText}>
                                        {ADINKRA_SYMBOLS[(lvl.level * 2) % ADINKRA_SYMBOLS.length].symbol}
                                    </Text>
                                </View>
                            )}

                            {isUnlocked && <View style={styles.levelCoverOverlay} />}

                            {/* Stars */}
                            <View style={styles.starsTopRow}>
                                {[1, 2, 3].map(s => (
                                    <Text key={s} style={[styles.levelStar, data && s <= data.stars ? styles.levelStarFilled : styles.levelStarEmpty]}>★</Text>
                                ))}
                            </View>

                            {/* Icon */}
                            <View style={styles.levelCenter}>
                                {isCompleted ? (
                                    <View style={[styles.checkCircle, { borderColor: '#FFD700' }]}>
                                        <Text style={styles.checkText}>✓</Text>
                                    </View>
                                ) : isUnlocked ? (
                                    <View style={[styles.checkCircle, { borderColor: bgColor }]}>
                                        <Text style={[styles.checkText, { color: bgColor }]}>▶</Text>
                                    </View>
                                ) : (
                                    <View style={styles.lockCircle}>
                                        <Text style={styles.lockIcon}>🔒</Text>
                                    </View>
                                )}
                            </View>

                            <Text style={[styles.levelLabel, !isUnlocked && { color: '#4A3A6A' }]}>
                                Level {lvl.level}
                            </Text>
                            <Text style={[styles.levelMeta, !isUnlocked && { color: '#3A2A5A' }]}>
                                {lvl.cards} cards · {lvl.timeLimit}s
                            </Text>

                            <View style={[styles.levelFooter, { backgroundColor: isUnlocked ? bgColor : '#1E0E38' }]}>
                                <Text style={[styles.levelFooterText, !isUnlocked && { color: '#4A3A6A' }]}>
                                    🪙 {isCompleted && data ? data.coins : lvl.coinReward}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* Banner Ad — native only */}
            {Platform.OS !== 'web' && BannerAd && (
                <View style={styles.bannerContainer}>
                    <BannerAd
                        unitId={BANNER_ID}
                        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
                    />
                </View>
            )}
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0D0020' },
    loadingScreen: { flex: 1, backgroundColor: '#0D0020', alignItems: 'center', justifyContent: 'center', gap: 16 },
    loadingText: { color: '#C8B8E8', fontSize: 14 },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: '#2A1A4A', backgroundColor: '#100025',
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    headerRight: { alignItems: 'center' },
    headerIconBox: {
        width: 52, height: 52, borderRadius: 12,
        backgroundColor: '#F5E6C8', alignItems: 'center', justifyContent: 'center', marginRight: 10,
    },
    headerIcon: { fontSize: 28 },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#FFD700', letterSpacing: 2 },
    headerSubtitle: { fontSize: 13, color: '#C8B8E8', fontWeight: '600' },
    headerDesc: { fontSize: 11, color: '#7A6A9A' },
    coinBadge: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#1E0E38', borderRadius: 20,
        paddingHorizontal: 14, paddingVertical: 8,
        borderWidth: 1, borderColor: '#3A2A5A', gap: 6,
    },
    coinIcon: { fontSize: 16 },
    coinCount: { fontSize: 16, fontWeight: '800', color: '#FFD700' },

    // Level Grid
    levelGrid: {
        flexDirection: 'row', flexWrap: 'wrap',
        justifyContent: 'space-between', padding: 12, paddingBottom: 40,
    },
    levelCard: {
        width: (SCREEN_WIDTH - 36) / 3, marginBottom: 10,
        borderRadius: 14, borderWidth: 2, overflow: 'hidden',
        position: 'relative', minHeight: 160,
    },
    levelCardUnlocked: {
        shadowColor: '#7B2FBE', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
    },
    levelCoverImage: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        width: '100%', height: '100%',
    },
    levelCoverOverlay: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: '#00000055',
    },
    levelCardBg: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        alignItems: 'center', justifyContent: 'center',
    },
    levelCardBgText: { fontSize: 60, opacity: 0.12, color: '#FFFFFF' },
    starsTopRow: { flexDirection: 'row', justifyContent: 'center', paddingTop: 8, gap: 2 },
    levelStar: { fontSize: 12 },
    levelStarFilled: { color: '#FFD700' },
    levelStarEmpty: { color: '#3A2A5A' },
    levelCenter: { alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
    checkCircle: {
        width: 44, height: 44, borderRadius: 22, borderWidth: 2.5,
        alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFD70022',
    },
    checkText: { fontSize: 18, fontWeight: '900', color: '#FFD700' },
    lockCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1E0E38', alignItems: 'center', justifyContent: 'center' },
    lockIcon: { fontSize: 22 },
    levelLabel: { fontSize: 13, fontWeight: '800', color: '#E8D8FF', textAlign: 'center' },
    levelMeta: { fontSize: 10, color: '#8A7AAA', textAlign: 'center', marginBottom: 6 },
    levelFooter: { paddingVertical: 5, alignItems: 'center' },
    levelFooterText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },

    // Banner Ad
    bannerContainer: { alignItems: 'center', backgroundColor: '#0D0020' },

    // Game
    gameScreen: { flex: 1, backgroundColor: '#0D0020' },
    gameHeader: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: '#100025', borderBottomWidth: 1, borderBottomColor: '#2A1A4A', gap: 14,
    },
    backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#3A1A6E', alignItems: 'center', justifyContent: 'center' },
    backBtnText: { fontSize: 20, color: '#FFD700', fontWeight: '700' },
    gameTitle: { flex: 1, alignItems: 'flex-end' },
    gameTitleText: { fontSize: 22, fontWeight: '900', color: '#FFD700', letterSpacing: 1 },
    gameTitleSub: { fontSize: 12, color: '#C8B8E8' },

    statsRow: {
        flexDirection: 'row', alignItems: 'center',
        marginHorizontal: 16, marginTop: 8, marginBottom: 6,
        backgroundColor: '#160030', borderRadius: 16,
        borderWidth: 1, borderColor: '#2A1A4A', paddingVertical: 10,
    },
    statItem: { flex: 1, alignItems: 'center', gap: 2 },
    statIcon: { fontSize: 16, color: '#FFD700' },
    statLabel: { fontSize: 10, color: '#9A8ABB', fontWeight: '600', letterSpacing: 1 },
    statValue: { fontSize: 18, fontWeight: '900', color: '#FFD700' },
    statDivider: { width: 1, height: 36, backgroundColor: '#2A1A4A' },

    gridContainer: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 4 },
    watermark: { alignItems: 'center', marginTop: 20, opacity: 0.08 },
    watermarkText: { fontSize: 80, color: '#7B2FBE' },

    // Cards
    cardBack: {
        borderRadius: 14, backgroundColor: '#1E0840',
        borderWidth: 2, borderColor: '#5B35A0',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#7B2FBE', shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.5, shadowRadius: 6, elevation: 5,
    },
    cardBackInner: {
        width: '70%', height: '70%', borderRadius: 10,
        backgroundColor: '#2A0E5A', borderWidth: 1.5, borderColor: '#7B5ABE',
        alignItems: 'center', justifyContent: 'center',
    },
    cardBackSymbol: { fontSize: 28, color: '#5B35A0' },
    cornerDot: { position: 'absolute', width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#7B5ABE' },
    cardFront: {
        borderRadius: 14, backgroundColor: '#16063A', borderWidth: 2.5,
        alignItems: 'center', justifyContent: 'center', padding: 8,
        shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.6, shadowRadius: 8, elevation: 6,
        overflow: 'hidden',
    },
    cardFrontGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: '50%', borderTopLeftRadius: 14, borderTopRightRadius: 14 },
    cardSymbol: { fontSize: 34, marginBottom: 6 },
    cardName: { fontSize: 10, fontWeight: '800', color: '#E8D8FF', textAlign: 'center', lineHeight: 13 },
    matchedOverlay: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFD700', alignItems: 'center', justifyContent: 'center' },
    matchedCheck: { fontSize: 11, color: '#0D0020', fontWeight: '900' },

    // Modals
    modalOverlay: { flex: 1, backgroundColor: '#00000099', alignItems: 'center', justifyContent: 'center' },
    winModal: {
        backgroundColor: '#160030', borderRadius: 24, padding: 32,
        width: SCREEN_WIDTH * 0.85, alignItems: 'center',
        borderWidth: 2, borderColor: '#FFD700',
        shadowColor: '#FFD700', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 20,
    },
    winTitle: { fontSize: 26, fontWeight: '900', color: '#FFD700', marginBottom: 16, letterSpacing: 1 },
    starsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    starIcon: { fontSize: 38 },
    starFilled: { color: '#FFD700' },
    starEmpty: { color: '#3A2A5A' },
    winCoins: { fontSize: 20, fontWeight: '800', color: '#FFD700', marginBottom: 8 },
    winStats: { fontSize: 13, color: '#9A8ABB', marginBottom: 16 },
    rewardAdBtn: {
        backgroundColor: '#1A0A3E', borderWidth: 1.5, borderColor: '#7B2FBE',
        paddingVertical: 12, paddingHorizontal: 24, borderRadius: 14, marginBottom: 12,
    },
    rewardAdBtnText: { fontSize: 14, fontWeight: '800', color: '#C8B8FF' },
    winBtn: { backgroundColor: '#FFD700', paddingVertical: 14, paddingHorizontal: 40, borderRadius: 14, marginBottom: 12 },
    winBtnText: { fontSize: 16, fontWeight: '900', color: '#0D0020', letterSpacing: 0.5 },
    replayBtn: { paddingVertical: 10, paddingHorizontal: 30, borderRadius: 14, borderWidth: 1.5, borderColor: '#5B35A0' },
    replayBtnText: { fontSize: 14, fontWeight: '700', color: '#C8B8E8' },
    gameOverModal: {
        backgroundColor: '#160030', borderRadius: 24, padding: 32,
        width: SCREEN_WIDTH * 0.85, alignItems: 'center',
        borderWidth: 2, borderColor: '#FF4444',
    },
    gameOverEmoji: { fontSize: 48, marginBottom: 12 },
    gameOverTitle: { fontSize: 26, fontWeight: '900', color: '#FF4444', marginBottom: 8 },
    gameOverSub: { fontSize: 14, color: '#9A8ABB', marginBottom: 24 },
});
