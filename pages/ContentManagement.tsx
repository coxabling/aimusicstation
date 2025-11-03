
import React, { useState, useMemo, ChangeEvent, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { MusicIcon, PencilIcon, TrashIcon, ArrowUpIcon, ArrowDownIcon, SortIcon, PlaylistAddIcon, PlayCircleIcon, PauseCircleIcon, DownloadIcon, SparklesIcon, GlobeIcon, ExclamationCircleIcon, QueueAddIcon, VoiceIcon } from '../components/icons';
import Modal from '../components/Modal';
import InputField from '../components/InputField';
import ToggleSwitch from '../components/ToggleSwitch';
import type { ContentItem, MusicContent, ArticleContent, AdContent, CustomAudioContent, RssFeedContent, Playlist, ClonedVoice, RelayStreamContent } from '../types';
import { usePlayer } from '../contexts/PlayerContext';
import { useContent } from '../contexts/ContentContext';
import { useAuth } from '../contexts/AuthContext';
import { isPlayableContent } from '../types';
import { generateWithRetry, handleAiError } from '../services/ai';
import { useToast } from '../contexts/ToastContext';
import { fetchRssFeed, RssArticle } from '../services/rss';
import * as db from '../services/db';

// --- HELPER & UTILITY COMPONENTS ---

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

const getInitialItem = (item?: Partial<ContentItem>): Partial<ContentItem> => {
    if (item && item.id) return item;
    return { type: 'Music', title: '', artist: '', useAiAnnouncer: false, predefinedAnnouncement: '', announcementWithBackgroundMusic: false, announcerVoice: 'AI-David' };
};

const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => (
    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-4 my-2 overflow-hidden">
        <div className="bg-brand-blue h-4 rounded-full flex items-center justify-center text-white text-xs font-semibold leading-4 transition-all duration-300 ease-in-out" style={{ width: `${progress}%` }} >
            {progress > 10 ? `${Math.round(progress)}%` : ''}
        </div>
    </div>
);

// FIX: This helper function was missing in a previous commit, causing an error when handling file-based ads.
const getAudioDuration = (file: File): Promise<string> => {
    return new Promise((resolve) => {
        const audio = document.createElement('audio');
        const objectUrl = URL.createObjectURL(file);
        audio.src = objectUrl;
        audio.onloadedmetadata = () => {
            const duration = Math.round(audio.duration);
            const minutes = Math.floor(duration / 60);
            const seconds = duration % 60;
            resolve(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        };
        audio.onerror = () => {
            resolve('0:00'); // Resolve with default on error
        };
    });
};

// --- AI PREVIEW HELPERS ---
function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) { bytes[i] = binaryString.charCodeAt(i); }
    return bytes;
}
function pcmToWav(pcmData: Uint8Array, sampleRate: number, numChannels: number, bitsPerSample: number): Blob {
    const dataSize = pcmData.length; const buffer = new ArrayBuffer(44 + dataSize); const view = new DataView(buffer);
    const writeString = (offset: number, str: string) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8); const blockAlign = numChannels * (bitsPerSample / 8);
    writeString(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true); writeString(8, 'WAVE'); writeString(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, numChannels, true); view.setUint32(24, sampleRate, true); view.setUint32(28, byteRate, true); view.setUint16(32, blockAlign, true); view.setUint16(34, bitsPerSample, true); writeString(36, 'data'); view.setUint32(40, dataSize, true); new Uint8Array(buffer, 44).set(pcmData);
    return new Blob([view], { type: 'audio/wav' });
}
const getPreviewDuration = (url: string): Promise<string> => new Promise(resolve => {
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
        const duration = audio.duration;
        resolve(`${Math.floor(duration / 60)}:${Math.round(duration % 60).toString().padStart(2, '0')}`);
    };
    audio.onerror = () => resolve('0:05');
    audio.src = url;
});


// --- SINGLE ITEM FORM ---

