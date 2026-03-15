import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const SUPABASE_URL  = 'https://jlwpqyzjxpapzkodmofc.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impsd3BxeXpqeHBhcHprb2Rtb2ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NjczMDcsImV4cCI6MjA4OTE0MzMwN30.5Fr2xBgjDFvOrh8p37brvNKa_FfkNup_ihIVC7Zv0R0';

// Check if we're in a browser environment (not SSR)
const isBrowser = Platform.OS === 'web' && typeof window !== 'undefined' && typeof localStorage !== 'undefined';

// Use localStorage on web (when not in SSR) to avoid errors during export
// Use expo-secure-store on native platforms
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    if (isBrowser) {
      return Promise.resolve(localStorage.getItem(key));
    }
    if (Platform.OS === 'web') {
      // SSR or localStorage not available
      return Promise.resolve(null);
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    if (isBrowser) {
      localStorage.setItem(key, value);
      return Promise.resolve();
    }
    if (Platform.OS === 'web') {
      // SSR or localStorage not available
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    if (isBrowser) {
      localStorage.removeItem(key);
      return Promise.resolve();
    }
    if (Platform.OS === 'web') {
      // SSR or localStorage not available
      return Promise.resolve();
    }
    return SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});