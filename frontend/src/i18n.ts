import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      common: {
        appName: 'Naaya - The Nepali Network',
        reels: 'Reels'
      },
      nav: {
        home: 'Home',
        bazaar: 'Bazaar',
        messages: 'Messages',
        more: 'More',
        profile: 'Profile',
        settings: 'Settings',
        logout: 'Logout',
        appearance: 'Appearance',
        account: 'Account',
        privacy: 'Privacy',
        notifications: 'Notifications',
        english: 'English',
        nepali: 'Nepali',
        language: 'Language',
        mode: 'Mode',
        tagline: 'For the Nepali community',
        reels: 'Reels',
        createPost: 'Create Post',
        search: 'Search',
        explore: 'Explore',
        darkMode: 'Dark Mode',
        lightMode: 'Light Mode'
      },
      notifications: {
        notifications: 'Notifications',
        newLike: 'liked your post',
        newComment: 'commented on your post',
        newFollower: 'started following you',
        newMention: 'mentioned you',
        newMessage: 'sent you a message',
        storyReply: 'replied to your story',
        markAllRead: 'Mark all as read',
        noNotifications: 'No notifications yet',
        like: 'Like',
        comment: 'Comment',
        follow: 'Follow',
        mention: 'Mention',
        message: 'Message',
        story_reply: 'Story Reply',
        preferencesTitle: 'Notification Preferences',
        pushNotifications: 'Push Notifications',
        pushNotificationsDesc: 'Receive notifications on your device',
        emailNotifications: 'Email Notifications',
        emailNotificationsDesc: 'Get updates delivered to your inbox',
        soundEffects: 'Sound Effects',
        soundEffectsDesc: 'Play sounds when you receive notifications',
        enabled: 'Enabled',
        enable: 'Enable',
        loadingPreferences: 'Loading your preferences...'
      }
    }
  },
  ne: {
    translation: {
      common: {
        appName: 'नाया - नेपाली नेटवर्क',
        reels: 'रिल्स'
      },
      nav: {
        home: 'गृहपृष्ठ',
        bazaar: 'बजार',
        messages: 'सन्देश',
        more: 'थप',
        profile: 'प्रोफाइल',
        settings: 'सेटिङ',
        logout: 'लगआउट',
        appearance: 'रूप',
        account: 'खाता',
        privacy: 'गोपनीयता',
        notifications: 'सूचनाहरू',
        english: 'English',
        nepali: 'नेपाली',
        language: 'भाषा',
        mode: 'मोड',
        tagline: 'नेपाली समुदायको लागि',
        reels: 'रिल्स',
        createPost: 'पोस्ट सिर्जना गर्नुहोस्',
        search: 'खोज',
        explore: 'अन्वेषण',
        darkMode: 'डार्क मोड',
        lightMode: 'लाइट मोड'
      },
      notifications: {
        notifications: 'सूचनाहरू',
        newLike: 'तपाईको पोस्ट मन पराउनुभयो',
        newComment: 'तपाईको पोस्टमा कमेन्ट गर्नुभयो',
        newFollower: 'तपाईलाई फलो गर्न थाल्नुभयो',
        newMention: 'तपाईलाई उल्लेख गर्नुभयो',
        newMessage: 'तपाईलाई सन्देश पठाउनुभयो',
        storyReply: 'तपाईको स्टोरीमा जवाफ दिनुभयो',
        markAllRead: 'सबैलाई पढेको भन्नुहोस्',
        noNotifications: 'अहिलेसम्म कुनै सूचना छैन',
        like: 'मन पराउने',
        comment: 'कमेन्ट',
        follow: 'फलो',
        mention: 'उल्लेख',
        message: 'सन्देश',
        story_reply: 'स्टोरी जवाफ',
        preferencesTitle: 'सूचना प्राथमिकताहरू',
        pushNotifications: 'पुश सूचनाहरू',
        pushNotificationsDesc: 'तपाईंको उपकरणमा सूचनाहरू प्राप्त गर्नुहोस्',
        emailNotifications: 'इमेल सूचनाहरू',
        emailNotificationsDesc: 'तपाईंको इनबक्समा अपडेटहरू प्राप्त गर्नुहोस्',
        soundEffects: 'ध्वनि प्रभावहरू',
        soundEffectsDesc: 'तपाईंले सूचनाहरू प्राप्त गर्दा ध्वनि बजाउनुहोस्',
        enabled: 'सक्षम गरिएको',
        enable: 'सक्षम गर्नुहोस्',
        loadingPreferences: 'तपाईंका प्राथमिकताहरू लोड हुँदैछ...'
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: (localStorage.getItem('lang') as 'en' | 'ne') || 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false }
  });

export default i18n;