const ContentForm: React.FC<{ item: Partial<ContentItem>; onSave: (item: Partial<ContentItem>, file?: File) => void; onCancel: () => void; clonedVoices: ClonedVoice[]; }> = ({ item, onSave, onCancel, clonedVoices }) => {
    const [currentItem, setCurrentItem] = useState<Partial<ContentItem>>(getInitialItem(item));
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isGeneratingAnnouncement, setIsGeneratingAnnouncement] = useState(false);
    const { addToast } = useToast();
    const { stationSettings, deductCredits } = useAuth();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'type') {
            const newType = value as ContentItem['type'];
            const baseState: Partial<ContentItem> = { id: currentItem.id, title: currentItem.title || '' };
            if (newType !== 'Music' && newType !== 'Custom Audio' && newType !== 'Ad') setFile(null);
            const typeDefaults: Record<ContentItem['type'], Partial<ContentItem>> = { 
                'Music': { type: 'Music' as const, artist: '' }, 
                'Article': { type: 'Article' as const, content: '' }, 
                'Ad': { type: 'Ad' as const }, 
                'Custom Audio': { type: 'Custom Audio' as const, artist: '' }, 
                'RSS Feed': { type: 'RSS Feed' as const, source: '' },
                'Relay Stream': { type: 'Relay Stream' as const, url: '' },
            };
            setCurrentItem({ ...baseState, ...typeDefaults[newType], useAiAnnouncer: false, announcementWithBackgroundMusic: false, announcerVoice: 'AI-David' });
        } else {
             setCurrentItem(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            const fileName = selectedFile.name.replace(/\.[^/.]+$/, "");
            const duration = await getAudioDuration(selectedFile);
            setCurrentItem(prev => ({ ...prev, title: fileName, duration }));
        }
    };

    const handleToggle = (name: string, value: boolean) => setCurrentItem(prev => ({ ...prev, [name]: value }));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (file && !isUploading) {
            if (currentItem.type !== 'Music' && currentItem.type !== 'Ad' && currentItem.type !== 'Custom Audio') {
                onSave(currentItem, file);
                return;
            }

            setIsUploading(true);
            setUploadProgress(0);
            const interval = setInterval(() => {
                setUploadProgress(prev => {
                    const newProgress = prev + Math.floor(Math.random() * 15) + 5;
                    if (newProgress >= 100) {
                        clearInterval(interval);
                        setUploadProgress(100);
                        setTimeout(() => onSave(currentItem, file), 500);
                        return 100;
                    }
                    return newProgress;
                });
            }, 250);
        } else if (!isUploading) {
            onSave(currentItem, file);
        }
    };

    const handleGenerateAnnouncement = async () => {
        const musicItem = currentItem as MusicContent;
        if (!musicItem.title || !musicItem.artist || isGeneratingAnnouncement) return;

        const ANNOUNCEMENT_COST = 5;
        const canProceed = await deductCredits(ANNOUNCEMENT_COST, 'Pre-defined Announcement');
        if (!canProceed) {
            return;
        }

        setIsGeneratingAnnouncement(true);
        try {
            const stationVibe = stationSettings.vibe || 'Default';
            const persona = getPersonaPrompt(stationVibe);
            
            const prompt = `${persona} Your task is to introduce the song "${musicItem.title}" by "${musicItem.artist}".
Include a fascinating fact about the artist or the song if possible.
Write the announcement in a way that sounds natural and engaging for a radio broadcast. The text itself should convey the intended emotion and energy, without using special cues like parentheses. For example, instead of writing "(Smoothly) Here is...", you should write something like "And now, let's ease into...".
Keep the announcement under 45 seconds when read aloud.`;

            const response = await generateWithRetry({ model: 'gemini-2.5-flash', contents: prompt });
            setCurrentItem(prev => ({ ...prev, predefinedAnnouncement: response.text }));
            addToast("Announcement generated successfully!", "success");
        } catch (error) {
            console.error("Error generating announcement:", error);
            addToast("Failed to generate announcement.", "error");
        } finally {
            setIsGeneratingAnnouncement(false);
        }
    };
    
    const type = currentItem.type || 'Music';

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content Type</label>
                <select id="type" name="type" value={type} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue bg-white dark:bg-gray-700 disabled:bg-gray-200 dark:disabled:bg-gray-600" disabled={isUploading}>
                    <option>Music</option><option>Article</option><option>Ad</option><option>Custom Audio</option><option>RSS Feed</option><option>Relay Stream</option>
                </select>
            </div>
            {(type === 'Music' || type === 'Custom Audio' || type === 'Ad') && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Audio File</label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
                        <div className="space-y-1 text-center">
                            <MusicIcon />
                            <div className="flex text-sm text-gray-600 dark:text-gray-400">
                                <label htmlFor="file-upload" className={`relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-brand-blue hover:text-blue-700 focus-within:outline-none ${isUploading ? 'cursor-not-allowed text-gray-400' : ''}`}>
                                    <span>Upload a file</span>
                                    <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="audio/*" disabled={isUploading} />
                                </label>
                            </div>
                            {file ? <p className="text-xs text-green-500">{file.name}</p> : <p className="text-xs text-gray-500 dark:text-gray-400">MP3, WAV, etc.</p>}
                        </div>
                    </div>
                     {isUploading && file && (
                        <div className="mt-2">
                             <p className="text-sm text-gray-600 dark:text-gray-400">Uploading: <span className="font-medium text-gray-800 dark:text-gray-200">{file.name}</span></p>
                             <ProgressBar progress={uploadProgress} />
                        </div>
                    )}
                </div>
            )}
            <InputField label="Title" name="title" value={currentItem.title || ''} onChange={handleChange} placeholder="Content Title" disabled={isUploading} />
            {(type === 'Music' || type === 'Custom Audio' || type === 'Ad' || type === 'Relay Stream') && (
                <InputField label="Duration" name="duration" value={currentItem.duration || ''} onChange={handleChange} placeholder="e.g., 3:45" disabled={isUploading}/>
            )}
            {(type === 'Music' || type === 'Custom Audio') && <InputField label="Artist" name="artist" value={(currentItem as MusicContent | CustomAudioContent).artist || ''} onChange={handleChange} placeholder="Artist Name" disabled={isUploading} />}
            {type === 'Music' && <InputField label="Genre" name="genre" value={(currentItem as MusicContent).genre || ''} onChange={handleChange} placeholder="Music Genre" disabled={isUploading} />}
            {type === 'RSS Feed' && <InputField label="Source URL" name="source" value={(currentItem as RssFeedContent).source || ''} onChange={handleChange} placeholder="https://..." disabled={isUploading} />}
            {type === 'Relay Stream' && <InputField label="Stream URL" name="url" value={(currentItem as RelayStreamContent).url || ''} onChange={handleChange} placeholder="https://your-stream.com/live" disabled={isUploading} />}
            
            {type === 'Article' && (
                <InputField label="Article Body" name="content" value={(currentItem as ArticleContent).content || ''} onChange={handleChange} placeholder="Write your article here, or generate one in the AI Content Studio." isTextarea disabled={isUploading} />
            )}

             {type === 'Music' && (
                <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                     <h4 className="font-semibold text-gray-800 dark:text-white">Music Details (for AI Announcer)</h4>
                     <div className="grid grid-cols-2 gap-4">
                        <InputField label="Album" name="album" value={(currentItem as MusicContent).album || ''} onChange={handleChange} placeholder="Album Name" disabled={isUploading} />
                        <InputField label="Year" name="year" value={(currentItem as MusicContent).year || ''} onChange={handleChange} placeholder="Release Year" disabled={isUploading} />
                     </div>
                     <InputField label="Mood/Tags" name="mood" value={(currentItem as MusicContent).mood || ''} onChange={handleChange} placeholder="e.g., Summer Anthem, 80s" disabled={isUploading} />
                     <InputField label="Fun Fact / Note" name="notes" value={(currentItem as MusicContent).notes || ''} onChange={handleChange} placeholder="e.g., Featured in the movie 'Drive'" isTextarea disabled={isUploading} />
                </div>
            )}

            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-gray-800 dark:text-white">AI Announcement</h4>
                <ToggleSwitch label="Use AI Announcer" enabled={!!currentItem.useAiAnnouncer} onChange={(val) => handleToggle('useAiAnnouncer', val)} disabled={isUploading} />
                {currentItem.useAiAnnouncer && (
                    <div className="space-y-4 pl-4 border-l-2 border-gray-200 dark:border-gray-600">
                        <div>
                            <label htmlFor="announcerVoice" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Announcer Voice</label>
                            <select id="announcerVoice" name="announcerVoice" value={currentItem.announcerVoice || 'AI-David'} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue bg-white dark:bg-gray-700" disabled={isUploading}>
                                <optgroup label="Standard Voices">
                                    <option>AI-David</option>
                                    <option>AI-Sarah</option>
                                    <option>AI-Ayo (African Male)</option>
                                    <option>AI-Zola (African Female)</option>
                                </optgroup>
                                {clonedVoices.length > 0 && (
                                    <optgroup label="Cloned Voices">
                                        {clonedVoices.map(voice => (
                                            <option key={voice.id} value={voice.name}>{voice.name}</option>
                                        ))}
                                    </optgroup>
                                )}
                            </select>
                        </div>
                        <div>
                             <InputField label="Predefined Announcement" name="predefinedAnnouncement" value={currentItem.predefinedAnnouncement || ''} onChange={handleChange} placeholder="Leave blank for AI-generated announcement" isTextarea disabled={isUploading} />
                             {type === 'Music' && (
                                <div className="flex justify-end -mt-2">
                                    <button
                                        type="button"
                                        onClick={handleGenerateAnnouncement}
                                        disabled={isGeneratingAnnouncement || isUploading || !(currentItem as MusicContent).artist || !(currentItem as MusicContent).title}
                                        className="flex items-center px-3 py-1 text-xs bg-purple-100 text-purple-700 font-semibold rounded-lg shadow-sm hover:bg-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:hover:bg-purple-900 focus:outline-none disabled:opacity-50"
                                    >
                                        <SparklesIcon className="h-3 w-3 mr-1.5" />
                                        {isGeneratingAnnouncement ? 'Generating...' : 'Generate with AI (5 Credits)'}
                                    </button>
                                </div>
                             )}
                        </div>
                        <ToggleSwitch label="Add background music to announcement" enabled={!!currentItem.announcementWithBackgroundMusic} onChange={(val) => handleToggle('announcementWithBackgroundMusic', val)} disabled={isUploading} />
                    </div>
                )}
            </div>
            <div className="flex justify-end pt-4 space-x-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 font-semibold rounded-lg shadow-md hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed" disabled={isUploading}>Cancel</button>
                <button type="submit" className="px-4 py-2 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none disabled:bg-blue-400 dark:disabled:bg-blue-800 disabled:cursor-not-allowed" disabled={isUploading}>{isUploading ? `Uploading... ${Math.round(uploadProgress)}%` : 'Save Content'}</button>
            </div>
        </form>
    );
};

