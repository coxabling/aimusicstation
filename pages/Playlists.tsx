import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { PlaylistIcon, TrashIcon, ArrowLeftIcon, DragHandleIcon, SparklesIcon } from '../components/icons';
import Modal from '../components/Modal';
import InputField from '../components/InputField';
import type { Playlist, ContentItem, MusicContent, AudioContent, RssFeedContent, CustomAudioContent } from '../types';
import { useContent } from '../contexts/ContentContext';
import { generateWithRetry } from '../services/ai';
import { useToast } from '../contexts/ToastContext';
import * as db from '../services/db';
import { useAuth } from '../contexts/AuthContext';

const parseDurationToSeconds = (durationStr: string): number => {
    if (!durationStr || !durationStr.includes(':')) return 0;
    const parts = durationStr.split(':').map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return parts[0] * 60 + parts[1];
    }
    return 0;
};

const formatSecondsToDuration = (totalSeconds: number): string => {
    if (isNaN(totalSeconds) || totalSeconds < 0) return '0m';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
};

const getArtistSource = (item: ContentItem | AudioContent): string => {
    if ('artist' in item && item.artist) {
        return item.artist;
    }
    if (item.type === 'RSS Feed' && 'source' in item) {
        return (item as RssFeedContent).source;
    }
    if (item.type === 'Article') {
        return 'Article';
    }
    return '-';
};


