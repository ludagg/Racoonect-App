import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Image,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

// ── 8 icônes de l'app, 4 visibles à la fois ───────────────────
const APP_ICONS = [
  { emoji: '🗑️' }, { emoji: '♻️' }, { emoji: '🌱' }, { emoji: '🚚' },
  { emoji: '📍' }, { emoji: '📊' }, { emoji: '💬' }, { emoji: '⚡' },
];
const RING_RADIUS   = 68;
const VISIBLE_COUNT = 4;

// ── Vues possibles ─────────────────────────────────────────────
type View_ = 'main' | 'phone_step1' | 'phone_step2' | 'signup';

export default function LoginScreen() {

  const [currentView, setCurrentView] = useState<View_>('main');
  const [phone,       setPhone]        = useState('');
  const [otp,         setOtp]          = useState('');
  const [name,        setName]         = useState('');
  const [email,       setEmail]        = useState('');
  const [error,       setError]        = useState('');
  const [loading,     setLoading]      = useState(false);
  const [iconOffset,  setIconOffset]   = useState(0);

  // Animations d'entrée
  const logoAnim     = useRef(new Animated.Value(0)).current;
  const titleAnim    = useRef(new Animated.Value(0)).current;
  const subtitleAnim = useRef(new Animated.Value(0)).current;
  const btn1Anim     = useRef(new Animated.Value(0)).current;
  const btn2Anim     = useRef(new Animated.Value(0)).current;
  const linkAnim     = useRef(new Animated.Value(0)).current;
  const ringRotate   = useRef(new Animated.Value(0)).current;
  const ringRotate2  = useRef(new Animated.Value(0)).current;
  const iconFade     = useRef(new Animated.Value(1)).current;
  const formAnim     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrée en cascade
    Animated.stagger(120, [
      Animated.timing(logoAnim,     { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(titleAnim,    { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(subtitleAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(btn1Anim,     { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(btn2Anim,     { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(linkAnim,     { toValue: 1, duration: 700, useNativeDriver: true }),
    ]).start();

    // Anneaux
    Animated.loop(Animated.timing(ringRotate,  { toValue: 1, duration: 22000, useNativeDriver: true })).start();
    Animated.loop(Animated.timing(ringRotate2, { toValue: 1, duration: 15000, useNativeDriver: true })).start();

    // Carousel icônes
    const interval = setInterval(() => {
      Animated.timing(iconFade, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setIconOffset(p => (p + 1) % APP_ICONS.length);
        Animated.timing(iconFade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  // Animer l'entrée du formulaire quand on change de vue
  useEffect(() => {
    if (currentView !== 'main') {
      formAnim.setValue(0);
      Animated.timing(formAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [currentView]);

  const spin1 = ringRotate.interpolate({ inputRange: [0,1], outputRange: ['0deg','360deg'] });
  const spin2 = ringRotate2.interpolate({ inputRange: [0,1], outputRange: ['0deg','-360deg'] });

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

  // ── Logique login ──────────────────────────────────────────
  async function handlePhoneNext() {
    setError('');
    if (phone.trim() === '') { setError('Entrez votre numéro de téléphone.'); return; }

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      phone: phone.trim(),
    });
    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setCurrentView('phone_step2');
    }
  }

  async function handleOtpConfirm() {
    setError('');
    if (otp.trim() === '') { setError('Entrez le code OTP.'); return; }

    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      phone: phone.trim(),
      token: otp.trim(),
      type: 'sms',
    });
    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      router.replace('/(tabs)');
    }
  }

  async function handleSignupSubmit() {
    setError('');
    if (!name.trim() || !email.trim() || !phone.trim()) { setError('Remplissez tous les champs.'); return; }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password: Math.random().toString(36).slice(-10), // Mot de passe aléatoire car on utilise le téléphone principalement
      options: {
        data: {
          full_name: name.trim(),
          phone: phone.trim(),
        }
      }
    });
    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setError('Inscription réussie ! Vous pouvez maintenant vous connecter.');
      setCurrentView('main');
    }
  }

  function goBack() {
    setError('');
    setPhone('');
    setOtp('');
    setName('');
    setEmail('');
    setCurrentView('main');
  }

  // ── RENDER ─────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ══ LOGO ══════════════════════════════════════════ */}
          <Animated.View style={[styles.logoWrap, fadeSlide(logoAnim)]}>
            <Animated.View style={[styles.ringOuter, { transform: [{ rotate: spin1 }] }]} />
            <Animated.View style={[styles.ringInner, { transform: [{ rotate: spin2 }] }]} />

            {visibleIcons.map((icon, i) => (
              <Animated.View
                key={i}
                style={[styles.floatIcon, {
                  opacity: iconFade,
                  transform: [{ translateX: icon.pos.x }, { translateY: icon.pos.y }],
                }]}
              >
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

          {/* ══ TITRE ═════════════════════════════════════════ */}
          <Animated.Text style={[styles.title, fadeSlide(titleAnim)]}>
            RACOONECT
          </Animated.Text>
          <Animated.Text style={[styles.subtitle, fadeSlide(subtitleAnim)]}>
            Donnez une seconde vie à vos déchets
          </Animated.Text>

          {/* ══ VUE PRINCIPALE ════════════════════════════════ */}
          {currentView === 'main' && (
            <>
              <Animated.View style={[styles.btnWrap, fadeSlide(btn1Anim)]}>
                <TouchableOpacity
                  style={styles.btnPrimary}
                  onPress={() => { setError(''); setCurrentView('phone_step1'); }}
                  activeOpacity={0.85}
                >
                  <View style={styles.btnIconWrap}>
                    <Text style={styles.btnIconText}>📱</Text>
                  </View>
                  <Text style={styles.btnLabelPrimary}>Login with Phone</Text>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View style={[styles.btnWrap, fadeSlide(btn2Anim)]}>
                <TouchableOpacity
                  style={styles.btnSecondary}
                  onPress={() => setError('Google login : connecté à Supabase prochainement.')}
                  activeOpacity={0.85}
                >
                  <View style={styles.btnIconWrapGray}>
                    <Text style={styles.gLetter}>G</Text>
                  </View>
                  <Text style={styles.btnLabelSecondary}>Login with Google</Text>
                </TouchableOpacity>
              </Animated.View>

              {error !== '' && <Text style={styles.errorText}>{error}</Text>}

              <Animated.View style={fadeSlide(linkAnim)}>
                <Text style={styles.signupText}>
                  Don&apos;t have an account?{' '}
                  <Text style={styles.signupLink} onPress={() => { setError(''); setCurrentView('signup'); }}>
                    Sign Up
                  </Text>
                </Text>
              </Animated.View>
            </>
          )}

          {/* ══ VUE : ENTRER LE NUMÉRO ════════════════════════ */}
          {currentView === 'phone_step1' && (
            <Animated.View style={[styles.formCard, fadeSlide(formAnim)]}>
              <Text style={styles.formTitle}>📱 Votre numéro</Text>
              <Text style={styles.formSub}>Nous enverrons un code SMS de vérification</Text>

              <TextInput
                style={styles.input}
                placeholder="Ex : +33600000000"
                placeholderTextColor="#aaa"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={t => { setPhone(t); setError(''); }}
                autoFocus
              />

              {error !== '' && <Text style={styles.errorText}>{error}</Text>}

              <TouchableOpacity
                style={[styles.btnPrimary, loading && { opacity: 0.7 }]}
                onPress={handlePhoneNext}
                activeOpacity={0.85}
                disabled={loading}
              >
                <Text style={styles.btnLabelCenter}>{loading ? 'Envoi en cours...' : 'Envoyer le code →'}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={goBack} style={styles.backBtn}>
                <Text style={styles.backText}>← Retour</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* ══ VUE : ENTRER LE CODE OTP ══════════════════════ */}
          {currentView === 'phone_step2' && (
            <Animated.View style={[styles.formCard, fadeSlide(formAnim)]}>
              <Text style={styles.formTitle}>🔐 Code OTP</Text>
              <Text style={styles.formSub}>Code envoyé au {phone}</Text>

              <TextInput
                style={[styles.input, styles.inputOtp]}
                placeholder="- - - -"
                placeholderTextColor="#aaa"
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={t => { setOtp(t); setError(''); }}
                autoFocus
              />

              {error !== '' && <Text style={styles.errorText}>{error}</Text>}

              <TouchableOpacity
                style={[styles.btnPrimary, loading && { opacity: 0.7 }]}
                onPress={handleOtpConfirm}
                activeOpacity={0.85}
                disabled={loading}
              >
                <Text style={styles.btnLabelCenter}>{loading ? 'Vérification...' : 'Confirmer →'}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setCurrentView('phone_step1')} style={styles.backBtn}>
                <Text style={styles.backText}>← Changer de numéro</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* ══ VUE : INSCRIPTION ═════════════════════════════ */}
          {currentView === 'signup' && (
            <Animated.View style={[styles.formCard, fadeSlide(formAnim)]}>
              <Text style={styles.formTitle}>✨ Créer un compte</Text>
              <Text style={styles.formSub}>Rejoignez RACOONECT</Text>

              <TextInput
                style={styles.input}
                placeholder="Votre nom complet"
                placeholderTextColor="#aaa"
                value={name}
                onChangeText={t => { setName(t); setError(''); }}
                autoFocus
              />
              <TextInput
                style={styles.input}
                placeholder="Votre email"
                placeholderTextColor="#aaa"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={t => { setEmail(t); setError(''); }}
              />
              <TextInput
                style={styles.input}
                placeholder="Votre téléphone (Ex : +33600000000)"
                placeholderTextColor="#aaa"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={t => { setPhone(t); setError(''); }}
              />

              {error !== '' && <Text style={styles.errorText}>{error}</Text>}

              <TouchableOpacity
                style={[styles.btnPrimary, loading && { opacity: 0.7 }]}
                onPress={handleSignupSubmit}
                activeOpacity={0.85}
                disabled={loading}
              >
                <Text style={styles.btnLabelCenter}>{loading ? 'Inscription...' : 'Créer mon compte →'}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={goBack} style={styles.backBtn}>
                <Text style={styles.backText}>← Retour au login</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── STYLES ────────────────────────────────────────────────────
const TEAL      = '#2d7a6e';
const TEAL_DARK = '#1a4f47';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
  },

  // Logo
  logoWrap: {
    width: 160, height: 160,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 28,
  },
  ringOuter: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    borderWidth: 1.5, borderColor: '#9ecec5', borderStyle: 'dashed',
  },
  ringInner: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    borderWidth: 1.5, borderColor: '#bdddd8', borderStyle: 'dashed',
  },
  floatIcon: {
    position: 'absolute', width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ddeee9',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: TEAL, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 6, elevation: 4,
  },
  floatEmoji: { fontSize: 16 },
  logoCenter: {
    width: 82, height: 82, borderRadius: 41,
    backgroundColor: TEAL, overflow: 'hidden',
    shadowColor: TEAL, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 12,
  },
  logoImage: { width: '100%', height: '100%' },

  // Textes
  title: {
    fontWeight: '800', fontSize: 26, letterSpacing: 4,
    color: TEAL_DARK, marginBottom: 6,
  },
  subtitle: {
    fontSize: 13, color: '#6b8f89', textAlign: 'center',
    marginBottom: 36, lineHeight: 20,
  },

  // Boutons principaux
  btnWrap: { width: '100%', marginBottom: 12 },
  btnPrimary: {
    backgroundColor: TEAL, height: 52, borderRadius: 50,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6,
    shadowColor: TEAL, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
    width: '100%',
  },
  btnSecondary: {
    backgroundColor: '#f3f3f3', height: 52, borderRadius: 50,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6,
  },
  btnIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  btnIconWrapGray: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
  },
  btnIconText:       { fontSize: 18 },
  gLetter:           { fontSize: 17, fontWeight: '800', color: '#EA4335' },
  btnLabelPrimary:   { flex: 1, textAlign: 'center', color: '#fff',     fontWeight: '700', fontSize: 15, marginRight: 40 },
  btnLabelSecondary: { flex: 1, textAlign: 'center', color: '#1a2e2b',  fontWeight: '700', fontSize: 15, marginRight: 40 },
  btnLabelCenter:    { flex: 1, textAlign: 'center', color: '#fff',     fontWeight: '700', fontSize: 15 },

  // Sign up
  signupText: { fontSize: 12, color: '#6b8f89', marginTop: 8 },
  signupLink: { color: TEAL, fontWeight: '700' },

  // Erreur
  errorText: {
    color: '#e05252', fontSize: 12, marginBottom: 10,
    textAlign: 'center', fontWeight: '500',
  },

  // Formulaire
  formCard: {
    width: '100%',
    backgroundColor: '#f7faf9',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#d8eee8',
  },
  formTitle: {
    fontSize: 18, fontWeight: '800', color: TEAL_DARK, marginBottom: 4,
  },
  formSub: {
    fontSize: 12, color: '#6b8f89', marginBottom: 20,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#c8e0da',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: '#1a2e2b',
    marginBottom: 12,
  },
  inputOtp: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 12,
    color: TEAL_DARK,
  },
  backBtn: { marginTop: 14, alignItems: 'center' },
  backText: { fontSize: 13, color: '#6b8f89', fontWeight: '600' },
});
