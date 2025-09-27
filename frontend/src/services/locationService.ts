interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  district?: string;
  province?: string;
  accuracy?: number;
}

interface LocationPermissionState {
  granted: boolean;
  denied: boolean;
  prompt: boolean;
}

class LocationService {
  private locationData: LocationData | null = null;
  private permissionState: LocationPermissionState = {
    granted: false,
    denied: false,
    prompt: true
  };

  async requestPermission(): Promise<LocationPermissionState> {
    if (!('geolocation' in navigator)) {
      throw new Error('Geolocation is not supported by this browser');
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      this.updatePermissionState(result.state);

      if (result.state === 'granted') {
        await this.getCurrentPosition();
      }

      return this.permissionState;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return this.permissionState;
    }
  }

  async getCurrentPosition(): Promise<LocationData | null> {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };

          // Try to get location details from reverse geocoding
          try {
            const addressDetails = await this.reverseGeocode(
              locationData.latitude,
              locationData.longitude
            );
            locationData.city = addressDetails.city;
            locationData.district = addressDetails.district;
            locationData.province = addressDetails.province;
          } catch (error) {
            console.warn('Reverse geocoding failed:', error);
          }

          this.locationData = locationData;
          this.saveLocationToStorage(locationData);
          resolve(locationData);
        },
        (error) => {
          console.error('Error getting location:', error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 
        }
      );
    });
  }

  private async reverseGeocode(lat: number, lng: number): Promise<{
    city?: string;
    district?: string;
    province?: string;
  }> {
    try {
      // Using OpenStreetMap Nominatim API for reverse geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`
      );

      if (!response.ok) {
        throw new Error('Reverse geocoding request failed');
      }

      const data = await response.json();

      return {
        city: data.address?.city || data.address?.town || data.address?.village,
        district: data.address?.county || data.address?.state_district,
        province: data.address?.state
      };
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return {};
    }
  }

  private updatePermissionState(state: PermissionState): void {
    this.permissionState = {
      granted: state === 'granted',
      denied: state === 'denied',
      prompt: state === 'prompt'
    };
  }

  private saveLocationToStorage(location: LocationData): void {
    try {
      localStorage.setItem('userLocation', JSON.stringify(location));
      localStorage.setItem('locationTimestamp', Date.now().toString());
    } catch (error) {
      console.warn('Failed to save location to storage:', error);
    }
  }

  loadLocationFromStorage(): LocationData | null {
    try {
      const locationStr = localStorage.getItem('userLocation');
      const timestampStr = localStorage.getItem('locationTimestamp');

      if (locationStr && timestampStr) {
        const timestamp = parseInt(timestampStr);
        const age = Date.now() - timestamp;

        // Location data expires after 1 hour
        if (age < 60 * 60 * 1000) {
          return JSON.parse(locationStr);
        } else {
          // Clear expired data
          localStorage.removeItem('userLocation');
          localStorage.removeItem('locationTimestamp');
        }
      }
    } catch (error) {
      console.warn('Failed to load location from storage:', error);
    }

    return null;
  }

  getLocationData(): LocationData | null {
    return this.locationData || this.loadLocationFromStorage();
  }

  getPermissionState(): LocationPermissionState {
    return this.permissionState;
  }

  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; 
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Check if content is considered "local" (within 50km)
  isLocalContent(contentLat: number, contentLng: number, maxDistance: number = 50): boolean {
    const userLocation = this.getLocationData();
    if (!userLocation) return false;

    const distance = this.calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      contentLat,
      contentLng
    );

    return distance <= maxDistance;
  }
}

export const locationService = new LocationService();
export type { LocationData, LocationPermissionState };
