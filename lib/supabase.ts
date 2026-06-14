import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';

const supabaseUrl = 'https://ojfinuvtodnscuzohlpm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qZmludXZ0b2Ruc2N1em9obHBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNzA5NDgsImV4cCI6MjA5MTc0Njk0OH0.srSIyGC7PERy02DNHdhJ6wzHvLb3pvzXdC8Os_kipKc';

// Use React Native AsyncStorage on native platforms; let Supabase use
// browser storage (localStorage) on web to avoid refresh-token issues.
const authOptions: any = {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
};

if (Platform.OS !== 'web') {
    authOptions.storage = AsyncStorage;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: authOptions,
});