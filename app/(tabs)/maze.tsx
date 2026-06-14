import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    PanResponder,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import { supabase } from '../../lib/supabase';

// ─── Adinkra symbols used as wall decorations ──────────────────────────────
const ADINKRA_GLYPHS = ['⁕', '✦', '◈', '⬡', '✧', '◇', '❖', '⬢', '⊕', '✺'];

// ─── Difficulty config per level band ──────────────────────────────────────
const getDifficulty = (level: number) => {
    if (level <= 5) return { size: 9, timeLimit: 60, chaserDelay: null, coinCount: 3 };
    if (level <= 10) return { size: 11, timeLimit: 55, chaserDelay: null, coinCount: 4 };
    if (level <= 15) return { size: 11, timeLimit: 50, chaserDelay: 900, coinCount: 5 };
    if (level <= 20) return { size: 13, timeLimit: 45, chaserDelay: 750, coinCount: 6 };
    if (level <= 30) return { size: 13, timeLimit: 40, chaserDelay: 600, coinCount: 7 };
    return { size: 15, timeLimit: 35, chaserDelay: 450, coinCount: 8 };
};

// ─── Recursive Backtracker maze generator ──────────────────────────────────
type Cell = { row: number; col: number };
type MazeData = {
    grid: number[][];
    start: Cell;
    finish: Cell;
    coins: Cell[];
    size: number;
    timeLimit: number;
    chaserDelay: number | null;
};

function generateMaze(level: number, seed: number): MazeData {
    const { size, timeLimit, chaserDelay, coinCount } = getDifficulty(level);
    // size must be odd for maze algo
    const S = size % 2 === 0 ? size + 1 : size;

    // Fill all walls
    const grid: number[][] = Array.from({ length: S }, () => Array(S).fill(1));

    // Seeded pseudo-random (simple LCG)
    let rng = seed;
    const rand = () => {
        rng = (rng * 1664525 + 1013904223) & 0xffffffff;
        return (rng >>> 0) / 0xffffffff;
    };
    const randInt = (n: number) => Math.floor(rand() * n);

    // Carve passages
    const carve = (r: number, c: number) => {
        grid[r][c] = 0;
        const dirs = [[0, 2], [0, -2], [2, 0], [-2, 0]].sort(() => rand() - 0.5);
        for (const [dr, dc] of dirs) {
            const nr = r + dr, nc = c + dc;
            if (nr > 0 && nr < S - 1 && nc > 0 && nc < S - 1 && grid[nr][nc] === 1) {
                grid[r + dr / 2][c + dc / 2] = 0;
                carve(nr, nc);
            }
        }
    };
    carve(1, 1);

    const start: Cell = { row: 1, col: 1 };
    const finish: Cell = { row: S - 2, col: S - 2 };
    grid[finish.row][finish.col] = 0;

    // Place coins on random open path cells (not start/finish)
    const pathCells: Cell[] = [];
    for (let r = 0; r < S; r++) {
        for (let c = 0; c < S; c++) {
            if (
                grid[r][c] === 0 &&
                !(r === start.row && c === start.col) &&
                !(r === finish.row && c === finish.col)
            ) {
                pathCells.push({ row: r, col: c });
            }
        }
    }
    const coins: Cell[] = [];
    const shuffled = [...pathCells].sort(() => rand() - 0.5);
    for (let i = 0; i < Math.min(coinCount, shuffled.length); i++) {
        coins.push(shuffled[i]);
    }

    return { grid, start, finish, coins, size: S, timeLimit, chaserDelay };
}

// ─── Reward calculation ─────────────────────────────────────────────────────
const getRewards = (level: number, timeLeft: number, timeLimit: number, collectedCoins: number) => {
    const base = 50 + level * 20;
    const timeBonus = Math.floor((timeLeft / timeLimit) * base);
    const coinValue = collectedCoins * 15;
    const total = base + timeBonus + coinValue;
    return {
        base,
        timeBonus,
        coinValue,
        total,
        score: total * 2,
    };
};

