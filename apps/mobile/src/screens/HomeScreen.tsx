import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api, Booking, Sport, Venue } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors, brand } from '../theme';
import { STATUS_LABELS, RootStackParamList } from '../navigation/types';

const POA = { lat: -30.0346, lng: -51.2177 };

export function HomeScreen() {
  const { token, user } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [upcoming, setUpcoming] = useState<Booking[]>([]);
  const [pendingPay, setPendingPay] = useState<Booking[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [nearby, setNearby] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sportList, near] = await Promise.all([
        api.sports(),
        api.venues({ lat: POA.lat, lng: POA.lng, radiusKm: 8 }),
      ]);
      setSports(sportList.slice(0, 6));
      setNearby(near.slice(0, 4));

      if (token) {
        const list = await api.myBookings(token);
        setUpcoming(
          list.filter((b) =>
            ['hold_15m', 'payment_pending', 'confirmed'].includes(b.status),
          ),
        );
        setPendingPay(list.filter((b) => b.status === 'payment_pending'));
      } else {
        setUpcoming([]);
        setPendingPay([]);
      }
    } catch {
      /* keep last good state */
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: 48 }}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} />
      }
    >
      <Text style={styles.brand}>{brand.name}</Text>
      <Text style={styles.hello}>
        {user ? `Olá, ${user.name.split(' ')[0]}` : 'Bem-vindo'}
      </Text>
      <Text style={styles.subtitle}>
        Próximas reservas · pagamento · atalhos · perto de você
      </Text>

      {user?.activeRole === 'PARTNER' ? (
        <View style={styles.partnerRow}>
          <Pressable
            style={styles.inbox}
            onPress={() => navigation.navigate('PartnerInbox')}
          >
            <Text style={styles.inboxText}>Inbox</Text>
          </Pressable>
          <Pressable
            style={styles.manage}
            onPress={() => navigation.navigate('PartnerVenues')}
          >
            <Text style={styles.manageText}>Meus locais</Text>
          </Pressable>
        </View>
      ) : null}

      {pendingPay.length > 0 ? (
        <View style={styles.alert}>
          <Text style={styles.alertTitle}>Pagamento pendente</Text>
          {pendingPay.slice(0, 2).map((b) => (
            <View key={b.id}>
              <Text style={styles.alertBody}>
                {b.venueName} · R$ {(b.priceCents / 100).toFixed(2)} · pague até{' '}
                {b.paymentDueAt
                  ? new Date(b.paymentDueAt).toLocaleString('pt-BR')
                  : '24h antes'}
              </Text>
            </View>
          ))}
          <Text style={styles.alertCtaText}>
            Abra a aba Histórico para gerar Pix / pagar
          </Text>
        </View>
      ) : null}

      <Text style={styles.section}>Próximas reservas</Text>
      {!token ? (
        <Text style={styles.empty}>Entre para ver suas reservas.</Text>
      ) : upcoming.length === 0 ? (
        <Text style={styles.empty}>Nenhuma reserva ativa.</Text>
      ) : (
        upcoming.slice(0, 5).map((b) => (
          <View key={b.id} style={styles.card}>
            <Text style={styles.cardTitle}>{b.venueName}</Text>
            <Text style={styles.status}>
              {STATUS_LABELS[b.status] ?? b.status}
            </Text>
            <Text style={styles.meta}>
              {new Date(b.startsAt).toLocaleString('pt-BR')}
            </Text>
          </View>
        ))
      )}

      <Text style={styles.section}>Atalhos de esporte</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {sports.map((s) => (
          <Pressable
            key={s.id}
            style={styles.sportChip}
            onPress={() => navigation.navigate('MainTabs')}
          >
            <Text style={styles.sportChipText}>{s.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.section}>Perto de você</Text>
      {nearby.length === 0 ? (
        <Text style={styles.empty}>Carregando locais próximos…</Text>
      ) : (
        nearby.map((v) => (
          <Pressable
            key={v.id}
            style={styles.card}
            onPress={() =>
              navigation.navigate('VenueDetail', { slug: v.slug })
            }
          >
            <Text style={styles.cardTitle}>{v.name}</Text>
            <Text style={styles.meta}>
              {v.neighborhood}
              {v.distanceKm != null ? ` · ${v.distanceKm} km` : ''}
              {' · '}a partir de R$ {(v.minPriceCents / 100).toFixed(0)}
            </Text>
          </Pressable>
        ))
      )}

      {loading ? (
        <ActivityIndicator color={colors.teal} style={{ marginTop: 16 }} />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.sand, padding: 20, paddingTop: 56 },
  brand: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.tealDark,
    letterSpacing: 1,
  },
  hello: { marginTop: 8, fontSize: 20, fontWeight: '700', color: colors.ink },
  subtitle: { marginTop: 4, marginBottom: 16, color: colors.muted },
  partnerRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  inbox: {
    flex: 1,
    backgroundColor: colors.navy,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  inboxText: { color: colors.white, fontWeight: '700' },
  manage: {
    flex: 1,
    backgroundColor: colors.teal,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  manageText: { color: colors.white, fontWeight: '700' },
  alert: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  alertTitle: { fontWeight: '800', color: '#92400E', marginBottom: 6 },
  alertBody: { color: '#78350F', marginBottom: 4, fontSize: 13 },
  alertCta: { marginTop: 8 },
  alertCtaText: { color: colors.navy, fontWeight: '700', fontSize: 13 },
  section: {
    marginTop: 8,
    marginBottom: 10,
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
  },
  empty: { color: colors.muted, marginBottom: 12 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
  },
  cardTitle: { fontWeight: '700', color: colors.navy },
  status: { marginTop: 4, color: colors.tealDark, fontWeight: '600' },
  meta: { marginTop: 2, color: colors.muted, fontSize: 13 },
  sportChip: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sportChipText: { color: colors.navy, fontWeight: '600', fontSize: 13 },
});
