import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, SafeAreaView, StatusBar, RefreshControl, Modal,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';

// ── Types ──────────────────────────────────────────────────────
type Statut = 'en_attente' | 'planifie' | 'collecte' | 'traitement' | 'livre' | 'annule';

interface Commande {
  id: string;
  type_produit: string;
  quantite: number;
  unite: string;
  statut: Statut;
  date_commande: string;
  adresse_livraison: string;
  notes?: string;
}

const STATUT_CONFIG: Record<Statut, { label: string; color: string; bg: string; emoji: string }> = {
  en_attente: { label: 'En attente',    color: '#c47d00', bg: '#fff3e0', emoji: '⏳' },
  planifie:   { label: 'Planifié',      color: '#1565c0', bg: '#e3f2fd', emoji: '📅' },
  collecte:   { label: 'En cours',      color: '#1565c0', bg: '#e3f2fd', emoji: '🚚' },
  traitement: { label: 'Préparation',   color: '#6a1b9a', bg: '#f3e5f5', emoji: '⚙️' },
  livre:      { label: 'Livré',         color: '#2e7d32', bg: '#e8f5e9', emoji: '✅' },
  annule:     { label: 'Annulé',        color: '#c62828', bg: '#ffebee', emoji: '❌' },
};

const PRODUITS = [
  '🌱 Fertilisant Organique (Compost)',
  '💧 Digestat Liquide',
  '🪱 Lombricompost',
];

