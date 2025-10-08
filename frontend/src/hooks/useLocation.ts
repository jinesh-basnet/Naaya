import { useState, useEffect } from 'react';
import { locationService, LocationData } from '../services/locationService';
import toast from 'react-hot-toast';

export const useLocation = () => {
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [showLocationAlert, setShowLocationAlert] = useState(false);

  useEffect(() => {
    const initializeLocation = async () => {
      try {
        const storedLocation = locationService.loadLocationFromStorage();
        if (storedLocation) {
          setLocationData(storedLocation);
          setLocationPermission('granted');
        } else {
          const permission = await locationService.requestPermission();
          setLocationPermission(permission.granted ? 'granted' : permission.denied ? 'denied' : 'prompt');

          if (permission.granted) {
            const location = await locationService.getCurrentPosition();
            if (location) {
              setLocationData(location);
              toast.success(`Location detected: ${location.city || 'Unknown location'}`);
            }
          } else if (permission.denied) {
            setShowLocationAlert(true);
          }
        }
      } catch (error) {
        console.error('Location initialization failed:', error);
        setLocationPermission('denied');
        setShowLocationAlert(true);
      }
    };

    initializeLocation();
  }, []);

  const handleEnableLocation = async () => {
    try {
      const permission = await locationService.requestPermission();
      setLocationPermission(permission.granted ? 'granted' : 'denied');

      if (permission.granted) {
        const location = await locationService.getCurrentPosition();
        if (location) {
          setLocationData(location);
          setShowLocationAlert(false);
          toast.success(`Location detected: ${location.city || 'Unknown location'}`);
        }
      }
    } catch (error) {
      toast.error('Failed to get location permission');
    }
  };

  return { locationData, locationPermission, showLocationAlert, handleEnableLocation };
};
