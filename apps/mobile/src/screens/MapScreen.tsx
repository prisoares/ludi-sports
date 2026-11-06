import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
  TextInput,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api, MapPin, Sport } from '../api/client';
import { cacheMapPins, loadCachedMapPins } from '../api/mapCache';
import { colors } from '../theme';
import type { RootStackParamList } from '../navigation/types';

const POA = { lat: -30.0346, lng: -51.2177 };

let MapView: React.ComponentType<Record<string, unknown>> | null = null;
let Marker: React.ComponentType<Record<string, unknown>> | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
} catch {
  MapView = null;
  Marker = null;
}

export function MapScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [pins, setPins] = useState<MapPin[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [sport, setSport] = useState<string | undefined>();
  const [radiusKm, setRadiusKm] = useState('10');
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const list = await api.mapPins({
        sport,
        lat: POA.lat,
        lng: POA.lng,
        radiusKm: Number(radiusKm) || undefined,
      });
      setPins(list);
      setOffline(false);
      await cacheMapPins(list);
    } catch {
      const cached = await loadCachedMapPins();
      setPins(cached ?? []);
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, [sport, radiusKm]);

  useFocusEffect(
    useCallback(() => {
      void api.sports().then(setSports).catch(() => undefined);
      void load();
    }, [load]),
  );

  const region = useMemo(
    () => ({
      latitude: POA.lat,
      longitude: POA.lng,
      latitudeDelta: 0.12,
      longitudeDelta: 0.12,
    }),
    [],
  );

  const showNativeMap = Platform.OS !== 'web' && MapView && Marker;

  if (loading && pins.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.teal} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Mapa</Text>
      <Text style={styles.subtitle}>
        Pins ao vivo · Porto Alegre
        {offline ? ' · cache offline' : ''}
      </Text>

      <FlatList
        horizontal
        data={[{ id: 'all', slug: '', name: 'Todos' } as Sport, ...sports]}
        keyExtractor={(s) => s.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingBottom: 10 }}
        renderItem={({ item }) => {
          const active = (sport ?? '') === item.slug;
          return (
            <Pressable
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setSport(item.slug || undefined)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {item.name}
              </Text>
            </Pressable>
          );
        }}
      />

      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Raio (km)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={radiusKm}
          onChangeText={setRadiusKm}
          onBlur={() => void load()}
        />
        <Pressable style={styles.apply} onPress={() => void load()}>
          <Text style={styles.applyText}>Filtrar</Text>
        </Pressable>
      </View>

      {showNativeMap ? (
        <View style={styles.mapWrap}>
          {(() => {
            const NativeMap = MapView!;
            const NativeMarker = Marker!;
            return (
              <NativeMap style={StyleSheet.absoluteFill} initialRegion={region}>
                {pins.map((p) => (
                  <NativeMarker
                    key={p.id}
                    coordinate={{ latitude: p.lat, longitude: p.lng }}
                    title={p.name}
                    description={p.neighborhood}
                    onCalloutPress={() =>
                      navigation.navigate('VenueDetail', { slug: p.slug })
                    }
                  />
                ))}
              </NativeMap>
            );
          })()}
        </View>
      ) : (
        <View style={styles.mapPlane}>
          <Text style={styles.mapHint}>
            Mapa nativo indisponível neste runtime — lista com coordenadas
          </Text>
          {pins.map((v) => (
            <Pressable
              key={v.id}
              style={styles.pin}
              onPress={() =>
                navigation.navigate('VenueDetail', { slug: v.slug })
              }
            >
              <Text style={styles.pinDot}>●</Text>
              <Text style={styles.pinLabel}>
                {v.name} ({v.lat.toFixed(3)}, {v.lng.toFixed(3)})
                {v.distanceKm != null ? ` · ${v.distanceKm} km` : ''}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <FlatList
        data={pins}
        keyExtractor={(v) => v.id}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={load} />
        }
        contentContainerStyle={{ gap: 8, paddingBottom: 40 }}
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhum pin no raio.</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() =>
              navigation.navigate('VenueDetail', { slug: item.slug })
            }
          >
            <Text style={styles.rowTitle}>{item.name}</Text>
            <Text style={styles.rowMeta}>
              {item.neighborhood}
              {item.distanceKm != null ? ` · ${item.distanceKm} km` : ''}
              {' · '}a partir de R$ {(item.minPriceCents / 100).toFixed(0)}
            </Text>
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
  subtitle: { marginTop: 6, marginBottom: 12, color: colors.muted },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  chipText: { color: colors.navy, fontWeight: '600', fontSize: 12 },
  chipTextActive: { color: colors.white },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
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
  mapWrap: {
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  mapPlane: {
    backgroundColor: '#CCFBF1',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    minHeight: 120,
  },
  mapHint: { color: colors.navy, fontWeight: '600', marginBottom: 8 },
  pin: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  pinDot: { color: '#B91C1C', fontSize: 12 },
  pinLabel: { color: colors.ink, fontSize: 12, flex: 1 },
  row: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  rowTitle: { fontWeight: '700', color: colors.navy },
  rowMeta: { marginTop: 2, color: colors.muted, fontSize: 13 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 16 },
});
