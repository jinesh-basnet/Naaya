import React from 'react';
import { FaMapMarkerAlt } from 'react-icons/fa';

interface LocationAlertProps {
  showLocationAlert: boolean;
  locationPermission: 'granted' | 'denied' | 'prompt';
  handleEnableLocation: () => void;
}

const LocationAlert: React.FC<LocationAlertProps> = ({ showLocationAlert, locationPermission, handleEnableLocation }) => {
  if (!showLocationAlert || locationPermission !== 'denied') return null;

  return (
    <div className="alert">
      Enable location to see posts from people near you and discover local content!
      <button
        className="alert-button"
        onClick={handleEnableLocation}
      >
        <FaMapMarkerAlt className="icon" />
        Enable Location
      </button>
    </div>
  );
};

export default LocationAlert;
