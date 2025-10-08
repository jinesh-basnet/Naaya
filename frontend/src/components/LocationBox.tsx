import React from 'react';
import { FaMapMarkerAlt } from 'react-icons/fa';
import { LocationData } from '../services/locationService';

interface LocationBoxProps {
  locationData: LocationData | null;
}

const LocationBox: React.FC<LocationBoxProps> = ({ locationData }) => {
  if (!locationData) return null;

  return (
    <div className="location-box">
      <FaMapMarkerAlt className="icon" />
      <span>
        Showing content near {locationData.city || 'your location'}
      </span>
      <span className="chip location-chip">
        Local
      </span>
    </div>
  );
};

export default LocationBox;
