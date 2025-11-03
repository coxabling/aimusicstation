import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as db from '../services/db';
import { Playlist, ContentItem, AudioContent, MusicContent } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useContent } from '../contexts/ContentContext';
import { ClipboardListIcon, SparklesIcon } from '../components/icons';
import { generateWithRetry } from '../services/ai';
import { useToast } from '../contexts/ToastContext';
import { marked } from 'marked';

const PREP_COST = 200;

const ShowPrep: React.FC = () => {
    const { currentUser, deductCredits } = useAuth();
    const { contentItems, audioContentItems } = useContent();
    const { addToast } = useToast();

    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedNotes, setGeneratedNotes] = useState<string>('');

    const allContentById = useMemo(() => {
        const map = new Map<string, ContentItem | AudioContent>();
        contentItems.forEach(item => map.set(item.id, item));
        audioContentItems.forEach(item => map.set(item.id, item));
        return map;
    }, [contentItems, audioContentItems]);

    const selectedPlaylistTracks = useMemo(() => {
        if (!selectedPlaylistId) return [];
        const playlist = playlists.find(p => p.id === selectedPlaylistId);
        if (!playlist) return [];
        return playlist.trackIds
            .map(id => allContentById.get(id))
            .filter((item): item is ContentItem | AudioContent => !!item && (item.type === 'Music'));
    }, [selectedPlaylistId, playlists, allContentById]);

    useEffect(() => {
        const loadPlaylists = async () => {
            if (currentUser) {
                setIsLoading(true);
                const loadedPlaylists = await db.getAllPlaylists(currentUser.tenantId);
                setPlaylists(loadedPlaylists);
                setIsLoading(false);
            }
        };
        loadPlaylists();
    }, [currentUser]);
    
    const handleGeneratePrep = async () => {
        if (selectedPlaylistTracks.length === 0) {
            addToast('Please select a playlist with music tracks.', 'error');
            return;
        }

        const canProceed = await deductCredits(PREP_COST, 'Show Prep Generation');
        if (!canProceed) return;

        setIsGenerating(true);
        setGeneratedNotes('');

        try {
            const tracklist = selectedPlaylistTracks.map((track, i) => {
                const musicTrack = track as MusicContent | AudioContent;
                const metadata = [
                    musicTrack.genre,
                    musicTrack.bpm ? `${musicTrack.bpm} BPM` : null,
                    musicTrack.key,
                    musicTrack.energy ? `Energy: ${musicTrack.energy}/10` : null,
                    ...(musicTrack.moodTags || [])
                ].filter(Boolean).join(', ');

                return `${i + 1}. "${'title' in track ? track.title : track.filename}" by ${track.artist} (${metadata})`;
            }).join('\n');


            const prompt = `You are a professional and witty radio show producer. Your task is to create a "Show Prep" sheet for a radio host based on a given tracklist. The station's vibe is energetic and fun.

Here is the tracklist with metadata:
${tracklist}

Please provide the following in your response:
1.  **Track Notes:** For each track, find one fascinating, little-known, and radio-friendly fact about the song or the artist. Use the provided metadata to inform your tone.
2.  **Transitions:** For each transition between songs, provide a creative and smooth segue or a clever talking point to bridge the gap. Use the metadata (BPM, key, energy, mood) to create more intelligent transitions.
3.  **Audience Questions:** For every 2-3 songs, suggest an engaging, open-ended question to ask the audience that relates to the upcoming music.

Format the entire output in clean, readable Markdown. Use headings for each section (e.g., "### Track Notes", "### Transitions", "### Audience Questions").`;

            const response = await generateWithRetry({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { tools: [{ googleSearch: {} }] }
            });
            
            setGeneratedNotes(response.text);
            addToast('Show prep generated successfully!', 'success');

        } catch (error) {
            console.error('Error generating show prep:', error);
            addToast('Failed to generate show prep.', 'error');
        } finally {
            setIsGenerating(false);
        }
    };
    
    const generatedHtml = useMemo(() => {
        if (!generatedNotes) return '';
        return marked(generatedNotes, { breaks: true });
    }, [generatedNotes]);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center space-x-3 mb-2">
                <ClipboardListIcon />
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Show Prep Assistant</h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Select a playlist and let the AI generate facts, transitions, and questions for your show.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end mb-6">
                <div className="md:col-span-2">
                    <label htmlFor="playlist-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Playlist</label>
                    <select
                        id="playlist-select"
                        value={selectedPlaylistId}
                        onChange={e => setSelectedPlaylistId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue bg-white dark:bg-gray-700"
                        disabled={isLoading || isGenerating}
                    >
                        <option value="">-- Choose a playlist --</option>
                        {playlists.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
                <button
                    onClick={handleGeneratePrep}
                    disabled={isGenerating || !selectedPlaylistId || selectedPlaylistTracks.length === 0}
                    className="flex items-center justify-center w-full px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 focus:outline-none disabled:bg-purple-400 disabled:cursor-not-allowed whitespace-nowrap"
                >
                    <SparklesIcon className="h-5 w-5 mr-2" />
                    {isGenerating ? 'Generating...' : `Generate Prep (${PREP_COST} Credits)`}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Tracklist ({selectedPlaylistTracks.length})</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto border dark:border-gray-700 rounded-lg p-3">
                        {selectedPlaylistTracks.length > 0 ? (
                            selectedPlaylistTracks.map((track, index) => (
                                <div key={`${track.id}-${index}`} className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                                    <p className="font-semibold text-sm text-gray-800 dark:text-white">{'title' in track ? track.title : track.filename}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{track.artist}</p>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
                                {selectedPlaylistId ? 'This playlist has no music tracks.' : 'Select a playlist to see the tracks.'}
                            </p>
                        )}
                    </div>
                </div>
                <div className="lg:col-span-2 space-y-4">
                     <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Generated Show Prep</h3>
                     <div className="h-96 overflow-y-auto border dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50">
                        {isGenerating ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center">
                                    <svg className="animate-spin h-8 w-8 text-brand-blue mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <p className="mt-4 text-gray-600 dark:text-gray-300">The AI is preparing your show...</p>
                                </div>
                            </div>
                        ) : generatedNotes ? (
                            <div 
                                className="prose prose-sm dark:prose-invert max-w-none"
                                dangerouslySetInnerHTML={{ __html: generatedHtml }}
                            />
                        ) : (
                             <p className="text-center text-sm text-gray-500 dark:text-gray-400 pt-10">
                                Your generated notes will appear here.
                            </p>
                        )}
                     </div>
                </div>
            </div>
        </div>
    );
};

export default ShowPrep;