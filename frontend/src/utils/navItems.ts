import { IconType } from 'react-icons';
import { FaHome, FaBell, FaVideo, FaCompass, FaComment, FaUser, FaCog } from 'react-icons/fa';

export interface NavItem {
  icon: IconType;
  labelKey: string; // Translation key, e.g., 'nav.home'
  path: string;
  showBadge?: boolean; // For items like notifications, messages
}

export const getNavItems = (t: (key: string) => string): NavItem[] => [
  { icon: FaHome, labelKey: 'nav.home', path: '/home' },
  { icon: FaBell, labelKey: 'nav.notification', path: '/notifications', showBadge: true },
  { icon: FaComment, labelKey: 'nav.messages', path: '/messages', showBadge: true },
  { icon: FaCompass, labelKey: 'nav.explore', path: '/explore' },
  { icon: FaVideo, labelKey: 'nav.reels', path: '/reels' },
];

export const moreNavItems = (t: (key: string) => string): NavItem[] => [
  { icon: FaHome, labelKey: 'nav.home', path: '/home' },
  // Add more secondary items if needed, e.g., Bookmarks, Settings
];

export const userNavItems = (t: (key: string) => string): NavItem[] => [
  { icon: FaUser, labelKey: 'nav.profile', path: '/profile' }, // Dynamic username handled in component
  { icon: FaCog, labelKey: 'nav.settings', path: '/settings' },
];
