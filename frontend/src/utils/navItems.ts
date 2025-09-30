import { IconType } from 'react-icons';
import { FaHome, FaVideo, FaCompass, FaUser, FaCog, FaSignOutAlt } from 'react-icons/fa';

export interface NavItem {
  icon: IconType;
  labelKey: string; 
  path: string;
  showBadge?: boolean; 
}

export const getNavItems = (t: (key: string) => string): NavItem[] => [
  { icon: FaHome, labelKey: 'nav.home', path: '/home' },
  { icon: FaCompass, labelKey: 'nav.explore', path: '/explore' },
  { icon: FaVideo, labelKey: 'nav.reels', path: '/reels' },
  { icon: FaUser, labelKey: 'nav.profile', path: '/profile' },
];

export const userNavItems = (t: (key: string) => string): NavItem[] => [
  { icon: FaCog, labelKey: 'nav.settings', path: '/settings' },
  { icon: FaSignOutAlt, labelKey: 'nav.logout', path: '/logout' },
];
