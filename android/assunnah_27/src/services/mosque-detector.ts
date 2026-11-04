import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../constants/api';

const STORAGE_KEYS = {
  GOOGLE_API_KEY: 'auto_silent_google_api_key',
  CUSTOM_MOSQUES: 'auto_silent_custom_mosques',
};

export interface CustomMosque {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // custom geofence radius
}

export interface MosqueCheckResult {
  isInsideMosque: boolean;
  mosqueName: string | null;
  distance: number | null;
}

class MosqueDetector {
  /**
   * Check if a set of coordinates corresponds to a mosque.
   * Checks custom/crowdsourced mosques first, then the locally cached nearby backend mosques,
   * then OSM Overpass, and finally Google Places.
   */
  async checkIsNearMosque(latitude: number, longitude: number, searchRadius: number = 50): Promise<MosqueCheckResult> {
    try {
      // Trigger nearby mosques synchronization in background
      this.syncNearbyMosques(latitude, longitude).catch(e => console.warn(e));

      // 1. Check custom mosques database (local user-added cache)
      const customMosques = await this.getCustomMosques();
      for (const mosque of customMosques) {
        const distance = this.calculateDistance(latitude, longitude, mosque.latitude, mosque.longitude);
        if (distance <= (mosque.radius || searchRadius)) {
          return {
            isInsideMosque: true,
            mosqueName: mosque.name,
            distance,
          };
        }
      }

      // 2. Check cached nearby backend mosques (5km sync cache)
      const cachedData = await AsyncStorage.getItem('auto_silent_nearby_mosques_cache');
      if (cachedData) {
        const nearbyMosques = JSON.parse(cachedData);
        for (const mosque of nearbyMosques) {
          const distance = this.calculateDistance(latitude, longitude, mosque.latitude, mosque.longitude);
          if (distance <= (mosque.radius || searchRadius)) {
            return {
              isInsideMosque: true,
              mosqueName: mosque.name,
              distance,
            };
          }
        }
      }

      // 3. Try free OpenStreetMap Overpass API
      const osmResult = await this.queryOSMOverpass(latitude, longitude, searchRadius);
      if (osmResult.isInsideMosque) {
        return osmResult;
      }

      // 4. Fallback: Try Google Places API if configured
      const googleApiKey = await AsyncStorage.getItem(STORAGE_KEYS.GOOGLE_API_KEY);
      if (googleApiKey) {
        return await this.queryGooglePlaces(latitude, longitude, searchRadius, googleApiKey);
      }
    } catch (error) {
      console.error('Error detecting mosque:', error);
    }

    return { isInsideMosque: false, mosqueName: null, distance: null };
  }

  /**
   * Synchronize nearby mosques within 5km from backend when user moves > 1km.
   */
  async syncNearbyMosques(latitude: number, longitude: number): Promise<void> {
    try {
      const lastSyncStr = await AsyncStorage.getItem('auto_silent_last_sync_coordinates');
      if (lastSyncStr) {
        const lastSync = JSON.parse(lastSyncStr);
        const dist = this.calculateDistance(latitude, longitude, lastSync.latitude, lastSync.longitude);
        if (dist < 1000) {
          return; // Skip sync if moved less than 1km
        }
      }

      const url = `${API_ENDPOINTS.MOSQUES}?latitude=${latitude}&longitude=${longitude}&radius=5000`;
      const token = await AsyncStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }

      const response = await fetch(url, { headers });
      if (response.ok) {
        const data = await response.json();
        const results = Array.isArray(data) ? data : (data.results || []);
        await AsyncStorage.setItem('auto_silent_nearby_mosques_cache', JSON.stringify(results));
        await AsyncStorage.setItem('auto_silent_last_sync_coordinates', JSON.stringify({ latitude, longitude }));
      }
    } catch (e) {
      console.warn('Failed to sync nearby mosques:', e);
    }
  }

  /**
   * Fetch user-defined/crowdsourced mosques list.
   */
  async getCustomMosques(): Promise<CustomMosque[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_MOSQUES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Save a new custom mosque to the local database and sync with backend.
   */
  async addCustomMosque(name: string, latitude: number, longitude: number, radius: number = 50): Promise<CustomMosque> {
    const list = await this.getCustomMosques();
    const newMosque: CustomMosque = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name,
      latitude,
      longitude,
      radius,
    };
    list.push(newMosque);
    await AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_MOSQUES, JSON.stringify(list));

    // Sync to backend asynchronously
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }

      await fetch(API_ENDPOINTS.MOSQUES, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name,
          latitude,
          longitude,
          radius,
        }),
      });
    } catch (e) {
      console.warn('Failed to sync mosque to backend:', e);
    }

    return newMosque;
  }

  /**
   * Delete a custom mosque.
   */
  async removeCustomMosque(id: string): Promise<void> {
    let list = await this.getCustomMosques();
    list = list.filter(item => item.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_MOSQUES, JSON.stringify(list));
  }

  /**
   * Queries OSM Overpass API to find mosques within searchRadius meters.
   */
  private async queryOSMOverpass(lat: number, lng: number, radius: number): Promise<MosqueCheckResult> {
    const query = `[out:json][timeout:10];
    (
      node["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${lat},${lng});
      way["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${lat},${lng});
    );
    out body;`;

    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'As-Sunnah-App/1.0 (Mobile App; Android)'
        }
      });
      if (!response.ok) {
        throw new Error(`OSM Overpass returned status ${response.status}`);
      }

      const data = await response.json();
      if (data && data.elements && data.elements.length > 0) {
        const element = data.elements[0];
        const name = element.tags?.name || element.tags?.nameBn || element.tags?.nameEn || 'মসজিদ (OSM)';
        
        let distance: number | null = null;
        if (element.lat && element.lon) {
          distance = this.calculateDistance(lat, lng, element.lat, element.lon);
        }

        return {
          isInsideMosque: true,
          mosqueName: name,
          distance,
        };
      }
    } catch (e) {
      console.warn('OSM Overpass API request failed, trying fallback...', e);
    }

    return { isInsideMosque: false, mosqueName: null, distance: null };
  }

  /**
   * Queries Google Places API to find mosques.
   */
  private async queryGooglePlaces(lat: number, lng: number, radius: number, apiKey: string): Promise<MosqueCheckResult> {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=mosque&key=${apiKey}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Google Places returned status ${response.status}`);
      }

      const data = await response.json();
      if (data && data.results && data.results.length > 0) {
        const place = data.results[0];
        const name = place.name || 'মসজিদ';
        
        let distance: number | null = null;
        if (place.geometry && place.geometry.location) {
          distance = this.calculateDistance(lat, lng, place.geometry.location.lat, place.geometry.location.lng);
        }

        return {
          isInsideMosque: true,
          mosqueName: name,
          distance,
        };
      }
    } catch (e) {
      console.error('Google Places API request failed:', e);
    }

    return { isInsideMosque: false, mosqueName: null, distance: null };
  }

  /**
   * Calculates the distance between two points in meters using the Haversine formula.
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in meters
  }

  /**
   * Save Google Maps Places API key.
   */
  async setGoogleApiKey(key: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.GOOGLE_API_KEY, key);
  }

  /**
   * Retrieve Google Maps Places API key.
   */
  async getGoogleApiKey(): Promise<string | null> {
    return await AsyncStorage.getItem(STORAGE_KEYS.GOOGLE_API_KEY);
  }
}

export default new MosqueDetector();