export default function AgriculteurDashboard() {
  const [profile,    setProfile]    = useState<{ nom: string } | null>(null);
  const [commandes,  setCommandes]  = useState<Commande[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal,  setShowModal]  = useState(false);

  // Formulaire
  const [typeProduit, setTypeProduit] = useState('');
  const [quantite,    setQuantite]    = useState('');
  const [adresse,     setAdresse]     = useState('');
  const [notes,       setNotes]       = useState('');
  const [formError,   setFormError]   = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [showTypes,   setShowTypes]   = useState(false);

  // Animations
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
    Animated.stagger(160, [
      Animated.timing(anim1, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(anim2, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/(auth)/login'); return; }

    const { data: prof } = await supabase.from('profiles').select('nom').eq('id', user.id).single();
    if (prof) setProfile(prof);

    const { data: com } = await supabase
      .from('commandes').select('*')
      .eq('agriculteur_id', user.id)
      .order('date_commande', { ascending: false });

    if (com) setCommandes(com);
    setLoading(false);
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  async function handleCommander() {
    setFormError('');
    if (!typeProduit)                            { setFormError('Sélectionnez un produit.'); return; }
    if (!quantite || Number(quantite) <= 0)      { setFormError('Entrez une quantité valide.'); return; }
    if (!adresse.trim())                         { setFormError('Entrez l\'adresse de livraison.'); return; }

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('commandes').insert({
      agriculteur_id:    user!.id,
      type_produit:      typeProduit.replace(/^\S+\s/, ''),
      quantite:          Number(quantite),
      unite:             'kg',
      adresse_livraison: adresse.trim(),
      notes:             notes.trim() || null,
      statut:            'en_attente',
    });
    setSubmitting(false);
    if (error) { setFormError('Erreur: ' + error.message); return; }

    setTypeProduit(''); setQuantite(''); setAdresse(''); setNotes('');
    setShowModal(false);
    loadData();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  }

  const fs = (a: Animated.Value) => ({
    opacity: a,
    transform: [{ translateY: a.interpolate({ inputRange: [0,1], outputRange: [20,0] }) }],
  });

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={GD} />
      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GM} />}
      >
        <Animated.View style={[s.header, fs(anim1)]}>
          <View>
            <Text style={s.hHello}>Bonjour 👋</Text>
            <Text style={s.hName}>{profile?.nom || 'Agriculteur'}</Text>
            <View style={s.roleBadge}><Text style={s.roleText}>🌾 Agriculteur</Text></View>
          </View>
          <TouchableOpacity onPress={handleLogout} style={s.logoutBtn}>
            <Text style={s.logoutIcon}>↩</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={[s.body, fs(anim2)]}>
          <View style={s.mainCard}>
            <View style={{ flex: 1 }}>
              <Text style={s.mainLabel}>Solutions Organiques</Text>
              <Text style={s.mainTitle}>Boostez vos récoltes naturellement</Text>
              <TouchableOpacity style={s.orderBtn} onPress={() => setShowModal(true)}>
                <Text style={s.orderBtnTxt}>Commander de l&apos;engrais →</Text>
              </TouchableOpacity>
            </View>
            <Text style={s.mainEmoji}>🌱</Text>
          </View>

          <Text style={s.secTitle}>Mes Commandes</Text>

          {loading ? (
            <ActivityIndicator color={GD} style={{ marginTop: 40 }} />
          ) : commandes.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>📦</Text>
              <Text style={s.emptyTitle}>Aucune commande</Text>
              <Text style={s.emptySub}>Vos commandes d&apos;engrais organique apparaîtront ici.</Text>
            </View>
          ) : (
            commandes.map(c => {
              const sc = STATUT_CONFIG[c.statut] || STATUT_CONFIG.en_attente;
              return (
                <View key={c.id} style={s.card}>
                  <View style={s.cardTop}>
                    <View style={[s.statBadge, { backgroundColor: sc.bg }]}>
                      <Text style={[s.statTxt, { color: sc.color }]}>{sc.emoji} {sc.label}</Text>
                    </View>
                    <Text style={s.cardDate}>{new Date(c.date_commande).toLocaleDateString('fr-FR')}</Text>
                  </View>
                  <Text style={s.cardType}>{c.type_produit}</Text>
                  <Text style={s.cardKg}>{c.quantite} {c.unite}</Text>
                  <Text style={s.cardAddr}>📍 {c.adresse_livraison}</Text>
                </View>
              );
            })
          )}
        </Animated.View>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal Commander */}
      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={s.modalBg} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={s.modalTitle}>🌱 Nouvelle Commande</Text>
              <Text style={s.modalSub}>Engrais organique et fertilisants</Text>

              <Text style={s.lbl}>Produit *</Text>
              <TouchableOpacity style={[s.input, s.selectRow]} onPress={() => setShowTypes(!showTypes)}>
                <Text style={typeProduit ? s.selectVal : s.selectPh}>{typeProduit || 'Sélectionner...'}</Text>
                <Text style={{ color: MUTED }}>{showTypes ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showTypes && (
                <View style={s.typeList}>
                  {PRODUITS.map(t => (
                    <TouchableOpacity key={t} style={[s.typeOpt, typeProduit === t && s.typeOptOn]}
                      onPress={() => { setTypeProduit(t); setShowTypes(false); setFormError(''); }}>
                      <Text style={[s.typeOptTxt, typeProduit === t && s.typeOptTxtOn]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={s.lbl}>Quantité souhaitée (kg) *</Text>
              <TextInput style={s.input} placeholder="Ex : 1000" placeholderTextColor="#a89880"
                keyboardType="numeric" value={quantite} onChangeText={t => { setQuantite(t); setFormError(''); }} />

              <Text style={s.lbl}>Adresse de livraison *</Text>
              <TextInput style={s.input} placeholder="Adresse de votre ferme"
                placeholderTextColor="#a89880" value={adresse} onChangeText={t => { setAdresse(t); setFormError(''); }} />

              <Text style={s.lbl}>Notes (optionnel)</Text>
              <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Instructions pour la livraison..." placeholderTextColor="#a89880"
                multiline value={notes} onChangeText={setNotes} />

              {formError !== '' && <Text style={s.err}>{formError}</Text>}

              <View style={s.mBtns}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => { setShowModal(false); setFormError(''); }}>
                  <Text style={s.cancelTxt}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.submitBtn, submitting && { opacity: 0.7 }]}
                  onPress={handleCommander} disabled={submitting}>
                  {submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.submitTxt}>Commander →</Text>}
                </TouchableOpacity>
              </View>
              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const GD = '#3a6b35'; const GM = '#5a8f4e';
const BROWN = '#5c3d1e'; const CREAM = '#faf6f0';
const SAND = '#e8dcc8'; const MUTED = '#8a7560';

const s = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: GD },
  scroll:{ flex: 1, backgroundColor: '#f5f0e8' },
  header:{ backgroundColor: GD, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  hHello:{ color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  hName: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 2 },
  roleBadge: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4, marginTop: 6, alignSelf: 'flex-start' },
  roleText:  { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '600' },
  logoutBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  logoutIcon:{ color: '#fff', fontSize: 18 },
  body: { padding: 16 },
  mainCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 24, shadowColor: '#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.08, shadowRadius:12, elevation:5 },
  mainLabel: { fontSize: 11, color: GD, fontWeight: '700', textTransform: 'uppercase' },
  mainTitle: { fontSize: 18, fontWeight: '800', color: BROWN, marginVertical: 8 },
  orderBtn: { backgroundColor: GD, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 50, alignSelf: 'flex-start' },
  orderBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  mainEmoji: { fontSize: 48, opacity: 0.2 },
  secTitle: { fontSize: 18, fontWeight: '800', color: BROWN, marginBottom: 16 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.06, shadowRadius:8, elevation:3 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  statBadge: { borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4 },
  statTxt: { fontSize: 11, fontWeight: '700' },
  cardDate: { fontSize: 11, color: MUTED },
  cardType: { fontSize: 15, fontWeight: '700', color: BROWN, marginBottom: 4 },
  cardKg: { fontSize: 16, fontWeight: '800', color: GD, marginBottom: 6 },
  cardAddr: { fontSize: 12, color: MUTED },
  empty: { alignItems: 'center', marginTop: 40, paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: BROWN, marginBottom: 8 },
  emptySub: { fontSize: 14, color: MUTED, textAlign: 'center' },
  modalBg: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: CREAM, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '92%' },
  modalHandle:{ width: 40, height: 4, backgroundColor: SAND, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: BROWN, marginBottom: 4 },
  modalSub:   { fontSize: 13, color: MUTED, marginBottom: 20 },
  lbl:        { fontSize: 12, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input:      { backgroundColor: '#fff', borderWidth: 1.5, borderColor: SAND, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: BROWN, marginBottom: 14 },
  selectRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectVal:  { color: BROWN, fontSize: 15 },
  selectPh:   { color: '#a89880', fontSize: 15 },
  typeList:   { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: SAND, marginBottom: 14, overflow: 'hidden' },
  typeOpt:    { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0e8da' },
  typeOptOn:  { backgroundColor: '#e8f0e5' },
  typeOptTxt: { fontSize: 14, color: BROWN },
  typeOptTxtOn:{ fontWeight: '700', color: GD },
  err:        { color: '#c0392b', fontSize: 12, marginBottom: 10, textAlign: 'center' },
  mBtns:      { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn:  { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#ede8df', alignItems: 'center' },
  cancelTxt:  { color: MUTED, fontWeight: '700', fontSize: 14 },
  submitBtn:  { flex: 2, padding: 14, borderRadius: 12, backgroundColor: GD, alignItems: 'center' },
  submitTxt:  { color: '#fff', fontWeight: '700', fontSize: 14 },
});
