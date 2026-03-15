import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, SafeAreaView, Image, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';

const APP_ICONS = [
  { emoji: '🌾' }, { emoji: '🔥' }, { emoji: '⚡' }, { emoji: '🌱' },
  { emoji: '♻️' }, { emoji: '🇲🇦' }, { emoji: '🚜' }, { emoji: '💧' },
];
const RING_RADIUS   = 68;
const VISIBLE_COUNT = 4;

type ViewName = 'main' | 'login_form' | 'signup_form';
type Role = 'agriculteur' | 'fournisseur' | 'gestionnaire' | 'chauffeur';

// ── Redirection selon le rôle ──────────────────────────────────
function redirectByRole(role: Role) {
  switch (role) {
    case 'fournisseur':   router.replace('/(tabs)/fournisseur');   break;
    case 'gestionnaire':  router.replace('/(tabs)/gestionnaire');  break;
    case 'agriculteur':   router.replace('/(tabs)/agriculteur');   break;
    case 'chauffeur':     router.replace('/(tabs)/chauffeur');     break;
    default:              router.replace('/(tabs)/fournisseur');   break;
  }
}

export default function LoginScreen() {
  const [currentView, setCurrentView] = useState<ViewName>('main');
  const [email,       setEmail]        = useState('');
  const [password,    setPassword]     = useState('');
  const [nom,         setNom]          = useState('');
  const [telephone,   setTelephone]    = useState('');
  const [role,        setRole]         = useState<Role>('fournisseur');
  const [error,       setError]        = useState('');
  const [loading,     setLoading]      = useState(false);
  const [iconOffset,  setIconOffset]   = useState(0);

  const logoAnim     = useRef(new Animated.Value(0)).current;
  const titleAnim    = useRef(new Animated.Value(0)).current;
  const subtitleAnim = useRef(new Animated.Value(0)).current;
  const btn1Anim     = useRef(new Animated.Value(0)).current;
  const btn2Anim     = useRef(new Animated.Value(0)).current;
  const ringRotate   = useRef(new Animated.Value(0)).current;
  const ringRotate2  = useRef(new Animated.Value(0)).current;
  const iconFade     = useRef(new Animated.Value(1)).current;
  const formAnim     = useRef(new Animated.Value(0)).current;

  // ── Vérifier session existante au lancement ────────────────
  useEffect(() => {
    checkExistingSession();
  }, []);

  async function checkExistingSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await fetchRoleAndRedirect(session.user.id);
    }
  }

  async function fetchRoleAndRedirect(userId: string) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    if (profile?.role) {
      redirectByRole(profile.role as Role);
    } else {
      // Pas de profil → rester sur login
      console.log('Aucun profil trouvé pour cet utilisateur');
    }
  }

  useEffect(() => {
    Animated.stagger(120, [
      Animated.timing(logoAnim,     { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(titleAnim,    { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(subtitleAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(btn1Anim,     { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(btn2Anim,     { toValue: 1, duration: 700, useNativeDriver: true }),
    ]).start();

    Animated.loop(Animated.timing(ringRotate,  { toValue: 1, duration: 22000, useNativeDriver: true })).start();
    Animated.loop(Animated.timing(ringRotate2, { toValue: 1, duration: 15000, useNativeDriver: true })).start();

    const interval = setInterval(() => {
      Animated.timing(iconFade, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setIconOffset(p => (p + 1) % APP_ICONS.length);
        Animated.timing(iconFade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (currentView !== 'main') {
      formAnim.setValue(0);
      Animated.timing(formAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [currentView]);

  const spin1 = ringRotate.interpolate({ inputRange:[0,1], outputRange:['0deg','360deg'] });
  const spin2 = ringRotate2.interpolate({ inputRange:[0,1], outputRange:['0deg','-360deg'] });

  function getPos(index: number) {
    const angle = (index / VISIBLE_COUNT) * 2 * Math.PI - Math.PI / 2;
    return { x: RING_RADIUS * Math.cos(angle), y: RING_RADIUS * Math.sin(angle) };
  }
  const visibleIcons = Array.from({ length: VISIBLE_COUNT }, (_, i) => ({
    ...APP_ICONS[(iconOffset + i) % APP_ICONS.length],
    pos: getPos(i),
  }));

  const fadeSlide = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange:[0,1], outputRange:[20,0] }) }],
  });

  // ── LOGIN ──────────────────────────────────────────────────
  async function handleLogin() {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Remplissez email et mot de passe.');
      return;
    }
    setLoading(true);
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });
      if (err) { setError('Email ou mot de passe incorrect.'); return; }
      if (data.user) await fetchRoleAndRedirect(data.user.id);
    } catch (e) {
      setError('Erreur de connexion.');
    } finally {
      setLoading(false);
    }
  }

  // ── INSCRIPTION ────────────────────────────────────────────
  async function handleSignup() {
    setError('');
    if (!nom.trim() || !email.trim() || !password.trim()) {
      setError('Remplissez tous les champs obligatoires.');
      return;
    }
    if (password.length < 6) {
      setError('Mot de passe : minimum 6 caractères.');
      return;
    }
    setLoading(true);
    try {
      const { data, error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: { data: { nom: nom.trim(), role } },
      });
      if (err) { setError(err.message); return; }

      if (data.user) {
        // Créer le profil avec le rôle choisi
        const { error: profileErr } = await supabase.from('profiles').upsert({
          id:        data.user.id,
          nom:       nom.trim(),
          telephone: telephone.trim() || null,
          role,
        });
        if (profileErr) { setError('Compte créé mais profil introuvable: ' + profileErr.message); return; }
        await fetchRoleAndRedirect(data.user.id);
      }
    } catch (e) {
      setError("Erreur lors de l'inscription.");
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    setError(''); setEmail(''); setPassword('');
    setNom(''); setTelephone('');
    setCurrentView('main');
  }

  const ROLES: { key: Role; label: string; emoji: string }[] = [
    { key: 'fournisseur',  label: 'Fournisseur',  emoji: '🚜' },
    { key: 'agriculteur',  label: 'Agriculteur',  emoji: '🌾' },
    { key: 'gestionnaire', label: 'Gestionnaire', emoji: '📊' },
    { key: 'chauffeur',    label: 'Chauffeur',    emoji: '🚚' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ══ LOGO ════════════════════════════════════════ */}
          <Animated.View style={[styles.logoWrap, fadeSlide(logoAnim)]}>
            <Animated.View style={[styles.ringOuter, { transform: [{ rotate: spin1 }] }]} />
            <Animated.View style={[styles.ringInner, { transform: [{ rotate: spin2 }] }]} />
            {visibleIcons.map((icon, i) => (
              <Animated.View key={i} style={[styles.floatIcon, {
                opacity: iconFade,
                transform: [{ translateX: icon.pos.x }, { translateY: icon.pos.y }],
              }]}>
                <Text style={styles.floatEmoji}>{icon.emoji}</Text>
              </Animated.View>
            ))}
            <View style={styles.logoCenter}>
              <Image
                source={require('../../assets/images/racoonLogo.png')}
                style={styles.logoImage}
                resizeMode="cover"
              />
            </View>
          </Animated.View>

          {/* ══ TITRE ═══════════════════════════════════════ */}
          <Animated.Text style={[styles.title, fadeSlide(titleAnim)]}>RACOONECT</Animated.Text>
          <Animated.Text style={[styles.subtitle, fadeSlide(subtitleAnim)]}>
            Des déchets agricoles vers le biogaz et le fertilisant naturel
          </Animated.Text>
          <Animated.View style={[styles.teamBadge, fadeSlide(subtitleAnim)]}>
            <Text style={styles.teamText}>🦝 L&apos;équipe des Racoons · Maroc & Afrique</Text>
          </Animated.View>

          {/* ══ VUE PRINCIPALE ══════════════════════════════ */}
          {currentView === 'main' && (
            <>
              <Animated.View style={[styles.btnWrap, fadeSlide(btn1Anim)]}>
                <TouchableOpacity
                  style={styles.btnPrimary}
                  onPress={() => { setError(''); setCurrentView('login_form'); }}
                  activeOpacity={0.85}
                >
                  <View style={styles.btnIconWrap}><Text style={styles.btnIconText}>🔑</Text></View>
                  <Text style={styles.btnLabelPrimary}>Se connecter</Text>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View style={[styles.btnWrap, fadeSlide(btn2Anim)]}>
                <TouchableOpacity
                  style={styles.btnSecondary}
                  onPress={() => { setError(''); setCurrentView('signup_form'); }}
                  activeOpacity={0.85}
                >
                  <View style={styles.btnIconWrapGray}><Text style={styles.btnIconText}>🌱</Text></View>
                  <Text style={styles.btnLabelSecondary}>Créer un compte</Text>
                </TouchableOpacity>
              </Animated.View>

              {error !== '' && <Text style={styles.errorText}>{error}</Text>}
            </>
          )}

          {/* ══ FORMULAIRE LOGIN ════════════════════════════ */}
          {currentView === 'login_form' && (
            <Animated.View style={[styles.formCard, fadeSlide(formAnim)]}>
              <Text style={styles.formTitle}>🔑 Connexion</Text>
              <Text style={styles.formSub}>Redirigé automatiquement selon votre rôle</Text>

              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#a89880"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={t => { setEmail(t); setError(''); }}
                autoFocus
              />
              <TextInput
                style={styles.input}
                placeholder="Mot de passe"
                placeholderTextColor="#a89880"
                secureTextEntry
                value={password}
                onChangeText={t => { setPassword(t); setError(''); }}
              />

              {error !== '' && <Text style={styles.errorText}>{error}</Text>}

              <TouchableOpacity
                style={[styles.btnPrimary, loading && { opacity: 0.7 }]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#fff" style={{ flex: 1 }} />
                  : <Text style={styles.btnLabelCenter}>Se connecter →</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity onPress={goBack} style={styles.backBtn}>
                <Text style={styles.backText}>← Retour</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* ══ FORMULAIRE INSCRIPTION ══════════════════════ */}
          {currentView === 'signup_form' && (
            <Animated.View style={[styles.formCard, fadeSlide(formAnim)]}>
              <Text style={styles.formTitle}>🌱 Créer un compte</Text>
              <Text style={styles.formSub}>Choisissez votre rôle — vous serez redirigé vers votre espace</Text>

              <Text style={styles.roleLabel}>Je suis :</Text>
              <View style={styles.roleGrid}>
                {ROLES.map(r => (
                  <TouchableOpacity
                    key={r.key}
                    style={[styles.roleBtn, role === r.key && styles.roleBtnActive]}
                    onPress={() => setRole(r.key)}
                  >
                    <Text style={styles.roleEmoji}>{r.emoji}</Text>
                    <Text style={[styles.roleText, role === r.key && styles.roleTextActive]}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.input}
                placeholder="Nom complet *"
                placeholderTextColor="#a89880"
                value={nom}
                onChangeText={t => { setNom(t); setError(''); }}
              />
              <TextInput
                style={styles.input}
                placeholder="Email *"
                placeholderTextColor="#a89880"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={t => { setEmail(t); setError(''); }}
              />
              <TextInput
                style={styles.input}
                placeholder="Mot de passe * (min. 6 caractères)"
                placeholderTextColor="#a89880"
                secureTextEntry
                value={password}
                onChangeText={t => { setPassword(t); setError(''); }}
              />
              <TextInput
                style={styles.input}
                placeholder="Téléphone (optionnel)"
                placeholderTextColor="#a89880"
                keyboardType="phone-pad"
                value={telephone}
                onChangeText={t => { setTelephone(t); }}
              />

              {error !== '' && <Text style={styles.errorText}>{error}</Text>}

              <TouchableOpacity
                style={[styles.btnPrimary, loading && { opacity: 0.7 }]}
                onPress={handleSignup}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#fff" style={{ flex: 1 }} />
                  : <Text style={styles.btnLabelCenter}>Créer mon compte →</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity onPress={goBack} style={styles.backBtn}>
                <Text style={styles.backText}>← Retour</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const BROWN      = '#5c3d1e';
const GREEN_DEEP = '#3a6b35';
const CREAM      = '#faf6f0';
const SAND       = '#e8dcc8';
const MUTED      = '#8a7560';

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: CREAM },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 40, backgroundColor: CREAM },
  logoWrap:  { width: 160, height: 160, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  ringOuter: { position: 'absolute', width: 160, height: 160, borderRadius: 80, borderWidth: 1.5, borderColor: '#b5a080', borderStyle: 'dashed' },
  ringInner: { position: 'absolute', width: 120, height: 120, borderRadius: 60, borderWidth: 1.5, borderColor: '#8fad7a', borderStyle: 'dashed' },
  floatIcon: { position: 'absolute', width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', borderWidth: 1.5, borderColor: SAND, alignItems: 'center', justifyContent: 'center', shadowColor: BROWN, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 },
  floatEmoji:      { fontSize: 16 },
  logoCenter:      { width: 82, height: 82, borderRadius: 41, backgroundColor: GREEN_DEEP, overflow: 'hidden', shadowColor: GREEN_DEEP, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 12 },
  logoImage:       { width: '100%', height: '100%' },
  title:           { fontWeight: '800', fontSize: 26, letterSpacing: 4, color: BROWN, marginBottom: 10 },
  subtitle:        { fontSize: 13, color: MUTED, textAlign: 'center', marginBottom: 10, lineHeight: 20, paddingHorizontal: 8 },
  teamBadge:       { backgroundColor: '#eee4d4', borderRadius: 50, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 32, borderWidth: 1, borderColor: '#d4c4a8' },
  teamText:        { fontSize: 11, color: BROWN, fontWeight: '600' },
  btnWrap:         { width: '100%', marginBottom: 12 },
  btnPrimary:      { backgroundColor: GREEN_DEEP, height: 52, borderRadius: 50, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, shadowColor: GREEN_DEEP, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8, width: '100%' },
  btnSecondary:    { backgroundColor: '#ede8df', height: 52, borderRadius: 50, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, borderWidth: 1, borderColor: SAND },
  btnIconWrap:     { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  btnIconWrapGray: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  btnIconText:       { fontSize: 18 },
  btnLabelPrimary:   { flex: 1, textAlign: 'center', color: '#fff',  fontWeight: '700', fontSize: 15, marginRight: 40 },
  btnLabelSecondary: { flex: 1, textAlign: 'center', color: BROWN,   fontWeight: '700', fontSize: 15, marginRight: 40 },
  btnLabelCenter:    { flex: 1, textAlign: 'center', color: '#fff',  fontWeight: '700', fontSize: 15 },
  errorText:   { color: '#c0392b', fontSize: 12, marginBottom: 10, textAlign: 'center', fontWeight: '500' },
  formCard:    { width: '100%', backgroundColor: '#fff', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: SAND, shadowColor: BROWN, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  formTitle:   { fontSize: 18, fontWeight: '800', color: BROWN, marginBottom: 4 },
  formSub:     { fontSize: 12, color: MUTED, marginBottom: 20 },
  input:       { backgroundColor: CREAM, borderWidth: 1.5, borderColor: SAND, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: BROWN, marginBottom: 12 },
  backBtn:     { marginTop: 14, alignItems: 'center' },
  backText:    { fontSize: 13, color: MUTED, fontWeight: '600' },
  roleLabel:   { fontSize: 12, fontWeight: '700', color: MUTED, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  roleGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  roleBtn:     { flex: 1, minWidth: '45%', backgroundColor: CREAM, borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1.5, borderColor: SAND },
  roleBtnActive:  { backgroundColor: '#e8f0e5', borderColor: GREEN_DEEP },
  roleEmoji:      { fontSize: 22, marginBottom: 4 },
  roleText:       { fontSize: 12, fontWeight: '600', color: MUTED },
  roleTextActive: { color: GREEN_DEEP },
});