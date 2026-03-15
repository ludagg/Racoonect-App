import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, RefreshControl, Modal, ActivityIndicator,
  Alert, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';

const { width: SW } = Dimensions.get('window');

// ── Types ──────────────────────────────────────────────────────
type Statut = 'en_attente' | 'planifie' | 'collecte' | 'traitement' | 'livre' | 'annule';

interface Depot {
  id: string;
  type_dechet: string;
  quantite_kg: number;
  adresse: string;
  statut: Statut;
  date_demande: string;
  notes?: string;
  profiles?: { nom: string; telephone?: string };
  chauffeur_id?: string;
}

interface Commande {
  id: string;
  type_produit: string;
  quantite: number;
  unite: string;
  statut: Statut;
  date_commande: string;
  adresse_livraison: string;
  profiles?: { nom: string; telephone?: string };
  chauffeur_id?: string;
}

interface Chauffeur {
  id: string;
  nom: string;
}

// ── Config statuts ─────────────────────────────────────────────
const SC: Record<Statut, { label: string; color: string; bg: string; emoji: string; next?: Statut }> = {
  en_attente: { label: 'En attente',    color: '#b45309', bg: '#fef3c7', emoji: '⏳', next: 'planifie'   },
  planifie:   { label: 'Planifié',      color: '#1d4ed8', bg: '#dbeafe', emoji: '📅', next: 'collecte'   },
  collecte:   { label: 'Collecté',      color: '#15803d', bg: '#dcfce7', emoji: '✅', next: 'traitement' },
  traitement: { label: 'En traitement', color: '#7e22ce', bg: '#f3e8ff', emoji: '⚙️'                     },
  livre:      { label: 'Livré',         color: '#15803d', bg: '#dcfce7', emoji: '📦'                     },
  annule:     { label: 'Annulé',        color: '#dc2626', bg: '#fee2e2', emoji: '❌'                     },
};

const STATUT_ORDER: Statut[] = ['en_attente', 'planifie', 'collecte', 'traitement', 'livre', 'annule'];

