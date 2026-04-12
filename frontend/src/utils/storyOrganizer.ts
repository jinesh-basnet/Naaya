import { Story, DisplayStoryItem } from '../types/stories';

export function groupStoriesByAuthorWithStatus(stories: Story[], currentUserId?: string): DisplayStoryItem[] {
  const authorMap = new Map<string, { author: any; stories: Story[]; hasUnseen: boolean; unseenCount: number }>();

  for (const story of stories) {
    const authorId = story.author._id;
    if (!authorMap.has(authorId)) {
      authorMap.set(authorId, {
        author: story.author,
        stories: [],
        hasUnseen: false,
        unseenCount: 0
      });
    }
    const authorData = authorMap.get(authorId)!;
    authorData.stories.push(story);
    if (story.hasViewed === false) {
      authorData.hasUnseen = true;
      authorData.unseenCount++;
    }
  }

  return Array.from(authorMap.values()).map(({ author, stories, hasUnseen, unseenCount }) => ({
    author,
    stories,
    hasUnseen,
    unseenCount
  }));
}


export function getUnseenStoriesCount(displayStories: DisplayStoryItem[]): number {
  return displayStories.reduce((total, item) => total + (item.unseenCount || 0), 0);
}


export function markStoriesAsSeen(displayStories: DisplayStoryItem[], authorId: string): DisplayStoryItem[] {
  return displayStories.map(item => {
    if (item.author._id === authorId) {
      return {
        ...item,
        hasUnseen: false,
        unseenCount: 0,
        stories: item.stories?.map(story => ({ ...story, hasViewed: true }))
      };
    }
    return item;
  });
}


export function organizeStories(stories: Story[], currentUserId?: string): DisplayStoryItem[] {
  const grouped = groupStoriesByAuthorWithStatus(stories, currentUserId);

  grouped.sort((a, b) => {
    if (a.hasUnseen && !b.hasUnseen) return -1;
    if (!a.hasUnseen && b.hasUnseen) return 1;

    const aLatest = a.stories?.[0]?.createdAt || '';
    const bLatest = b.stories?.[0]?.createdAt || '';
    return new Date(bLatest).getTime() - new Date(aLatest).getTime();
  });

  return grouped;
}


export function sortStoriesClientSide(stories: Story[], sortType: 'unseen_first' | 'createdAt' = 'createdAt'): Story[] {
  if (sortType === 'unseen_first') {
    return [...stories].sort((a, b) => {
      const aUnseen = a.hasViewed === false;
      const bUnseen = b.hasViewed === false;
      if (aUnseen && !bUnseen) return -1;
      if (!aUnseen && bUnseen) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  return [...stories].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
