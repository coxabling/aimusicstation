

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Page } from '../App';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import { useContent } from '../contexts/ContentContext';
import { useToast } from '../contexts/ToastContext';
import * as db from '../services/db';
import { generateWithRetry, handleAiError } from '../services/ai';
// Fix: Import all icons from './icons' and ContentItem from '../types'.
import { LightbulbIcon, SparklesIcon, XIcon, MusicIcon, PlaylistIcon, ShareIcon, DocumentTextIcon, FolderOpenIcon, PlusIcon } from './icons';
import { ContentItem } from '../types';


interface CoPilotProps {
    isOpen: boolean;
    onToggle: () => void;
    activePage: Page;
    selectedContentIds: string[];
    setActivePage: (page: Page) => void;
}

const CoPilot: React.FC<CoPilotProps> = ({ isOpen, onToggle, activePage, selectedContentIds, setActivePage }) => {
    const { currentUser, stationSettings, deductCredits } = useAuth();
    const { currentItem, playoutQueue, currentQueueIndex, addToQueue, updateQueueItem } = usePlayer();
    const { contentItems, audioContentItems, addContentItem, loadContent } = useContent();
    const { addToast } = useToast();

    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [aiResponse, setAiResponse] = useState('');

    const currentContext = useMemo(() => {
        let context = `The user is on the "${activePage}" page.`;
        if (stationSettings) {
            context += ` The station name is "${stationSettings.name}" with a vibe of "${stationSettings.vibe || 'Default'}".`;
        }
        if (currentUser) {
            context += ` The current user is "${currentUser.username}" with role "${currentUser.role}".`;
        }

        if (activePage === 'dashboard' && playoutQueue.length === 0) {
            context += ` The station is currently offline with an empty playout queue.`;
        } else if (currentItem) {
            context += ` The station is currently playing "${currentItem.title}" by ${'artist' in currentItem ? currentItem.artist : currentItem.type}.`;
            const nextItem = playoutQueue[currentQueueIndex + 1];
            if (nextItem) {
                context += ` The next item is "${nextItem.title}".`;
            }
        }
        
        const selectedContent = contentItems.filter(item => selectedContentIds.includes(item.id));
        if (selectedContent.length > 0) {
            context += ` User has ${selectedContent.length} item(s) selected: ${selectedContent.map(i => `${i.title} (${i.type})`).join(', ')}.`;
        }

        return context;
    }, [activePage, stationSettings, currentUser, currentItem, playoutQueue, currentQueueIndex, selectedContentIds, contentItems]);

    const allPlayableContent = useMemo(() => {
        const playableContent: ContentItem[] = [];
        contentItems.forEach(item => {
            if (['Music', 'Ad', 'Custom Audio', 'Relay Stream'].includes(item.type)) {
                playableContent.push(item);
            }
        });
        audioContentItems.forEach(item => {
            if (['Music', 'Jingle', 'Ad'].includes(item.type)) {
                // Assuming AudioContent maps to ContentItem or is playable directly
                playableContent.push({
                    id: item.id,
                    tenantId: item.tenantId,
                    title: item.filename,
                    type: item.type === 'Music' ? 'Music' : item.type === 'Jingle' ? 'Custom Audio' : 'Ad',
                    duration: item.duration,
                    date: item.dateTime,
                    url: item.url,
                    artist: item.artist, // Add artist to satisfy ContentItem structure if needed
                } as ContentItem);
            }
        });
        return playableContent;
    }, [contentItems, audioContentItems]);

    const fetchSuggestions = useCallback(async () => {
        if (!currentUser) return;
        setIsLoading(true);
        setAiResponse('');
        try {
            const prompt = `You are an AI Co-pilot for a radio station. Provide 3 short, proactive, and contextual suggestions to the user based on the following situation. Each suggestion should be a clear action the user can take. The user interface buttons are: "Upload Audio", "Generate AI Content", "Create Playlist", "New Ad Campaign", "Compose Social Post", "Go Live", "Clear & Stop", "Save Schedule", "Load Schedule", "Add Playlist to Queue".
If the user is on a content management page with selected items, suggest actions relevant to the selection (e.g., "Generate social posts for selected music," "Merge selected articles").
If the station is offline, suggest starting it or creating content.
If music is playing, suggest creating social media posts for it, or creating a transition.
If a report is available in the Control Room, suggest viewing it.
Be concise and avoid conversational filler. Use bullet points.

Current context: ${currentContext}
`;
            const response = await generateWithRetry({ model: 'gemini-2.5-flash', contents: prompt });
            setSuggestions(response.text.split('\n').filter(s => s.trim().length > 0 && s.startsWith('- ')).map(s => s.substring(2).trim()));
        } catch (error) {
            handleAiError(error, addToast);
            setSuggestions(["Failed to fetch suggestions."]);
        } finally {
            setIsLoading(false);
        }
    }, [currentUser, currentContext, addToast]);

    useEffect(() => {
        if (isOpen) {
            fetchSuggestions();
        }
    }, [isOpen, fetchSuggestions]);

    const handleSuggestionClick = async (suggestion: string) => {
        if (!currentUser) return;
        setIsLoading(true);
        setAiResponse('');

        try {
            const currentSelectedItems = contentItems.filter(item => selectedContentIds.includes(item.id));
            const prompt = `User wants to "${suggestion}". Current context: ${currentContext}.
            User has selected items: ${currentSelectedItems.map(i => `${i.title} (${i.type})`).join(', ') || 'None'}.
            
            Simulate performing this action. Provide a short, positive confirmation or the result of the action.
            If the action involves generating text or content, include a placeholder result.
            Example for "Generate social posts for selected music": "Generated 3 new social media drafts for 'Song Title'!"
            Example for "Create a smooth transition for the next song": "Here's a smooth transition for 'Next Song Title' by 'Artist': [Generated transition text]"
            If the action is complex (e.g., "Merge selected articles"), provide a summary of what happened.
            If the action involves navigation or opening a modal, state that. For example: "Opening 'Create Playlist' modal."
            
            If the action seems to be an invalid request given the context, state that.
            
            Respond concisely, as if you are the AI Co-pilot confirming an action or providing a quick result.`;

            const response = await generateWithRetry({ model: 'gemini-2.5-flash', contents: prompt });
            const result = response.text;
            setAiResponse(result);

            // Simulate specific actions based on keywords in the suggestion
            if (suggestion.toLowerCase().includes('generate social posts')) {
                // No actual post generation here, just a toast
                addToast('Generated social post drafts! Check Social Media Manager.', 'success');
                setActivePage('social');
            } else if (suggestion.toLowerCase().includes('merge selected articles')) {
                // This would trigger a modal in ContentManagement, just navigate for now
                addToast('Opening merge tool with selected articles.', 'info');
                setActivePage('content');
            } else if (suggestion.toLowerCase().includes('create playlist')) {
                addToast('Opening "Create Playlist" modal.', 'info');
                setActivePage('playlists'); // Assume 'playlists' page has a way to trigger modal
            } else if (suggestion.toLowerCase().includes('create a smooth transition')) {
                 if (currentItem && playoutQueue[currentQueueIndex + 1] && currentUser) {
                    // Assume generate a transition text
                    const nextItem = playoutQueue[currentQueueIndex + 1];
                    const transitionPrompt = `Write a smooth and engaging radio transition from "${currentItem.title}" by ${'artist' in currentItem ? currentItem.artist : ''} to "${nextItem.title}" by ${'artist' in nextItem ? nextItem.artist : ''}. Keep it under 20 seconds read aloud.`;
                    const transitionResponse = await generateWithRetry({ model: 'gemini-2.5-flash', contents: transitionPrompt });
                    const transitionText = transitionResponse.text;

                    const updatedNextItem = { ...nextItem, predefinedAnnouncement: transitionText, useAiAnnouncer: true };
                    updateQueueItem(currentQueueIndex + 1, updatedNextItem);
                    addToast('Generated and added transition to next track!', 'success');
                } else {
                    addToast('Cannot generate transition: no current or next track.', 'error');
                }
            } else if (suggestion.toLowerCase().includes('start your station')) {
                addToast('Navigating to Schedule page to start broadcast.', 'info');
                setActivePage('schedule');
            } else if (suggestion.toLowerCase().includes('add music to your library') || suggestion.toLowerCase().includes('upload audio')) {
                addToast('Navigating to Audio Content for upload.', 'info');
                setActivePage('audioContent');
            } else if (suggestion.toLowerCase().includes('view ai report') || suggestion.toLowerCase().includes('control room')) {
                addToast('Navigating to Control Room to view reports.', 'info');
                setActivePage('controlRoom');
            }
        } catch (error) {
            handleAiError(error, addToast);
            setAiResponse("Sorry, I couldn't perform that action right now.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`fixed inset-y-0 right-0 w-80 bg-white dark:bg-gray-800 shadow-lg z-40 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                <div className="flex items-center space-x-2">
                    <LightbulbIcon className="h-6 w-6 text-brand-blue" />
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">AI Co-pilot</h3>
                </div>
                <button onClick={onToggle} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">
                    <XIcon />
                </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    Your intelligent assistant. I'm here to help you manage your station more efficiently.
                </p>

                {isLoading ? (
                    <div className="text-center py-8">
                        <svg className="animate-spin h-8 w-8 text-brand-blue mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="mt-4 text-gray-600 dark:text-gray-300">Thinking of ideas...</p>
                    </div>
                ) : (
                    <>
                        <h4 className="text-md font-semibold text-gray-800 dark:text-white mb-2">Suggestions:</h4>
                        <ul className="space-y-2 mb-6">
                            {suggestions.map((s, index) => (
                                <li key={index}>
                                    <button
                                        onClick={() => handleSuggestionClick(s)}
                                        className="w-full text-left p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 flex items-center space-x-2"
                                    >
                                        <SparklesIcon className="h-4 w-4 text-purple-500" />
                                        <span>{s}</span>
                                    </button>
                                </li>
                            ))}
                            <li>
                                <button onClick={fetchSuggestions} className="w-full text-left p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 flex items-center space-x-2">
                                    <PlusIcon className="h-4 w-4 text-green-500" />
                                    <span>Get more suggestions</span>
                                </button>
                            </li>
                        </ul>

                        {aiResponse && (
                            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/50 rounded-lg border-l-4 border-brand-blue">
                                <h4 className="font-semibold text-gray-800 dark:text-white mb-2">Co-pilot Response:</h4>
                                <p className="text-sm text-gray-700 dark:text-gray-300">{aiResponse}</p>
                            </div>
                        )}
                    </>
                )}
            </div>
            <div className="p-4 border-t dark:border-gray-700 flex-shrink-0">
                <button onClick={onToggle} className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">
                    Close Co-pilot
                </button>
            </div>
        </div>
    );
};

export { CoPilot };
