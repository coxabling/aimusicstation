import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
// FIX: Import RssArticle from its correct source in services/rss.ts
import { Submission, SocialPost, RssFeedSettings, ContentItem, AudioContent, User, isPlayableContent, CustomAudioContent } from '../types';
import * as db from '../services/db';
import { fetchRssFeed, RssArticle } from '../services/rss';
import { generateWithRetry, handleAiError } from '../services/ai';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { usePlayer } from '../contexts/PlayerContext';
import { useContent } from '../contexts/ContentContext';
import { InboxIcon, CheckIcon, XIcon, MusicIcon, DocumentTextIcon, ShareIcon, SparklesIcon, TrashIcon } from '../components/icons';

type ControlRoomItemType = 'Shoutout' | 'Song Request' | 'RSS Article' | 'Social Post Draft';
interface UnifiedItem {
    id: string;
    type: ControlRoomItemType;
    data: any;
    createdAt: Date;
    source?: string;
}

// --- AUDIO HELPERS (copied from other components for self-containment) ---

// FIX: Correctly define helper functions instead of declaring empty functions and re-assigning them.
function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}
async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
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
function pcmToWav(pcmData: Uint8Array, sampleRate: number, numChannels: number, bitsPerSample: number): Blob {
    const dataSize = pcmData.length;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    const writeString = (offset: number, str: string) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    writeString(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true); writeString(8, 'WAVE'); writeString(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, numChannels, true); view.setUint32(24, sampleRate, true); view.setUint32(28, byteRate, true); view.setUint16(32, blockAlign, true); view.setUint16(34, bitsPerSample, true); writeString(36, 'data'); view.setUint32(40, dataSize, true); new Uint8Array(buffer, 44).set(pcmData);
    return new Blob([view], { type: 'audio/wav' });
}
function getAnnouncerVoiceName(voice: string): string {
    switch (voice) { case 'AI-David': return 'Puck'; case 'AI-Sarah': return 'Kore'; case 'AI-Ayo (African Male)': return 'Fenrir'; case 'AI-Zola (African Female)': return 'Charon'; default: return 'Zephyr'; }
}
function getDuration(url: string): Promise<string> {
    return new Promise(resolve => {
        const audio = document.createElement('audio');
        audio.preload = 'metadata';
        audio.onloadedmetadata = () => {
            const duration = audio.duration;
            resolve(`${Math.floor(duration / 60)}:${Math.round(duration % 60).toString().padStart(2, '0')}`);
        };
        audio.onerror = () => {
            resolve('0:20'); // fallback
        }
        audio.src = url;
    });
}


/**
 * Converts an AudioContent object into a standard, playable ContentItem object.
 * This ensures consistency when adding items from different libraries to the playout queue.
 */
function mapAudioToContentItem(audio: AudioContent, currentUser: User): ContentItem | null {
    if (audio.type === 'Music') {
        return {
            id: audio.id, tenantId: currentUser.tenantId, title: audio.filename, type: 'Music', artist: audio.artist || 'Unknown',
            duration: audio.duration, date: audio.dateTime, url: audio.url, file: audio.file, genre: audio.genre,
            useAiAnnouncer: audio.announceTrack, announcerVoice: audio.announcementVoice, announcementWithBackgroundMusic: audio.announcementWithBackgroundMusic,
        };
    } // simplified for brevity
    return null;
}


