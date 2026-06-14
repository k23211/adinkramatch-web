import { supabase } from './supabase';
import { ANANSE_STORIES } from './ananse-stories';

// ─── Types ───────────────────────────────────────────────────────────────────

export type BattleRoom = {
    id: string;
    player1_id: string;
    player2_id: string | null;
    player1_username: string;
    player2_username: string | null;
    story_id: number;
    status: 'waiting' | 'active' | 'finished';
    player1_score: number;
    player2_score: number;
    winner_id: string | null;
    created_at: string;
    started_at: string | null;
    finished_at: string | null;
};

export type QueueEntry = {
    id: string;
    user_id: string;
    username: string;
    avatar_url: string | null;
    joined_at: string;
    status: 'waiting' | 'matched';
};

// ─── Join Matchmaking Queue ───────────────────────────────────────────────────

export async function joinQueue(userId: string, username: string, avatarUrl?: string) {
    // Remove any existing queue entry for this user first
    await supabase.from('battle_queue').delete().eq('user_id', userId);

    const { data, error } = await supabase
        .from('battle_queue')
        .insert({
            user_id: userId,
            username,
            avatar_url: avatarUrl ?? null,
            status: 'waiting',
        })
        .select()
        .single();

    if (error) throw error;
    return data as QueueEntry;
}

// ─── Leave Queue ─────────────────────────────────────────────────────────────

export async function leaveQueue(userId: string) {
    await supabase.from('battle_queue').delete().eq('user_id', userId);
}

// ─── Try to Match Two Players ─────────────────────────────────────────────────
// Called after joining queue — looks for another waiting player

export async function tryMatch(currentUserId: string, currentUsername: string): Promise<BattleRoom | null> {
    // Find another waiting player (not the current user)
    const { data: opponents } = await supabase
        .from('battle_queue')
        .select('*')
        .eq('status', 'waiting')
        .neq('user_id', currentUserId)
        .order('joined_at', { ascending: true })
        .limit(1);

    if (!opponents || opponents.length === 0) return null;

    const opponent = opponents[0] as QueueEntry;

    // Pick a random story
    const storyId = Math.floor(Math.random() * ANANSE_STORIES.length) + 1;

    // Create battle room
    const { data: room, error } = await supabase
        .from('battle_rooms')
        .insert({
            player1_id: opponent.user_id,
            player2_id: currentUserId,
            player1_username: opponent.username,
            player2_username: currentUsername,
            story_id: storyId,
            status: 'active',
            player1_score: 0,
            player2_score: 0,
            started_at: new Date().toISOString(),
        })
        .select()
        .single();

    if (error) throw error;

    // Mark both players as matched and remove from queue
    await supabase.from('battle_queue').delete().eq('user_id', opponent.user_id);
    await supabase.from('battle_queue').delete().eq('user_id', currentUserId);

    return room as BattleRoom;
}

// ─── Submit Answer ────────────────────────────────────────────────────────────

export async function submitAnswer(
    roomId: string,
    userId: string,
    questionIndex: number,
    answer: string,
    isCorrect: boolean
) {
    const { error } = await supabase.from('battle_answers').insert({
        room_id: roomId,
        user_id: userId,
        question_index: questionIndex,
        answer,
        is_correct: isCorrect,
    });

    if (error) throw error;

    // Update score if correct
    if (isCorrect) {
        // Get current room to know which player we are
        const { data: room } = await supabase
            .from('battle_rooms')
            .select('player1_id, player1_score, player2_score')
            .eq('id', roomId)
            .single();

        if (room) {
            const isPlayer1 = room.player1_id === userId;
            const field = isPlayer1 ? 'player1_score' : 'player2_score';
            const currentScore = isPlayer1 ? room.player1_score : room.player2_score;

            await supabase
                .from('battle_rooms')
                .update({ [field]: currentScore + 1 })
                .eq('id', roomId);
        }
    }
}

// ─── Finish Battle ────────────────────────────────────────────────────────────

export async function finishBattle(roomId: string, player1Id: string, player2Id: string, player1Score: number, player2Score: number) {
    let winnerId: string | null = null;
    if (player1Score > player2Score) winnerId = player1Id;
    else if (player2Score > player1Score) winnerId = player2Id;
    // null = draw

    await supabase
        .from('battle_rooms')
        .update({
            status: 'finished',
            winner_id: winnerId,
            finished_at: new Date().toISOString(),
        })
        .eq('id', roomId);

    return winnerId;
}

// ─── Award Coins ──────────────────────────────────────────────────────────────

export async function awardBattleCoins(userId: string, isWinner: boolean, isDraw: boolean) {
    const coins = isWinner ? 50 : isDraw ? 20 : 10;

    const { data: profile } = await supabase
        .from('profiles')
        .select('coins')
        .eq('id', userId)
        .single();

    if (profile) {
        await supabase
            .from('profiles')
            .update({ coins: (profile.coins ?? 0) + coins })
            .eq('id', userId);
    }

    return coins;
}

// ─── Subscribe to Room Changes ────────────────────────────────────────────────

export function subscribeToRoom(roomId: string, callback: (room: BattleRoom) => void) {
    return supabase
        .channel(`room:${roomId}`)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'battle_rooms', filter: `id=eq.${roomId}` },
            (payload) => {
                callback(payload.new as BattleRoom);
            }
        )
        .subscribe();
}

// ─── Subscribe to Queue (to detect when matched) ──────────────────────────────

export function subscribeToQueue(userId: string, onMatched: (roomId: string) => void) {
    return supabase
        .channel(`queue:${userId}`)
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'battle_rooms' },
            (payload) => {
                const room = payload.new as BattleRoom;
                if (room.player1_id === userId || room.player2_id === userId) {
                    onMatched(room.id);
                }
            }
        )
        .subscribe();
}

// ─── Get Story by ID ──────────────────────────────────────────────────────────

export function getStory(storyId: number) {
    return ANANSE_STORIES.find((s) => s.id === storyId) ?? ANANSE_STORIES[0];
}