function today() {
  return new Date().toLocaleDateString('fr-MA', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-MA', { day: '2-digit', month: 'short' });
}

// ══════════════════════════════════════════════════════════════
export default function GestionnaireDashboard() {
  const [gestNom,       setGestNom]       = useState('Gestionnaire');
  const [depots,        setDepots]        = useState<Depot[]>([]);
  const [commandes,     setCommandes]     = useState<Commande[]>([]);
  const [chauffeurs,    setChauffeurs]    = useState<Chauffeur[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [selectedItem,  setSelectedItem]  = useState<Depot | Commande | null>(null);
  const [showAssign,    setShowAssign]    = useState(false);
  const [updating,      setUpdating]      = useState(false);

  // Derived stats
  const [kgTotal,       setKgTotal]       = useState(0);
  const [kgMois,        setKgMois]        = useState(0);
  const [counts,        setCounts]        = useState<Record<Statut, number>>({
    en_attente: 0, planifie: 0, collecte: 0, traitement: 0, livre: 0, annule: 0,
  });

  // Animations
  const fadeHdr  = useRef(new Animated.Value(0)).current;
  const fadeBody = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
    Animated.stagger(200, [
      Animated.spring(fadeHdr,  { toValue: 1, useNativeDriver: true }),
      Animated.spring(fadeBody, { toValue: 1, useNativeDriver: true }),
    ]).start();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/(auth)/login'); return; }

      const { data: prof } = await supabase.from('profiles').select('nom').eq('id', user.id).single();
      if (prof) setGestNom(prof.nom);

      // Fetch depots
      const { data: depData } = await supabase.from('dechets').select('*, profiles:fournisseur_id(nom, telephone)').order('date_demande', { ascending: false });
      if (depData) setDepots(depData);

      // Fetch orders
      const { data: comData } = await supabase.from('commandes').select('*, profiles:agriculteur_id(nom, telephone)').order('date_commande', { ascending: false });
      if (comData) setCommandes(comData);

      // Fetch chauffeurs
      const { data: chaufData } = await supabase.from('profiles').select('id, nom').eq('role', 'chauffeur');
      if (chaufData) setChauffeurs(chaufData);

      // Stats
      if (depData) {
        const now = new Date();
        const debut = new Date(now.getFullYear(), now.getMonth(), 1);
        const actifs = depData.filter((d: Depot) => d.statut !== 'annule');
        setKgTotal(actifs.reduce((s: number, d: Depot) => s + d.quantite_kg, 0));
        setKgMois(depData.filter((d: Depot) => new Date(d.date_demande) >= debut && d.statut !== 'annule').reduce((s: number, d: Depot) => s + d.quantite_kg, 0));
        const c = { en_attente:0, planifie:0, collecte:0, traitement:0, livre:0, annule:0 };
        depData.forEach((d: Depot) => { if(c[d.statut] !== undefined) c[d.statut]++; });
        comData?.forEach((co: Commande) => { if(c[co.statut] !== undefined) c[co.statut]++; });
        setCounts(c);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = useCallback(() => { setRefreshing(true); loadData(); }, []);

  async function changeStatut(id: string, statut: Statut, type: 'depot' | 'commande') {
    setUpdating(true);
    const table = type === 'depot' ? 'dechets' : 'commandes';
    const { error } = await supabase.from(table).update({ statut }).eq('id', id);
    setUpdating(false);
    if (error) { Alert.alert('Erreur', error.message); return; }
    setSelectedItem(null);
    loadData();
  }

  async function assignChauffeur(chauffeurId: string) {
    if (!selectedItem) return;
    setUpdating(true);
    const isDepot = 'type_dechet' in selectedItem;
    const table = isDepot ? 'dechets' : 'commandes';
    const { error } = await supabase.from(table).update({
      chauffeur_id: chauffeurId,
      statut: 'planifie'
    }).eq('id', selectedItem.id);
    setUpdating(false);
    if (error) { Alert.alert('Erreur', error.message); return; }
    setShowAssign(false);
    setSelectedItem(null);
    loadData();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  }

  const pct = Math.min(Math.round((kgMois / 5000) * 100), 100);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[GD]} />}>

        <Animated.View style={{ opacity: fadeHdr }}>
          <View style={s.welcomeCard}>
            <View style={s.welcomeTop}>
              <View style={s.avatarWrap}><Text style={s.avatarTxt}>{gestNom.charAt(0).toUpperCase()}</Text></View>
              <View style={{ flex:1, marginLeft:12 }}>
                <Text style={s.welcomeHello}>Bonjour 👋</Text>
                <Text style={s.welcomeName}>{gestNom}</Text>
                <Text style={s.welcomeRole}>📊 Gestionnaire des opérations</Text>
              </View>
              <TouchableOpacity onPress={handleLogout} style={s.logoutBtn}><Text style={s.logoutTxt}>↩</Text></TouchableOpacity>
            </View>
            <View style={s.dateRow}><Text style={s.dateTxt}>📅 {today()}</Text></View>
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: fadeBody }}>
          <Text style={s.sectionTitle}>Objectif mensuel</Text>
          <View style={s.objectifCard}>
            <View style={s.circleWrap}>
              <View style={s.circleOuter}><View style={s.circleInner}><Text style={s.circlePct}>{pct}%</Text></View></View>
            </View>
            <View style={s.objectifRight}>
              <Text style={s.objectifTitle}>Collectes ce mois</Text>
              <Text style={s.objectifSub}>{kgMois} kg / 5 000 kg</Text>
              <View style={s.barBg}><View style={[s.barFill, { width: `${pct}%` }]} /></View>
            </View>
          </View>

          <Text style={s.sectionTitle}>Missions en attente d&apos;attribution</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.listH}>
            {depots.filter(d => d.statut === 'en_attente').map(d => (
              <TouchableOpacity key={d.id} style={s.miniCard} onPress={() => setSelectedItem(d)}>
                <Text style={s.miniEmoji}>🌾</Text>
                <Text style={s.miniType}>{d.type_dechet}</Text>
                <Text style={s.miniKg}>{d.quantite_kg} kg</Text>
                <Text style={s.miniBtn}>Attribuer →</Text>
              </TouchableOpacity>
            ))}
            {commandes.filter(c => c.statut === 'en_attente').map(c => (
              <TouchableOpacity key={c.id} style={[s.miniCard, { borderColor: '#1565c0' }]} onPress={() => setSelectedItem(c)}>
                <Text style={s.miniEmoji}>📦</Text>
                <Text style={s.miniType}>{c.type_produit}</Text>
                <Text style={s.miniKg}>{c.quantite} kg</Text>
                <Text style={[s.miniBtn, { color: '#1565c0' }]}>Attribuer →</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={s.sectionTitle}>Toutes les opérations</Text>
          <View style={s.listV}>
            {depots.map(d => (
              <TouchableOpacity key={d.id} style={s.itemRow} onPress={() => setSelectedItem(d)}>
                <Text style={s.itemEmoji}>🌾</Text>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={s.itemName}>{d.type_dechet}</Text>
                  <Text style={s.itemSub}>{d.profiles?.nom} · {formatDate(d.date_demande)}</Text>
                </View>
                <View style={[s.statBadge, { backgroundColor: SC[d.statut].bg }]}><Text style={[s.statTxt, { color: SC[d.statut].color }]}>{SC[d.statut].label}</Text></View>
              </TouchableOpacity>
            ))}
            {commandes.map(c => (
              <TouchableOpacity key={c.id} style={s.itemRow} onPress={() => setSelectedItem(c)}>
                <Text style={s.itemEmoji}>📦</Text>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={s.itemName}>{c.type_produit}</Text>
                  <Text style={s.itemSub}>{c.profiles?.nom} · {formatDate(c.date_commande)}</Text>
                </View>
                <View style={[s.statBadge, { backgroundColor: SC[c.statut].bg }]}><Text style={[s.statTxt, { color: SC[c.statut].color }]}>{SC[c.statut].label}</Text></View>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal Détails & Attribution */}
      <Modal visible={!!selectedItem} animationType="slide" transparent>
        <View style={s.modalBg}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            {selectedItem && (
              <ScrollView>
                <Text style={s.modalTitle}>{'type_dechet' in selectedItem ? '🌾 Collecte de déchets' : '📦 Livraison engrais'}</Text>
                <Text style={s.modalSub}>Détails de l&apos;opération</Text>

                <View style={s.infoBox}>
                  <Text style={s.infoLbl}>Élément</Text>
                  <Text style={s.infoVal}>{'type_dechet' in selectedItem ? selectedItem.type_dechet : selectedItem.type_produit}</Text>
                  <Text style={s.infoLbl}>Quantité</Text>
                  <Text style={s.infoVal}>{'quantite_kg' in selectedItem ? selectedItem.quantite_kg : selectedItem.quantite} kg</Text>
                  <Text style={s.infoLbl}>Contact</Text>
                  <Text style={s.infoVal}>{selectedItem.profiles?.nom} ({selectedItem.profiles?.telephone})</Text>
                </View>

                {selectedItem.statut === 'en_attente' ? (
                  <>
                    <Text style={s.assignTitle}>Attribuer à un chauffeur</Text>
                    <View style={s.chaufGrid}>
                      {chauffeurs.map(ch => (
                        <TouchableOpacity key={ch.id} style={s.chaufBtn} onPress={() => assignChauffeur(ch.id)}>
                          <Text style={s.chaufEmoji}>👨‍✈️</Text>
                          <Text style={s.chaufName}>{ch.nom}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                ) : (
                  <Text style={s.assignedText}>Déjà attribué ou en cours.</Text>
                )}

                <TouchableOpacity style={s.closeBtn} onPress={() => setSelectedItem(null)}>
                  <Text style={s.closeBtnTxt}>Fermer</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const GD = '#3a6b35'; const BROWN = '#5c3d1e'; const CREAM = '#faf6f0'; const SAND = '#e8dcc8'; const MUTED = '#8a7560';

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0ebe0' },
  welcomeCard: { backgroundColor: GD, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, padding: 20, paddingTop: 16, paddingBottom: 24 },
  welcomeTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatarWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontSize: 22, fontWeight: '800' },
  welcomeHello: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  welcomeName: { color: '#fff', fontSize: 20, fontWeight: '800' },
  welcomeRole: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 },
  logoutBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  logoutTxt: { color: '#fff', fontSize: 18 },
  dateRow: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 10 },
  dateTxt: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: BROWN, paddingHorizontal: 20, marginTop: 20, marginBottom: 12 },
  objectifCard: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 16 },
  circleWrap: { width: 70, height: 70 },
  circleOuter: { width: 70, height: 70, borderRadius: 35, borderWidth: 6, borderColor: '#e8f5e9', alignItems: 'center', justifyContent: 'center' },
  circleInner: { alignItems: 'center' },
  circlePct: { fontSize: 16, fontWeight: '800', color: GD },
  objectifRight: { flex: 1 },
  objectifTitle: { fontSize: 14, fontWeight: '700', color: BROWN },
  objectifSub: { fontSize: 12, color: MUTED, marginBottom: 8 },
  barBg: { backgroundColor: '#f0ebe0', borderRadius: 50, height: 6 },
  barFill: { backgroundColor: GD, borderRadius: 50, height: '100%' },
  listH: { paddingHorizontal: 16, gap: 12 },
  miniCard: { width: 140, backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: SAND },
  miniEmoji: { fontSize: 24, marginBottom: 4 },
  miniType: { fontSize: 12, fontWeight: '700', color: BROWN },
  miniKg: { fontSize: 14, fontWeight: '800', color: GD, marginVertical: 4 },
  miniBtn: { fontSize: 11, fontWeight: '700', color: GD },
  listV: { paddingHorizontal: 16 },
  itemRow: { backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  itemEmoji: { fontSize: 20 },
  itemName: { fontSize: 14, fontWeight: '700', color: BROWN },
  itemSub: { fontSize: 11, color: MUTED },
  statBadge: { borderRadius: 50, paddingHorizontal: 8, paddingVertical: 3 },
  statTxt: { fontSize: 10, fontWeight: '700' },
  modalBg: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: { backgroundColor: CREAM, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '90%' },
  modalHandle: { width: 40, height: 4, backgroundColor: SAND, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: BROWN, marginBottom: 4 },
  modalSub: { fontSize: 13, color: MUTED, marginBottom: 20 },
  infoBox: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 20 },
  infoLbl: { fontSize: 10, color: MUTED, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
  infoVal: { fontSize: 14, color: BROWN, fontWeight: '600', marginBottom: 12 },
  assignTitle: { fontSize: 14, fontWeight: '800', color: BROWN, marginBottom: 12 },
  chaufGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chaufBtn: { backgroundColor: '#fff', padding: 12, borderRadius: 12, alignItems: 'center', width: '30%', borderWidth: 1, borderColor: SAND },
  chaufEmoji: { fontSize: 24, marginBottom: 4 },
  chaufName: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
  closeBtn: { marginTop: 20, backgroundColor: GD, padding: 14, borderRadius: 14, alignItems: 'center' },
  closeBtnTxt: { color: '#fff', fontWeight: '700' },
  assignedText: { textAlign: 'center', color: MUTED, fontStyle: 'italic', marginVertical: 20 },
});
