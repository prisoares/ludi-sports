import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api, PartnerVenue, Sport } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import type { RootStackParamList } from '../navigation/types';

export function PartnerVenuesScreen() {
  const { token } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [venues, setVenues] = useState<PartnerVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setVenues(await api.partnerVenues(token));
    } catch (e) {
      Alert.alert('Erro', (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const create = async () => {
    if (!token || !name.trim() || !address.trim() || !neighborhood.trim()) {
      Alert.alert('Preencha nome, endereço e bairro');
      return;
    }
    setSaving(true);
    try {
      await api.createVenue(token, {
        name: name.trim(),
        address: address.trim(),
        neighborhood: neighborhood.trim(),
        lat: -30.0346,
        lng: -51.2177,
        photoUrls: [
          'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800',
        ],
      });
      setName('');
      setAddress('');
      setNeighborhood('');
      await load();
    } catch (e) {
      Alert.alert('Erro', (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!token) {
    return (
      <View style={styles.root}>
        <Text style={styles.title}>Meus locais</Text>
        <Text style={styles.meta}>Faça login como parceiro.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: 48 }}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} />
      }
    >
      <Pressable onPress={() => navigation.goBack()}>
        <Text style={styles.back}>← Voltar</Text>
      </Pressable>
      <Text style={styles.title}>Meus locais</Text>
      <Text style={styles.meta}>CRUD MVP · fotos por URL · taxa mapa 1%</Text>

      <Text style={styles.section}>Novo local (POA)</Text>
      <TextInput
        style={styles.input}
        placeholder="Nome"
        placeholderTextColor={colors.muted}
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Endereço"
        placeholderTextColor={colors.muted}
        value={address}
        onChangeText={setAddress}
      />
      <TextInput
        style={styles.input}
        placeholder="Bairro"
        placeholderTextColor={colors.muted}
        value={neighborhood}
        onChangeText={setNeighborhood}
      />
      <Pressable
        style={[styles.btn, saving && { opacity: 0.6 }]}
        disabled={saving}
        onPress={() => void create()}
      >
        <Text style={styles.btnText}>
          {saving ? 'Salvando…' : 'Criar local'}
        </Text>
      </Pressable>

      {loading && venues.length === 0 ? (
        <ActivityIndicator color={colors.teal} style={{ marginTop: 24 }} />
      ) : null}

      {venues.map((v) => (
        <Pressable
          key={v.id}
          style={styles.card}
          onPress={() =>
            navigation.navigate('PartnerVenueDetail', { venueId: v.id })
          }
        >
          <Text style={styles.cardTitle}>{v.name}</Text>
          <Text style={styles.meta}>
            {v.neighborhood} · {v.courts.length} quadra(s)
            {v.mapVisible ? '' : ' · oculto no mapa'}
          </Text>
          {v.mapFees[0] ? (
            <Text style={styles.fee}>
              Taxa {v.mapFees[0].month}/{v.mapFees[0].year}: R${' '}
              {(v.mapFees[0].feeCents / 100).toFixed(2)} ({v.mapFees[0].status})
            </Text>
          ) : null}
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function PartnerVenueDetailScreen() {
  const { token } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route =
    useRoute<RouteProp<RootStackParamList, 'PartnerVenueDetail'>>();
  const [venue, setVenue] = useState<PartnerVenue | null>(null);
  const [sports, setSports] = useState<Sport[]>([]);
  const [courtName, setCourtName] = useState('Society');
  const [sportSlug, setSportSlug] = useState('futebol-society');
  const [price, setPrice] = useState('180');
  const [photoUrl, setPhotoUrl] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const [v, s] = await Promise.all([
      api.partnerVenue(token, route.params.venueId),
      api.sports(),
    ]);
    setVenue(v);
    setSports(s);
    if (s[0]) setSportSlug(s[0].slug);
  }, [token, route.params.venueId]);

  useFocusEffect(
    useCallback(() => {
      void load().catch((e) => Alert.alert('Erro', (e as Error).message));
    }, [load]),
  );

  if (!token || !venue) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.teal} />
      </View>
    );
  }

  const addCourt = async () => {
    setBusy(true);
    try {
      await api.createCourt(token, venue.id, {
        name: courtName,
        sportSlug,
        priceCents: Math.round(Number(price) * 100) || 0,
      });
      await load();
    } catch (e) {
      Alert.alert('Erro', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const addPhoto = async () => {
    if (!photoUrl.trim()) return;
    setBusy(true);
    try {
      await api.addVenuePhoto(token, venue.id, photoUrl.trim());
      setPhotoUrl('');
      await load();
    } catch (e) {
      Alert.alert('Erro', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const bumpPrice = async (courtId: string, priceCents: number) => {
    setBusy(true);
    try {
      await api.updateCourt(token, courtId, { priceCents });
      await load();
    } catch (e) {
      Alert.alert('Erro', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const setWeek = async (courtId: string) => {
    setBusy(true);
    try {
      await api.setAvailability(
        token,
        courtId,
        [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
          dayOfWeek,
          startMin: 8 * 60,
          endMin: 22 * 60,
        })),
      );
      Alert.alert('OK', 'Grade seg–sáb 08–22 definida');
      await load();
    } catch (e) {
      Alert.alert('Erro', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const addBlock = async (courtId: string) => {
    const start = new Date();
    start.setDate(start.getDate() + 2);
    start.setHours(14, 0, 0, 0);
    const end = new Date(start);
    end.setHours(16, 0, 0, 0);
    setBusy(true);
    try {
      await api.createBlock(token, courtId, {
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        reason: 'Manutenção',
      });
      await load();
    } catch (e) {
      Alert.alert('Erro', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const payFee = async (id: string) => {
    setBusy(true);
    try {
      await api.payMapFeeStub(token, id);
      await load();
    } catch (e) {
      Alert.alert('Erro', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const runFeeJob = async () => {
    setBusy(true);
    try {
      const r = await api.runMapFeeJob(token);
      Alert.alert(
        'Job GMV',
        `Período ${r.month}/${r.year} · ${r.created} fatura(s)`,
      );
      await load();
    } catch (e) {
      Alert.alert('Erro', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: 48 }}
    >
      <Pressable onPress={() => navigation.goBack()}>
        <Text style={styles.back}>← Locais</Text>
      </Pressable>
      <Text style={styles.title}>{venue.name}</Text>
      <Text style={styles.meta}>
        {venue.address} · mapa {venue.mapVisible ? 'visível' : 'oculto'}
      </Text>

      <Text style={styles.section}>Fotos (URL stub)</Text>
      <TextInput
        style={styles.input}
        placeholder="https://..."
        placeholderTextColor={colors.muted}
        value={photoUrl}
        onChangeText={setPhotoUrl}
        autoCapitalize="none"
      />
      <Pressable style={styles.btn} disabled={busy} onPress={() => void addPhoto()}>
        <Text style={styles.btnText}>Adicionar foto</Text>
      </Pressable>
      <Text style={styles.meta}>{venue.photoUrls.length} foto(s)</Text>

      <Text style={styles.section}>Nova quadra</Text>
      <TextInput
        style={styles.input}
        value={courtName}
        onChangeText={setCourtName}
        placeholder="Nome"
        placeholderTextColor={colors.muted}
      />
      <ScrollView horizontal contentContainerStyle={{ gap: 8, marginBottom: 8 }}>
        {sports.map((s) => (
          <Pressable
            key={s.id}
            style={[styles.chip, sportSlug === s.slug && styles.chipOn]}
            onPress={() => setSportSlug(s.slug)}
          >
            <Text
              style={[
                styles.chipText,
                sportSlug === s.slug && styles.chipTextOn,
              ]}
            >
              {s.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <TextInput
        style={styles.input}
        value={price}
        onChangeText={setPrice}
        keyboardType="numeric"
        placeholder="Preço R$"
        placeholderTextColor={colors.muted}
      />
      <Pressable style={styles.btn} disabled={busy} onPress={() => void addCourt()}>
        <Text style={styles.btnText}>Criar quadra</Text>
      </Pressable>

      <Text style={styles.section}>Quadras</Text>
      {venue.courts.map((c) => (
        <View key={c.id} style={styles.card}>
          <Text style={styles.cardTitle}>
            {c.name} · {c.sportName}
          </Text>
          <Text style={styles.meta}>
            R$ {(c.priceCents / 100).toFixed(0)} ·{' '}
            {c.weeklyAvailability.length} dia(s) na grade · {c.blocks.length}{' '}
            bloqueio(s)
          </Text>
          <View style={styles.rowBtns}>
            <Pressable
              style={styles.small}
              onPress={() => void bumpPrice(c.id, c.priceCents + 1000)}
            >
              <Text style={styles.smallText}>+R$10</Text>
            </Pressable>
            <Pressable style={styles.small} onPress={() => void setWeek(c.id)}>
              <Text style={styles.smallText}>Grade 8–22</Text>
            </Pressable>
            <Pressable style={styles.small} onPress={() => void addBlock(c.id)}>
              <Text style={styles.smallText}>Bloquear</Text>
            </Pressable>
          </View>
        </View>
      ))}

      <Text style={styles.section}>Taxa mensal mapa (1% GMV)</Text>
      <Pressable style={styles.btn} disabled={busy} onPress={() => void runFeeJob()}>
        <Text style={styles.btnText}>Rodar job do mês anterior</Text>
      </Pressable>
      {venue.mapFees.length === 0 ? (
        <Text style={styles.meta}>Nenhuma fatura ainda.</Text>
      ) : (
        venue.mapFees.map((f) => (
          <View key={f.id} style={styles.card}>
            <Text style={styles.cardTitle}>
              {f.month}/{f.year} · R$ {(f.feeCents / 100).toFixed(2)}
            </Text>
            <Text style={styles.meta}>
              GMV R$ {(f.gmvCents / 100).toFixed(2)} · {f.status} · vence{' '}
              {new Date(f.dueAt).toLocaleDateString('pt-BR')}
            </Text>
            {f.status !== 'paid' && f.feeCents > 0 ? (
              <Pressable
                style={styles.small}
                onPress={() => void payFee(f.id)}
              >
                <Text style={styles.smallText}>Pagar (stub)</Text>
              </Pressable>
            ) : null}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.sand, padding: 20, paddingTop: 56 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  back: { color: colors.tealDark, fontWeight: '700', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: colors.ink },
  meta: { marginTop: 4, color: colors.muted, fontSize: 13 },
  section: {
    marginTop: 20,
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    color: colors.ink,
  },
  btn: {
    backgroundColor: colors.teal,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  btnText: { color: colors.white, fontWeight: '700' },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
  },
  cardTitle: { fontWeight: '700', color: colors.navy },
  fee: { marginTop: 4, color: colors.tealDark, fontWeight: '600', fontSize: 12 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.teal, borderColor: colors.teal },
  chipText: { color: colors.navy, fontWeight: '600', fontSize: 12 },
  chipTextOn: { color: colors.white },
  rowBtns: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  small: {
    backgroundColor: colors.navy,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  smallText: { color: colors.white, fontWeight: '700', fontSize: 12 },
});
