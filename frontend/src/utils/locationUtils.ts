/**
 * Utility functions for safely handling location data
 */

/**
 * Safely renders a location object as a string
 * @param location - The location object or string
 * @returns A formatted location string
 */
export const formatLocation = (location: any): string => {
  if (!location) return '';

  // If location is already a string, return it
  if (typeof location === 'string') {
    return location;
  }

  // If location is an object, format it
  if (typeof location === 'object') {
    const parts = [];

    if (location.city) parts.push(location.city);
    if (location.district) parts.push(location.district);
    if (location.province) parts.push(location.province);

    return parts.filter(Boolean).join(', ');
  }

  // Fallback for any other type
  return '';
};

/**
 * Safely renders any value as a string for React components
 * @param value - The value to render
 * @returns A safe string representation
 */
export const safeString = (value: any): string => {
  if (value === null || value === undefined) return '';

  if (typeof value === 'string') return value;

  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  if (typeof value === 'object') {
    // For location objects, format them properly
    if (value.city || value.district || value.province) {
      return formatLocation(value);
    }

    // For other objects, stringify them
    try {
      return JSON.stringify(value);
    } catch {
      return '[Object]';
    }
  }

  return String(value);
};

/**
 * Checks if a value is safe to render directly in React
 * @param value 
 * @returns 
 */
export const isSafeForRender = (value: any): boolean => {
  return typeof value === 'string' ||
         typeof value === 'number' ||
         value === null ||
         value === undefined;
};
