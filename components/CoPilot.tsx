import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Page } from '../App';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import { useContent } from '../contexts/ContentContext';
import { useToast } from '../contexts/ToastContext';
import * as db from '../services/db';
import { generateWithRetry, handleAiError } from '../services/ai';
// FIX: Icon components should be imported from './icons', and type definitions from '../types'.
import { LightbulbIcon, SparklesIcon, XIcon } from './icons';
import type { MusicContent, Playlist } from '../types';
import { marked } from 'marked';

interface CoPilotProps {
    isOpen: boolean;
    onToggle: () => void;
    activePage: Page;
    selectedContentIds: string[];
    setActivePage: (page: Page) => void;
}

interface Suggestion {
    id: string;
    icon: React.ReactNode;
    title: string;
    description: string;
    action: () => void;
    actionLabel: string;
}

const CoPilot: React.FC<CoPilotProps> = ({ isOpen, onToggle, activePage, selectedContentIds, setActivePage }) => {
    const { currentUser } = useAuth();
    const { playoutQueue, currentQueueIndex, addToQueue } = usePlayer();
    const { contentItems, audioContentItems } = useContent();
    const { addToast } = useToast();

    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [actionResponse, setActionResponse] = useState<string | null>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);

    const generateDashboardSuggestions = useCallback(async () => {
        if (!currentUser) return [];
        const submissions = await db.getAllSubmissions(currentUser.tenantId);
        const songRequests = submissions.filter(s => s.type === 'Song Request' && s.status === 'pending');
        if (songRequests.length < 3) return [];

        const requestText = songRequests.map(r => r.message).join(', ');
        const prompt = `Based on these user song requests, what is the most requested music genre? Requests: "${requestText}". Respond with only the genre name (e.g., "Synthwave").`;
        
        try {
            const response = await generateWithRetry({ model: 'gemini-2.5-flash', contents: prompt });
            const genre = response.text.trim();
            if (genre) {
                return [{
                    id: 'dashboard-playlist',
                    icon: <SparklesIcon />,
                    title: 'Playlist Opportunity',
                    description: `Your listeners are requesting a lot of ${genre}. Would you like me to build a new playlist for you with this vibe?`,
                    action: () => buildPlaylist(genre),
                    actionLabel: 'Build Playlist'
                }];
            }
        } catch (error) {
            console.error("Dashboard suggestion AI failed:", error);
        }
        return [];
    }, [currentUser]);

    const generateContentSuggestions = useCallback(async (ids: string[]) => {
        if (ids.length !== 1) return [];
        const selectedId = ids[0];
        const item = contentItems.find(i => i.id === selectedId) || audioContentItems.find(i => i.id === selectedId);

        if (item && item.type === 'Music') {
            const musicItem = item as MusicContent;
            return [
                { id: 'content-social', icon: <SparklesIcon />, title: 'Generate Social Post', description: `Create an engaging social media post for "${musicItem.title}".`, action: () => generateSocialPost(musicItem), actionLabel: 'Generate Post' },
                { id: 'content-facts', icon: <SparklesIcon />, title: 'Find Interesting Facts', description: `Find a fun, radio-friendly fact about "${musicItem.title}" or ${musicItem.artist}.`, action: () => findFacts(musicItem), actionLabel: 'Find Facts' },
            ];
        }
        return [];
    }, [contentItems, audioContentItems]);

    const generateScheduleSuggestions = useCallback(async () => {
        const upcomingQueue = playoutQueue.slice(currentQueueIndex + 1);
        if (upcomingQueue.length < 2) return [];

        for (let i = 0; i < upcomingQueue.length - 1; i++) {
            const item1 = upcomingQueue[i];
            const item2 = upcomingQueue[i + 1];

            const isHighEnergy = (item: any) => item.mood?.toLowerCase().includes('upbeat') || item.mood?.toLowerCase().includes('energetic');

            if (item1.type === 'Music' && item2.type === 'Music' && isHighEnergy(item1) && isHighEnergy(item2)) {
                return [{
                    id: 'schedule-transition',
                    icon: <SparklesIcon />,
                    title: 'Smooth Transition Needed',
                    description: `I see two high-energy tracks back-to-back: "${item1.title}" and "${item2.title}". Would you like me to generate a transition script?`,
                    action: () => generateTransition(item1 as MusicContent, item2 as MusicContent),
                    actionLabel: 'Generate Script'
                }];
            }
        }
        return [];
    }, [playoutQueue, currentQueueIndex]);

    useEffect(() => {
        if (!isOpen) {
            setSuggestions([]);
            setActionResponse(null);
            return;
        }

        const generate = async () => {
            setIsLoading(true);
            setActionResponse(null);
            let newSuggestions: Suggestion[] = [];
            
            try {
                switch (activePage) {
                    case 'dashboard': newSuggestions = await generateDashboardSuggestions(); break;
                    case 'content': newSuggestions = await generateContentSuggestions(selectedContentIds); break;
                    case 'schedule': newSuggestions = await generateScheduleSuggestions(); break;
                }
            } catch (error) {
                console.error("Error generating suggestions:", error);
            } finally {
                if (newSuggestions.length === 0) {
                     newSuggestions.push({ id: 'default-welcome', icon: <LightbulbIcon />, title: "Welcome!", description: "I'm your AI Co-pilot. I'll provide contextual suggestions as you navigate the app. Try selecting a song in 'Content Management'!", action: () => {}, actionLabel: '' });
                }
                setSuggestions(newSuggestions);
                setIsLoading(false);
            }
        };

        generate();
    }, [isOpen, activePage, selectedContentIds, playoutQueue, generateDashboardSuggestions, generateContentSuggestions, generateScheduleSuggestions]);

    // --- Action Implementations ---

    const buildPlaylist = async (genre: string) => {
        if (!currentUser) return;
        setIsActionLoading(true);
        try {
            const music = [...contentItems, ...audioContentItems].filter(i => i.type === 'Music').map(i => ({id: i.id, title: ('title' in i ? i.title : i.filename), artist: (i as any).artist}));
            const prompt = `From the following list of songs, pick up to 15 that fit the "${genre}" genre. Return ONLY a JSON array of the song IDs. \nSongs: ${JSON.stringify(music)}`;
            const response = await generateWithRetry({ model: 'gemini-2.5-flash', contents: prompt });
            const ids = JSON.parse(response.text.replace(/```json|```/g, '').trim());
            const newPlaylist: Playlist = { id: `ai-playlist-${Date.now()}`, tenantId: currentUser.tenantId, name: `AI: ${genre} Vibes`, trackIds: ids, schedule: '' };
            await db.savePlaylist(newPlaylist);
            setActionResponse(`✅ Successfully created playlist "${newPlaylist.name}" with ${ids.length} tracks! You can find it on the Playlists page.`);
        } catch (error) { handleAiError(error, addToast); setActionResponse("❌ Failed to create playlist."); } finally { setIsActionLoading(false); }
    };

    const generateSocialPost = async (item: MusicContent) => {
        setIsActionLoading(true);
        try {
            const prompt = `Write a short, engaging social media post for X (formerly Twitter) about the song "${item.title}" by ${item.artist}. Include relevant hashtags.`;
            const response = await generateWithRetry({ model: 'gemini-2.5-flash', contents: prompt });
            setActionResponse(response.text);
        } catch (error) { handleAiError(error, addToast); } finally { setIsActionLoading(false); }
    };
    
    const findFacts = async (item: MusicContent) => {
        setIsActionLoading(true);
        try {
            const prompt = `Find one interesting, radio-friendly fact about the song "${item.title}" by ${item.artist}.`;
            const response = await generateWithRetry({ model: 'gemini-2.5-flash', contents: prompt, config: { tools: [{ googleSearch: {} }] } });
            setActionResponse(response.text);
        } catch (error) { handleAiError(error, addToast); } finally { setIsActionLoading(false); }
    };
    
    const generateTransition = async (song1: MusicContent, song2: MusicContent) => {
        setIsActionLoading(true);
        try {
            const prompt = `Write a short, energetic radio transition script from the song "${song1.title}" by ${song1.artist} to "${song2.title}" by ${song2.artist}.`;
            const response = await generateWithRetry({ model: 'gemini-2.5-flash', contents: prompt });
            setActionResponse(response.text);
        } catch (error) { handleAiError(error, addToast); } finally { setIsActionLoading(false); }
    };
    
    const actionResponseHtml = useMemo(() => actionResponse ? marked(actionResponse, { breaks: true }) : '', [actionResponse]);

    return (
        <>
            <button
                onClick={onToggle}
                className="fixed top-24 right-6 z-50 p-4 bg-brand-blue text-white rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-brand-blue transition-transform transform hover:scale-110"
                aria-label="Toggle AI Co-pilot"
            >
                <LightbulbIcon />
            </button>
            <div className={`fixed top-0 right-0 h-full bg-white dark:bg-gray-800 shadow-2xl z-40 transition-transform duration-300 ease-in-out w-96 flex flex-col border-l dark:border-gray-700 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex justify-between items-center p-4 border-b dark:border-gray-700 flex-shrink-0">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center"><SparklesIcon className="mr-2"/> AI Co-pilot</h2>
                    <button onClick={onToggle} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><XIcon/></button>
                </div>
                <div className="flex-grow p-4 overflow-y-auto">
                    {isLoading ? (
                        <div className="text-center text-gray-500 dark:text-gray-400">Loading suggestions...</div>
                    ) : (
                        <div className="space-y-4">
                            {suggestions.map(s => s.actionLabel && (
                                <div key={s.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <div className="flex items-start space-x-3">
                                        <div className="text-brand-blue mt-1">{s.icon}</div>
                                        <div>
                                            <h3 className="font-semibold text-gray-800 dark:text-white">{s.title}</h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-300">{s.description}</p>
                                            <button onClick={s.action} disabled={isActionLoading} className="mt-3 px-3 py-1 text-sm bg-brand-blue text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400">{isActionLoading ? 'Working...' : s.actionLabel}</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {(isActionLoading || actionResponse) && (
                        <div className="mt-6 pt-6 border-t dark:border-gray-600">
                             <h3 className="font-semibold text-gray-800 dark:text-white mb-2">AI Response</h3>
                             {isActionLoading && <p className="text-gray-500 dark:text-gray-400">Generating...</p>}
                             {actionResponse && (
                                <div className="p-4 bg-gray-100 dark:bg-gray-900/50 rounded-lg prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: actionResponseHtml }}></div>
                             )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default CoPilot;