const ControlRoom: React.FC = () => {
    const { currentUser, deductCredits } = useAuth();
    const { addToast } = useToast();
    const { addToQueue } = usePlayer();
    const { contentItems, audioContentItems, addContentItem, bulkAddTextContentItems } = useContent();
    const [allItems, setAllItems] = useState<UnifiedItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<ControlRoomItemType | 'All'>('All');
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!currentUser) return;
        setIsLoading(true);

        const [submissions, socialPosts, rssFeeds] = await Promise.all([
            db.getAllSubmissions(currentUser.tenantId),
            db.getAllSocialPosts(currentUser.tenantId),
            db.getAllRssFeedSettings(currentUser.tenantId)
        ]);

        const submissionItems: UnifiedItem[] = submissions.filter(s => s.status === 'pending').map(s => ({
            id: s.id, type: s.type, data: s, createdAt: new Date(s.createdAt), source: 'Audience'
        }));

        const socialPostItems: UnifiedItem[] = socialPosts.filter(p => p.status === 'draft').map(p => ({
            id: p.id, type: 'Social Post Draft', data: p, createdAt: new Date(p.createdAt), source: 'Social Media'
        }));

        const feedsToApprove = rssFeeds.filter(f => f.approveBeforeAiring && f.published);
        const existingArticleTitles = new Set(contentItems.filter(c => c.type === 'Article').map(c => c.title));
        let rssItems: UnifiedItem[] = [];
        for (const feed of feedsToApprove) {
            try {
                const articles = await fetchRssFeed(feed.url);
                const newArticles = articles.filter(a => !existingArticleTitles.has(a.title));
                rssItems.push(...newArticles.map(a => ({ id: a.link, type: 'RSS Article', data: a, createdAt: new Date(a.date), source: feed.name } as UnifiedItem)));
            } catch (error) { console.error(`Failed to fetch RSS feed: ${feed.name}`, error); }
        }

        const feedsToAutoPublish = rssFeeds.filter(f => !f.approveBeforeAiring && f.published);
        let totalNewArticles = 0;
        
        for (const feed of feedsToAutoPublish) {
            try {
                const articles = await fetchRssFeed(feed.url);
                const newArticlesFromFeed = articles.filter(a => !existingArticleTitles.has(a.title));
                
                if (newArticlesFromFeed.length > 0) {
                    const newItemsData = newArticlesFromFeed.map(article => ({
                        type: 'Article' as const,
                        title: article.title,
                        content: article.content,
                        source: feed.name,
                        useAiAnnouncer: true,
                    }));
                    
                    const createdContentItems = await bulkAddTextContentItems(newItemsData);
                    totalNewArticles += createdContentItems.length;
                    
                    if (feed.targetPlaylistId && createdContentItems.length > 0) {
                        const articleIds = createdContentItems.map(item => item.id);
                        await db.addTracksToPlaylists(articleIds, [feed.targetPlaylistId], currentUser.tenantId);
                    }
                }
            } catch (error) { console.error(`Failed to auto-publish RSS feed: ${feed.name}`, error); }
        }

        if (totalNewArticles > 0) {
            addToast(`${totalNewArticles} new article(s) auto-published from RSS feeds.`, 'info');
        }

        const combined = [...submissionItems, ...socialPostItems, ...rssItems];
        combined.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setAllItems(combined);
        setIsLoading(false);
    }, [currentUser, contentItems, bulkAddTextContentItems, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAction = async (itemId: string, action: 'approve' | 'reject' | 'delete', data?: any) => {
        const item = allItems.find(i => i.id === itemId);
        if (!item || !currentUser) return;

        setProcessingId(itemId);
        try {
            switch (item.type) {
                case 'Shoutout':
                    if (action === 'approve') {
                         const canProceed = await deductCredits(20, 'AI Shoutout Generation');
                         if (!canProceed) return;
                         const textToSpeak = `Here's a shoutout from ${item.data.from}${item.data.location ? ` in ${item.data.location}` : ''}. They say: "${item.data.message}"`;
                         const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                         const response = await ai.models.generateContent({ model: "gemini-2.5-flash-preview-tts", contents: [{ parts: [{ text: textToSpeak }] }], config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: getAnnouncerVoiceName('AI-David') } } } } });
                         const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
                         if (!base64Audio) throw new Error("TTS failed.");
                         const pcmBytes = decode(base64Audio);
                         const wavBlob = pcmToWav(pcmBytes, 24000, 1, 16);
                         const audioUrl = URL.createObjectURL(wavBlob);
                         const duration = await getDuration(audioUrl);
                         const shoutoutItem: CustomAudioContent = { id: `shoutout-${item.id}`, originalId: `shoutout-${item.id}`, tenantId: currentUser.tenantId, title: `Shoutout: ${item.data.from}`, type: 'Custom Audio', artist: 'AI Announcer', duration, date: new Date().toISOString(), url: audioUrl };
                         addToQueue([shoutoutItem]);
                         addToast(`Shoutout from ${item.data.from} queued!`, 'success');
                         await db.saveSubmission({ ...item.data, status: 'approved' });
                    } else { // reject
                        await db.saveSubmission({ ...item.data, status: 'rejected' });
                    }
                    break;
                case 'Song Request':
                    // Simplified logic from AudienceInteraction
                    if (action === 'approve') {
                        const allMusic = [...contentItems, ...audioContentItems].filter(i => i.type === 'Music');
                        const query = item.data.message.toLowerCase().trim();
                        const match = allMusic.find(i => ('title' in i && i.title.toLowerCase().includes(query)) || ('filename' in i && i.filename.toLowerCase().includes(query)));
                        if (match) {
                           let playableItem: ContentItem | null = 'dateTime' in match ? mapAudioToContentItem(match as AudioContent, currentUser) : match as ContentItem;
                           if (playableItem && isPlayableContent(playableItem)) {
                               const songToAdd: ContentItem = { ...playableItem, id: `request-${item.id}`, originalId: playableItem.id, useAiAnnouncer: true, predefinedAnnouncement: `Up next, a request from ${item.data.from}. Here's "${playableItem.title}"!` };
                               addToQueue([songToAdd]);
                               addToast(`Request for "${songToAdd.title}" queued.`, 'success');
                               await db.saveSubmission({ ...item.data, status: 'approved' });
                           } else {
                                addToast(`Song "${query}" found but is not playable.`, 'error');
                           }
                        } else {
                           addToast(`Song request "${query}" not found in library.`, 'error');
                        }
                    } else { // reject
                        await db.saveSubmission({ ...item.data, status: 'rejected' });
                    }
                    break;
                case 'RSS Article':
                    if (action === 'approve') {
                        const articleData = item.data as RssArticle;
                        await addContentItem({ type: 'Article', title: articleData.title, content: articleData.content, useAiAnnouncer: true });
                        addToast(`Article "${articleData.title}" approved and saved.`, 'success');
                    }
                    // 'reject' for RSS is just removing from view, which happens on state update
                    break;
                case 'Social Post Draft':
                    if (action === 'approve') { // 'Post Now'
                         await db.saveSocialPost({ ...item.data, status: 'sent' });
                         addToast('Social post has been sent!', 'success');
                    } else if (action === 'delete') {
                         await db.deleteSocialPosts([item.id], currentUser.tenantId);
                         addToast('Draft deleted.', 'info');
                    }
                    break;
            }
            setAllItems(prev => prev.filter(i => i.id !== itemId));
        } catch (error) {
            handleAiError(error, addToast);
        } finally {
            setProcessingId(null);
        }
    };

    const filteredItems = useMemo(() => activeFilter === 'All' ? allItems : allItems.filter(item => item.type === activeFilter), [allItems, activeFilter]);

    const getIcon = (type: ControlRoomItemType) => {
        switch (type) {
            case 'Shoutout': return <SparklesIcon className="h-5 w-5 text-purple-500" />;
            case 'Song Request': return <MusicIcon />;
            case 'RSS Article': return <DocumentTextIcon />;
            case 'Social Post Draft': return <ShareIcon />;
            default: return <InboxIcon />;
        }
    };
    
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center space-x-3 mb-2">
                <InboxIcon />
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Control Room</h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Your unified inbox for all pending actions across the platform.</p>

            {/* Filters */}
            <div className="flex space-x-2 border-b dark:border-gray-700 mb-4 overflow-x-auto">
                {(['All', 'Shoutout', 'Song Request', 'RSS Article', 'Social Post Draft'] as const).map(filter => (
                    <button key={filter} onClick={() => setActiveFilter(filter)} className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${activeFilter === filter ? 'text-brand-blue border-b-2 border-brand-blue' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                        {filter}
                    </button>
                ))}
            </div>

            {isLoading && <p className="text-center p-8">Loading items...</p>}

            {!isLoading && filteredItems.length === 0 && (
                <div className="text-center py-16 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                    <div className="mx-auto h-12 w-12 text-gray-400"><CheckIcon/></div>
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">All caught up!</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Your inbox is empty.</p>
                </div>
            )}
            
            <div className="space-y-3">
                {filteredItems.map(item => (
                    <div key={item.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 flex items-start space-x-4">
                        <div className="text-gray-500 dark:text-gray-400 mt-1">{getIcon(item.type)}</div>
                        <div className="flex-grow">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-gray-800 dark:text-white">
                                        {item.type === 'Shoutout' || item.type === 'Song Request' ? item.data.message : item.data.title || item.data.content}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {item.type} from {item.source} · {item.createdAt.toLocaleString()}
                                    </p>
                                </div>
                                <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                                    {(item.type === 'Shoutout' || item.type === 'Song Request') && (
                                        <>
                                            <button onClick={() => handleAction(item.id, 'approve')} disabled={processingId === item.id} className="px-3 py-1 text-xs bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-green-300">Approve & Queue</button>
                                            <button onClick={() => handleAction(item.id, 'reject')} disabled={processingId === item.id} className="p-2 text-red-500 hover:text-red-700 disabled:opacity-50"><XIcon /></button>
                                        </>
                                    )}
                                    {item.type === 'RSS Article' && (
                                        <>
                                             <button onClick={() => handleAction(item.id, 'approve')} disabled={processingId === item.id} className="px-3 py-1 text-xs bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-green-300">Approve</button>
                                            <button onClick={() => handleAction(item.id, 'reject')} disabled={processingId === item.id} className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"><TrashIcon /></button>
                                        </>
                                    )}
                                     {item.type === 'Social Post Draft' && (
                                        <>
                                            <button disabled={true} className="px-3 py-1 text-xs bg-gray-200 text-gray-500 dark:bg-gray-600 dark:text-gray-400 rounded-md cursor-not-allowed">Edit/Schedule</button>
                                            <button onClick={() => handleAction(item.id, 'approve')} disabled={processingId === item.id} className="px-3 py-1 text-xs bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-green-300">Post Now</button>
                                            <button onClick={() => handleAction(item.id, 'delete')} disabled={processingId === item.id} className="p-2 text-red-500 hover:text-red-700 disabled:opacity-50"><TrashIcon /></button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ControlRoom;