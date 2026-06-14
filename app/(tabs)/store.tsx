import { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Platform,
} from 'react-native';
import { C } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import {
    BannerAd,
    BannerAdSize,
    RewardedAd,
    RewardedAdEventType,
    AdEventType,
    TestIds,
} from '../utils/ads';

// Reward amount per rewarded ad (keeps existing single-ad reward)
const AD_REWARD_COINS = 400;

// Options for watching multiple rewarded ads for bigger coin rewards
const REWARDED_OPTIONS = [
    { id: 'r1', ads: 1, coins: 400 },
    { id: 'r2', ads: 2, coins: 800 },
    { id: 'r3', ads: 3, coins: 1200 },
    { id: 'r4', ads: 4, coins: 1600 },
    { id: 'r5', ads: 5, coins: 2000 },
];

export default function StoreScreen() {
    const [adLoading, setAdLoading] = useState(false);
    const [multiLoading, setMultiLoading] = useState<string | null>(null); // id of option loading
    const [userCoins, setUserCoins] = useState(0);

    // ── Fetch user coins on mount ──────────────────────────────────────────────
    useEffect(() => {
        const fetchCoins = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data } = await supabase
                .from('profiles')
                .select('coins')
                .eq('id', user.id)
                .single();
            if (data) setUserCoins(data.coins ?? 0);
        };
        fetchCoins();
    }, []);

    // removed IAP code — purchases are no longer available; replaced by rewarded-ad options below

    // ── Add coins to Supabase ──────────────────────────────────────────────────
    const addCoinsToUser = async (amount: number) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Use increment_coins RPC if available, fallback to manual update
            const { error } = await supabase.rpc('increment_coins', { user_id: user.id, amount });

            if (error) {
                // Fallback: fetch current coins then update manually
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('coins')
                    .eq('id', user.id)
                    .single();
                const currentCoins = profile?.coins ?? 0;
                await supabase
                    .from('profiles')
                    .update({ coins: currentCoins + amount })
                    .eq('id', user.id);
            }

            setUserCoins(prev => prev + amount);
        } catch (e) {
            console.error('addCoinsToUser error:', e);
        }
    };

    // ── Play multiple rewarded ads sequentially and award coins ──────────────
    const playSingleRewardedAd = async (): Promise<boolean> => {
        if (Platform.OS === 'web') {
            return false;
        }

        return new Promise<boolean>((resolve, reject) => {
            const adUnitId = __DEV__ ? TestIds.REWARDED : 'ca-app-pub-5377997497697187/9910680034';
            const rewarded = RewardedAd.createForAdRequest(adUnitId);

            const unsubLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
                rewarded.show();
            });

            const unsubEarned = rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
                cleanup();
                resolve(true);
            });

            const unsubClosed = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
                cleanup();
                resolve(false);
            });

            const unsubError = rewarded.addAdEventListener(AdEventType.ERROR, (e: any) => {
                cleanup();
                reject(e);
            });

            const cleanup = () => {
                try { unsubLoaded(); } catch (e) {}
                try { unsubEarned(); } catch (e) {}
                try { unsubClosed(); } catch (e) {}
                try { unsubError(); } catch (e) {}
            };

            rewarded.load();
        });
    };

    const handleWatchMultiple = async (optId: string, adsCount: number) => {
        if (Platform.OS === 'web') {
            Alert.alert('Not Available', 'Rewarded ads are only available on the Android app.');
            return;
        }

        setMultiLoading(optId);
        try {
            let earned = 0;
            for (let i = 0; i < adsCount; i += 1) {
                try {
                    const got = await playSingleRewardedAd();
                    if (got) earned += 1;
                } catch (e) {
                    // Continue to next ad on error but stop the sequence
                    console.error('Ad error in sequence:', e);
                    break;
                }
            }

            const awarded = earned * AD_REWARD_COINS;
            if (awarded > 0) {
                await addCoinsToUser(awarded);
                Alert.alert('🎉 Rewards Earned!', `+${awarded.toLocaleString()} coins added!`);
            } else {
                Alert.alert('No Reward', 'No ads completed. Try again.');
            }
        } catch (e) {
            Alert.alert('Ad Error', 'Could not load ad. Try again later.');
        } finally {
            setMultiLoading(null);
        }
    };

    // ── Handle watch ad ───────────────────────────────────────────────────────
    const handleWatchAd = async () => {
        if (Platform.OS === 'web') {
            Alert.alert('Not Available', 'Rewarded ads are only available on the Android app.');
            return;
        }
        setAdLoading(true);
        try {
            const adUnitId = __DEV__
                ? TestIds.REWARDED
                : 'ca-app-pub-5377997497697187/9910680034';
            const rewarded = RewardedAd.createForAdRequest(adUnitId);

            await new Promise<void>((resolve, reject) => {
                const unsubLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
                    rewarded.show();
                });

                const unsubEarned = rewarded.addAdEventListener(
                    RewardedAdEventType.EARNED_REWARD,
                    async () => {
                        await addCoinsToUser(AD_REWARD_COINS);
                        Alert.alert('🎉 Reward Earned!', `+${AD_REWARD_COINS} coins added!`);
                        cleanup();
                        resolve();
                    }
                );

                // FIX: handle ad closed without earning (user skipped)
                const unsubClosed = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
                    cleanup();
                    resolve(); // resolve without coins — user closed early
                });

                // FIX: handle ad error
                const unsubError = rewarded.addAdEventListener(AdEventType.ERROR, (e: any) => {
                    cleanup();
                    reject(e);
                });

                const cleanup = () => {
                    unsubLoaded();
                    unsubEarned();
                    unsubClosed();
                    unsubError();
                };

                rewarded.load();
            });
        } catch (e) {
            Alert.alert('Ad Error', 'Could not load ad. Try again later.');
        } finally {
            setAdLoading(false);
        }
    };

    // ── Banner Ad (native only) ───────────────────────────────────────────────
    let BannerAdView: any = null;
    if (Platform.OS !== 'web' && BannerAd) {
        try {
            const bannerUnitId = __DEV__
                ? TestIds.BANNER
                : 'ca-app-pub-5377997497697187/8465577324';
            BannerAdView = (
                <View style={styles.bannerWrap}>
                    <BannerAd unitId={bannerUnitId} size={BannerAdSize.BANNER} />
                </View>
            );
        } catch (e) {
            BannerAdView = null;
        }
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>🛍️ Store</Text>
                <View style={styles.coinBadge}>
                    <Text style={styles.coinBadgeText}>🪙 {userCoins.toLocaleString()}</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* Watch Ad */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🎬 Watch Ad for Coins</Text>
                    <Text style={styles.sectionSub}>Watch a short video and earn free coins</Text>

                    <TouchableOpacity
                        style={[styles.adCard, adLoading && styles.disabled]}
                        onPress={handleWatchAd}
                        activeOpacity={0.85}
                        disabled={adLoading}
                    >
                        <View style={styles.adLeft}>
                            <Text style={styles.adIcon}>▶️</Text>
                            <View>
                                <Text style={styles.adTitle}>Watch a Video</Text>
                                <Text style={styles.adSub}>Earn {AD_REWARD_COINS} coins instantly</Text>
                            </View>
                        </View>
                        <View style={styles.adBtn}>
                            {adLoading
                                ? <ActivityIndicator size="small" color={C.bg} />
                                : <Text style={styles.adBtnText}>WATCH</Text>
                            }
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Divider */}
                <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerLabel}>OR BUY COINS</Text>
                    <View style={styles.dividerLine} />
                </View>

                {BannerAdView}

                {/* Rewarded multi-ad options (replaces coin purchases) */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🎯 Bigger Rewards</Text>
                    <Text style={styles.sectionSub}>Watch multiple ads back-to-back to earn more coins</Text>

                    {REWARDED_OPTIONS.map((opt) => {
                        const isLoading = multiLoading === opt.id;
                        return (
                            <View key={opt.id} style={styles.packWrapper}>
                                <TouchableOpacity
                                    style={[styles.packCard, opt.ads === 3 && styles.packCardPopular]}
                                    onPress={() => handleWatchMultiple(opt.id, opt.ads)}
                                    activeOpacity={0.85}
                                    disabled={adLoading || !!multiLoading}
                                >
                                    <Text style={styles.packCoin}>🪙</Text>
                                    <View style={styles.packInfo}>
                                        <Text style={styles.packCoins}>{opt.coins.toLocaleString()} Coins</Text>
                                        <Text style={styles.packBonus}>Watch {opt.ads} ad{opt.ads > 1 ? 's' : ''} to earn</Text>
                                    </View>
                                    <View style={[styles.priceBtn, isLoading && styles.priceBtnLoading]}>
                                        {isLoading
                                            ? <ActivityIndicator size="small" color={C.bg} />
                                            : <Text style={styles.priceBtnText}>WATCH</Text>
                                        }
                                    </View>
                                </TouchableOpacity>
                            </View>
                        );
                    })}
                </View>

                <Text style={styles.footer}>
                    Coins are non-refundable and have no real-world value.
                </Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 52,
        paddingBottom: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
    },
    headerTitle: { color: C.gold, fontSize: 20, fontWeight: '800' },
    coinBadge: {
        backgroundColor: C.surface,
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: C.goldDark,
    },
    coinBadgeText: { color: C.gold, fontSize: 13, fontWeight: '700' },
    scroll: { paddingBottom: 48 },
    section: { paddingHorizontal: 16, paddingTop: 24 },
    sectionTitle: { color: C.text, fontSize: 18, fontWeight: '800', marginBottom: 2 },
    sectionSub: { color: C.muted, fontSize: 12, marginBottom: 16 },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginTop: 24,
        gap: 10,
    },
    dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
    dividerLabel: { color: C.muted, fontSize: 11, fontWeight: '700', letterSpacing: 2 },
    adCard: {
        backgroundColor: '#0d2a1a',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: C.success,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    disabled: { opacity: 0.6 },
    adLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    adIcon: { fontSize: 28 },
    adTitle: { color: C.text, fontSize: 15, fontWeight: '700' },
    adSub: { color: C.success, fontSize: 12, fontWeight: '600' },
    adBtn: {
        backgroundColor: C.success,
        borderRadius: 20,
        paddingHorizontal: 18,
        paddingVertical: 8,
        minWidth: 80,
        alignItems: 'center',
    },
    adBtnText: { color: C.bg, fontSize: 13, fontWeight: '800', letterSpacing: 1 },
    flagBar: {
        flexDirection: 'row',
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: 16,
    },
    flagSegment: { flex: 1 },
    packWrapper: { marginBottom: 12 },
    bannerWrap: { alignItems: 'center', marginVertical: 12 },
    packLabel: {
        alignSelf: 'flex-start',
        backgroundColor: C.goldDark,
        paddingHorizontal: 12,
        paddingVertical: 3,
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        marginBottom: -1,
        zIndex: 1,
    },
    packLabelPopular: { backgroundColor: C.gold },
    packLabelText: { color: C.bg, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
    packCard: {
        backgroundColor: C.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: C.border,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        gap: 12,
    },
    packCardPopular: {
        borderColor: C.gold,
        backgroundColor: '#1a1400',
        shadowColor: C.gold,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
    },
    packCoin: { fontSize: 36 },
    packInfo: { flex: 1 },
    packCoins: { color: C.text, fontSize: 16, fontWeight: '800' },
    packBonus: { color: C.success, fontSize: 12, fontWeight: '600', marginTop: 2 },
    packBonusBest: { color: C.warning },
    priceBtn: {
        backgroundColor: C.gold,
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
        minWidth: 90,
        alignItems: 'center',
    },
    priceBtnLoading: { backgroundColor: C.goldDark },
    priceBtnText: { color: C.bg, fontSize: 13, fontWeight: '800' },
    footer: {
        color: C.faint,
        fontSize: 11,
        textAlign: 'center',
        marginTop: 24,
        paddingHorizontal: 24,
        lineHeight: 16,
    },
});
