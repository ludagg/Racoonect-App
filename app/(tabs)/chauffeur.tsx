import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, SafeAreaView, StatusBar, RefreshControl, Modal,
  ActivityIndicator, Alert, Linking,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';

// ── Types ──────────────────────────────────────────────────────
type Statut = 'en_attente' | 'planifie' | 'collecte' | 'traitement' | 'annule' | 'livre';

interface Mission {
  id: string;
  type: 'collecte' | 'livraison';
  type_item: string;
  quantite: number;
  adresse: string;
  statut: Statut;
  date: string;
  notes?: string;
  contact_nom?: string;
  contact_tel?: string;
}

const STATUT_CONFIG: Record<Statut, { label: string; color: string; bg: string; emoji: string }> = {
  en_attente: { label: 'En attente',    color: '#c47d00', bg: '#fff3e0', emoji: '⏳' },
  planifie:   { label: 'Planifié',      color: '#1565c0', bg: '#e3f2fd', emoji: '📅' },
  collecte:   { label: 'Collecté',      color: '#2e7d32', bg: '#e8f5e9', emoji: '✅' },
  traitement: { label: 'En traitement', color: '#6a1b9a', bg: '#f3e5f5', emoji: '⚙️' },
  annule:     { label: 'Annulé',        color: '#c62828', bg: '#ffebee', emoji: '❌' },
  livre:      { label: 'Livré',         color: '#2e7d32', bg: '#e8f5e9', emoji: '📦' },
};

export default function ChauffeurDashboard() {
  const [profile,    setProfile]    = useState<{ nom: string } | null>(null);
  const [missions,   setMissions]   = useState<Mission[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating,   setUpdating]   = useState<string | null>(null);

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

    // Fetch collections
    const { data: dechets } = await supabase
      .from('dechets')
      .select('*, profiles:fournisseur_id(nom, telephone)')
      .eq('chauffeur_id', user.id)
      .not('statut', 'in', '("collecte","traitement","annule")');

    // Fetch deliveries
    const { data: commandes } = await supabase
      .from('commandes')
      .select('*, profiles:agriculteur_id(nom, telephone)')
      .eq('chauffeur_id', user.id)
      .not('statut', 'in', '("livre","annule")');

    const combined: Mission[] = [
      ...(dechets || []).map(d => ({
        id: d.id,
        type: 'collecte' as const,
        type_item: d.type_dechet,
        quantite: d.quantite_kg,
        adresse: d.adresse,
        statut: d.statut as Statut,
        date: d.date_demande,
        notes: d.notes,
        contact_nom: d.profiles?.nom,
        contact_tel: d.profiles?.telephone,
      })),
      ...(commandes || []).map(c => ({
        id: c.id,
        type: 'livraison' as const,
        type_item: c.type_produit,
        quantite: c.quantite,
        adresse: c.adresse_livraison,
        statut: c.statut as Statut,
        date: c.date_commande,
        notes: c.notes,
        contact_nom: c.profiles?.nom,
        contact_tel: c.profiles?.telephone,
      }))
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    setMissions(combined);
    setLoading(false);
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  async function handleCompleteMission(mission: Mission) {
    setUpdating(mission.id);
    const nextStatut = mission.type === 'collecte' ? 'collecte' : 'livre';
    const table = mission.type === 'collecte' ? 'dechets' : 'commandes';

    const { error } = await supabase
      .from(table)
      .update({ statut: nextStatut, date_collecte: mission.type === 'collecte' ? new Date().toISOString() : undefined })
      .eq('id', mission.id);

    setUpdating(null);
    if (error) {
      Alert.alert('Erreur', error.message);
    } else {
      loadData();
    }
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
            <Text style={s.hName}>{profile?.nom || 'Chauffeur'}</Text>
            <View style={s.roleBadge}><Text style={s.roleText}>🚚 Chauffeur / Livreur</Text></View>
          </View>
          <TouchableOpacity onPress={handleLogout} style={s.logoutBtn}>
            <Text style={s.logoutIcon}>↩</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={[s.body, fs(anim2)]}>
          <Text style={s.secTitle}>Missions du jour</Text>

          {loading ? (
            <ActivityIndicator color={GD} style={{ marginTop: 40 }} />
          ) : missions.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>🚚</Text>
              <Text style={s.emptyTitle}>Aucune mission</Text>
              <Text style={s.emptySub}>Vous n&apos;avez pas de collecte ou livraison prévue pour le moment.</Text>
            </View>
          ) : (
            missions.map(m => (
              <View key={m.id} style={s.card}>
                <View style={s.cardTop}>
                  <View style={[s.typeBadge, { backgroundColor: m.type === 'collecte' ? '#e8f5e9' : '#e3f2fd' }]}>
                    <Text style={[s.typeTxt, { color: m.type === 'collecte' ? '#2e7d32' : '#1565c0' }]}>
                      {m.type === 'collecte' ? '🌾 Collecte' : '📦 Livraison'}
                    </Text>
                  </View>
                  <Text style={s.cardDate}>{new Date(m.date).toLocaleDateString('fr-FR')}</Text>
                </View>

                <Text style={s.itemTitle}>{m.type_item} ({m.quantite} kg)</Text>
                <Text style={s.addrText}>📍 {m.adresse}</Text>

                {m.contact_nom && (
                  <View style={s.contactRow}>
                    <Text style={s.contactText}>👤 {m.contact_nom}</Text>
                    {m.contact_tel && (
                      <TouchableOpacity onPress={() => Linking.openURL(`tel:${m.contact_tel}`)}>
                        <Text style={s.telText}>📞 {m.contact_tel}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {m.notes && <Text style={s.notesText}>💬 {m.notes}</Text>}

                <TouchableOpacity
                  style={[s.actionBtn, updating === m.id && { opacity: 0.7 }]}
                  onPress={() => handleCompleteMission(m)}
                  disabled={updating !== null}
                >
                  {updating === m.id ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={s.actionBtnTxt}>
                      {m.type === 'collecte' ? 'Marquer comme collecté' : 'Marquer comme livré'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ))
          )}
        </Animated.View>
        <View style={{ height: 40 }} />
      </ScrollView>
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
  secTitle: { fontSize: 18, fontWeight: '800', color: BROWN, marginBottom: 16 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.06, shadowRadius:8, elevation:3 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50 },
  typeTxt: { fontSize: 11, fontWeight: '700' },
  cardDate: { fontSize: 12, color: MUTED },
  itemTitle: { fontSize: 16, fontWeight: '800', color: BROWN, marginBottom: 4 },
  addrText: { fontSize: 13, color: MUTED, marginBottom: 8 },
  contactRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, paddingVertical: 8, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#f0e8da' },
  contactText: { fontSize: 13, color: BROWN, fontWeight: '600' },
  telText: { fontSize: 13, color: GD, fontWeight: '700' },
  notesText: { fontSize: 12, color: MUTED, fontStyle: 'italic', marginBottom: 12 },
  actionBtn: { backgroundColor: GD, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  actionBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: BROWN, marginBottom: 8 },
  emptySub: { fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 20 },
});
