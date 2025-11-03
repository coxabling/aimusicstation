
import type { AudioContent } from '../types';

export interface VaultContentItem {
  id: string; // Unique ID within the vault
  category: 'Jingles & Stingers' | 'Promos & Sweepers' | 'Sound FX' | 'Music Beds';
  filename: string;
  duration: string;
  genre: string;
  url: string;
}

export const vaultContent: VaultContentItem[] = [
  { id: 'vc_jingle_01', category: 'Jingles & Stingers', filename: 'Upbeat Morning Jingle', duration: '0:15', genre: 'Broadcast', url: 'https://www.zapsplat.com/wp-content/uploads/2015/06/positive-news-jingle-1.mp3' },
  { id: 'vc_jingle_02', category: 'Jingles & Stingers', filename: 'News Intro Stinger', duration: '0:05', genre: 'Broadcast', url: 'https://www.zapsplat.com/wp-content/uploads/2015/06/news-jingle-2.mp3' },
  { id: 'vc_jingle_03', category: 'Jingles & Stingers', filename: 'Smooth Evening ID', duration: '0:10', genre: 'Broadcast', url: 'https://www.zapsplat.com/wp-content/uploads/2015/06/chill-out-jingle-1.mp3' },
  { id: 'vc_promo_01', category: 'Promos & Sweepers', filename: 'Weekend Show Promo', duration: '0:25', genre: 'Promo', url: 'https://www.zapsplat.com/wp-content/uploads/2015/06/funk-jingle-1.mp3' },
  { id: 'vc_promo_02', category: 'Promos & Sweepers', filename: 'Station Contest Sweeper', duration: '0:08', genre: 'Promo', url: 'https://www.zapsplat.com/wp-content/uploads/2015/06/electro-jingle-1.mp3' },
  { id: 'vc_sfx_01', category: 'Sound FX', filename: 'Whoosh Transition', duration: '0:03', genre: 'FX', url: 'https://www.zapsplat.com/wp-content/uploads/2015/06/swoosh_sfx_1.mp3' },
  { id: 'vc_sfx_02', category: 'Sound FX', filename: 'Digital Beep', duration: '0:02', genre: 'FX', url: 'https://www.zapsplat.com/wp-content/uploads/2015/06/beep_sfx_1.mp3' },
  { id: 'vc_sfx_03', category: 'Sound FX', filename: 'Record Scratch', duration: '0:04', genre: 'FX', url: 'https://www.zapsplat.com/wp-content/uploads/2015/06/dj_scratch_sfx_1.mp3' },
  { id: 'vc_music_01', category: 'Music Beds', filename: 'Upbeat Corporate Bed', duration: '2:10', genre: 'Corporate / Upbeat', url: 'https://www.zapsplat.com/wp-content/uploads/2015/06/corporate-business-5.mp3' },
  { id: 'vc_music_02', category: 'Music Beds', filename: 'Lofi Study Bed', duration: '2:38', genre: 'Lofi / Chill', url: 'https://www.zapsplat.com/wp-content/uploads/2015/06/lo-fi-hip-hop-1.mp3' },
  { id: 'vc_music_03', category: 'Music Beds', filename: 'Ambient Mystery Bed', duration: '2:01', genre: 'Ambient / Mysterious', url: 'https://www.zapsplat.com/wp-content/uploads/2015/06/ambient-mystery-1.mp3' },
  { id: 'vc_music_04', category: 'Music Beds', filename: 'Stylish Stomp Rock Bed', duration: '2:12', genre: 'Rock / Energetic', url: 'https://www.zapsplat.com/wp-content/uploads/2015/06/rock-stomp-1.mp3' },
  { id: 'vc_music_05', category: 'Music Beds', filename: 'Smooth Jazz Cafe Bed', duration: '3:05', genre: 'Jazz / Smooth', url: 'https://www.zapsplat.com/wp-content/uploads/2015/06/jazz-cafe-1.mp3' },
];

export const vaultCategories: VaultContentItem['category'][] = [
    'Jingles & Stingers',
    'Promos & Sweepers',
    'Sound FX',
    'Music Beds',
];

export const mapVaultItemToAudioContent = (item: VaultContentItem): Omit<AudioContent, 'id' | 'tenantId'> => {
    let type: 'Music' | 'Jingle' | 'Ad';
    switch (item.category) {
        case 'Music Beds':
            type = 'Music';
            break;
        case 'Promos & Sweepers':
            type = 'Ad';
            break;
        case 'Jingles & Stingers':
        case 'Sound FX':
        default:
            type = 'Jingle';
            break;
    }

    return {
        vaultId: item.id,
        type,
        filename: item.filename,
        artist: item.category,
        duration: item.duration,
        genre: item.genre,
        announceTrack: type === 'Music',
        announcementVoice: 'AI-Ayo (African Male)',
        announcementWithBackgroundMusic: true,
        dateTime: new Date().toLocaleString('en-US'),
        totalPlays: 0,
        lastPlayed: 'Never',
        published: true,
        url: item.url,
    };
};