const PlaylistDetail: React.FC<{
    playlist: Playlist;
    onSave: (updatedPlaylist: Playlist) => void;
    onBack: () => void;
    allContentById: Map<string, ContentItem | AudioContent>;
}> = ({ playlist, onSave, onBack, allContentById }) => {
    const [editedPlaylist, setEditedPlaylist] = useState<Playlist>(playlist);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const playlistTracks = useMemo(() => {
        return editedPlaylist.trackIds
            .map(id => allContentById.get(id))
            .filter((item): item is ContentItem | AudioContent => !!item);
    }, [editedPlaylist.trackIds, allContentById]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setEditedPlaylist(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleRemoveTrack = (trackId: string, index: number) => {
        setEditedPlaylist(prev => ({
            ...prev,
            trackIds: prev.trackIds.filter((id, i) => i !== index),
        }));
    };
    
    const handleDragStart = (index: number) => setDraggedIndex(index);
    const handleDrop = (targetIndex: number) => {
        if (draggedIndex === null || draggedIndex === targetIndex) {
            setDraggedIndex(null);
            return;
        }
        const newTrackIds = [...editedPlaylist.trackIds];
        const [movedItem] = newTrackIds.splice(draggedIndex, 1);
        newTrackIds.splice(targetIndex, 0, movedItem);
        setEditedPlaylist(prev => ({...prev, trackIds: newTrackIds }));
        setDraggedIndex(null);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-6">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 mr-2">
                    <ArrowLeftIcon />
                </button>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Edit Playlist</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <InputField label="Playlist Name" name="name" value={editedPlaylist.name || ''} onChange={handleChange} placeholder="e.g., Morning Drive" />
                <InputField label="Schedule" name="schedule" value={editedPlaylist.schedule || ''} onChange={handleChange} placeholder="e.g., Weekdays at 7 AM" />
                <div className="md:col-span-2">
                    <InputField label="Description" name="description" value={editedPlaylist.description || ''} onChange={handleChange} placeholder="A short description of the playlist" isTextarea />
                </div>
            </div>

            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Tracks ({playlistTracks.length})</h3>
            <div className="mb-6 space-y-2 max-h-[40vh] overflow-y-auto pr-2">
                {playlistTracks.length > 0 ? playlistTracks.map((track, index) => (
                    <div 
                        key={`${track.id}-${index}`}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragEnter={(e) => e.preventDefault()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDrop(index)}
                        className={`bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg flex items-center justify-between ${draggedIndex === index ? 'opacity-30' : ''}`}
                    >
                        <div className="flex items-center space-x-3">
                            <DragHandleIcon />
                            <div>
                                <p className="font-semibold text-gray-800 dark:text-white">{('title' in track) ? track.title : track.filename}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{getArtistSource(track)}</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3">
                            <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{track.duration}</span>
                            <button onClick={() => handleRemoveTrack(track.id, index)} className="text-red-500 hover:text-red-700" title="Remove track"><TrashIcon /></button>
                        </div>
                    </div>
                )) : <p className="text-gray-500 dark:text-gray-400">This playlist is empty. Add tracks from the Content Management page.</p>}
            </div>
            <div className="flex justify-end pt-6">
                <button onClick={() => onSave(editedPlaylist)} className="px-6 py-2 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">Save Playlist</button>
            </div>
        </div>
    );
};

interface PlaylistsProps {
    actionTrigger?: string;
    clearActionTrigger?: () => void;
}

const Playlists: React.FC<PlaylistsProps> = ({ actionTrigger, clearActionTrigger }) => {
    const { currentUser, deductCredits } = useAuth();
    const { addToast } = useToast();
    const { contentItems, audioContentItems } = useContent();

    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const AI_PLAYLIST_COST = 75;

    const allContentById = useMemo(() => {
        const map = new Map<string, ContentItem | AudioContent>();
        contentItems.forEach(item => map.set(item.id, item));
        audioContentItems.forEach(item => map.set(item.id, item));
        return map;
    }, [contentItems, audioContentItems]);

    const loadPlaylists = useCallback(async () => {
        if (!currentUser) return;
        setIsLoading(true);
        const userPlaylists = await db.getAllPlaylists(currentUser.tenantId);
        setPlaylists(userPlaylists);
        setIsLoading(false);
    }, [currentUser]);

    useEffect(() => {
        loadPlaylists();
    }, [loadPlaylists]);

    useEffect(() => {
        if (actionTrigger === 'createPlaylist' && clearActionTrigger) {
            setIsCreateModalOpen(true);
            clearActionTrigger();
        }
    }, [actionTrigger, clearActionTrigger]);

    const handleCreatePlaylist = async () => {
        if (!newPlaylistName.trim() || !currentUser) return;
        const newPlaylist: Playlist = {
            id: new Date().toISOString(),
            tenantId: currentUser.tenantId,
            name: newPlaylistName,
            description: newPlaylistDescription,
            trackIds: [],
            schedule: '',
        };
        await db.savePlaylist(newPlaylist);
        addToast(`Playlist "${newPlaylistName}" created.`, 'success');
        setIsCreateModalOpen(false);
        setNewPlaylistName('');
        setNewPlaylistDescription('');
        await loadPlaylists();
    };
    
    const handleGeneratePlaylist = async () => {
        if (!aiPrompt.trim() || !currentUser) return;

        const canProceed = await deductCredits(AI_PLAYLIST_COST, "AI Playlist Generation");
        if (!canProceed) {
            return;
        }

        setIsGenerating(true);
        try {
            const allMusic = [...contentItems.filter(i => i.type === 'Music'), ...audioContentItems.filter(i => i.type === 'Music')];
            if (allMusic.length === 0) {
                addToast("Your music library is empty. Add music to generate a playlist.", "error");
                setIsGenerating(false);
                return;
            }

            const musicList = allMusic.map(track => {
                const musicTrack = track as (MusicContent | AudioContent);
                return {
                    id: musicTrack.id,
                    title: ('title' in musicTrack) ? musicTrack.title : musicTrack.filename,
                    artist: musicTrack.artist,
                    genre: musicTrack.genre
                };
            }).slice(0, 50); // Limit to 50 tracks for prompt size

            const prompt = `You are a professional radio music director. Your task is to create a playlist of 10-15 tracks based on a user's prompt.
User prompt: "${aiPrompt}".
From the following list of available tracks, select tracks that fit the user's prompt.
Return ONLY a JSON array of the recommended track IDs (e.g., ["id_1", "id_2", "id_3"]). Do not include any other text, explanations, or markdown.
Available tracks: ${JSON.stringify(musicList)}`;

            const response = await generateWithRetry({ model: 'gemini-2.5-flash', contents: prompt });
            const responseText = response.text.replace(/```json|```/g, '').trim();
            const trackIds = JSON.parse(responseText);

            if (Array.isArray(trackIds) && trackIds.length > 0) {
                const newPlaylist: Playlist = {
                    id: new Date().toISOString(),
                    tenantId: currentUser.tenantId,
                    name: `AI: ${aiPrompt}`,
                    description: `Generated by AI based on the prompt: "${aiPrompt}"`,
                    trackIds: trackIds,
                    schedule: '',
                };
                await db.savePlaylist(newPlaylist);
                addToast(`AI-generated playlist "${newPlaylist.name}" created!`, 'success');
                setAiPrompt('');
                await loadPlaylists();
            } else {
                throw new Error("AI did not return any track IDs.");
            }
        } catch (error) {
            console.error("Error generating AI playlist:", error);
            addToast("Failed to generate AI playlist. The AI might not have found suitable tracks.", "error");
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleSavePlaylist = async (updatedPlaylist: Playlist) => {
        await db.savePlaylist(updatedPlaylist);
        addToast(`Playlist "${updatedPlaylist.name}" saved.`, 'success');
        setSelectedPlaylist(updatedPlaylist);
        await loadPlaylists();
    };

    const handleDeletePlaylist = async (playlistId: string) => {
        if (!currentUser) return;
        if (window.confirm("Are you sure you want to delete this playlist?")) {
            await db.deletePlaylist(playlistId, currentUser.tenantId);
            addToast("Playlist deleted.", "info");
            await loadPlaylists();
        }
    };

    const totalDuration = (playlist: Playlist) => {
        const totalSeconds = playlist.trackIds
            .map(id => allContentById.get(id))
            .reduce((sum, item) => sum + (item ? parseDurationToSeconds(item.duration) : 0), 0);
        return formatSecondsToDuration(totalSeconds);
    };

    if (selectedPlaylist) {
        return <PlaylistDetail playlist={selectedPlaylist} onSave={handleSavePlaylist} onBack={() => setSelectedPlaylist(null)} allContentById={allContentById} />;
    }

    return (
        <>
            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New Playlist">
                <form onSubmit={(e) => { e.preventDefault(); handleCreatePlaylist(); }} className="space-y-4">
                    <InputField label="Playlist Name" name="name" value={newPlaylistName} onChange={(e) => setNewPlaylistName(e.target.value)} placeholder="e.g., Morning Chill" />
                    <InputField label="Description" name="description" value={newPlaylistDescription} onChange={(e) => setNewPlaylistDescription(e.target.value)} placeholder="A short description" isTextarea />
                    <div className="flex justify-end pt-4 space-x-2">
                        <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 font-semibold rounded-lg shadow-md hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">Create Playlist</button>
                    </div>
                </form>
            </Modal>

            <div className="space-y-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                    <h3 className="text-xl font-semibold mb-4 flex items-center text-gray-800 dark:text-white">
                        <SparklesIcon className="h-5 w-5 mr-2 text-purple-500" />
                        Generate Playlist with AI
                    </h3>
                    <div className="flex items-center space-x-2">
                        <input type="text" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="e.g., upbeat 80s synthwave for a morning drive" className="flex-grow px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue bg-white dark:bg-gray-700" />
                        <button onClick={handleGeneratePlaylist} disabled={isGenerating || !aiPrompt} className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 disabled:bg-purple-400">
                            {isGenerating ? 'Generating...' : `Generate (${AI_PLAYLIST_COST} Credits)`}
                        </button>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Playlists</h2>
                        <button onClick={() => setIsCreateModalOpen(true)} className="px-4 py-2 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">Create Playlist</button>
                    </div>
                    {isLoading ? <p>Loading playlists...</p> : playlists.length > 0 ? (
                        <div className="space-y-4">
                            {playlists.map(playlist => (
                                <div key={playlist.id} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg flex justify-between items-center">
                                    <div className="cursor-pointer flex-grow" onClick={() => setSelectedPlaylist(playlist)}>
                                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">{playlist.name}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{playlist.trackIds.length} tracks • {totalDuration(playlist)}</p>
                                    </div>
                                    <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                                        <button onClick={() => setSelectedPlaylist(playlist)} className="px-3 py-1 text-sm bg-blue-100 text-brand-blue rounded-md hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900">Edit</button>
                                        <button onClick={() => handleDeletePlaylist(playlist.id)} className="p-2 text-red-500 hover:text-red-700"><TrashIcon /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                            <PlaylistIcon />
                            <p className="mt-2 font-semibold text-gray-700 dark:text-gray-300">No playlists yet</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Create a playlist or use the AI generator to get started.</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default Playlists;