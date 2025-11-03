
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
  { id: 'vc_jingle_01', category: 'Jingles & Stingers', filename: 'Upbeat Morning Jingle', duration: '0:15', genre: 'Broadcast', url: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Monplaisir/Happy_Holidays/Monplaisir_-_02_-_Cant_Stop_Me_Now.mp3' },
  { id: 'vc_jingle_02', category: 'Jingles & Stingers', filename: 'News Intro Stinger', duration: '0:05', genre: 'Broadcast', url: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Monplaisir/Antigravity/Monplaisir_-_04_-_Antigravity.mp3' },
  { id: 'vc_jingle_03', category: 'Jingles & Stingers', filename: 'Smooth Evening ID', duration: '0:10', genre: 'Broadcast', url: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/ccCommunity/E_s_Jammy_Jams/The_Jazz_Piano/E_s_Jammy_Jams_-_The_Jazz_Piano.mp3' },
  { id: 'vc_promo_01', category: 'Promos & Sweepers', filename: 'Weekend Show Promo', duration: '0:25', genre: 'Promo', url: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/ccCommunity/Silence_Is_Sexy/This_Aint_Hollywood/Silence_Is_Sexy_-_02_-_Talk.mp3' },
  { id: 'vc_promo_02', category: 'Promos & Sweepers', filename: 'Station Contest Sweeper', duration: '0:08', genre: 'Promo', url: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Monplaisir/Antigravity/Monplaisir_-_04_-_Antigravity.mp3' },
  { id: 'vc_sfx_01', category: 'Sound FX', filename: 'Whoosh Transition', duration: '0:03', genre: 'FX', url: 'https://archive.org/download/Soundeffects-Swishes-01/Swoosh%201.mp3' },
  { id: 'vc_sfx_02', category: 'Sound FX', filename: 'Digital Beep', duration: '0:02', genre: 'FX', url: 'https://archive.org/download/Soundeffects-UI-01/Ui%2072.mp3' },
  { id: 'vc_sfx_03', category: 'Sound FX', filename: 'Record Scratch', duration: '0:04', genre: 'FX', url: 'https://archive.org/download/Soundeffects-Scratches-01/Scratch%205.mp3' },
  { id: 'vc_music_01', category: 'Music Beds', filename: 'Upbeat Corporate Bed', duration: '2:10', genre: 'Corporate / Upbeat', url: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Monplaisir/Antigravity/Monplaisir_-_04_-_Antigravity.mp3' },
  { id: 'vc_music_02', category: 'Music Beds', filename: 'Lofi Study Bed', duration: '2:38', genre: 'Lofi / Chill', url: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Monplaisir/Happy_Holidays/Monplaisir_-_02_-_Cant_Stop_Me_Now.mp3' },
  { id: 'vc_music_03', category: 'Music Beds', filename: 'Ambient Mystery Bed', duration: '2:01', genre: 'Ambient / Mysterious', url: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Lobo_Loco/Tree_of_Meditation/Lobo_Loco_-_01_-_Tree_of_Meditation_INSTRUMENTAL.mp3' },
  { id: 'vc_music_04', category: 'Music Beds', filename: 'Stylish Stomp Rock Bed', duration: '2:12', genre: 'Rock / Energetic', url: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/ccCommunity/Silence_Is_Sexy/This_Aint_Hollywood/Silence_Is_Sexy_-_02_-_Talk.mp3' },
  { id: 'vc_music_05', category: 'Music Beds', filename: 'Smooth Jazz Cafe Bed', duration: '3:05', genre: 'Jazz / Smooth', url: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/ccCommunity/E_s_Jammy_Jams/The_Jazz_Piano/E_s_Jammy_Jams_-_The_Jazz_Piano.mp3' },
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