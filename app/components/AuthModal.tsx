import React, { createContext, useContext, useState } from 'react';
import { View, Text, Modal, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { C } from '../../constants/colors';
import { supabase } from '../../lib/supabase';

type Options = {
    onSuccess?: () => void;
};

const AuthModalContext = createContext<{
    show: (opts?: Options) => void;
    hide: () => void;
} | null>(null);

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [opts, setOpts] = useState<Options | undefined>(undefined);

    const show = (o?: Options) => { setOpts(o); setVisible(true); };
    const hide = () => { setVisible(false); setEmail(''); setPassword(''); setLoading(false); };

    const submit = async () => {
        setLoading(true);
        try {
            if (isSignUp) {
                const { data, error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                // create profile on sign up handled by email confirm or elsewhere
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            }
            hide();
            opts?.onSuccess?.();
        } catch (e: any) {
            Alert.alert('Auth error', e?.message || 'Could not authenticate');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthModalContext.Provider value={{ show, hide }}>
            {children}
            <Modal visible={visible} transparent animationType="fade">
                <View style={styles.backdrop}>
                    <View style={styles.card}>
                        <Text style={styles.title}>{isSignUp ? 'Sign Up' : 'Login'}</Text>
                        <TextInput placeholder="Email" placeholderTextColor="#999" style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                        <TextInput placeholder="Password" placeholderTextColor="#999" style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />

                        <TouchableOpacity style={[styles.btn, { backgroundColor: C.gold }]} onPress={submit} disabled={loading}>
                            {loading ? <ActivityIndicator color={C.bg} /> : <Text style={styles.btnText}>{isSignUp ? 'Sign Up' : 'Login'}</Text>}
                        </TouchableOpacity>

                        <View style={{ flexDirection: 'row', marginTop: 10, justifyContent: 'space-between' }}>
                            <TouchableOpacity onPress={() => setIsSignUp(s => !s)}>
                                <Text style={styles.link}>{isSignUp ? 'Have an account? Login' : "Don't have an account? Sign Up"}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={hide}><Text style={styles.link}>Cancel</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </AuthModalContext.Provider>
    );
}

export function useAuthModal() {
    const ctx = useContext(AuthModalContext);
    if (!ctx) throw new Error('useAuthModal must be used inside AuthModalProvider');
    return ctx;
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    card: { width: '90%', maxWidth: 420, backgroundColor: '#0a0a0a', padding: 18, borderRadius: 12, borderWidth: 1, borderColor: C.border },
    title: { color: C.gold, fontSize: 18, fontWeight: '800', marginBottom: 12 },
    input: { backgroundColor: '#111', color: C.text, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: C.border, marginBottom: 8 },
    btn: { paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
    btnText: { color: C.bg, fontWeight: '800' },
    link: { color: C.muted, fontSize: 13 },
});

export default AuthModalProvider;
