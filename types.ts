


export interface Station {
  name: string;
  description: string;
  timeZone: string;
  logo: string | null;
  radioFormat: 'Music Radio' | 'Talk Radio';
  vibe?: 'Upbeat' | 'Chill' | 'Playful' | 'Professional' | 'Default';
  enableAiWebResearch?: boolean;
  failoverPlaylistId?: string;
  streamUrl?: string;
}

export type StreamStatus = 'offline' | 'auto-dj' | 'live-dj' | 'failover';

export type Role = 'Admin' | 'User';

export interface User {
  id: string; // email
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: Role;
  tenantId: string;
  avatar?: string | null;
  credits: number;
  subscriptionPlan: 'Hobby' | 'Pro Broadcaster' | 'Network';
  renewalDate: string;
  status: 'active' | 'pending';
}

export interface CreditUsageLog {
  id: string;
  tenantId: string;
  userId: string;
  feature: string;
  creditsUsed: number;
  date: string;
}

export interface Campaign {
  id: string;
  tenantId: string;
  name: string;
  sponsor: string;
  startDate: string; // ISO Date string
  endDate: string; // ISO Date string
  status: 'active' | 'inactive' | 'completed';
  impressionGoal?: number;
  impressions: number;
  creativeIds: string[]; // Array of AdContent IDs
}

interface BaseContentItem {
  id: string;
  originalId?: string; // The ID of the source item in the main content library
  campaignId?: string; // The ID of the ad campaign this item belongs to
  tenantId: string;
  title: string;
  duration: string;
  date: string;
  useAiAnnouncer?: boolean;
  announcerVoice?: string;
  predefinedAnnouncement?: string;
  announcementWithBackgroundMusic?: boolean;
  isGeneratingAnnouncement?: boolean;
  deliveryStyle?: 'Energetic' | 'Whisper' | 'Conversational' | 'Formal Newscaster' | 'Default';
}

export interface MusicContent extends BaseContentItem {
  type: 'Music';
  artist: string;
  genre?: string;
  url?: string;
  file?: File;
  album?: string;
  year?: string;
  mood?: string;
  notes?: string;
}

export interface ArticleContent extends BaseContentItem {
  type: 'Article';
  content?: string;
}

export interface AdContent extends BaseContentItem {
  type: 'Ad';
  url?: string;
  file?: File;
}

export interface CustomAudioContent extends BaseContentItem {
  type: 'Custom Audio';
  artist: string;
  url?: string;
  file?: File;
}

export interface RssFeedContent extends BaseContentItem {
    type: 'RSS Feed';
    source: string;
    content?: string;
}

export type ContentItem = MusicContent | ArticleContent | AdContent | CustomAudioContent | RssFeedContent;

// Type guard to check if a content item is playable audio with a valid URL.
export function isPlayableContent(item: ContentItem): item is (MusicContent | AdContent | CustomAudioContent) & { url: string } {
    if (item.type === 'Music' || item.type === 'Ad' || item.type === 'Custom Audio') {
        return typeof item.url === 'string' && item.url.trim() !== '';
    }
    return false;
}

export interface Playlist {
    id: string;
    tenantId: string;
    name: string;
    description?: string;
    trackIds: string[];
    schedule: string;
}

export interface AudioContent {
  id:string;
  tenantId: string;
  vaultId?: string;
  type: 'Music' | 'Jingle' | 'Ad';
  filename: string;
  artist?: string;
  duration: string;
  genre: string;
  announceTrack: boolean;
  announcementVoice: string;
  announcementWithBackgroundMusic: boolean;
  dateTime: string;
  totalPlays: number;
  lastPlayed: string;
  published: boolean;
  url?: string;
  file?: File;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: ContentItem['type'];
}

export interface ArticleHistoryItem {
    id: string;
    tenantId: string;
    topic: string;
    content: string;
    date: string;
}

export interface SavedSchedule {
    id: string;
    tenantId: string;
    name: string;
    date: string;
    trackIds: string[];
}

export interface ClonedVoice {
  id: string;
  tenantId: string;
  name: string;
  status: 'Ready' | 'Processing';
  file?: File; // The uploaded audio sample
  url?: string; // Blob URL created for playback
}

export interface RssFeedSettings {
  id: string;
  tenantId: string;
  published: boolean;
  name: string;
  url: string;
  numberOfArticles: number; // 1-10
  parseFrequencyHours: number; // 1-24
  language: string;
  voice: string;
  readingSpeed: number; // 1-15
  backgroundMusic: string | null;
  autoDeleteOldContent: boolean;
  approveBeforeAiring: boolean;
  includeTitlesIntoBody: boolean;
  readOnlyTheTitle: boolean;
  mergeArticlesIntoOne: boolean;
  removePathsUrls: boolean;
  removeDuplicateText: boolean;
  disableSpellingOfCapitalizedWords: boolean;
  summarizeText: boolean;
  correctGrammar: boolean;
  reviseText: boolean;
  randomize: boolean;
  ignoreNegativeSentiment: boolean;
  ignoreByKeywords: boolean;
  keywordsToIgnore: string[];
  defaultFallbackMessage: string;
  introText: string;
  outroText: string;
  stringsToReplace: { from: string; to: string }[];
  schedules: string[];
}

// Add Clockwheel types for the Show Designer feature.
// FIX: Add 'Article' to ClockwheelBlockType to support talk radio formats.
export type ClockwheelBlockType = 'Music' | 'Ad' | 'Jingle' | 'News' | 'Weather' | 'StationID' | 'Promo' | 'Article' | 'Thematic';

export interface ClockwheelBlock {
    type: ClockwheelBlockType;
    /** For standard types, this is the number of items. For 'Thematic' type, this is the duration in minutes. */
    count: number;
    /** For standard types, this is a rule/genre filter. For 'Thematic' type, this is the theme prompt for the AI. */
    rule: string;
}

export interface Clockwheel {
    id: string;
    tenantId: string;
    name: string;
    blocks: ClockwheelBlock[];
}

export interface SocialPost {
  id: string;
  tenantId: string;
  platform: 'X' | 'Facebook';
  content: string;
  status: 'draft' | 'scheduled' | 'sent';
  scheduledAt?: string | null;
  createdAt: string;
}

export type SubmissionType = 'Shoutout' | 'Song Request';

export interface Submission {
  id: string;
  tenantId: string;
  type: SubmissionType;
  from: string;
  location?: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export type WebhookService = 'discord' | 'slack' | 'custom';

export interface Webhook {
    id: string;
    tenantId: string;
    name: string;
    url: string;
    service: WebhookService;
}

export interface WebsiteSettings {
  heroTitle: string;
  heroSubtitle: string;
  showFeatured: boolean;
  showSchedule: boolean;
  showBlog: boolean;
}

export interface PublicWebsiteData {
  settings: WebsiteSettings;
  station: Station;
  articles: ArticleContent[];
  schedule: ContentItem[];
}