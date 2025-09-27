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
        english: 'English',
        nepali: 'Nepali',
        tagline: 'For the Nepali community',
        reels: 'Reels',
        createPost: 'Create Post'
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
        story_reply: 'Story Reply'
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
        english: 'English',
        nepali: 'नेपाली',
        tagline: 'नेपाली समुदायको लागि',
        reels: 'रिल्स',
        createPost: 'पोस्ट सिर्जना गर्नुहोस्'
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
        story_reply: 'स्टोरी जवाफ'
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

