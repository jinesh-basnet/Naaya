interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  district?: string;
  province?: string;
}

class LocationService {
  private locationData: LocationData | null = null;

  loadLocationFromStorage(): LocationData | null {
    const stored = localStorage.getItem('userLocation');
    return stored ? (JSON.parse(stored) as LocationData) : null;
  }

  async requestPermission(): Promise<{ granted: boolean; denied: boolean }> {
    return new Promise((resolve) => {
      if (!('geolocation' in navigator)) {
        resolve({ granted: false, denied: true });
        return;
      }

      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((permission) => {
        switch (permission.state) {
          case 'granted':
            resolve({ granted: true, denied: false });
            break;
          case 'denied':
            resolve({ granted: false, denied: true });
            break;
          default:
            resolve({ granted: false, denied: false });
        }
      }).catch(() => {
        // Fallback - try getCurrentPosition with error handling
        navigator.geolocation.getCurrentPosition(() => {
          resolve({ granted: true, denied: false });
        }, () => {
          resolve({ granted: false, denied: false });
        }, { timeout: 1000 });
      });
    });
  }

  async getCurrentPosition(): Promise<LocationData | null> {
    return new Promise((resolve) => {
      if (!('geolocation' in navigator)) {
        return resolve(null);
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };

          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${locationData.latitude}&lon=${locationData.longitude}&zoom=10`
            );
            const data = await response.json();
            
            locationData.city = data.address?.city || data.address?.town || data.address?.village;
            locationData.district = data.address?.county;
            locationData.province = data.address?.state;
          } catch (error) {
            console.error('Reverse geocode error', error);
          }

          this.locationData = locationData;
          localStorage.setItem('userLocation', JSON.stringify(locationData));
          resolve(locationData);
        },
        (error) => {
          console.error('Location error', error);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });
  }

  getLocationData(): LocationData | null {
    if (this.locationData) return this.locationData;
    return this.loadLocationFromStorage();
  }

  // Simplified distance for basic local content check
  isLocal(targetLat: number, targetLng: number, maxKm: number = 50): boolean {
    const current = this.getLocationData();
    if (!current) return false;

    // Simple Pythagorean approximation for small distances (Good enough for a student project)
    const ky = 40000 / 360;
    const kx = Math.cos(Math.PI * current.latitude / 180.0) * ky;
    const dx = Math.abs(current.longitude - targetLng) * kx;
    const dy = Math.abs(current.latitude - targetLat) * ky;
    return Math.sqrt(dx * dx + dy * dy) <= maxKm;
  }
}

export const locationService = new LocationService();
export type { LocationData };
