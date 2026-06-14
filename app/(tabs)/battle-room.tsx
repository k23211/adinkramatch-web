
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Animated,
    Dimensions, StatusBar, ScrollView, BackHandler,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import {
    getStory, submitAnswer, finishBattle,
    awardBattleCoins, subscribeToRoom, BattleRoom,
} from '../../lib/battle';
import type { AnAnseStory } from '../../lib/ananse-stories';

const { width: SW, height: SH } = Dimensions.get('window');
const QUESTION_TIME = 15;

type Phase = 'story' | 'question' | 'answer_reveal' | 'finished';

export default function BattleRoomScreen() {
    const { roomId } = useLocalSearchParams<{ roomId: string }>();
    const router = useRouter();

    const [userId, setUserId] = useState<string | null>(null);
    const [room, setRoom] = useState<BattleRoom | null>(null);
    const [story, setStory] = useState<AnAnseStory | null>(null);
    const [phase, setPhase] = useState<Phase>('story');
    const [questionIndex, setQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [myScore, setMyScore] = useState(0);
    const [opponentScore, setOpponentScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
    const [coinsEarned, setCoinsEarned] = useState(0);
    const [winnerId, setWinnerId] = useState<string | null>(null);
    const [answeredIndexes, setAnsweredIndexes] = useState<Set<number>>(new Set());

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const roomSubRef = useRef<any>(null);
    const progressAnim = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scoreAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUserId(user.id);

            const { data: roomData } = await supabase
                .from('battle_rooms')
                .select('*')
                .eq('id', roomId)
                .single();

            if (roomData) {
                setRoom(roomData as BattleRoom);
                const s = getStory(roomData.story_id);
                setStory(s);
            }
        })();

        const handler = BackHandler.addEventListener('hardwareBackPress', () => true);
        return () => handler.remove();
    }, [roomId]);

    useEffect(() => {
        if (!roomId || !userId || !room) return;

        roomSubRef.current = subscribeToRoom(roomId, (updatedRoom) => {
            const isPlayer1 = updatedRoom.player1_id === userId;
            setMyScore(isPlayer1 ? updatedRoom.player1_score : updatedRoom.player2_score);
            setOpponentScore(isPlayer1 ? updatedRoom.player2_score : updatedRoom.player1_score);

            Animated.sequence([
                Animated.spring(scoreAnim, { toValue: 1.3, useNativeDriver: true, friction: 4 }),
                Animated.spring(scoreAnim, { toValue: 1, useNativeDriver: true, friction: 4 }),
            ]).start();

            if (updatedRoom.status === 'finished') {
                setWinnerId(updatedRoom.winner_id);
                setPhase('finished');
            }
        });

        return () => {
            if (roomSubRef.current) supabase.removeChannel(roomSubRef.current);
        };
    }, [roomId, userId, room]);

    useEffect(() => {
        if (phase === 'story') {
            Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
        }
    }, [phase]);

    useEffect(() => {
        if (phase !== 'question') return;

        setTimeLeft(QUESTION_TIME);
        progressAnim.setValue(1);

        Animated.timing(progressAnim, {
            toValue: 0,
            duration: QUESTION_TIME * 1000,
            useNativeDriver: false,
        }).start();

        timerRef.current = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) {
                    clearInterval(timerRef.current!);
                    handleTimeUp();
                    return 0;
                }
                return t - 1;
            });
        }, 1000);

        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [phase, questionIndex]);

    const handleTimeUp = useCallback(async () => {
        if (!userId || !roomId || !story) return;
        if (answeredIndexes.has(questionIndex)) return;
        setAnsweredIndexes(prev => new Set(prev).add(questionIndex));
        setSelectedAnswer(null);
        setIsCorrect(false);
        setPhase('answer_reveal');
        await submitAnswer(roomId, userId, questionIndex, '', false);
        setTimeout(() => goToNext(), 2000);
    }, [userId, roomId, story, questionIndex, answeredIndexes]);

    const handleAnswer = async (answer: string) => {
        if (!userId || !roomId || !story) return;
        if (answeredIndexes.has(questionIndex)) return;
        if (timerRef.current) clearInterval(timerRef.current);

        const question = story.questions[questionIndex];
        const correct = answer === question.correct;

        setAnsweredIndexes(prev => new Set(prev).add(questionIndex));
        setSelectedAnswer(answer);
        setIsCorrect(correct);
        setPhase('answer_reveal');

        await submitAnswer(roomId, userId, questionIndex, answer, correct);

        if (correct) {
            setMyScore(s => s + 1);
            Animated.sequence([
                Animated.spring(scoreAnim, { toValue: 1.4, useNativeDriver: true, friction: 3 }),
                Animated.spring(scoreAnim, { toValue: 1, useNativeDriver: true, friction: 4 }),
            ]).start();
        }

        setTimeout(() => goToNext(), 2200);
    };

    const goToNext = useCallback(async () => {
        if (!story || !userId || !roomId || !room) return;
        const nextIndex = questionIndex + 1;

        if (nextIndex >= story.questions.length) {
            const isPlayer1 = room.player1_id === userId;
            const p1Score = isPlayer1 ? myScore : opponentScore;
            const p2Score = isPlayer1 ? opponentScore : myScore;
            const winner = await finishBattle(roomId, room.player1_id, room.player2_id!, p1Score, p2Score);
            const isDraw = winner === null;
            const iWon = winner === userId;
            const coins = await awardBattleCoins(userId, iWon, isDraw);
            setCoinsEarned(coins);
            setWinnerId(winner);
            setPhase('finished');
        } else {
            setSelectedAnswer(null);
            setIsCorrect(null);
            setQuestionIndex(nextIndex);
            setPhase('question');
        }
    }, [story, userId, roomId, room, questionIndex, myScore, opponentScore]);

    const isPlayer1 = room?.player1_id === userId;
    const myUsername = isPlayer1 ? room?.player1_username : room?.player2_username;
    const opponentUsername = isPlayer1 ? room?.player2_username : room?.player1_username;
    const iWon = winnerId === userId;
    const isDraw = winnerId === null && phase === 'finished';

    if (!story || !room) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingEmoji}>🕷️</Text>
                <Text style={styles.loadingText}>Ananse is preparing the story...</Text>
            </View>
        );
    }

    if (phase === 'story') {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="#0a0a1a" />
                <ScrollView contentContainerStyle={styles.storyScroll}>
                    <Animated.View style={{ opacity: fadeAnim }}>
                        <Text style={styles.storyLabel}>🕷️ Ananse Speaks...</Text>
                        <Text style={styles.storyTitle}>{story.title}</Text>
                        <View style={styles.storyBox}>
                            <Text style={styles.storyText}>{story.story}</Text>
                        </View>
                        <View style={styles.moralBox}>
                            <Text style={styles.moralLabel}>Moral of the story:</Text>
                            <Text style={styles.moralText}>"{story.moral}"</Text>
                        </View>
                        <Text style={styles.storyHint}>Read carefully — questions are coming!</Text>
                        <TouchableOpacity style={styles.readyBtn} onPress={() => setPhase('question')} activeOpacity={0.85}>
                            <Text style={styles.readyBtnText}>I'm Ready ⚔️</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </ScrollView>
            </View>
        );
    }

    if (phase === 'finished') {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="#0a0a1a" />
                <View style={styles.finishedContainer}>
                    <Text style={styles.finishedEmoji}>{iWon ? '🏆' : isDraw ? '🤝' : '💀'}</Text>
                    <Text style={styles.finishedTitle}>{iWon ? 'You Won!' : isDraw ? "It's a Draw!" : 'You Lost!'}</Text>
                    <View style={styles.scoreboard}>
                        <View style={styles.scoreCol}>
                            <Text style={styles.scoreColName}>{myUsername ?? 'You'}</Text>
                            <Text style={[styles.scoreColScore, { color: '#FFD700' }]}>{myScore}</Text>
                        </View>
                        <Text style={styles.scoreVs}>VS</Text>
                        <View style={styles.scoreCol}>
                            <Text style={styles.scoreColName}>{opponentUsername ?? 'Opponent'}</Text>
                            <Text style={[styles.scoreColScore, { color: '#FF6B6B' }]}>{opponentScore}</Text>
                        </View>
                    </View>
                    <View style={styles.coinsEarnedBox}>
                        <Text style={styles.coinsEarnedLabel}>Coins Earned</Text>
                        <Text style={styles.coinsEarnedValue}>+{coinsEarned} 🪙</Text>
                    </View>
                    <Text style={styles.storyMoral}>"{story.moral}"</Text>
                    <TouchableOpacity style={styles.doneBtn} onPress={() => router.replace('/(tabs)/')} activeOpacity={0.85}>
                        <Text style={styles.doneBtnText}>Back to Home</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.playAgainBtn} onPress={() => router.replace('/(tabs)/battle')} activeOpacity={0.85}>
                        <Text style={styles.playAgainBtnText}>⚔️ Play Again</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const question = story.questions[questionIndex];
    const letters = ['A', 'B', 'C', 'D'];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0a0a1a" />
            <View style={styles.scoreBar}>
                <View style={styles.scoreBarPlayer}>
                    <Text style={styles.scoreBarName} numberOfLines={1}>{myUsername ?? 'You'}</Text>
                    <Animated.Text style={[styles.scoreBarScore, { transform: [{ scale: scoreAnim }], color: '#FFD700' }]}>
                        {myScore}
                    </Animated.Text>
                </View>
                <View style={styles.scoreBarCenter}>
                    <Text style={styles.questionCounter}>{questionIndex + 1}/{story.questions.length}</Text>
                    <Text style={styles.timerText}>{timeLeft}s</Text>
                </View>
                <View style={styles.scoreBarPlayer}>
                    <Text style={styles.scoreBarName} numberOfLines={1}>{opponentUsername ?? 'Opponent'}</Text>
                    <Text style={[styles.scoreBarScore, { color: '#FF6B6B' }]}>{opponentScore}</Text>
                </View>
            </View>

            <View style={styles.timerBarBg}>
                <Animated.View style={[
                    styles.timerBarFill,
                    {
                        width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                        backgroundColor: timeLeft > 7 ? '#FFD700' : timeLeft > 3 ? '#FFA500' : '#FF4444',
                    }
                ]} />
            </View>

            <ScrollView contentContainerStyle={styles.questionScroll}>
                <View style={styles.symbolBox}>
                    <Text style={styles.questionSymbol}>{question.symbol ?? '🕷️'}</Text>
                </View>
                <Text style={styles.questionText}>{question.question}</Text>
                <View style={styles.optionsContainer}>
                    {question.options.map((option, idx) => {
                        let btnStyle: any = styles.optionBtn;
                        let textStyle: any = styles.optionText;
                        if (phase === 'answer_reveal') {
                            if (option === question.correct) {
                                btnStyle = { ...styles.optionBtn, ...styles.optionCorrect };
                                textStyle = { ...styles.optionText, color: '#fff' };
                            } else if (option === selectedAnswer && !isCorrect) {
                                btnStyle = { ...styles.optionBtn, ...styles.optionWrong };
                                textStyle = { ...styles.optionText, color: '#fff' };
                            }
                        }
                        return (
                            <TouchableOpacity
                                key={idx}
                                style={btnStyle}
                                onPress={() => phase === 'question' && handleAnswer(option)}
                                disabled={phase === 'answer_reveal'}
                                activeOpacity={0.8}
                            >
                                <View style={styles.optionRow}>
                                    <View style={styles.optionLetter}>
                                        <Text style={styles.optionLetterText}>{letters[idx]}</Text>
                                    </View>
                                    <Text style={textStyle}>{option}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {phase === 'answer_reveal' && (
                    <View style={[styles.feedbackBox, { backgroundColor: isCorrect ? '#1a3a1a' : '#3a1a1a' }]}>
                        <Text style={styles.feedbackEmoji}>{isCorrect ? '✅' : '❌'}</Text>
                        <Text style={[styles.feedbackText, { color: isCorrect ? '#4CAF50' : '#FF6B6B' }]}>
                            {isCorrect ? 'Correct! +1 point' : selectedAnswer ? `Wrong! Answer: ${question.correct}` : `Time's up! Answer: ${question.correct}`}
                        </Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0a1a' },
    loadingContainer: { flex: 1, backgroundColor: '#0a0a1a', justifyContent: 'center', alignItems: 'center' },
    loadingEmoji: { fontSize: 56, marginBottom: 16 },
    loadingText: { fontSize: 16, color: '#aaa' },
    storyScroll: { padding: 20, paddingTop: 48 },
    storyLabel: { fontSize: 18, color: '#FFD700', fontWeight: '700', marginBottom: 8, textAlign: 'center' },
    storyTitle: { fontSize: 22, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 20 },
    storyBox: { backgroundColor: '#12122a', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#FFD70033', marginBottom: 16 },
    storyText: { fontSize: 16, color: '#ddd', lineHeight: 26 },
    moralBox: { backgroundColor: '#1a1a0a', borderRadius: 12, padding: 14, borderLeftWidth: 3, borderLeftColor: '#FFD700', marginBottom: 20 },
    moralLabel: { fontSize: 12, color: '#FFD700', fontWeight: '700', marginBottom: 4 },
    moralText: { fontSize: 14, color: '#ccc', fontStyle: 'italic' },
    storyHint: { textAlign: 'center', color: '#888', fontSize: 13, marginBottom: 20 },
    readyBtn: { backgroundColor: '#FFD700', paddingVertical: 16, borderRadius: 50, alignItems: 'center', shadowColor: '#FFD700', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
    readyBtnText: { fontSize: 18, fontWeight: '900', color: '#0a0a1a' },
    scoreBar: { flexDirection: 'row', backgroundColor: '#12122a', paddingTop: 44, paddingBottom: 12, paddingHorizontal: 16, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#ffffff11' },
    scoreBarPlayer: { flex: 1, alignItems: 'center' },
    scoreBarName: { fontSize: 12, color: '#aaa', marginBottom: 2 },
    scoreBarScore: { fontSize: 28, fontWeight: '900' },
    scoreBarCenter: { alignItems: 'center', paddingHorizontal: 12 },
    questionCounter: { fontSize: 12, color: '#888' },
    timerText: { fontSize: 20, fontWeight: '800', color: '#fff' },
    timerBarBg: { height: 4, backgroundColor: '#1a1a2e', width: '100%' },
    timerBarFill: { height: 4 },
    questionScroll: { padding: 20 },
    symbolBox: { alignSelf: 'center', backgroundColor: '#12122a', borderRadius: 60, width: 100, height: 100, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 2, borderColor: '#FFD70055' },
    questionSymbol: { fontSize: 48 },
    questionText: { fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 24, lineHeight: 26 },
    optionsContainer: { gap: 12 },
    optionBtn: { backgroundColor: '#12122a', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#ffffff22' },
    optionCorrect: { backgroundColor: '#1a4a1a', borderColor: '#4CAF50' },
    optionWrong: { backgroundColor: '#4a1a1a', borderColor: '#FF6B6B' },
    optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    optionLetter: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#ffffff11', justifyContent: 'center', alignItems: 'center' },
    optionLetterText: { fontSize: 14, fontWeight: '700', color: '#FFD700' },
    optionText: { fontSize: 15, color: '#ddd', flex: 1 },
    feedbackBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, padding: 14, marginTop: 16 },
    feedbackEmoji: { fontSize: 24 },
    feedbackText: { fontSize: 15, fontWeight: '700', flex: 1 },
    finishedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    finishedEmoji: { fontSize: 72, marginBottom: 12 },
    finishedTitle: { fontSize: 32, fontWeight: '900', color: '#FFD700', marginBottom: 24 },
    scoreboard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#12122a', borderRadius: 20, padding: 20, width: '100%', marginBottom: 20, borderWidth: 1, borderColor: '#FFD70033' },
    scoreCol: { flex: 1, alignItems: 'center' },
    scoreColName: { fontSize: 14, color: '#aaa', marginBottom: 8 },
    scoreColScore: { fontSize: 48, fontWeight: '900' },
    scoreVs: { fontSize: 20, fontWeight: '900', color: '#888', paddingHorizontal: 12 },
    coinsEarnedBox: { backgroundColor: '#1a1a0a', borderRadius: 16, padding: 16, alignItems: 'center', width: '100%', marginBottom: 16, borderWidth: 1, borderColor: '#FFD70055' },
    coinsEarnedLabel: { fontSize: 13, color: '#aaa', marginBottom: 4 },
    coinsEarnedValue: { fontSize: 32, fontWeight: '900', color: '#FFD700' },
    storyMoral: { fontSize: 13, color: '#888', fontStyle: 'italic', textAlign: 'center', marginBottom: 24, paddingHorizontal: 16 },
    doneBtn: { backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#ffffff33', paddingVertical: 14, paddingHorizontal: 40, borderRadius: 50, marginBottom: 12, width: '100%', alignItems: 'center' },
    doneBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
    playAgainBtn: { backgroundColor: '#FFD700', paddingVertical: 14, paddingHorizontal: 40, borderRadius: 50, width: '100%', alignItems: 'center', shadowColor: '#FFD700', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
    playAgainBtnText: { fontSize: 16, fontWeight: '900', color: '#0a0a1a' },
});
