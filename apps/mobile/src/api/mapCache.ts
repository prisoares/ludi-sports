import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MapPin } from '../api/client';

const KEY = 'ludi:map-pins:v1';

export async function cacheMapPins(pins: MapPin[]): Promise<void> {
  await AsyncStorage.setItem(
    KEY,
    JSON.stringify({ savedAt: Date.now(), pins }),
  );
}

export async function loadCachedMapPins(): Promise<MapPin[] | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { pins: MapPin[] };
    return Array.isArray(parsed.pins) ? parsed.pins : null;
  } catch {
    return null;
  }
}
