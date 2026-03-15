import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { View, ActivityIndicator } from 'react-native';

export default function RootLayout() {
  const segments = useSegments();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    // 1. Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsReady(true);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      // Not logged in, redirect to login
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      // Logged in, fetch role and redirect
      fetchRoleAndRedirect(session.user.id);
    }
  }, [session, segments, isReady]);

  async function fetchRoleAndRedirect(userId: string) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profile?.role) {
      const role = profile.role;
      switch (role) {
        case 'fournisseur':   router.replace('/(tabs)/fournisseur');   break;
        case 'gestionnaire':  router.replace('/(tabs)/gestionnaire');  break;
        case 'agriculteur':   router.replace('/(tabs)/agriculteur');   break;
        case 'chauffeur':     router.replace('/(tabs)/chauffeur');     break;
        default:              router.replace('/(tabs)/fournisseur');   break;
      }
    } else {
      // If no profile, stay on login or handle error
      console.log('No profile found for user');
    }
  }

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#faf6f0' }}>
        <ActivityIndicator size="large" color="#3a6b35" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)/login" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
