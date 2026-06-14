import { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, KeyboardAvoidingView, Platform,
    ActivityIndicator, Alert
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { C } from '../../constants/colors';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);

    async function handleAuth() {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }
        if (isSignUp && !username) {
            Alert.alert('Error', 'Please enter a username');
            return;
        }
        setLoading(true);

        if (isSignUp) {
            const { data, error } = await supabase.auth.signUp({ email, password });
            if (error) {
                Alert.alert('Error', error.message);
            } else if (data.user) {
                await supabase.from('profiles').insert({
                    id: data.user.id,
                    username,
                    email,
                    coins: 100,
                    xp: 0,
                    level: 1,
                });
            }
        } else {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) Alert.alert('Error', error.message);
        }

        setLoading(false);
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.inner}>
                <Text style={styles.title}>AdinkraMatch</Text>
                <Text style={styles.subtitle}>Match. Battle. Conquer.</Text>

                {isSignUp && (
                    <TextInput
                        style={styles.input}
                        placeholder="Username"
                        placeholderTextColor={C.muted}
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                    />
                )}

                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor={C.muted}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />
                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor={C.muted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />

                <TouchableOpacity style={styles.btn} onPress={handleAuth} disabled={loading}>
                    {loading
                        ? <ActivityIndicator color={C.bg} />
                        : <Text style={styles.btnText}>{isSignUp ? 'Sign Up' : 'Login'}</Text>
                    }
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
                    <Text style={styles.toggle}>
                        {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
                    </Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    inner: { flex: 1, justifyContent: 'center', padding: 24 },
    title: { fontSize: 36, fontWeight: '900', color: C.gold, textAlign: 'center', marginBottom: 8 },
    subtitle: { fontSize: 14, color: C.muted, textAlign: 'center', marginBottom: 40 },
    input: {
        backgroundColor: C.surface, color: C.text, borderRadius: 12,
        padding: 14, marginBottom: 14, fontSize: 15, borderWidth: 1, borderColor: C.border
    },
    btn: {
        backgroundColor: C.gold, borderRadius: 12,
        padding: 16, alignItems: 'center', marginBottom: 16
    },
    btnText: { color: C.bg, fontWeight: '800', fontSize: 16 },
    toggle: { color: C.muted, textAlign: 'center', fontSize: 13 },
});