// ─── BFS pathfinder for chaser ─────────────────────────────────────────────
function bfsNext(grid: number[][], from: Cell, to: Cell): Cell | null {
    const rows = grid.length, cols = grid[0].length;
    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    const queue: { cell: Cell; path: Cell[] }[] = [{ cell: from, path: [] }];
    visited[from.row][from.col] = true;

    while (queue.length) {
        const { cell, path } = queue.shift()!;
        for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
            const nr = cell.row + dr, nc = cell.col + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc] && grid[nr][nc] === 0) {
                const next = { row: nr, col: nc };
                if (nr === to.row && nc === to.col) return path[0] || next;
                visited[nr][nc] = true;
                queue.push({ cell: next, path: path.length ? path : [next] });
            }
        }
    }
    return null;
}

// ─── Main Component ─────────────────────────────────────────────────────────
const { width: SCREEN_W } = Dimensions.get('window');

export default function MazeScreen() {

    const [level, setLevel] = useState(1);
    const router = useRouter();
    const params = useLocalSearchParams();

    const [maze, setMaze] = useState<MazeData>(() => generateMaze(1, Date.now()));
    const [pos, setPos] = useState<Cell>({ row: 1, col: 1 });
    const [chaserPos, setChaserPos] = useState<Cell | null>(null);
    const [collectedCoins, setCollectedCoins] = useState<Cell[]>([]);
    const [remainingCoins, setRemainingCoins] = useState<Cell[]>([]);
    const [timeLeft, setTimeLeft] = useState(60);
    const [steps, setSteps] = useState(0);
    const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
    const [saving, setSaving] = useState(false);
    const [totalBalance, setTotalBalance] = useState(0);

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const chaserRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [seed, setSeed] = useState<number | null>(null);
    const [headerH, setHeaderH] = useState(0);
    const [statsH, setStatsH] = useState(0);
    const [controlsH, setControlsH] = useState(0);

    // Animations
    const modalScale = useRef(new Animated.Value(0)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;
    const coinBounce = useRef(new Animated.Value(0)).current;
    const playerGlow = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // sound handling removed (audio helper not present)

    // ─── Init maze for a level ────────────────────────────────────────────────
    const initLevel = useCallback((lvl: number, providedSeed?: number) => {
        const s = providedSeed ?? (Date.now() + lvl * 9999);
        const newMaze = generateMaze(lvl, s);
        setMaze(newMaze);
        setPos(newMaze.start);
        setRemainingCoins([...newMaze.coins]);
        setCollectedCoins([]);
        setTimeLeft(newMaze.timeLimit);
        setSteps(0);
        setGameState('playing');
        setChaserPos(newMaze.chaserDelay ? { row: newMaze.size - 2, col: 1 } : null);
        setSeed(s);
        modalScale.setValue(0);
        glowAnim.setValue(0);
        coinBounce.setValue(0);
        playerGlow.setValue(0);
        pulseAnim.setValue(1);
    }, []);

    // ─── Focus reset ──────────────────────────────────────────────────────────
    useFocusEffect(useCallback(() => {
        initLevel(1);
        setLevel(1);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (chaserRef.current) clearInterval(chaserRef.current);
        };
    }, []));

    // ─── Player glow pulse ────────────────────────────────────────────────────
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(playerGlow, { toValue: 1, duration: 800, useNativeDriver: true }),
                Animated.timing(playerGlow, { toValue: 0, duration: 800, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    // ─── Finish cell pulse ────────────────────────────────────────────────────
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    // ─── Timer ────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (gameState !== 'playing') {
            if (timerRef.current) clearInterval(timerRef.current);
            return;
        }
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    setGameState('lost');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [gameState]);

    // ─── Chaser AI (BFS) ─────────────────────────────────────────────────────
    useEffect(() => {
        if (!maze.chaserDelay || gameState !== 'playing') {
            if (chaserRef.current) clearInterval(chaserRef.current);
            return;
        }
        chaserRef.current = setInterval(() => {
            setChaserPos(prev => {
                if (!prev) return prev;
                const next = bfsNext(maze.grid, prev, pos);
                if (next) {
                    if (next.row === pos.row && next.col === pos.col) {
                        setGameState('lost');
                    }
                    return next;
                }
                return prev;
            });
        }, maze.chaserDelay);
        return () => { if (chaserRef.current) clearInterval(chaserRef.current); };
    }, [maze, gameState, pos]);



    // ─── Win animation ────────────────────────────────────────────────────────
    useEffect(() => {
        if (gameState !== 'won') return;
        if (timerRef.current) clearInterval(timerRef.current);
        if (chaserRef.current) clearInterval(chaserRef.current);

        Animated.spring(modalScale, { toValue: 1, useNativeDriver: true, bounciness: 18 }).start();
        Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
                Animated.timing(glowAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
            ])
        ).start();
        Animated.loop(
            Animated.sequence([
                Animated.timing(coinBounce, { toValue: -10, duration: 280, useNativeDriver: true }),
                Animated.timing(coinBounce, { toValue: 0, duration: 280, useNativeDriver: true }),
            ])
        ).start();

        saveRewards();
    }, [gameState]);

    // ─── Save rewards ─────────────────────────────────────────────────────────
    const saveRewards = async () => {
        const rewards = getRewards(level, timeLeft, maze.timeLimit, collectedCoins.length);
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('coins, score')
                    .eq('id', user.id)
                    .single();

                const newCoins = (profile?.coins ?? 0) + rewards.total;
                const newScore = (profile?.score ?? 0) + rewards.score;
                setTotalBalance(newCoins);

                await supabase.from('profiles').update({ coins: newCoins, score: newScore }).eq('id', user.id);

                await supabase.from('leaderboard').upsert(
                    { user_id: user.id, coins: rewards.total, mode: 'maze' },
                    { onConflict: 'user_id,mode' }
                );

                try {
                    await supabase.rpc('increment_story_points', { p_user_id: user.id, p_amount: rewards.total });
                } catch { }
            }
        } finally {
            setSaving(false);
        }
    };

    // ─── Movement ─────────────────────────────────────────────────────────────
    const move = useCallback((dRow: number, dCol: number) => {
        if (gameState !== 'playing') return;
        setPos(prev => {
            const nr = prev.row + dRow, nc = prev.col + dCol;
            if (
                nr >= 0 && nr < maze.grid.length &&
                nc >= 0 && nc < maze.grid[0].length &&
                maze.grid[nr][nc] === 0
            ) {
                const newPos = { row: nr, col: nc };
                setSteps(s => s + 1);

                // Coin pickup
                setRemainingCoins(coins => {
                    const idx = coins.findIndex(c => c.row === nr && c.col === nc);
                    if (idx !== -1) {
                        const updated = [...coins];
                        updated.splice(idx, 1);
                        setCollectedCoins(cc => [...cc, { row: nr, col: nc }]);
                        return updated;
                    }
                    return coins;
                });

                // Finish check
                if (nr === maze.finish.row && nc === maze.finish.col) {
                    setTimeout(() => setGameState('won'), 200);
                }

                // Chaser catch check
                if (chaserPos && nr === chaserPos.row && nc === chaserPos.col) {
                    setGameState('lost');
                }

                return newPos;
            }
            return prev;
        });
    }, [gameState, maze, chaserPos]);

    // ─── Swipe gestures ───────────────────────────────────────────────────────
    const swipeRef = useRef({ x: 0, y: 0 });
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderGrant: (e) => {
                swipeRef.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
            },
            onPanResponderRelease: (e) => {
                const dx = e.nativeEvent.pageX - swipeRef.current.x;
                const dy = e.nativeEvent.pageY - swipeRef.current.y;
                const threshold = 20;
                if (Math.abs(dx) > Math.abs(dy)) {
                    if (dx > threshold) move(0, 1);
                    else if (dx < -threshold) move(0, -1);
                } else {
                    if (dy > threshold) move(1, 0);
                    else if (dy < -threshold) move(-1, 0);
                }
            },
        })
    ).current;

    // ─── Cell sizing (responsive) ─────────────────────────────────────────────
    const { width: winW, height: winH } = useWindowDimensions();
    // Compute available vertical space by subtracting measured header/stats/controls heights
    const extraPadding = 48; // safe padding for margins and modals
    const availableHeight = Math.max(200, winH - headerH - statsH - controlsH - extraPadding);
    const maxBoardFromWidth = Math.max(200, winW - 32);
    const boardMax = Math.min(maxBoardFromWidth, availableHeight);
    let CELL = Math.floor(boardMax / maze.size);
    if (CELL < 10) CELL = 10; // minimum cell size for usability
    const BOARD_SIZE = CELL * maze.size;
    // On web, also cap BOARD_SIZE to never exceed the available width/height
    // so the grid can never overflow its bordered wrapper, even if CELL
    // ends up larger than ideal due to the minimum cell size above.
    const SAFE_BOARD_SIZE = Math.min(BOARD_SIZE, maxBoardFromWidth, availableHeight);

    // ─── Helpers ──────────────────────────────────────────────────────────────
    const timerColor = timeLeft <= 10 ? '#FF4444' : timeLeft <= 20 ? '#FFD700' : '#4ade80';
    const rewards = getRewards(level, timeLeft, maze.timeLimit, collectedCoins.length);
    const isChaseMode = !!maze.chaserDelay;

    const adinkraForWall = (r: number, c: number) =>
        ADINKRA_GLYPHS[(r * 7 + c * 3) % ADINKRA_GLYPHS.length];

    const handleExit = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (chaserRef.current) clearInterval(chaserRef.current);
        router.back();
    };

    const handleNextLevel = () => {
        const next = level + 1;
        setLevel(next);
        initLevel(next);
    };

    const handleRetry = () => initLevel(level);

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <View style={styles.screen}>
            {/* Header */}
            <View style={styles.header} onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}>
                <View>
                    <Text style={styles.title}>⬡ MAZE QUEST</Text>
                    <Text style={styles.subtitle}>
                        {isChaseMode ? '🚨 Chase Mode — Don\'t get caught!' : 'Navigate the Adinkra labyrinth'}
                    </Text>
                </View>
                <View style={styles.headerRight}>
                    <View style={[styles.levelBadge, isChaseMode && styles.levelBadgeChase]}>
                        <Text style={styles.levelText}>LVL {level}</Text>
                    </View>
                    <TouchableOpacity style={styles.exitBtn} onPress={handleExit}>
                        <Text style={styles.exitBtnText}>✕</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Stats bar */}
            <View style={styles.statsBar} onLayout={(e) => setStatsH(e.nativeEvent.layout.height)}>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>STEPS</Text>
                    <Text style={styles.statValue}>{steps}</Text>
                </View>
                <View style={[styles.timerBox, { borderColor: timerColor }]}>
                    <Text style={[styles.timerValue, { color: timerColor }]}>{timeLeft}s</Text>
                    <Text style={styles.timerLabel}>TIME</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>COINS</Text>
                    <Text style={[styles.statValue, { color: '#FFD700' }]}>
                        🪙{collectedCoins.length}/{maze.coins.length}
                    </Text>
                </View>
            </View>

            {/* Maze Grid with swipe */}
            <ScrollView
                contentContainerStyle={styles.mazeContainer}
                scrollEnabled={false}
                {...panResponder.panHandlers}
            >
                <View style={[styles.mazeWrapper, { borderColor: isChaseMode ? '#FF4444' : '#6b21a8', width: SAFE_BOARD_SIZE, height: SAFE_BOARD_SIZE, maxWidth: SAFE_BOARD_SIZE, maxHeight: SAFE_BOARD_SIZE }]}>
                    <View
                        style={{
                            width: BOARD_SIZE,
                            height: BOARD_SIZE,
                            transform: [{ scale: BOARD_SIZE > 0 ? SAFE_BOARD_SIZE / BOARD_SIZE : 1 }],
                            transformOrigin: 'top left',
                        }}
                    >
                        {maze.grid.map((row, r) => (
                            <View key={r} style={{ flexDirection: 'row' }}>
                                {row.map((cell, c) => {
                                    const isPlayer = pos.row === r && pos.col === c;
                                    const isFinish = maze.finish.row === r && maze.finish.col === c;
                                    const isChaser = chaserPos?.row === r && chaserPos?.col === c;
                                    const hasCoin = remainingCoins.some(cn => cn.row === r && cn.col === c);
                                    const isWall = cell === 1;

                                    return (
                                        <View
                                            key={c}
                                            style={[
                                                { width: CELL, height: CELL },
                                                isWall ? styles.wall : styles.path,
                                                isFinish && !isPlayer && styles.finishCell,
                                            ]}
                                        >
                                            {isWall && (
                                                <Text style={[styles.adinkraGlyph, { fontSize: CELL * 0.45 }]}>
                                                    {adinkraForWall(r, c)}
                                                </Text>
                                            )}
                                            {!isWall && !isPlayer && !isFinish && !isChaser && hasCoin && (
                                                <Text style={[styles.coinGlyph, { fontSize: CELL * 0.5 }]}>🪙</Text>
                                            )}
                                            {isFinish && !isPlayer && (
                                                <Animated.Text style={[
                                                    styles.finishGlyph,
                                                    { fontSize: CELL * 0.6, transform: [{ scale: pulseAnim }] }
                                                ]}>
                                                    💎
                                                </Animated.Text>
                                            )}
                                            {isChaser && !isPlayer && (
                                                <Text style={[styles.chaserGlyph, { fontSize: CELL * 0.6 }]}>👮🏾</Text>
                                            )}
                                            {isPlayer && (
                                                <Animated.Text style={[
                                                    styles.playerGlyph,
                                                    {
                                                        fontSize: CELL * 0.65,
                                                        opacity: playerGlow.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }),
                                                    }
                                                ]}>
                                                    🧒🏾
                                                </Animated.Text>
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>

            {/* D-Pad */}
            <View style={styles.controls} onLayout={(e) => setControlsH(e.nativeEvent.layout.height)}>
                <TouchableOpacity style={styles.dBtn} onPress={() => move(-1, 0)} disabled={gameState !== 'playing'}>
                    <Text style={styles.dBtnText}>▲</Text>
                </TouchableOpacity>
                <View style={styles.dRow}>
                    <TouchableOpacity style={styles.dBtn} onPress={() => move(0, -1)} disabled={gameState !== 'playing'}>
                        <Text style={styles.dBtnText}>◀</Text>
                    </TouchableOpacity>
                    <View style={styles.dCenter}>
                        <Text style={styles.dCenterSymbol}>⬡</Text>
                    </View>
                    <TouchableOpacity style={styles.dBtn} onPress={() => move(0, 1)} disabled={gameState !== 'playing'}>
                        <Text style={styles.dBtnText}>▶</Text>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.dBtn} onPress={() => move(1, 0)} disabled={gameState !== 'playing'}>
                    <Text style={styles.dBtnText}>▼</Text>
                </TouchableOpacity>
            </View>

            {/* ── Win Modal ── */}
            <Modal visible={gameState === 'won'} transparent animationType="fade">
                <View style={styles.modalBg}>
                    <Animated.View style={[styles.rewardCard, { transform: [{ scale: modalScale }] }]}>

                        <Animated.Text style={[styles.rewardIcon, {
                            opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }),
                            transform: [{ scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }) }],
                        }]}>
                            🏆
                        </Animated.Text>

                        <Text style={styles.rewardTitle}>Level {level} Complete!</Text>
                        <Text style={styles.rewardSub}>You navigated the labyrinth in {steps} steps</Text>

                        {/* Reward breakdown */}
                        <View style={styles.rewardBreakdown}>
                            <View style={styles.rewardRow}>
                                <Text style={styles.rewardRowLabel}>🎯 Base reward</Text>
                                <Text style={styles.rewardRowVal}>+{rewards.base}</Text>
                            </View>
                            <View style={styles.rewardRow}>
                                <Text style={styles.rewardRowLabel}>⏱️ Time bonus</Text>
                                <Text style={styles.rewardRowVal}>+{rewards.timeBonus}</Text>
                            </View>
                            <View style={styles.rewardRow}>
                                <Text style={styles.rewardRowLabel}>🪙 Coin pickups</Text>
                                <Text style={styles.rewardRowVal}>+{rewards.coinValue}</Text>
                            </View>
                            <View style={[styles.rewardRow, styles.rewardRowTotal]}>
                                <Text style={styles.rewardTotalLabel}>TOTAL COINS</Text>
                                <Animated.Text style={[styles.rewardTotal, { transform: [{ translateY: coinBounce }] }]}>
                                    🪙 {rewards.total}
                                </Animated.Text>
                            </View>
                        </View>

                        {saving && <Text style={styles.savingText}>Saving rewards...</Text>}
                        {!saving && totalBalance > 0 && (
                            <Text style={styles.balanceText}>Your balance: {totalBalance.toLocaleString()} 🪙</Text>
                        )}

                        <TouchableOpacity style={styles.nextBtn} onPress={handleNextLevel}>
                            <Text style={styles.nextBtnText}>Next Level →  LVL {level + 1}</Text>
                        </TouchableOpacity>

                    </Animated.View>
                </View>
            </Modal>

            {/* ── Game Over Modal ── */}
            <Modal visible={gameState === 'lost'} transparent animationType="fade">
                <View style={styles.modalBg}>
                    <View style={[styles.rewardCard, styles.lostCard]}>
                        <Text style={styles.rewardIcon}>{isChaseMode ? '🚨' : '⏰'}</Text>
                        <Text style={[styles.rewardTitle, { color: '#FF4444' }]}>
                            {isChaseMode ? 'Caught!' : "Time's Up!"}
                        </Text>
                        <Text style={styles.rewardSub}>
                            {isChaseMode
                                ? 'The chaser caught you in the labyrinth!'
                                : 'You ran out of time. Try again!'}
                        </Text>
                        <Text style={styles.rewardSub}>Level {level} · {steps} steps taken</Text>

                        <View style={styles.lostBtnRow}>
                            <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
                                <Text style={styles.retryBtnText}>↺ Retry</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.backBtn} onPress={handleExit}>
                                <Text style={styles.backBtnText}>← Exit</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#0d0018',
        alignItems: 'center',
        paddingTop: 52,
        paddingBottom: 16,
    },

    // Header
    header: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 16,
        marginBottom: 10,
    },
    title: {
        color: '#c084fc',
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: 2,
    },
    subtitle: {
        color: '#7c3aed',
        fontSize: 11,
        marginTop: 2,
        letterSpacing: 0.5,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    levelBadge: {
        backgroundColor: '#4c1d95',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: '#7c3aed',
    },
    levelBadgeChase: {
        backgroundColor: '#7f1d1d',
        borderColor: '#FF4444',
    },
    levelText: {
        color: '#e9d5ff',
        fontWeight: '900',
        fontSize: 12,
        letterSpacing: 1,
    },
    exitBtn: {
        width: 32,
        height: 32,
        backgroundColor: '#1a0030',
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#7c3aed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    exitBtnText: {
        color: '#c084fc',
        fontSize: 14,
        fontWeight: '900',
    },

    // Stats bar
    statsBar: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 10,
        alignItems: 'center',
    },
    statBox: {
        alignItems: 'center',
        backgroundColor: '#1a0030',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: '#4c1d95',
    },
    statLabel: {
        color: '#7c3aed',
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1.5,
    },
    statValue: {
        color: '#e9d5ff',
        fontSize: 15,
        fontWeight: '900',
    },
    timerBox: {
        alignItems: 'center',
        backgroundColor: '#1a0030',
        borderRadius: 10,
        paddingHorizontal: 18,
        paddingVertical: 6,
        borderWidth: 2,
    },
    timerValue: {
        fontSize: 20,
        fontWeight: '900',
    },
    timerLabel: {
        color: '#7c3aed',
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1.5,
    },

    // Maze
    mazeContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingHorizontal: 16,
    },
    mazeWrapper: {
        borderWidth: 2,
        borderRadius: 10,
        overflow: 'hidden',
        elevation: 12,
        shadowColor: '#7c3aed',
        shadowOpacity: 0.8,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 0 },
        alignSelf: 'center',
    },
    wall: {
        backgroundColor: '#1e0040',
        justifyContent: 'center',
        alignItems: 'center',
    },
    path: {
        backgroundColor: '#0d0018',
        justifyContent: 'center',
        alignItems: 'center',
    },
    finishCell: {
        backgroundColor: '#0f0025',
        justifyContent: 'center',
        alignItems: 'center',
    },
    adinkraGlyph: {
        color: '#4c1d95',
        fontWeight: '700',
        opacity: 0.9,
    },
    playerGlyph: {
        lineHeight: undefined,
        textAlign: 'center',
    },
    finishGlyph: {
        textAlign: 'center',
        lineHeight: undefined,
    },
    coinGlyph: {
        textAlign: 'center',
        lineHeight: undefined,
    },
    chaserGlyph: {
        textAlign: 'center',
        lineHeight: undefined,
    },

    // D-Pad
    controls: {
        marginTop: 14,
        alignItems: 'center',
        gap: 4,
    },
    dRow: {
        flexDirection: 'row',
        gap: 4,
        alignItems: 'center',
    },
    dBtn: {
        width: 54,
        height: 54,
        backgroundColor: '#1a0030',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#6b21a8',
        elevation: 4,
        shadowColor: '#c084fc',
        shadowOpacity: 0.4,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 0 },
    },
    dBtnText: {
        color: '#c084fc',
        fontSize: 20,
        fontWeight: '900',
    },
    dCenter: {
        width: 54,
        height: 54,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0d0018',
        borderRadius: 16,
    },
    dCenterSymbol: {
        color: '#4c1d95',
        fontSize: 22,
    },

    // Modals
    modalBg: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.88)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    rewardCard: {
        backgroundColor: '#0d0018',
        borderRadius: 28,
        padding: 28,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#7c3aed',
        width: 310,
        gap: 10,
        elevation: 20,
        shadowColor: '#c084fc',
        shadowOpacity: 0.5,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 0 },
    },
    lostCard: {
        borderColor: '#FF4444',
        shadowColor: '#FF4444',
    },
    rewardIcon: {
        fontSize: 64,
    },
    rewardTitle: {
        color: '#c084fc',
        fontSize: 24,
        fontWeight: '900',
        letterSpacing: 1,
    },
    rewardSub: {
        color: '#7c3aed',
        fontSize: 13,
        textAlign: 'center',
    },

    // Reward breakdown
    rewardBreakdown: {
        width: '100%',
        backgroundColor: '#150028',
        borderRadius: 16,
        padding: 14,
        gap: 6,
        borderWidth: 1,
        borderColor: '#4c1d95',
        marginTop: 4,
    },
    rewardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    rewardRowTotal: {
        borderTopWidth: 1,
        borderTopColor: '#4c1d95',
        paddingTop: 8,
        marginTop: 4,
    },
    rewardRowLabel: {
        color: '#9d6fd4',
        fontSize: 13,
    },
    rewardRowVal: {
        color: '#e9d5ff',
        fontSize: 14,
        fontWeight: '700',
    },
    rewardTotalLabel: {
        color: '#c084fc',
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 1,
    },
    rewardTotal: {
        color: '#FFD700',
        fontSize: 20,
        fontWeight: '900',
    },

    savingText: {
        color: '#7c3aed',
        fontSize: 12,
    },
    balanceText: {
        color: '#4ade80',
        fontSize: 12,
        fontWeight: '700',
    },

    nextBtn: {
        backgroundColor: '#7c3aed',
        borderRadius: 18,
        paddingHorizontal: 28,
        paddingVertical: 14,
        marginTop: 4,
        borderWidth: 2,
        borderColor: '#c084fc',
        width: '100%',
        alignItems: 'center',
    },
    nextBtnText: {
        color: '#ffffff',
        fontWeight: '900',
        fontSize: 16,
        letterSpacing: 0.5,
    },

    lostBtnRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    retryBtn: {
        backgroundColor: '#7c3aed',
        borderRadius: 14,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderWidth: 1.5,
        borderColor: '#c084fc',
    },
    retryBtnText: {
        color: '#ffffff',
        fontWeight: '900',
        fontSize: 15,
    },
    backBtn: {
        backgroundColor: '#1a0030',
        borderRadius: 14,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderWidth: 1.5,
        borderColor: '#4c1d95',
    },
    backBtnText: {
        color: '#c084fc',
        fontWeight: '900',
        fontSize: 15,
    },
});