// --- BULK FORMS ---

interface BulkItem extends Partial<Omit<ContentItem, 'id' | 'date'>> {
    file: File;
    progress: number;
    status: 'pending' | 'uploading' | 'done';
    artist?: string;
    genre?: string;
}

const BulkUploadForm: React.FC<{
    files: File[];
    onSave: (items: Partial<Omit<ContentItem, 'id' | 'date'>>[], files: File[]) => void;
    onCancel: () => void;
}> = ({ files, onSave, onCancel }) => {
    const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        const processFiles = async () => {
            const initialItems = await Promise.all(files.map(async file => {
                const duration = await getAudioDuration(file);
                const title = file.name.replace(/\.[^/.]+$/, "");
                return {
                    file,
                    title,
                    duration,
                    type: 'Music',
                    artist: '',
                    genre: '',
                    progress: 0,
                    status: 'pending'
                } as BulkItem;
            }));
            setBulkItems(initialItems);
        };
        processFiles();
    }, [files]);

    const handleItemChange = (index: number, field: keyof BulkItem, value: string) => {
        setBulkItems(prev =>
            prev.map((item, i) =>
                i === index ? { ...item, [field]: value } : item
            )
        );
    };

    const handleImport = () => {
        setIsImporting(true);
        const itemsToSave = bulkItems.map(item => ({...item})); // create copies
        const filesToSave = itemsToSave.map(item => item.file);
        
        // Simulate upload progress
        const interval = setInterval(() => {
            let allDone = true;
            setBulkItems(currentItems => currentItems.map((item, index) => {
                if (item.status === 'done') return item;

                allDone = false;
                const newProgress = item.progress + Math.random() * 20 + 5;
                if (newProgress >= 100) {
                    return { ...item, progress: 100, status: 'done' };
                }
                return { ...item, progress: newProgress, status: 'uploading' };
            }));
            if (allDone) {
                clearInterval(interval);
                 setTimeout(() => {
                    onSave(itemsToSave, filesToSave);
                    addToast(`${itemsToSave.length} items imported successfully!`, 'success');
                 }, 500);
            }
        }, 300);
    };

    return (
        <div className="space-y-4">
            <div className="max-h-[60vh] overflow-y-auto -mx-6 px-6">
                <table className="w-full text-sm">
                    <thead className="text-left text-gray-500 dark:text-gray-400">
                        <tr>
                            <th className="p-2">File Name</th>
                            <th className="p-2">Title</th>
                            <th className="p-2">Type</th>
                            <th className="p-2">Artist</th>
                            <th className="p-2">Genre</th>
                            <th className="p-2">Duration</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bulkItems.map((item, index) => (
                            <tr key={index} className="border-b dark:border-gray-700">
                                <td className="p-2 align-top">
                                    <p className="font-semibold text-gray-800 dark:text-white truncate max-w-xs">{item.file.name}</p>
                                    <ProgressBar progress={item.progress} />
                                </td>
                                <td className="p-2 align-top"><input type="text" value={item.title} onChange={e => handleItemChange(index, 'title', e.target.value)} className="w-full bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md p-1.5 text-sm" /></td>
                                <td className="p-2 align-top">
                                    <select value={item.type} onChange={e => handleItemChange(index, 'type', e.target.value as ContentItem['type'])} className="w-full bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md p-1.5 text-sm">
                                        <option>Music</option><option>Ad</option><option>Custom Audio</option>
                                    </select>
                                </td>
                                <td className="p-2 align-top"><input type="text" value={item.artist} onChange={e => handleItemChange(index, 'artist', e.target.value)} className="w-full bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md p-1.5 text-sm" /></td>
                                <td className="p-2 align-top"><input type="text" value={item.genre} onChange={e => handleItemChange(index, 'genre', e.target.value)} className="w-full bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md p-1.5 text-sm" /></td>
                                <td className="p-2 align-top text-gray-600 dark:text-gray-300 font-mono">{item.duration}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="flex justify-end pt-4 space-x-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 font-semibold rounded-lg shadow-md hover:bg-gray-300 dark:hover:bg-gray-500" disabled={isImporting}>Cancel</button>
                <button type="button" onClick={handleImport} className="px-4 py-2 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700" disabled={isImporting}>{isImporting ? 'Importing...' : `Import All (${files.length})`}</button>
            </div>
        </div>
    );
};

// --- RSS FEED MODAL ---

const RssFeedModal: React.FC<{
    feed: RssFeedContent;
    onImport: (articles: RssArticle[]) => void;
    onClose: () => void;
}> = ({ feed, onImport, onClose }) => {
    const [articles, setArticles] = useState<RssArticle[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());

    useEffect(() => {
        const loadFeed = async () => {
            setIsLoading(true);
            try {
                const fetchedArticles = await fetchRssFeed(feed.source);
                setArticles(fetchedArticles);
            } catch (error) {
                console.error("Failed to fetch RSS feed:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadFeed();
    }, [feed]);

    const handleSelect = (link: string) => {
        setSelectedArticles(prev => {
            const newSet = new Set(prev);
            if (newSet.has(link)) newSet.delete(link);
            else newSet.add(link);
            return newSet;
        });
    };

    const handleImportClick = () => {
        const articlesToImport = articles.filter(a => selectedArticles.has(a.link));
        onImport(articlesToImport);
    };

    return (
         <div className="flex flex-col h-full">
            <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
                {isLoading ? (
                    <p className="text-center text-gray-500 dark:text-gray-400">Loading feed...</p>
                ) : articles.length > 0 ? (
                    articles.map(article => (
                        <div key={article.link} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <input
                                type="checkbox"
                                className="h-5 w-5 mt-1 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
                                checked={selectedArticles.has(article.link)}
                                onChange={() => handleSelect(article.link)}
                                aria-label={`Select article: ${article.title}`}
                            />
                            <div>
                                <h4 className="font-semibold text-gray-800 dark:text-white">{article.title}</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{new Date(article.date).toLocaleDateString()}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">{article.content}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-center text-gray-500 dark:text-gray-400">No articles found in this feed.</p>
                )}
            </div>
            <div className="flex justify-end pt-4 mt-4 border-t dark:border-gray-700 space-x-2">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 font-semibold rounded-lg shadow-md hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none">Cancel</button>
                <button type="button" onClick={handleImportClick} disabled={selectedArticles.size === 0} className="px-4 py-2 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none disabled:bg-blue-400 dark:disabled:bg-blue-800 disabled:cursor-not-allowed">
                    Import Selected ({selectedArticles.size})
                </button>
            </div>
        </div>
    );
};


// --- MAIN COMPONENT & OTHER FORMS ---

const AddToPlaylistForm: React.FC<{ item: ContentItem | null; playlists: Playlist[]; onAdd: (playlistIds: string[]) => void; onCancel: () => void; }> = ({ item, playlists, onAdd, onCancel }) => {
    const [selectedPlaylists, setSelectedPlaylists] = useState<string[]>([]);
    const handleCheckboxChange = (playlistId: string, checked: boolean) => {
        if (checked) setSelectedPlaylists(prev => [...prev, playlistId]);
        else setSelectedPlaylists(prev => prev.filter(id => id !== playlistId));
    };
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onAdd(selectedPlaylists); };
    if (!item) return null;
    return (
        <form onSubmit={handleSubmit}>
            <p className="text-gray-700 dark:text-gray-300 mb-4">Add "<strong>{item.title}</strong>" to the following playlists:</p>
            <div className="space-y-3 max-h-60 overflow-y-auto">
                {playlists.map(playlist => (
                    <label key={playlist.id} className="flex items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                        <input type="checkbox" className="h-5 w-5 rounded border-gray-300 text-brand-blue focus:ring-brand-blue" checked={selectedPlaylists.includes(playlist.id)} onChange={e => handleCheckboxChange(playlist.id, e.target.checked)} />
                        <span className="ml-3 text-sm font-medium text-gray-800 dark:text-gray-200">{playlist.name}</span>
                    </label>
                ))}
            </div>
            <div className="flex justify-end pt-6 space-x-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 font-semibold rounded-lg shadow-md hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none">Add to Playlists</button>
            </div>
        </form>
    );
};

const BulkAddToPlaylistForm: React.FC<{
    itemCount: number;
    playlists: Playlist[];
    onAdd: (playlistIds: string[]) => void;
    onCancel: () => void;
}> = ({ itemCount, playlists, onAdd, onCancel }) => {
    const [selectedPlaylists, setSelectedPlaylists] = useState<string[]>([]);

    const handleCheckboxChange = (playlistId: string, checked: boolean) => {
        setSelectedPlaylists(prev => checked ? [...prev, playlistId] : prev.filter(id => id !== playlistId));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAdd(selectedPlaylists);
    };

    return (
        <form onSubmit={handleSubmit}>
            <p className="text-gray-700 dark:text-gray-300 mb-4">Add <strong>{itemCount} selected items</strong> to the following playlists:</p>
            <div className="space-y-3 max-h-60 overflow-y-auto border dark:border-gray-600 rounded-md p-3">
                {playlists.length > 0 ? playlists.map(playlist => (
                    <label key={playlist.id} className="flex items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                        <input
                            type="checkbox"
                            className="h-5 w-5 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
                            checked={selectedPlaylists.includes(playlist.id)}
                            onChange={e => handleCheckboxChange(playlist.id, e.target.checked)}
                        />
                        <span className="ml-3 text-sm font-medium text-gray-800 dark:text-gray-200">{playlist.name}</span>
                    </label>
                )) : <p className="text-center text-gray-500 dark:text-gray-400">No playlists found. Create one on the Playlists page first.</p>}
            </div>
            <div className="flex justify-end pt-6 space-x-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 font-semibold rounded-lg shadow-md hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
                <button type="submit" disabled={selectedPlaylists.length === 0} className="px-4 py-2 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-blue-400">Add to Playlists</button>
            </div>
        </form>
    );
};

const BulkEditForm: React.FC<{ items: ContentItem[]; onSave: (changes: Partial<ContentItem>) => void; onCancel: () => void; clonedVoices: ClonedVoice[]; }> = ({ items, onSave, onCancel, clonedVoices }) => {
    const [changes, setChanges] = useState<Record<string, any>>({});
    const [fieldsToUpdate, setFieldsToUpdate] = useState<Record<string, boolean>>({});
    const itemType = items.length > 0 ? (items[0] as ContentItem).type : null;

    const handleFieldToggle = (field: string, checked: boolean) => setFieldsToUpdate(prev => ({ ...prev, [field]: checked }));
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setChanges(prev => ({...prev, [e.target.name]: e.target.value}));
    const handleToggle = (name: string, value: boolean) => setChanges(prev => ({...prev, [name]: value}));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalChanges: Partial<ContentItem> = {};
        for (const key in fieldsToUpdate) {
            if (fieldsToUpdate[key]) {
                (finalChanges as any)[key] = changes[key];
            }
        }
        onSave(finalChanges);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-lg font-semibold text-gray-800 dark:text-white">Editing {items.length} {itemType} items</p>
            
            {(itemType === 'Music' || itemType === 'Custom Audio') && (
                <div className="p-4 border rounded-md dark:border-gray-600 space-y-4">
                    <label className="flex items-center space-x-3 cursor-pointer">
                        <input type="checkbox" className="h-5 w-5 rounded border-gray-300 text-brand-blue focus:ring-brand-blue" checked={!!fieldsToUpdate.artist} onChange={e => handleFieldToggle('artist', e.target.checked)} />
                        <span className="text-gray-700 dark:text-gray-300">Change Artist</span>
                    </label>
                    <InputField label="New Artist" name="artist" value={changes.artist || ''} onChange={handleChange} placeholder="Artist Name" disabled={!fieldsToUpdate.artist}/>
                </div>
            )}
            
            {itemType === 'Music' && (
                 <div className="p-4 border rounded-md dark:border-gray-600 space-y-4">
                    <label className="flex items-center space-x-3 cursor-pointer">
                        <input type="checkbox" className="h-5 w-5 rounded border-gray-300 text-brand-blue focus:ring-brand-blue" checked={!!fieldsToUpdate.genre} onChange={e => handleFieldToggle('genre', e.target.checked)} />
                        <span className="text-gray-700 dark:text-gray-300">Change Genre</span>
                    </label>
                    <InputField label="New Genre" name="genre" value={changes.genre || ''} onChange={handleChange} placeholder="Music Genre" disabled={!fieldsToUpdate.genre}/>
                </div>
            )}

            <div className="p-4 border rounded-md dark:border-gray-600 space-y-4">
                <label className="flex items-center space-x-3 cursor-pointer">
                    <input type="checkbox" className="h-5 w-5 rounded border-gray-300 text-brand-blue focus:ring-brand-blue" checked={!!fieldsToUpdate.useAiAnnouncer} onChange={e => handleFieldToggle('useAiAnnouncer', e.target.checked)} />
                    <span className="text-gray-700 dark:text-gray-300">Change "Use AI Announcer" setting</span>
                </label>
                <ToggleSwitch label="Use AI Announcer" enabled={!!changes.useAiAnnouncer} onChange={(val) => handleToggle('useAiAnnouncer', val)} disabled={!fieldsToUpdate.useAiAnnouncer} />
            </div>

            <div className="p-4 border rounded-md dark:border-gray-600 space-y-4">
                <label className="flex items-center space-x-3 cursor-pointer">
                    <input type="checkbox" className="h-5 w-5 rounded border-gray-300 text-brand-blue focus:ring-brand-blue" checked={!!fieldsToUpdate.announcerVoice} onChange={e => handleFieldToggle('announcerVoice', e.target.checked)} />
                    <span className="text-gray-700 dark:text-gray-300">Change Announcer Voice</span>
                </label>
                <div>
                    <label htmlFor="bulk-announcerVoice" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Announcer Voice</label>
                    <select 
                        id="bulk-announcerVoice"
                        name="announcerVoice" 
                        value={changes.announcerVoice || 'AI-David'} 
                        onChange={handleChange} 
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue bg-white dark:bg-gray-700" 
                        disabled={!fieldsToUpdate.announcerVoice}
                    >
                        <optgroup label="Standard Voices">
                            <option>AI-David</option>
                            <option>AI-Sarah</option>
                            <option>AI-Ayo (African Male)</option>
                            <option>AI-Zola (African Female)</option>
                        </optgroup>
                        {clonedVoices.length > 0 && (
                            <optgroup label="Cloned Voices">
                                {clonedVoices.map(voice => (
                                    <option key={voice.id} value={voice.name}>{voice.name}</option>
                                ))}
                            </optgroup>
                        )}
                    </select>
                </div>
            </div>

            <div className="p-4 border rounded-md dark:border-gray-600 space-y-4">
                <label className="flex items-center space-x-3 cursor-pointer">
                    <input type="checkbox" className="h-5 w-5 rounded border-gray-300 text-brand-blue focus:ring-brand-blue" checked={!!fieldsToUpdate.announcementWithBackgroundMusic} onChange={e => handleFieldToggle('announcementWithBackgroundMusic', e.target.checked)} />
                    <span className="text-gray-700 dark:text-gray-300">Change "Add background music" setting</span>
                </label>
                <ToggleSwitch label="Add background music to announcement" enabled={!!changes.announcementWithBackgroundMusic} onChange={(val) => handleToggle('announcementWithBackgroundMusic', val)} disabled={!fieldsToUpdate.announcementWithBackgroundMusic} />
            </div>
            
            <div className="flex justify-end pt-4 space-x-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 font-semibold rounded-lg shadow-md hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none">Apply Changes</button>
            </div>
        </form>
    );
};

const MergeSummarizeForm: React.FC<{ items: (ArticleContent | RssFeedContent)[]; onSave: (newItemData: Partial<ArticleContent>) => void; onCancel: () => void; }> = ({ items, onSave, onCancel }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [newTitle, setNewTitle] = useState(`Merged Article - ${new Date().toLocaleDateString()}`);
    const [summarizedContent, setSummarizedContent] = useState('');
    const { addToast } = useToast();

    const mergedContent = useMemo(() => {
        return items.map(item => `--- ARTICLE: ${item.title} ---\n${item.content || '(No content available)'}`).join('\n\n');
    }, [items]);

    useEffect(() => {
        setSummarizedContent(mergedContent);
    }, [mergedContent]);

    const handleSummarize = async () => {
        setIsLoading(true);
        try {
            const prompt = `You are an expert radio script writer. Merge the following articles and news items into a single, cohesive, and engaging script for a radio broadcast. The script should be easy for a host to read and for listeners to understand. Summarize the key points, create smooth transitions between topics, and maintain a consistent, professional tone. Here is the content to merge and summarize:\n\n${mergedContent}`;
            const response = await generateWithRetry({ model: 'gemini-2.5-flash', contents: prompt });
            setSummarizedContent(response.text);
            addToast("Content summarized by AI!", "success");
        } catch (error) {
            console.error("Error summarizing content:", error);
            addToast("Failed to summarize content.", "error");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            title: newTitle,
            content: summarizedContent,
            type: 'Article',
            useAiAnnouncer: true, 
            announcerVoice: 'AI-David',
            announcementWithBackgroundMusic: true
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <InputField label="New Article Title" name="newTitle" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Title for the new article" />
            
            <div className="flex justify-end">
                <button type="button" onClick={handleSummarize} disabled={isLoading} className="flex items-center px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 focus:outline-none disabled:bg-purple-400">
                    <SparklesIcon className="h-4 w-4 mr-2" />
                    {isLoading ? 'Summarizing...' : 'Merge & Summarize with AI'}
                </button>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Generated Radio Script</label>
                <textarea
                    value={summarizedContent}
                    onChange={e => setSummarizedContent(e.target.value)}
                    className="w-full h-64 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue bg-white dark:bg-gray-700"
                    placeholder="Summarized content will appear here..."
                    rows={10}
                />
            </div>
            
            <div className="flex justify-end pt-4 space-x-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 font-semibold rounded-lg shadow-md hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none">Save as New Article</button>
            </div>
        </form>
    );
};

interface ContentManagementProps {
  onSelectionChange: (selectedIds: string[]) => void;
}

const ContentManagement: React.FC<ContentManagementProps> = ({ onSelectionChange }) => {
    const { contentItems, addContentItem, bulkAddContentItems, bulkAddTextContentItems, updateContentItem, deleteContentItems, bulkUpdateContentItems, isLoading } = useContent();
    const { currentUser, deductCredits } = useAuth();
    const [isSingleItemModalOpen, setIsSingleItemModalOpen] = useState(false);
    const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
    const [filesToBulkUpload, setFilesToBulkUpload] = useState<File[]>([]);
    const [editingItem, setEditingItem] = useState<Partial<ContentItem> | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('All');
    const [sortConfig, setSortConfig] = useState<{ key: 'type' | 'title' | 'artist' | 'duration' | 'date'; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });
    
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
    const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
    const [isBulkPlaylistModalOpen, setIsBulkPlaylistModalOpen] = useState(false);
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [clonedVoices, setClonedVoices] = useState<ClonedVoice[]>([]);
    const [currentItemForPlaylist, setCurrentItemForPlaylist] = useState<ContentItem | null>(null);
    const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
    const [isRssModalOpen, setIsRssModalOpen] = useState(false);
    const [currentRssFeed, setCurrentRssFeed] = useState<RssFeedContent | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemsToDelete, setItemsToDelete] = useState<string[]>([]);
    const [previewingItemId, setPreviewingItemId] = useState<string | null>(null);
    
    const { addToast } = useToast();
    const { currentItem, playbackState, isPreviewing, playPreview, addToQueue, togglePlayPause } = usePlayer();

    const isPlaying = playbackState === 'playing';
    
    useEffect(() => {
        const fetchPlaylistsAndVoices = async () => {
            if (!currentUser) return;
            const [loadedPlaylists, voices] = await Promise.all([
                db.getAllPlaylists(currentUser.tenantId),
                db.getAllClonedVoices(currentUser.tenantId)
            ]);
            setPlaylists(loadedPlaylists);
            setClonedVoices(voices.filter(v => v.status === 'Ready'));
        };
        fetchPlaylistsAndVoices();
    }, [currentUser]);

    const requestSort = (key: 'type' | 'title' | 'artist' | 'duration' | 'date') => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: 'type' | 'title' | 'artist' | 'duration' | 'date') => {
        if (sortConfig.key !== key) return <SortIcon />;
        if (sortConfig.direction === 'ascending') return <ArrowUpIcon />;
        return <ArrowDownIcon />;
    };

    const getArtistSource = (item: ContentItem) => {
        switch(item.type) { case 'Music': case 'Custom Audio': return item.artist; case 'RSS Feed': return item.source; case 'Article': return 'Article'; default: return '-'; }
    }
    
    const processedContent = useMemo(() => {
        let items = [...contentItems];
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            items = items.filter(item => item.title.toLowerCase().includes(query) || item.type.toLowerCase().includes(query) || getArtistSource(item).toLowerCase().includes(query));
        }
        if (typeFilter !== 'All') items = items.filter(item => item.type === typeFilter);
        
        items.sort((a, b) => {
            const key = sortConfig.key;
            let valA: any, valB: any;
            if (key === 'artist') {
                valA = getArtistSource(a).toLowerCase();
                valB = getArtistSource(b).toLowerCase();
            } else {
                const commonKey = key as 'type' | 'title' | 'duration' | 'date';
                valA = (a as any)[commonKey] ?? '';
                valB = (b as any)[commonKey] ?? '';
                if (typeof valA === 'string') valA = valA.toLowerCase();
                if (typeof valB === 'string') valB = valB.toLowerCase();
            }
        
            if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });

        return items;
    }, [contentItems, searchQuery, typeFilter, sortConfig]);

    const handleAiPreview = async (item: ArticleContent) => {
        if (!currentUser) return;

        if (isPreviewing && currentItem?.id.startsWith(`ai-preview-${item.id}`)) {
            togglePlayPause();
            return;
        }

        if (!item.content) {
            addToast('This article has no content to preview.', 'error');
            return;
        }

        const canProceed = await deductCredits(5, 'AI Article Preview');
        if (!canProceed) return;

        setPreviewingItemId(item.id);
        try {
            const textToSpeak = item.title + ". " + item.content;
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: textToSpeak }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } }
                }
            });

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!base64Audio) throw new Error("TTS failed to return audio data.");
            
            const pcmBytes = decode(base64Audio);
            const wavBlob = pcmToWav(pcmBytes, 24000, 1, 16);
            const audioUrl = URL.createObjectURL(wavBlob);
            
            const duration = await getPreviewDuration(audioUrl);

            const previewItem: CustomAudioContent = {
                id: `ai-preview-${item.id}-${Date.now()}`,
                tenantId: currentUser.tenantId,
                type: 'Custom Audio',
                title: `Preview: ${item.title}`,
                artist: 'AI Announcer',
                duration: duration,
                date: new Date().toISOString(),
                url: audioUrl,
            };
            
            playPreview(previewItem);

        } catch (error) {
            handleAiError(error, addToast);
        } finally {
            setPreviewingItemId(null);
        }
    };
    
    const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files ? Array.from(e.target.files) : [];
        const audioFiles = files.filter((file: File) => file.type.startsWith('audio/'));
        if (audioFiles.length === 0) return;

        if (audioFiles.length > 1) {
            setFilesToBulkUpload(audioFiles);
            setIsBulkUploadModalOpen(true);
        } else {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.files = e.target.files;
            
            setEditingItem({});
            setIsSingleItemModalOpen(true);
            
            // We need a slight delay to let the modal open before triggering the change
            setTimeout(() => {
                const event = new Event('change', { bubbles: true });
                Object.defineProperty(event, 'target', { value: fileInput, enumerable: true });
                document.querySelector('#file-upload')?.dispatchEvent(event);
            }, 100);
        }
         // Reset file input
        if (e.target) e.target.value = '';
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newSelection = e.target.checked ? processedContent.map(i => i.id) : [];
        setSelectedItems(newSelection);
        onSelectionChange(newSelection);
    };

    const handleSelectItem = (id: string, checked: boolean) => {
        const newSelection = checked ? [...selectedItems, id] : selectedItems.filter(i => i !== id);
        setSelectedItems(newSelection);
        onSelectionChange(newSelection);
    };

    const isAllSelected = processedContent.length > 0 && selectedItems.length === processedContent.length;
    const selectedContent = useMemo(() => contentItems.filter(item => selectedItems.includes(item.id)), [contentItems, selectedItems]);
    const areAllSelectedItemsSameType = useMemo(() => {
        if (selectedContent.length < 2) return true;
        const firstType = selectedContent[0].type;
        return selectedContent.every(item => item.type === firstType);
    }, [selectedContent]);
    const areAllSelectedItemsTextBased = useMemo(() => {
        if (selectedContent.length < 2) return false;
        return selectedContent.every(item => item.type === 'Article' || item.type === 'RSS Feed');
    }, [selectedContent]);
    const areAllSelectedItemsPlayable = useMemo(() => {
        if (selectedContent.length === 0) return false;
        const playableTypes: ContentItem['type'][] = ['Music', 'Ad', 'Custom Audio', 'Relay Stream'];
        return selectedContent.every(item => playableTypes.includes(item.type));
    }, [selectedContent]);

    const handleEdit = (item: ContentItem) => { setEditingItem(item); setIsSingleItemModalOpen(true); };
    
    const handleDelete = (id: string) => {
        setItemsToDelete([id]);
        setIsDeleteModalOpen(true);
    };
    
    const handleSave = (itemToSave: Partial<ContentItem>, file?: File) => {
        if (itemToSave.id) {
            const originalItem = contentItems.find(item => item.id === itemToSave.id);
            if (originalItem) {
                const updatedItem = { ...originalItem, ...itemToSave } as ContentItem;
    
                if (file) {
                    if (updatedItem.type === 'Music' || updatedItem.type === 'Ad' || updatedItem.type === 'Custom Audio') {
                        (updatedItem as any).file = file;
                    }
                }
                
                updateContentItem(updatedItem);
            } else {
                console.error(`Item with id ${itemToSave.id} not found for update.`);
                addToast('Error updating item.', 'error');
            }
        } else {
            addContentItem(itemToSave, file);
        }
        setIsSingleItemModalOpen(false); setEditingItem(null);
    };
    
    const handleBulkDelete = () => {
        setItemsToDelete([...selectedItems]);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (itemsToDelete.length > 0) {
            deleteContentItems(itemsToDelete);
            const newSelection = selectedItems.filter(id => !itemsToDelete.includes(id));
            setSelectedItems(newSelection);
            onSelectionChange(newSelection);
            addToast(`${itemsToDelete.length} item(s) deleted.`, 'info');
        }
        setIsDeleteModalOpen(false);
        setItemsToDelete([]);
    };

    const handleBulkSave = (changes: Partial<ContentItem>) => {
        bulkUpdateContentItems(selectedItems, changes);
        setIsBulkEditModalOpen(false); 
        setSelectedItems([]); 
        onSelectionChange([]);
    };
    
    const handleOpenPlaylistModal = (item: ContentItem) => { setCurrentItemForPlaylist(item); setIsPlaylistModalOpen(true); };
    
    const handleAddToPlaylist = async (playlistIds: string[]) => {
        if (!currentItemForPlaylist || !currentUser) return;
        await db.addTracksToPlaylists([currentItemForPlaylist.originalId || currentItemForPlaylist.id], playlistIds, currentUser.tenantId);
        addToast(`"${currentItemForPlaylist.title}" added to ${playlistIds.length} playlist(s).`, 'success');
        setIsPlaylistModalOpen(false);
        setCurrentItemForPlaylist(null);
    };

    const handleBulkAddToPlaylist = async (playlistIds: string[]) => {
        if (!currentUser || selectedItems.length === 0) return;
        await db.addTracksToPlaylists(selectedItems, playlistIds, currentUser.tenantId);
        addToast(`${selectedItems.length} items added to ${playlistIds.length} playlist(s).`, 'success');
        setIsBulkPlaylistModalOpen(false);
        setSelectedItems([]);
        onSelectionChange([]);
    };

    const handleSaveMerge = (newItemData: Partial<ArticleContent>) => {
        addContentItem(newItemData);
        setIsMergeModalOpen(false);
        setSelectedItems([]);
        onSelectionChange([]);
    };
    
    const handleBulkItemsSave = (items: Partial<Omit<ContentItem, 'id' | 'date'>>[], files: File[]) => {
        bulkAddContentItems(items, files);
        setIsBulkUploadModalOpen(false);
        setFilesToBulkUpload([]);
    };

    const handleDownload = (item: ContentItem) => {
        if (!isPlayableContent(item)) {
            return;
        }

        const link = document.createElement('a');
        link.style.display = 'none';
        const filename = item.title || 'download';
        
        // FIX: Check if the 'file' property exists on the item before accessing it, as RelayStreamContent does not have this property.
        // This resolves the TypeScript error. Also, prevent attempts to download a live Relay Stream URL.
        if ('file' in item && item.file && item.file instanceof File) {
            const blobUrl = URL.createObjectURL(item.file);
            link.href = blobUrl;
            link.download = item.file.name || filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
        } 
        else if (item.url && item.type !== 'Relay Stream') {
            link.href = item.url;
            link.download = filename;
            link.target = '_blank'; 
            link.rel = 'noopener noreferrer';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleAddToQueue = (item: ContentItem) => {
        addToQueue([item]);
        addToast(`"${item.title}" added to the playout queue.`, 'success');
    };

    return (
        <>
            <Modal isOpen={isSingleItemModalOpen} onClose={() => { setIsSingleItemModalOpen(false); setEditingItem(null); }} title={editingItem?.id ? 'Edit Content' : 'Add New Content'}>
                <ContentForm item={editingItem || {}} onSave={handleSave} onCancel={() => { setIsSingleItemModalOpen(false); setEditingItem(null); }} clonedVoices={clonedVoices} />
            </Modal>
    
            <Modal isOpen={isBulkUploadModalOpen} onClose={() => setIsBulkUploadModalOpen(false)} title={`Bulk Upload (${filesToBulkUpload.length} files)`}>
                <BulkUploadForm files={filesToBulkUpload} onSave={handleBulkItemsSave} onCancel={() => setIsBulkUploadModalOpen(false)} />
            </Modal>
    
            <Modal isOpen={isPlaylistModalOpen} onClose={() => setIsPlaylistModalOpen(false)} title="Add to Playlist">
                <AddToPlaylistForm item={currentItemForPlaylist} playlists={playlists} onAdd={handleAddToPlaylist} onCancel={() => setIsPlaylistModalOpen(false)} />
            </Modal>
             <Modal isOpen={isBulkPlaylistModalOpen} onClose={() => setIsBulkPlaylistModalOpen(false)} title="Add to Playlist">
                <BulkAddToPlaylistForm
                    itemCount={selectedItems.length}
                    playlists={playlists}
                    onAdd={handleBulkAddToPlaylist}
                    onCancel={() => setIsBulkPlaylistModalOpen(false)}
                />
            </Modal>
            
            <Modal isOpen={isBulkEditModalOpen} onClose={() => setIsBulkEditModalOpen(false)} title="Bulk Edit">
                {selectedContent.length > 0 && <BulkEditForm items={selectedContent} onSave={handleBulkSave} onCancel={() => setIsBulkEditModalOpen(false)} clonedVoices={clonedVoices} />}
            </Modal>
    
            <Modal isOpen={isMergeModalOpen} onClose={() => setIsMergeModalOpen(false)} title="Merge & Summarize Articles">
                {areAllSelectedItemsTextBased && <MergeSummarizeForm items={selectedContent as (ArticleContent | RssFeedContent)[]} onSave={handleSaveMerge} onCancel={() => setIsMergeModalOpen(false)} />}
            </Modal>

            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Deletion">
                <div className="text-center">
                    <ExclamationCircleIcon className="mx-auto h-12 w-12 text-red-600" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Are you sure?</h3>
                    <div className="mt-2 px-7 py-3">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            You are about to permanently delete {itemsToDelete.length} item(s). This will also remove them from any playlists they are part of. This action cannot be undone.
                        </p>
                    </div>
                    <div className="mt-4 flex justify-center space-x-2">
                        <button type="button" onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 font-semibold rounded-lg shadow-md hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none">
                            Cancel
                        </button>
                        <button type="button" onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none">
                            Delete
                        </button>
                    </div>
                </div>
            </Modal>
    
            {currentRssFeed && (
                <Modal isOpen={isRssModalOpen} onClose={() => setIsRssModalOpen(false)} title={`Articles from ${currentRssFeed.title}`}>
                    <RssFeedModal feed={currentRssFeed} onImport={(articles) => {
                        const newItems = articles.map(a => ({
                            type: 'Article' as const,
                            title: a.title,
                            content: a.content,
                            duration: '0:00', // Placeholder
                            useAiAnnouncer: true,
                        }));
                        bulkAddTextContentItems(newItems);
                        setIsRssModalOpen(false);
                        addToast(`${articles.length} articles imported.`, 'success');
                    }} onClose={() => setIsRssModalOpen(false)} />
                </Modal>
            )}
    
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                {selectedItems.length > 0 ? (
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 p-4 -m-6 mb-0 bg-blue-50 dark:bg-gray-700/50 rounded-t-lg">
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">{selectedItems.length} item(s) selected</h2>
                        <div className="flex items-center gap-4 flex-wrap justify-center">
                             <button onClick={() => setIsBulkPlaylistModalOpen(true)} disabled={!areAllSelectedItemsPlayable} className="px-4 py-2 bg-purple-500 text-white font-semibold rounded-lg shadow-md hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed">Add to Playlist</button>
                            <button onClick={() => setIsBulkEditModalOpen(true)} disabled={!areAllSelectedItemsSameType} className="px-4 py-2 bg-yellow-500 text-white font-semibold rounded-lg shadow-md hover:bg-yellow-600 disabled:bg-gray-400 disabled:cursor-not-allowed">Edit Selected</button>
                            {areAllSelectedItemsTextBased && <button onClick={() => setIsMergeModalOpen(true)} className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700">Merge & Summarize</button>}
                            <button onClick={handleBulkDelete} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700">Delete Selected</button>
                            <button onClick={() => { setSelectedItems([]); onSelectionChange([]); }} className="px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg shadow-md hover:bg-gray-600">Deselect All</button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                         <div>
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Content Management</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your station's music, articles, ads, and other audio content.</p>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button onClick={() => { setEditingItem({}); setIsSingleItemModalOpen(true); }} className="px-4 py-2 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none whitespace-nowrap">Add Content</button>
                            <label htmlFor="content-bulk-upload" className="cursor-pointer px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none whitespace-nowrap">Bulk Upload</label>
                            <input id="content-bulk-upload" type="file" onChange={handleFileSelect} className="hidden" multiple accept="audio/*" />
                        </div>
                    </div>
                )}
    
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                    <div className="relative w-full sm:w-80">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg></div>
                        <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue bg-white dark:bg-gray-700" aria-label="Search content"/>
                    </div>
                    <div>
                        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue bg-white dark:bg-gray-700">
                            <option>All</option><option>Music</option><option>Article</option><option>Ad</option><option>Custom Audio</option><option>RSS Feed</option><option>Relay Stream</option>
                        </select>
                    </div>
                </div>
    
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="p-4"><input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue" onChange={handleSelectAll} checked={isAllSelected} aria-label="Select all items"/></th>
                                {(['type', 'title', 'artist', 'duration', 'date'] as const).map(key => <th scope="col" className="px-4 py-3" key={key}><button onClick={() => requestSort(key)} className="flex items-center group font-inherit text-inherit uppercase">{key} {getSortIcon(key)}</button></th>)}
                                <th scope="col" className="px-4 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={7} className="text-center py-8">Loading content...</td></tr>
                            ) : processedContent.length > 0 ? (
                                processedContent.map((item) => (
                                    <tr key={item.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                        <td className="p-4"><input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue" checked={selectedItems.includes(item.id)} onChange={e => handleSelectItem(item.id, e.target.checked)} aria-label={`Select ${item.title}`}/></td>
                                        <td className="px-4 py-4 font-medium text-gray-900 dark:text-white">{item.type}</td>
                                        <td className="px-4 py-4">{item.title}</td>
                                        <td className="px-4 py-4">{getArtistSource(item)}</td>
                                        <td className="px-4 py-4">{item.duration}</td>
                                        <td className="px-4 py-4">{new Date(item.date).toLocaleDateString()}</td>
                                        <td className="px-4 py-4"><div className="flex items-center space-x-3">
                                            {isPlayableContent(item) ? (<><button onClick={() => playPreview(item)} className="text-brand-blue hover:text-blue-700" title={isPreviewing && currentItem?.id === item.id && isPlaying ? 'Pause' : 'Preview'}>{isPreviewing && currentItem?.id === item.id && isPlaying ? <PauseCircleIcon /> : <PlayCircleIcon />}</button><button onClick={() => handleDownload(item)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" title="Download Source"><DownloadIcon /></button></>) : (<>
                                                {item.type === 'RSS Feed' && <button onClick={() => { setCurrentRssFeed(item as RssFeedContent); setIsRssModalOpen(true); }} className="text-blue-500 hover:text-blue-700" title="View Articles"><GlobeIcon /></button>}
                                                {item.type === 'Article' && (
                                                    <button onClick={() => handleAiPreview(item as ArticleContent)} disabled={previewingItemId === item.id} className="text-purple-500 hover:text-purple-700 disabled:text-gray-400" title="Preview with AI Voice">
                                                        {previewingItemId === item.id ? (
                                                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                        ) : ( isPreviewing && currentItem?.id.startsWith(`ai-preview-${item.id}`) && isPlaying ? <PauseCircleIcon /> : <VoiceIcon /> )}
                                                    </button>
                                                )}
                                            </>)}
                                            <button onClick={() => handleEdit(item)} className="text-brand-blue hover:text-blue-700" title="Edit"><PencilIcon /></button>
                                            <button onClick={() => handleAddToQueue(item)} className="text-green-500 hover:text-green-700" title="Add to Playout Queue"><QueueAddIcon /></button>
                                            <button onClick={() => handleOpenPlaylistModal(item)} className="text-purple-500 hover:text-purple-700" title="Add to Playlist"><PlaylistAddIcon /></button>
                                            <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700" title="Delete"><TrashIcon /></button>
                                        </div></td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="text-center py-16">
                                        <div className="mx-auto h-12 w-12 text-gray-400"><MusicIcon /></div>
                                        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No content found</h3>
                                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                            {searchQuery || typeFilter !== 'All' ? 'Try adjusting your search or filter.' : 'Get started by adding new content.'}
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};

export default ContentManagement;
