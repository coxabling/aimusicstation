import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect, useRef } from 'react';
// FIX: Import StreamStatus to use it in the context.
import { ContentItem, isPlayableContent, AudioContent, MusicContent, AdContent, CustomAudioContent, Station, Campaign, Clockwheel, Webhook, User, StreamStatus } from '../types';
import { useContent } from './ContentContext';
import { GoogleGenAI, Modality } from '@google/genai';
import { generateWithRetry, handleAiError } from '../services/ai';
import * as db from '../services/db';
import { useAuth } from './AuthContext';
import { generateSchedule, generateScheduleFromClockwheel } from '../services/playoutGenerator';
import { useToast } from './ToastContext';

type PlaybackState = 'stopped' | 'playing' | 'paused';

interface SavedPlayoutState {
    queueIndex: number;
    time: number;
    playbackState: PlaybackState;
}

export type PlayoutHistoryItem = ContentItem & { playedAt: Date };

interface PlayerContextType {
    currentItem: ContentItem | null;
    playbackState: PlaybackState;
    isPreviewing: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    isMuted: boolean;
    playoutQueue: ContentItem[];
    currentQueueIndex: number;
    albumArtUrl: string | null;
    isGeneratingAnnouncements: boolean;
    announcementGenerationProgress: number;
    playoutHistory: PlayoutHistoryItem[];
    isAiProgramDirectorActive: boolean;
    // FIX: Add streamStatus to the context type for Dashboard.tsx
    streamStatus: StreamStatus;
    
    setIsAiProgramDirectorActive: (isActive: boolean) => void;
    loadSchedule: (items: ContentItem[]) => void;
    generateScheduleAndAnnouncements: (allContent: ContentItem[], campaigns: Campaign[], stationFormat: Station['radioFormat'], scheduleLengthHours: number, clockwheel?: Clockwheel) => Promise<void>;
    playPreview: (item: ContentItem) => void;
    returnToPlayout: () => void;
    togglePlayPause: () => void;
    playNext: () => void;
    playPrevious: () => void;
    seek: (time: number) => void;
    beginSeek: () => void;
    endSeek: () => void;
    setVolume: (volume: number) => void;
    setIsMuted: (isMuted: boolean) => void;
    reorderQueue: (startIndex: number, endIndex: number) => void;
    removeFromQueue: (index: number) => void;
    addToQueue: (items: ContentItem[]) => void;
    shuffleQueue: () => void;
    updateQueueItem: (index: number, item: ContentItem) => void;
    handleListenerLike: (likedItem: ContentItem) => void;
    // FIX: Add start/end live broadcast functions for LiveDJModal.tsx
    startLiveDJBroadcast: () => void;
    endLiveDJBroadcast: () => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

const parseDuration = (durationStr: string): number => {
    if (!durationStr || !durationStr.includes(':')) return 30;
    const parts = durationStr.split(':').map(Number);
    return parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) ? parts[0] * 60 + parts[1] : 30;
};

// --- AUDIO & AI HELPERS ---

