import { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, Image,
    ActivityIndicator, TouchableOpacity,
    TextInput, ScrollView, Alert, Platform, Linking
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
// web-only CSS moved to external file
import './profile.css';
import { C } from '../../constants/colors';
import { supabase } from '../../lib/supabase';

type Profile = {
    id: string;
    username: string;
    avatar_url: string;
    bio: string;
    coins: number;
};

export default function ProfileScreen() {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [username, setUsername] = useState('');
    const [bio, setBio] = useState('');
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    useEffect(() => { fetchProfile(); }, []);

    async function fetchProfile() {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        const { data } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, bio, coins')
            .eq('id', user.id)
            .single();
        if (data) {
            setProfile(data);
            setUsername(data.username || '');
            setBio(data.bio || '');
        }
        setLoading(false);
    }

    async function pickAndUploadAvatar() {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permission needed', 'Allow access to your photos.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });
        if (result.canceled || !result.assets[0]) return;
        setUploadingAvatar(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const uri = result.assets[0].uri;
            const fileName = `${user.id}/avatar.jpeg`;
            const response = await fetch(uri);
            const blob = await response.blob();
            await supabase.storage.from('avatars').upload(fileName, blob, {
                contentType: 'image/jpeg', upsert: true,
            });
            const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
            const newUrl = `${urlData.publicUrl}?t=${Date.now()}`;
            await supabase.from('profiles').update({ avatar_url: newUrl }).eq('id', user.id);
            setProfile(prev => prev ? { ...prev, avatar_url: newUrl } : prev);
        } catch (e) {
            Alert.alert('Error', 'Could not upload photo.');
        }
        setUploadingAvatar(false);
    }

    async function saveProfile() {
        if (!profile) return;
        setSaving(true);
        const { error } = await supabase
            .from('profiles').update({ username, bio }).eq('id', profile.id);
        if (error) Alert.alert('Error', 'Could not save profile');
        else { setProfile({ ...profile, username, bio }); setEditing(false); }
        setSaving(false);
    }

    async function signOut() { await supabase.auth.signOut(); }

    async function openPlayStore() {
        const url = 'https://play.google.com/store/apps/details?id=com.adinkramatchgh.game';
        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) await Linking.openURL(url);
            else Alert.alert('Cannot open link', 'Unable to open the Play Store link.');
        } catch (e) {
            Alert.alert('Error', 'Could not open link.');
        }
    }

    if (loading) return (
        <View style={styles.centered}>
            <ActivityIndicator color={C.gold} size="large" />
        </View>
    );

    if (!profile) return (
        <View style={styles.centered}>
            <Text style={styles.errorText}>Not logged in</Text>
        </View>
    );

    return (
        <View style={styles.root}>
            {/* Background */}
            {Platform.OS === 'web' ? (
                <div className="profile-bg" />
            ) : (
                <Image
                    source={require('../../assets/images/profile.png')}
                    style={styles.bgImage}
                    resizeMode="cover"
                />
            )}
            <View style={styles.overlay} />

            <ScrollView contentContainerStyle={styles.content}>

                {/* Avatar above the card */}
                <TouchableOpacity onPress={pickAndUploadAvatar} style={styles.avatarWrapper}>
                    {profile.avatar_url ? (
                        <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarInitial}>
                                {profile.username?.[0]?.toUpperCase() || '?'}
                            </Text>
                        </View>
                    )}
                    <View style={styles.cameraOverlay}>
                        {uploadingAvatar
                            ? <ActivityIndicator color={C.gold} size="small" />
                            : <Text style={styles.cameraIcon}>📷</Text>}
                    </View>
                </TouchableOpacity>
                <Text style={styles.editAvatarHint}>Tap to change photo</Text>

                {/* Card */}
                <View style={styles.card}>

                    {/* Coins */}
                    <View style={styles.coinsBadge}>
                        <Text style={styles.coinsText}>🪙 {profile.coins.toLocaleString()}</Text>
                    </View>

                    {/* Divider */}
                    <View style={styles.divider} />

                    {/* Username */}
                    {editing ? (
                        <TextInput
                            style={styles.input}
                            value={username}
                            onChangeText={setUsername}
                            placeholder="Username"
                            placeholderTextColor={C.muted}
                            maxLength={20}
                        />
                    ) : (
                        <Text style={styles.username}>{profile.username || 'No username'}</Text>
                    )}

                    {/* Bio */}
                    {editing ? (
                        <TextInput
                            style={[styles.input, styles.bioInput]}
                            value={bio}
                            onChangeText={setBio}
                            placeholder="Write something about yourself..."
                            placeholderTextColor={C.muted}
                            multiline
                            maxLength={80}
                        />
                    ) : (
                        <Text style={styles.bio}>{profile.bio || 'No bio yet...'}</Text>
                    )}

                    <View style={styles.divider} />

                    {/* App Update row */}
                    <TouchableOpacity style={styles.updateRow} onPress={openPlayStore}>
                        <Text style={styles.updateText}>App Update</Text>
                        <Text style={styles.updateAction}>Check on Play Store →</Text>
                    </TouchableOpacity>

                    {/* Buttons */}
                    {editing ? (
                        <View style={styles.row}>
                            <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={() => setEditing(false)}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.btn, styles.saveBtn]} onPress={saveProfile} disabled={saving}>
                                {saving
                                    ? <ActivityIndicator color={C.bg} size="small" />
                                    : <Text style={styles.saveText}>Save</Text>}
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity style={[styles.btn, styles.editBtn]} onPress={() => setEditing(true)}>
                            <Text style={styles.editText}>✏️ Edit Profile</Text>
                        </TouchableOpacity>
                    )}

                    {/* Sign Out */}
                    <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
                        <Text style={styles.signOutText}>Sign Out</Text>
                    </TouchableOpacity>

                </View>

                {/* Banner Ad (native only) */}
                {Platform.OS !== 'web' && (() => {
                    try {
                        const { BannerAd, BannerAdSize, TestIds } = require('react-native-google-mobile-ads');
                        const adUnitId = __DEV__ ? TestIds.BANNER : 'ca-app-pub-5377997497697187/8465577324';
                        return (
                            <View style={styles.bannerWrapper}>
                                <BannerAd unitId={adUnitId} size={BannerAdSize.BANNER} />
                            </View>
                        );
                    } catch (e) {
                        return null;
                    }
                })()}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    bgImage: { ...StyleSheet.absoluteFill as any },
    overlay: {
        ...StyleSheet.absoluteFill as any,
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    content: {
        alignItems: 'center',
        paddingTop: 56,
        paddingBottom: 40,
        paddingHorizontal: 20,
    },
    centered: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
    errorText: { color: C.error, fontSize: 16 },

    // Avatar (sits above card)
    avatarWrapper: {
        width: 110, height: 110, borderRadius: 55,
        borderWidth: 3, borderColor: C.gold,
        overflow: 'hidden', marginBottom: 6,
        zIndex: 2,
    },
    avatar: { width: '100%', height: '100%' },
    avatarPlaceholder: {
        width: '100%', height: '100%',
        backgroundColor: C.surface,
        justifyContent: 'center', alignItems: 'center',
    },
    avatarInitial: { color: C.gold, fontSize: 40, fontWeight: '800' },
    cameraOverlay: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 32, backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center', alignItems: 'center',
    },
    cameraIcon: { fontSize: 16 },
    editAvatarHint: { color: '#ccc', fontSize: 11, marginBottom: 16 },

    // Card
    card: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: 'rgba(10,10,10,0.88)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: C.goldDark,
        paddingVertical: 24,
        paddingHorizontal: 24,
        alignItems: 'center',
        shadowColor: C.gold,
        shadowOpacity: 0.15,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
    },

    coinsBadge: {
        backgroundColor: 'rgba(255,215,0,0.1)',
        borderRadius: 20,
        paddingHorizontal: 20, paddingVertical: 8,
        borderWidth: 1, borderColor: C.goldDark,
        marginBottom: 16,
    },
    coinsText: { color: C.gold, fontSize: 18, fontWeight: '800' },

    divider: {
        width: '100%', height: 1,
        backgroundColor: C.border,
        marginVertical: 16,
    },

    username: { color: C.text, fontSize: 24, fontWeight: '800', marginBottom: 8 },
    bio: { color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 20 },

    input: {
        width: '100%',
        backgroundColor: C.surface,
        color: C.text, borderRadius: 12,
        paddingHorizontal: 16, paddingVertical: 12,
        fontSize: 16, borderWidth: 1,
        borderColor: C.border, marginBottom: 12,
    },
    bioInput: { height: 80, textAlignVertical: 'top' },

    row: { flexDirection: 'row', gap: 12, marginTop: 4, width: '100%' },
    btn: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center' },
    editBtn: {
        width: '100%',
        backgroundColor: 'rgba(255,215,0,0.1)',
        borderWidth: 1, borderColor: C.gold,
    },
    editText: { color: C.gold, fontWeight: '700', fontSize: 15 },
    saveBtn: { backgroundColor: C.gold, flex: 1 },
    saveText: { color: C.bg, fontWeight: '800', fontSize: 15 },
    cancelBtn: { backgroundColor: C.surface, flex: 1, borderWidth: 1, borderColor: C.border },
    cancelText: { color: C.muted, fontWeight: '700', fontSize: 15 },

    updateRow: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 12,
        backgroundColor: 'transparent',
    },
    updateText: { color: C.text, fontSize: 16, fontWeight: '700' },
    updateAction: { color: C.gold, fontSize: 14, fontWeight: '700' },

    signOutBtn: { marginTop: 20 },
    signOutText: { color: C.error, fontSize: 14, fontWeight: '600' },
    bannerWrapper: {
        marginTop: 18,
        alignItems: 'center',
        width: '100%',
    },
});
