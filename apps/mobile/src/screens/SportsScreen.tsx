import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api, Sport, Venue } from '../api/client';
import { colors } from '../theme';
import type { RootStackParamList } from '../navigation/types';

const POA = { lat: -30.0346, lng: -51.2177 };
const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function defaultFreeAtIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(19, 0, 0, 0);
  return d.toISOString();
}

export function SportsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [sports, setSports] = useState<Sport[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState('15');
  const [useFreeAt, setUseFreeAt] = useState(false);
  const [freeAt, setFreeAt] = useState(defaultFreeAtIso());

  const loadVenues = useCallback(
    async (sportSlug: string | null) => {
      setError(null);
      try {
        setVenues(
          await api.venues({
            sport: sportSlug ?? undefined,
            lat: POA.lat,
            lng: POA.lng,
            radiusKm: Number(radiusKm) || undefined,
            freeAt: useFreeAt ? freeAt : undefined,
          }),
        );
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [radiusKm, useFreeAt, freeAt],
  );

  const loadSports = useCallback(async () => {
    setError(null);
    try {
      const data = await api.sports();
      setSports(data);
      const slug = selected ?? data[0]?.slug ?? null;
      if (!selected && data[0]) setSelected(data[0].slug);
      await loadVenues(slug);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [selected, loadVenues]);

  const pickSport = async (slug: string) => {
    setSelected(slug);
    await loadVenues(slug);
  };

  useFocusEffect(
    useCallback(() => {
      void loadSports();
    }, [loadSports]),
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.teal} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Esportes</Text>
      <Text style={styles.subtitle}>
        Filtros: esporte · distância · horário livre
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        horizontal
        data={sports}
        keyExtractor={(s) => s.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.chip, selected === item.slug && styles.chipActive]}
            onPress={() => void pickSport(item.slug)}
          >
            <Text
              style={[
                styles.chipText,
                selected === item.slug && styles.chipTextActive,
              ]}
            >
              {item.name}
            </Text>
          </Pressable>
        )}
      />

      <View style={styles.filters}>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Raio (km)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={radiusKm}
            onChangeText={setRadiusKm}
          />
          <Pressable
            style={styles.apply}
            onPress={() => void loadVenues(selected)}
          >
            <Text style={styles.applyText}>Aplicar</Text>
          </Pressable>
        </View>
        <Pressable
          style={[styles.toggle, useFreeAt && styles.toggleOn]}
          onPress={() => setUseFreeAt((v) => !v)}
        >
          <Text style={[styles.toggleText, useFreeAt && styles.toggleTextOn]}>
            Horário livre {useFreeAt ? 'ligado' : 'desligado'} · amanhã 19h
          </Text>
        </Pressable>
        {useFreeAt ? (
          <Text style={styles.hint}>
            freeAt={new Date(freeAt).toLocaleString('pt-BR')} (
            {DAY_LABELS[new Date(freeAt).getDay()]})
          </Text>
        ) : null}
      </View>

      <FlatList
        data={venues}
        keyExtractor={(v) => v.id}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => void loadVenues(selected)}
          />
        }
        contentContainerStyle={{ gap: 10, paddingBottom: 40 }}
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhum local com esses filtros.</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() =>
              navigation.navigate('VenueDetail', { slug: item.slug })
            }
          >
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardMeta}>
              {item.neighborhood}
              {item.distanceKm != null ? ` · ${item.distanceKm} km` : ''}
              {' · '}a partir de R$ {(item.minPriceCents / 100).toFixed(0)}
            </Text>
            <Text style={styles.cardAddr}>{item.address}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.sand, padding: 20, paddingTop: 56 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: colors.ink },
  subtitle: { marginTop: 6, marginBottom: 16, color: colors.muted },
  error: { color: '#B91C1C', marginBottom: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  chipText: { color: colors.navy, fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: colors.white },
  filters: { marginBottom: 12, gap: 8 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterLabel: { color: colors.muted, fontWeight: '600' },
  input: {
    width: 64,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    color: colors.ink,
  },
  apply: {
    backgroundColor: colors.navy,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  applyText: { color: colors.white, fontWeight: '700', fontSize: 12 },
  toggle: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
  },
  toggleOn: { borderColor: colors.teal, backgroundColor: '#CCFBF1' },
  toggleText: { color: colors.muted, fontWeight: '600', fontSize: 13 },
  toggleTextOn: { color: colors.tealDark },
  hint: { color: colors.muted, fontSize: 12 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.navy },
  cardMeta: { marginTop: 4, color: colors.tealDark, fontWeight: '600' },
  cardAddr: { marginTop: 4, color: colors.muted, fontSize: 13 },
  empty: { color: colors.muted, marginTop: 24, textAlign: 'center' },
});
