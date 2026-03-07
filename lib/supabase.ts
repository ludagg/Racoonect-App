import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = 'https://nqfxvigjkccxfbvgrmfs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xZnh2aWdqa2NjeGZidmdybWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MjcyMTksImV4cCI6MjA4ODQwMzIxOX0.wV-mdcifrB4NWgnVyG436lPFLcLagKTAr-nu6XRuULk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? (typeof window !== 'undefined' ? window.localStorage : undefined) : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