const sanitizeForTTS = (text: string): string => {
  if (!text) return '';
  // Remove parenthetical cues (e.g., "(with excitement)"), markdown characters, and collapse whitespace.
  // This helps prevent errors with the TTS model which expects clean, spoken-word text.
  return text
    .replace(/\(.*?\)/g, '') // Remove (anything in parentheses)
    .replace(/[*_#`]/g, '')    // Remove markdown characters
    .replace(/—/g, '-')       // Replace em-dash
    .replace(/…/g, '...')     // Replace ellipsis character
    .replace(/\s{2,}/g, ' ')  // Collapse multiple whitespace characters into a single space
    .trim();
};

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function getAnnouncerVoiceName(voice: string): string {
    switch (voice) {
        case 'AI-David': return 'Puck';
        case 'AI-Sarah': return 'Kore';
        case 'AI-Ayo (African Male)': return 'Fenrir';
        case 'AI-Zola (African Female)': return 'Charon';
        default: return 'Zephyr';
    }
}

const getPersonaPrompt = (vibe: string): string => {
    switch (vibe) {
        case 'Upbeat':
            return 'You are a high-energy DJ for a top 40 station. Your intros are fast, exciting, and get people pumped up.';
        case 'Chill':
            return 'You are the host of a late-night ambient music show. Your delivery is calm, smooth, and reflective.';
        case 'Playful':
            return 'You are a witty and slightly quirky radio host. You enjoy sharing interesting facts and have a fun, engaging delivery.';
        case 'Professional':
            return 'You are a professional broadcast announcer. Your delivery is clear, concise, and informative.';
        default:
            return 'You are a friendly and engaging radio host.';
    }
};

async function generateAnnouncementText(item: ContentItem, previousItem: ContentItem | null): Promise<string> {
    try {
        const savedSettings = localStorage.getItem('stationSettings');
        const stationSettings = savedSettings ? JSON.parse(savedSettings) : {};
        const stationVibe = stationSettings.vibe || 'Default';
        const persona = getPersonaPrompt(stationVibe);

        let prompt = `${persona} Your task is to introduce a piece of content.`;

        if (previousItem) {
            prompt += ` The previous item was "${previousItem.title}"${previousItem.type === 'Music' && 'artist' in previousItem ? ` by ${previousItem.artist}` : ''}. Create a smooth transition from that to the next item.`;
        }
        
        let contentDetails = '';
        switch(item.type) {
            case 'Music':
                contentDetails = `The next song is "${item.title}" by "${item.artist}".
                Album: ${item.album || 'N/A'}
                Year: ${item.year || 'N/A'}
                Mood/Tags: ${item.mood || 'N/A'}
                Note: ${item.notes || 'N/A'}`;
                break;
            case 'Ad':
                 contentDetails = `The next item is an advertisement titled "${item.title}".`;
                 break;
            case 'Custom Audio':
                 contentDetails = `The next item is a piece of custom audio titled "${item.title}" from "${item.artist}".`;
                 break;
            default:
                 contentDetails = `The next item is titled "${item.title}".`;
                 break;
        }

        prompt += `\nHere are the details:\n${contentDetails}`;
        
        prompt += `\nWrite the announcement in a way that sounds natural and engaging for a radio broadcast. The text itself should convey the intended emotion and energy, without using special cues like parentheses. For example, instead of writing "(Excitedly) Here's the next song!", you should write something like "Get ready for this next one! It's a banger!". Keep the announcement under 20 seconds when read aloud.`;
        
        const generateContentRequest: any = { model: 'gemini-2.5-flash', contents: prompt };
        
        if (stationSettings.enableAiWebResearch && item.type === 'Music') {
            generateContentRequest.config = { tools: [{ googleSearch: {} }] };
            prompt += `\nIf there's no specific note provided, use your search tool to find one brief, interesting, radio-friendly fact about the song or artist to share.`
        }
        
        generateContentRequest.contents = prompt;

        const response = await generateWithRetry(generateContentRequest);
        return response.text;
    } catch (error) {
        console.error("Error generating announcement text:", error);
        // Return a simple fallback on error during pre-generation
        return `Up next: ${item.title}.`;
    }
}

const mapAudioToContentItem = (audio: AudioContent, currentUser: User): ContentItem | null => {
    if (audio.type === 'Music') {
        return {
            id: audio.id,
            tenantId: currentUser.tenantId,
            title: audio.filename,
            type: 'Music',
            artist: audio.artist || 'Unknown',
            duration: audio.duration,
            date: audio.dateTime,
            url: audio.url,
            file: audio.file,
            genre: audio.genre,
            useAiAnnouncer: audio.announceTrack,
            announcerVoice: audio.announcementVoice,
            announcementWithBackgroundMusic: audio.announcementWithBackgroundMusic,
        };
    }
    if (audio.type === 'Jingle' || audio.type === 'Ad') {
        return {
            id: audio.id,
            tenantId: currentUser.tenantId,
            title: audio.filename,
            type: audio.type === 'Jingle' ? 'Custom Audio' : 'Ad',
            artist: audio.artist || (audio.type === 'Jingle' ? 'Station Audio' : 'Advertisement'),
            duration: audio.duration,
            date: audio.dateTime,
            url: audio.url,
            file: audio.file,
        };
    }
    return null;
}

export const PlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { contentItems, audioContentItems, isLoading: isContentLoading } = useContent();
    const { currentUser, deductCredits } = useAuth();
    const { addToast } = useToast();
    const [playoutQueue, setPlayoutQueue] = useState<ContentItem[]>([]);
    const [currentQueueIndex, setCurrentQueueIndex] = useState(-1);
    const [playbackState, setPlaybackState] = useState<PlaybackState>('stopped');
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(0.75);
    const [isMuted, setIsMuted] = useState(false);
    const [albumArtUrl, setAlbumArtUrl] = useState<string | null>(null);

    const [isPreviewing, setIsPreviewing] = useState(false);
    const [previewItem, setPreviewItem] = useState<ContentItem | null>(null);
    const [savedPlayoutState, setSavedPlayoutState] = useState<SavedPlayoutState | null>(null);
    const [isAiProgramDirectorActive, setIsAiProgramDirectorActive] = useState(false);
    // FIX: Add state for stream status and live DJ mode.
    const [streamStatus, setStreamStatus] = useState<StreamStatus>('offline');
    const wasPlayingBeforeLiveRef = useRef(false);

    const [isGeneratingAnnouncements, setIsGeneratingAnnouncements] = useState(false);
    const [announcementGenerationProgress, setAnnouncementGenerationProgress] = useState(0);
    const [playoutHistory, setPlayoutHistory] = useState<PlayoutHistoryItem[]>([]);
    const [webhooks, setWebhooks] = useState<Webhook[]>([]);

    const audioRefs = [useRef<HTMLAudioElement>(null), useRef<HTMLAudioElement>(null)];
    const activePlayerIndex = useRef(0);
    const isSeeking = useRef(false);
    const nonAudioTimerRef = useRef<number | null>(null);
    const countedImpressionsRef = useRef(new Set<string>());
    
    const announcementAudioContextRef = useRef<AudioContext | null>(null);
    const announcementSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const currentArticleBufferRef = useRef<AudioBuffer | null>(null);
    const articleResumeTimeRef = useRef(0);

    const fadeIntervalRef = useRef<number | null>(null);
    const isDuckingRef = useRef(false);
    const isCrossfadingRef = useRef(false);
    const albumArtCache = useRef(new Map<string, string>());
    const generationIdRef = useRef(0);
    const prevQueueIndexRef = useRef(-1);
    
    useEffect(() => {
        const loadWebhooks = async () => {
            if (currentUser) {
                const userWebhooks = await db.getAllWebhooks(currentUser.tenantId);
                setWebhooks(userWebhooks);
            }
        };
        loadWebhooks();
    }, [currentUser]);

    const postToWebhook = async (webhook: Webhook, item: ContentItem) => {
        if (item.type !== 'Music') return; // Only post for music tracks
        
        let payload: any;
        const artist = item.artist || 'Unknown Artist';
        const title = item.title || 'Unknown Title';
        
        switch (webhook.service) {
            case 'discord':
                payload = {
                    embeds: [{
                        title: "Now Playing",
                        description: `**${title}**\nby ${artist}`,
                        color: 3447003, // Blue
                        thumbnail: { url: albumArtUrl || '' },
                        footer: { text: "Powered by AI Music Station" }
                    }]
                };
                break;
            case 'slack':
                payload = {
                    text: `Now Playing: *${title}* by ${artist}`
                };
                break;
            default: // custom
                payload = {
                    now_playing: {
                        title: title,
                        artist: artist,
                        album_art: albumArtUrl || null,
                    }
                };
                break;
        }

        try {
            await fetch(webhook.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (error) {
            console.error(`Failed to post to webhook "${webhook.name}":`, error);
        }
    };

    const getActivePlayer = () => audioRefs[activePlayerIndex.current].current;
    const getNextPlayer = () => audioRefs[1 - activePlayerIndex.current].current;

    const currentItem = isPreviewing ? previewItem : playoutQueue[currentQueueIndex] || null;

    const fetchAlbumArt = useCallback(async (artist: string, title: string): Promise<string | null> => {
        const cacheKey = `${artist}|${title}`.toLowerCase();
        if (albumArtCache.current.has(cacheKey)) {
            return albumArtCache.current.get(cacheKey) || null;
        }

        try {
            const searchTerm = `${artist} ${title}`;
            const url = `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=song&limit=1`;
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`iTunes API request failed with status ${response.status}`);
            }
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
                const artworkUrl = data.results[0].artworkUrl100;
                // Get a higher resolution image if possible
                const highResUrl = artworkUrl.replace('100x100', '600x600');
                albumArtCache.current.set(cacheKey, highResUrl);
                return highResUrl;
            }
            return null;
        } catch (error) {
            console.error('Failed to fetch album art:', error);
            return null;
        }
    }, []);

    const fadeVolume = useCallback((player: HTMLAudioElement, targetVolume: number, duration: number = 500): Promise<void> => {
        return new Promise(resolve => {
            if (!player) return resolve();
            if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
            const startVolume = player.volume;
            if (Math.abs(startVolume - targetVolume) < 0.01) {
                player.volume = targetVolume;
                return resolve();
            }
            const steps = 50;
            const stepDuration = duration / steps;
            const volumeChangePerStep = (targetVolume - startVolume) / steps;
            let currentStep = 0;
            fadeIntervalRef.current = setInterval(() => {
                currentStep++;
                let newVolume = startVolume + (volumeChangePerStep * currentStep);
                if ((volumeChangePerStep > 0 && newVolume >= targetVolume) || (volumeChangePerStep < 0 && newVolume <= targetVolume) || currentStep >= steps) {
                    clearInterval(fadeIntervalRef.current!);
                    fadeIntervalRef.current = null;
                    player.volume = targetVolume;
                    resolve();
                    return;
                }
                player.volume = newVolume;
            }, stepDuration);
        });
    }, []);

    const playNext = useCallback((isCrossfade = false) => {
        if (isPreviewing) {
            setPlaybackState('stopped'); return;
        }
        
        setCurrentQueueIndex(prevIndex => {
            const nextIndex = prevIndex + 1;
            if (nextIndex < playoutQueue.length) {
                if (!isCrossfade) {
                    getActivePlayer()?.pause();
                    setPlaybackState('playing');
                }
                setCurrentTime(0);
                return nextIndex;
            }
            setPlaybackState('stopped');
            return -1;
        });
    }, [isPreviewing, playoutQueue.length]);

    const onTrackEnd = useCallback(() => {
        playNext(isCrossfadingRef.current);
    }, [playNext]);

    const handleTimeUpdate = useCallback(() => {
        const player = getActivePlayer();
        if (!player || isSeeking.current) return;

        const { currentTime, duration } = player;
        setCurrentTime(currentTime);
        setDuration(duration);

        const nextItem = playoutQueue[currentQueueIndex + 1];
        if (duration > 0 && duration - currentTime < 1.5 && nextItem && isPlayableContent(nextItem) && !isCrossfadingRef.current && !isDuckingRef.current) {
            isCrossfadingRef.current = true;
            const activePlayer = getActivePlayer();
            const nextPlayer = getNextPlayer();
            
            if (activePlayer) {
                fadeVolume(activePlayer, 0, 1500).then(() => {
                    activePlayer.pause();
                });
            }

            if (nextPlayer) {
                nextPlayer.volume = 0;
                nextPlayer.play().catch(e => console.error("Next player failed to play:", e));
                fadeVolume(nextPlayer, isMuted ? 0 : volume, 1500);
            }
            playNext(true);
        }
    }, [currentQueueIndex, playoutQueue, isMuted, volume, playNext, fadeVolume]);
    
    const playContentDirectly = useCallback((player: HTMLAudioElement, item: (MusicContent | AdContent | CustomAudioContent) & { url: string }) => {
        if (!player || !item || !item.url) {
            if (item) {
                console.error(`Skipping track due to invalid URL: ${item.title}`, item);
            }
            onTrackEnd(); // Skip to next track
            return;
        }
    
        const errorHandler = (event: Event) => {
            const mediaError = (event.target as HTMLAudioElement).error;
            console.error(`Audio error for "${item.title}" (ID: ${item.id}):`, mediaError?.message, `(Code: ${mediaError?.code})`);
            onTrackEnd();
        };
    
        const playPromise = () => {
            player.removeEventListener('error', errorHandler); // Clean up previous error listener
            player.addEventListener('error', errorHandler, { once: true });
            player.play().catch(error => {
                if (error.name !== 'AbortError') {
                    console.error(`Audio play failed for "${item.title}":`, error);
                }
            });
        };
    
        if (player.src !== item.url) {
            player.src = item.url;
            player.load();
            player.addEventListener('canplaythrough', playPromise, { once: true });
        } else {
            playPromise();
        }
    }, [onTrackEnd]);

    const playArticleTTS = useCallback((buffer: AudioBuffer, offset: number) => {
        if (announcementSourceRef.current) {
            announcementSourceRef.current.onended = null;
            try { announcementSourceRef.current.stop(); } catch(e){}
        }
        if (!announcementAudioContextRef.current) return;
        
        const ctx = announcementAudioContextRef.current;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);

        const startTime = ctx.currentTime - offset;
        
        if (nonAudioTimerRef.current) clearInterval(nonAudioTimerRef.current);
        nonAudioTimerRef.current = window.setInterval(() => {
            setCurrentTime(ctx.currentTime - startTime);
        }, 250);

        source.onended = () => {
            if (announcementSourceRef.current === source) {
                const elapsedTime = ctx.currentTime - startTime;
                if (elapsedTime >= buffer.duration - 0.2) {
                    playNext();
                }
            }
        };

        source.start(0, offset);
        announcementSourceRef.current = source;
    }, [playNext]);
    
    useEffect(() => {
        if (!isPreviewing && prevQueueIndexRef.current !== -1 && prevQueueIndexRef.current < playoutQueue.length) {
            const finishedItem = playoutQueue[prevQueueIndexRef.current];
            if (finishedItem) {
                setPlayoutHistory(prev => [{ ...finishedItem, playedAt: new Date() }, ...prev].slice(0, 20));
            }
        }
        prevQueueIndexRef.current = currentQueueIndex;

        const currentGenerationId = generationIdRef.current;
        const activePlayer = getActivePlayer();
        const nextPlayer = getNextPlayer();
        
        const cleanup = () => {
            if (nonAudioTimerRef.current) clearInterval(nonAudioTimerRef.current);
            if (announcementSourceRef.current) {
                announcementSourceRef.current.onended = null;
                try { announcementSourceRef.current.stop(); } catch(e){}
            }
            currentArticleBufferRef.current = null;
            activePlayer?.pause();
        };

        const handlePlayout = async () => {
            cleanup();
            if (!currentItem || playbackState !== 'playing') {
                setAlbumArtUrl(null);
                return;
            }
            
            let artUrl: string | null = null;
            if (currentItem.type === 'Music' && 'artist' in currentItem) {
                artUrl = await fetchAlbumArt(currentItem.artist, currentItem.title);
                setAlbumArtUrl(artUrl);
            } else {
                setAlbumArtUrl(null);
            }

            if (webhooks.length > 0) {
                webhooks.forEach(hook => postToWebhook(hook, { ...currentItem, albumArtUrl: artUrl } as any));
            }

            if (currentItem.type === 'Ad' && currentItem.campaignId && currentUser && !countedImpressionsRef.current.has(currentItem.id)) {
                db.incrementCampaignImpressions(currentItem.campaignId, currentUser.tenantId)
                    .then(() => {
                        countedImpressionsRef.current.add(currentItem.id);
                        console.log(`Impression counted for campaign: ${currentItem.campaignId}`);
                    })
                    .catch(err => console.error("Failed to increment impression count:", err));
            }

            isCrossfadingRef.current = false;
            if (isPlayableContent(currentItem)) {
                 if (activePlayer) {
                    activePlayer.volume = isMuted ? 0 : volume;
                    
                    const needsAnnouncement = currentItem.useAiAnnouncer;
                    const text = currentItem.predefinedAnnouncement;
                    const playWithBackgroundMusic = needsAnnouncement && currentItem.announcementWithBackgroundMusic;

                    const generateAndPlayTTS = async (onComplete: () => void, textToSpeak?: string) => {
                        const sanitizedText = sanitizeForTTS(textToSpeak || '');
                        if (!sanitizedText) {
                            onComplete();
                            return;
                        }
                        
                        const canProceed = await deductCredits(1, 'On-the-fly Announcement');
                        if (!canProceed) {
                            console.warn("Insufficient credits for on-the-fly announcement.");
                            onComplete();
                            return;
                        }

                        try {
                            const ttsResponse = await generateWithRetry({ model: "gemini-2.5-flash-preview-tts", contents: [{ parts: [{ text: sanitizedText }] }], config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: getAnnouncerVoiceName(currentItem.announcerVoice || '') } } } } });
                            
                            if (generationIdRef.current !== currentGenerationId) return;

                            const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
                            if (!base64Audio) throw new Error("TTS failed.");

                            if (!announcementAudioContextRef.current) announcementAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                            const ctx = announcementAudioContextRef.current;
                            if (ctx.state === 'suspended') await ctx.resume();
                            const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
                            
                            if (announcementSourceRef.current) {
                                announcementSourceRef.current.onended = null;
                                try { announcementSourceRef.current.stop(); } catch (e) {}
                            }
                            
                            const source = ctx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(ctx.destination);
                            announcementSourceRef.current = source;
                            source.onended = onComplete;
                            source.start();
                        } catch(e) {
                            handleAiError(e, addToast);
                            onComplete();
                        }
                    };

                    if (playWithBackgroundMusic) {
                        playContentDirectly(activePlayer, currentItem);
                        if (text) {
                            isDuckingRef.current = true;
                            await fadeVolume(activePlayer, (isMuted ? 0 : volume) * 0.2, 800);
                            await generateAndPlayTTS(() => {
                                fadeVolume(activePlayer, isMuted ? 0 : volume, 1200).then(() => isDuckingRef.current = false);
                            }, text);
                        }
                    } else if (needsAnnouncement) {
                        await generateAndPlayTTS(() => playContentDirectly(activePlayer, currentItem), text);
                    } else {
                        playContentDirectly(activePlayer, currentItem);
                    }
                 }
            } else {
                const isArticleForTTS = (currentItem.type === 'Article' || currentItem.type === 'RSS Feed') && currentItem.useAiAnnouncer && currentItem.content;
            
                const runTimerFallback = (defaultDuration = '0:30') => {
                    const itemDuration = parseDuration(currentItem.duration || defaultDuration);
                    setDuration(itemDuration);
                    setCurrentTime(0);
                    nonAudioTimerRef.current = window.setInterval(() => {
                        if (playbackState !== 'playing') return;
                        setCurrentTime(prev => {
                            const newTime = prev + 1;
                            if (newTime >= itemDuration) {
                                onTrackEnd();
                                return 0;
                            }
                            return newTime;
                        });
                    }, 1000);
                };

                if (isArticleForTTS) {
                    const canProceed = await deductCredits(1, 'Article TTS Playout');
                    if (!canProceed) {
                        console.warn("Insufficient credits for article TTS.");
                        runTimerFallback('1:00');
                    } else {
                        try {
                            const text = sanitizeForTTS(currentItem.content!);
                            if (!text) {
                                console.warn(`Article "${currentItem.title}" has no content after sanitization. Using fallback timer.`);
                                runTimerFallback('0:05');
                                return;
                            }
                            
                            const MAX_TTS_CHARS = 4000;
                            let textToSpeak = text;
                            if (textToSpeak.length > MAX_TTS_CHARS) {
                                console.warn(`Article content is too long for TTS (${textToSpeak.length} chars). Truncating to ~${MAX_TTS_CHARS} characters.`);
                                let truncated = textToSpeak.substring(0, MAX_TTS_CHARS);
                                const lastSentenceEnd = Math.max(truncated.lastIndexOf('.'), truncated.lastIndexOf('?'), truncated.lastIndexOf('!'));

                                if (lastSentenceEnd > 0) {
                                    textToSpeak = truncated.substring(0, lastSentenceEnd + 1);
                                } else {
                                    textToSpeak = truncated + "...";
                                }
                            }
                            
                            const ttsResponse = await generateWithRetry({ model: "gemini-2.5-flash-preview-tts", contents: [{ parts: [{ text: textToSpeak }] }], config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: getAnnouncerVoiceName(currentItem.announcerVoice || '') } } } } });
                            
                            if (generationIdRef.current !== currentGenerationId) {
                                console.log("Aborting stale article TTS generation.");
                                runTimerFallback('0:05');
                                return;
                            }

                            const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
                            if (!base64Audio) throw new Error("TTS generation returned no audio data.");
                            
                            if (!announcementAudioContextRef.current) announcementAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                            const ctx = announcementAudioContextRef.current;
                            if (ctx.state === 'suspended') await ctx.resume();

                            const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
                            currentArticleBufferRef.current = audioBuffer;
                            articleResumeTimeRef.current = 0;
                            setDuration(audioBuffer.duration);
                            setCurrentTime(0);
                            playArticleTTS(audioBuffer, 0);

                        } catch (e) {
                            handleAiError(e, addToast);
                            runTimerFallback('1:00');
                        }
                    }
                } else {
                    runTimerFallback();
                }
            }

            const nextItem = playoutQueue[currentQueueIndex + 1];
            if (nextPlayer && nextItem && isPlayableContent(nextItem)) {
                nextPlayer.src = nextItem.url;
                nextPlayer.load();
            }
        };

        handlePlayout();
        return cleanup;
    }, [currentItem, playbackState, playoutQueue, currentQueueIndex, volume, isMuted, playContentDirectly, fadeVolume, playNext, playArticleTTS, currentUser, onTrackEnd, fetchAlbumArt, deductCredits, addToast, isPreviewing, webhooks]);
    
    useEffect(() => {
        if (!isPreviewing) {
            activePlayerIndex.current = 1 - activePlayerIndex.current;
        }
    }, [currentQueueIndex, isPreviewing]);

    const loadSchedule = useCallback((items: ContentItem[]) => {
        generationIdRef.current++;
        countedImpressionsRef.current.clear();
        setPlayoutQueue(items);
        setPlayoutHistory([]);
        prevQueueIndexRef.current = -1;
        if (items.length > 0) {
            setCurrentQueueIndex(0);
            setPlaybackState('playing');
            // FIX: Set stream status when starting broadcast
            setStreamStatus('auto-dj');
        } else {
            setCurrentQueueIndex(-1);
            setPlaybackState('stopped');
            // FIX: Set stream status when stopping broadcast
            setStreamStatus('offline');
    
            audioRefs.forEach(ref => {
                if (ref.current) {
                    ref.current.pause();
                    if (ref.current.src) {
                        ref.current.removeAttribute('src');
                        ref.current.load();
                    }
                    ref.current.currentTime = 0;
                }
            });
    
            if (announcementSourceRef.current) {
                announcementSourceRef.current.onended = null;
                try { announcementSourceRef.current.stop(); } catch (e) {}
                announcementSourceRef.current = null;
            }
            if (announcementAudioContextRef.current) {
                if (announcementAudioContextRef.current.state !== 'closed') {
                    announcementAudioContextRef.current.close().catch(e => console.error("Error closing AudioContext:", e));
                }
                announcementAudioContextRef.current = null;
            }
            currentArticleBufferRef.current = null;
    
            if (nonAudioTimerRef.current) clearInterval(nonAudioTimerRef.current);
            if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
            nonAudioTimerRef.current = null;
            fadeIntervalRef.current = null;

            isCrossfadingRef.current = false;
            isDuckingRef.current = false;
        }
        setIsPreviewing(false);
        setPreviewItem(null);
        setCurrentTime(0);
    }, []);

    const generateScheduleAndAnnouncements = useCallback(async (
        allContent: ContentItem[],
        campaigns: Campaign[],
        stationFormat: Station['radioFormat'],
        scheduleLengthHours: number,
        clockwheel?: Clockwheel
    ) => {
        const now = new Date();
        const activeCampaigns = campaigns.filter(c => c.status === 'active' && new Date(c.startDate) <= now && new Date(c.endDate) >= now);
    
        // FIX: Handle async and sync schedule generation paths.
        let newSchedule: ContentItem[];
        if (clockwheel) {
            newSchedule = await generateScheduleFromClockwheel(allContent, activeCampaigns, clockwheel, scheduleLengthHours);
        } else {
            newSchedule = generateSchedule(allContent, activeCampaigns, stationFormat);
        }
        
        const itemsToGenerate = newSchedule.filter(item => item.useAiAnnouncer && !item.predefinedAnnouncement && item.type === 'Music');
        const totalToGenerate = itemsToGenerate.length;
    
        if (totalToGenerate > 0) {
            setIsGeneratingAnnouncements(true);
            setAnnouncementGenerationProgress(0);
            addToast('Generating schedule and AI announcements...', 'info');
        } else {
            addToast('Schedule loaded. Starting broadcast.', 'success');
            loadSchedule(newSchedule);
            return;
        }
    
        const finalSchedule: ContentItem[] = [];
        let generatedCount = 0;
        let creditsAvailable = true;
    
        for (const [i, item] of newSchedule.entries()) {
            if (item.useAiAnnouncer && !item.predefinedAnnouncement && item.type === 'Music' && creditsAvailable) {
                const canProceed = await deductCredits(1, 'Pre-generation Announcement');
                if (!canProceed) {
                    addToast('Insufficient credits. Halting announcement pre-generation.', 'error');
                    creditsAvailable = false;
                    finalSchedule.push(item);
                    continue;
                }
    
                const previousItem = i > 0 ? newSchedule[i - 1] : null;
                try {
                    const announcementText = await generateAnnouncementText(item, previousItem);
                    finalSchedule.push({ ...item, predefinedAnnouncement: announcementText });
                } catch (e) {
                    console.error(`Failed to pre-generate announcement for: "${item.title}"`, e);
                    finalSchedule.push(item);
                }
    
                generatedCount++;
                setAnnouncementGenerationProgress((generatedCount / totalToGenerate) * 100);

                if (totalToGenerate > 1 && generatedCount < totalToGenerate) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            } else {
                finalSchedule.push(item);
            }
        }
    
        setIsGeneratingAnnouncements(false);
        loadSchedule(finalSchedule);
    
        if (totalToGenerate > 0 && generatedCount === totalToGenerate) {
            addToast('AI announcements are ready! Starting broadcast.', 'success');
        } else if (totalToGenerate > 0) {
            addToast('Broadcast starting with available announcements.', 'info');
        }
    }, [loadSchedule, addToast, deductCredits]);

    const playPrevious = useCallback(() => {
        if (isPreviewing) return;
        setCurrentQueueIndex(prevIndex => {
            const newIndex = prevIndex - 1;
            if (newIndex >= 0) {
                setPlaybackState('playing');
                setCurrentTime(0);
                return newIndex;
            }
            return prevIndex;
        });
    }, [isPreviewing]);

    const playPreview = (item: ContentItem) => {
        if (!isPlayableContent(item)) return;
        if (isPreviewing && previewItem?.id === item.id) {
            togglePlayPause();
            return;
        }
        generationIdRef.current++; // Invalidate main playout state
        if (!isPreviewing && currentQueueIndex !== -1) {
            setSavedPlayoutState({ queueIndex: currentQueueIndex, time: currentTime, playbackState });
        }
        setIsPreviewing(true);
        setPreviewItem(item);
        setPlaybackState('playing');
        setCurrentTime(0);
    };

    const returnToPlayout = () => {
        if (!isPreviewing) return;
        generationIdRef.current++; // Invalidate preview playout state
        setIsPreviewing(false);
        setPreviewItem(null);
        if (savedPlayoutState) {
            setCurrentQueueIndex(savedPlayoutState.queueIndex);
            setPlaybackState(savedPlayoutState.playbackState);
            const itemToRestore = playoutQueue[savedPlayoutState.queueIndex];
            setCurrentTime(itemToRestore && isPlayableContent(itemToRestore) ? savedPlayoutState.time : 0);
            setSavedPlayoutState(null);
        } else {
            setPlaybackState('stopped');
            setCurrentQueueIndex(-1);
        }
    };
    
    const togglePlayPause = useCallback(() => {
       if (!currentItem) return;
       const player = getActivePlayer();
       const isArticle = (currentItem.type === 'Article' || currentItem.type === 'RSS Feed') && currentItem.useAiAnnouncer;

       if (playbackState === 'playing') {
           generationIdRef.current++; // Invalidate in-flight operations on pause
           setPlaybackState('paused');
           if (isArticle) {
               articleResumeTimeRef.current = currentTime;
               if(announcementSourceRef.current) {
                   announcementSourceRef.current.onended = null;
                   try { announcementSourceRef.current.stop(); } catch(e){}
               }
               if(nonAudioTimerRef.current) clearInterval(nonAudioTimerRef.current);
           } else {
               player?.pause();
               if(nonAudioTimerRef.current) clearInterval(nonAudioTimerRef.current);
               if (announcementSourceRef.current && announcementAudioContextRef.current?.state === 'running') {
                    announcementAudioContextRef.current.suspend();
               }
           }
       } else {
            setPlaybackState('playing');
            if(isArticle && currentArticleBufferRef.current) {
                playArticleTTS(currentArticleBufferRef.current, articleResumeTimeRef.current);
            } else if (announcementSourceRef.current && announcementAudioContextRef.current?.state === 'suspended') {
                announcementAudioContextRef.current.resume();
            } else if (!isArticle) {
                 player?.play().catch(e => console.error("Audio play failed on resume", e));
            }
       }
    }, [currentItem, playbackState, currentTime, playArticleTTS, getActivePlayer]);

    const seek = (time: number) => {
        if (!currentItem) return;
        setCurrentTime(time);
        const player = getActivePlayer();
        if (isPlayableContent(currentItem) && player) {
            player.currentTime = time;
        }
    };
    const beginSeek = () => { if (isPlayableContent(currentItem)) isSeeking.current = true; };
    const endSeek = () => { if (isPlayableContent(currentItem)) isSeeking.current = false; };

    const removeFromQueue = useCallback((indexToRemove: number) => {
        setPlayoutQueue(prevQueue => {
            const newQueue = prevQueue.filter((_, index) => index !== indexToRemove);
            setCurrentQueueIndex(prevIndex => {
                if (indexToRemove < prevIndex) return prevIndex - 1;
                if (indexToRemove === prevIndex) {
                    if (prevIndex >= newQueue.length) {
                        setPlaybackState('stopped');
                        return -1;
                    }
                    setCurrentTime(0);
                    setPlaybackState('playing');
                }
                return prevIndex;
            });
            return newQueue;
        });
    }, []);

    const reorderQueue = useCallback((startIndex: number, endIndex: number) => {
        setPlayoutQueue(prevQueue => {
            const newQueue = [...prevQueue];
            const [movedItem] = newQueue.splice(startIndex, 1);
            newQueue.splice(endIndex, 0, movedItem);
            setCurrentQueueIndex(prevIndex => {
                if (prevIndex === startIndex) return endIndex;
                if (startIndex < prevIndex && endIndex >= prevIndex) return prevIndex - 1;
                if (startIndex > prevIndex && endIndex <= prevIndex) return prevIndex + 1;
                return prevIndex;
            });
            return newQueue;
        });
    }, []);

    const addToQueue = useCallback((items: ContentItem[]) => {
        if (items.length === 0) return;
        setPlayoutQueue(prevQueue => {
            const newQueue = [...prevQueue, ...items];
            if (playbackState === 'stopped' && currentQueueIndex === -1) {
                setCurrentQueueIndex(prevQueue.length);
                setPlaybackState('playing');
                setCurrentTime(0);
            }
            return newQueue;
        });
    }, [playbackState, currentQueueIndex]);

    const shuffleQueue = useCallback(() => {
        setPlayoutQueue(prevQueue => {
            if (isPreviewing || currentQueueIndex >= prevQueue.length - 2) return prevQueue;
            const playedAndCurrent = prevQueue.slice(0, currentQueueIndex + 1);
            const upNext = prevQueue.slice(currentQueueIndex + 1);
            for (let i = upNext.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [upNext[i], upNext[j]] = [upNext[j], upNext[i]];
            }
            return [...playedAndCurrent, ...upNext];
        });
    }, [currentQueueIndex, isPreviewing]);

    const updateQueueItem = useCallback((index: number, item: ContentItem) => {
        setPlayoutQueue(prevQueue => {
            const newQueue = [...prevQueue];
            if (index >= 0 && index < newQueue.length) {
                newQueue[index] = item;
            }
            return newQueue;
        });
    }, []);

    const handleListenerLike = useCallback(async (likedItem: ContentItem) => {
        if (!isAiProgramDirectorActive || likedItem.type !== 'Music' || !currentUser) {
            return;
        }

        const canProceed = await deductCredits(5, 'AI Program Director Suggestion');
        if (!canProceed) return;

        try {
            const allMusic = [...contentItems, ...audioContentItems].filter(item => item.type === 'Music');
            if (allMusic.length < 2) {
                addToast('Not enough music in the library for the AI Program Director to make a choice.', 'info');
                return;
            }
            
            const musicLibrary = allMusic
                .filter(item => item.id !== likedItem.id) // Exclude the liked song itself
                .map(track => ({
                    id: track.id,
                    title: ('title' in track) ? track.title : track.filename,
                    artist: (track as any).artist,
                    genre: (track as any).genre
                }));

            const prompt = `You are an expert radio music director. A listener just liked the song "${likedItem.title}" by ${likedItem.artist} (Genre: ${(likedItem as MusicContent).genre}).
Your task is to pick one similar song from the library to play next. The new song should match the genre and mood.
Do not pick a song by the same artist if other options are available.
Available songs: ${JSON.stringify(musicLibrary.slice(0, 100))}
Return your choice ONLY as a JSON object with a single key "id". Example: {"id": "song_id_123"}`;

            const response = await generateWithRetry({ model: 'gemini-2.5-flash', contents: prompt });
            const result = JSON.parse(response.text.replace(/```json|```/g, '').trim());

            if (result.id) {
                const sourceItem = allMusic.find(item => item.id === result.id);
                if (sourceItem) {
                    let playableItem: ContentItem | null;
                     if ('dateTime' in sourceItem) {
                        playableItem = mapAudioToContentItem(sourceItem as AudioContent, currentUser);
                    } else {
                        playableItem = sourceItem as ContentItem;
                    }

                    if (playableItem && isPlayableContent(playableItem)) {
                        const newItem: ContentItem = {
                            ...playableItem,
                            id: `ai-pd-${playableItem.id}-${Date.now()}`,
                            originalId: playableItem.id,
                        };
                        
                        setPlayoutQueue(prev => {
                            const newQueue = [...prev];
                            newQueue.splice(currentQueueIndex + 1, 0, newItem);
                            return newQueue;
                        });
                        addToast(`AI Director added "${newItem.title}" to the queue!`, 'success');
                    }
                }
            }
        } catch (error) {
            handleAiError(error, addToast);
        }
    }, [isAiProgramDirectorActive, currentUser, deductCredits, contentItems, audioContentItems, addToast, currentQueueIndex]);

    const startLiveDJBroadcast = useCallback(() => {
        if (playbackState === 'playing') {
            wasPlayingBeforeLiveRef.current = true;
            togglePlayPause();
        } else {
            wasPlayingBeforeLiveRef.current = false;
        }
        setStreamStatus('live-dj');
        addToast("Live DJ broadcast has started! Auto DJ is paused.", "info");
    }, [playbackState, togglePlayPause, addToast]);

    const endLiveDJBroadcast = useCallback(() => {
        // If the queue has items, it's auto-dj, otherwise it's offline.
        setStreamStatus(playoutQueue.length > 0 && currentQueueIndex !== -1 ? 'auto-dj' : 'offline');
        if (wasPlayingBeforeLiveRef.current && playbackState !== 'playing') {
            togglePlayPause();
            addToast("Resuming Auto DJ.", "info");
        } else {
            addToast("Live DJ has disconnected.", "info");
        }
        wasPlayingBeforeLiveRef.current = false;
    }, [playbackState, togglePlayPause, addToast, playoutQueue.length, currentQueueIndex]);

    const value = { 
        currentItem, playbackState, isPreviewing, currentTime, duration, volume, isMuted,
        playoutQueue, currentQueueIndex, albumArtUrl, loadSchedule, playPreview, returnToPlayout, togglePlayPause,
        playNext, playPrevious, seek, beginSeek, endSeek, setVolume, setIsMuted, reorderQueue,
        removeFromQueue, addToQueue, shuffleQueue, updateQueueItem,
        isGeneratingAnnouncements, announcementGenerationProgress, generateScheduleAndAnnouncements,
        playoutHistory, isAiProgramDirectorActive, setIsAiProgramDirectorActive, handleListenerLike,
        streamStatus, startLiveDJBroadcast, endLiveDJBroadcast
    };

    return (
        <PlayerContext.Provider value={value}>
            {children}
            <audio ref={audioRefs[0]} onTimeUpdate={handleTimeUpdate} onEnded={onTrackEnd} className="hidden" />
            <audio ref={audioRefs[1]} onTimeUpdate={handleTimeUpdate} onEnded={onTrackEnd} className="hidden" />
        </PlayerContext.Provider>
    );
};

export const usePlayer = (): PlayerContextType => {
    const context = useContext(PlayerContext);
    if (context === undefined) {
        throw new Error('usePlayer must be used within a PlayerProvider');
    }
    return context;
};