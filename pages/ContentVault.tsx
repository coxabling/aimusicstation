

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { vaultContent, vaultCategories, VaultContentItem, mapVaultItemToAudioContent } from '../services/vaultContent';
import * as db from '../services/db';
import { usePlayer } from '../contexts/PlayerContext';
import { useToast } from '../contexts/ToastContext';
import { isPlayableContent, ContentItem, AudioContent } from '../types';
import { PlayCircleIcon, PauseCircleIcon, CheckIcon, DownloadIcon, SparklesIcon } from '../components/icons';
import { useAuth } from '../contexts/AuthContext';
import { GoogleGenAI, Modality } from '@google/genai';
import { handleAiError } from '../services/ai';

// --- AUDIO HELPER FUNCTIONS ---

function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

function pcmToWav(pcmData: Uint8Array, sampleRate: number, numChannels: number, bitsPerSample: number): Blob {
    const dataSize = pcmData.length;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    const writeString = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    };
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    new Uint8Array(buffer, 44).set(pcmData);

    return new Blob([view], { type: 'audio/wav' });
}

const getDuration = (url: string): Promise<string> => new Promise(resolve => {
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
        window.URL.revokeObjectURL(audio.src);
        const duration = audio.duration;
        resolve(`${Math.floor(duration / 60)}:${Math.round(duration % 60).toString().padStart(2, '0')}`);
    };
    audio.onerror = () => {
        resolve('0:05'); // fallback for short clips
        URL.revokeObjectURL(audio.src); 
    }
    audio.src = url;
});


const ContentVault: React.FC = () => {
    const [activeCategory, setActiveCategory] = useState<VaultContentItem['category']>(vaultCategories[0]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [importedVaultIds, setImportedVaultIds] = useState<Set<string>>(new Set());
    const [importingId, setImportingId] = useState<string | null>(null);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

    // AI Generation State
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
    const [generatedAudioBlob, setGeneratedAudioBlob] = useState<Blob | null>(null);
    const [newAudioTitle, setNewAudioTitle] = useState('');
    const AUDIO_GENERATION_COST = 50;

    const { addToast } = useToast();
    const { currentItem, playbackState, isPreviewing, playPreview } = usePlayer();
    const isPlaying = playbackState === 'playing';
    const { currentUser, deductCredits } = useAuth();

    const loadImportedContent = useCallback(async () => {
        if (!currentUser) return;
        setIsLoading(true);
        const userAudioContent = await db.getAllAudioContent(currentUser.tenantId);
        const vaultIds = new Set(userAudioContent.map(item => item.vaultId).filter((id): id is string => !!id));
        setImportedVaultIds(vaultIds);
        setIsLoading(false);
    }, [currentUser]);

    useEffect(() => {
        loadImportedContent();
    }, [loadImportedContent]);
    
    // Cleanup effect for generated audio URL
    useEffect(() => {
        const url = generatedAudioUrl;
        return () => {
            if (url) {
                URL.revokeObjectURL(url);
            }
        };
    }, [generatedAudioUrl]);

    const filteredContent = useMemo(() => {
        let items = vaultContent.filter(item => item.category === activeCategory);
        if (searchQuery) {
            items = items.filter(item => item.filename.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return items;
    }, [activeCategory, searchQuery]);

    const isAllSelected = useMemo(() => {
        const selectableItems = filteredContent.filter(item => !importedVaultIds.has(item.id));
        return selectableItems.length > 0 && selectableItems.every(item => selectedItems.has(item.id));
    }, [filteredContent, importedVaultIds, selectedItems]);
    
    useEffect(() => {
        setSelectedItems(new Set());
    }, [activeCategory]);

    const handleSelectItem = (id: string) => {
        setSelectedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const selectableIds = filteredContent
                .filter(item => !importedVaultIds.has(item.id))
                .map(item => item.id);
            setSelectedItems(new Set(selectableIds));
        } else {
            setSelectedItems(new Set());
        }
    };

    const handleImport = async (item: VaultContentItem) => {
        if (importedVaultIds.has(item.id) || !currentUser) return;

        setImportingId(item.id);
        const newAudioContentData = mapVaultItemToAudioContent(item);
        const newItem: AudioContent = {
            id: `imported-${item.id}-${Date.now()}`,
            tenantId: currentUser.tenantId,
            ...newAudioContentData,
        };

        await db.saveAudioContent(newItem);
        
        setImportedVaultIds(prev => new Set(prev).add(item.id));
        addToast(`"${item.filename}" added to your Audio Content library!`, 'success');
        
        setTimeout(() => {
            setImportingId(null);
        }, 1000);
    };

    const handleBulkImport = async () => {
        if (!currentUser) return;
        const itemsToImport = vaultContent.filter(item => selectedItems.has(item.id) && !importedVaultIds.has(item.id));
        if (itemsToImport.length === 0) {
            addToast('No new items selected to import.', 'info');
            return;
        }

        setImportingId('bulk-import');
        const newAudioItems: AudioContent[] = itemsToImport.map(item => ({
            id: `imported-${item.id}-${Date.now()}`,
            tenantId: currentUser.tenantId,
            ...mapVaultItemToAudioContent(item),
        }));

        await db.bulkSaveAudioContent(newAudioItems);

        setImportedVaultIds(prev => new Set([...prev, ...itemsToImport.map(i => i.id)]));
        addToast(`${itemsToImport.length} items added to your Audio Content library!`, 'success');
        setSelectedItems(new Set());
        
        setTimeout(() => {
            setImportingId(null);
        }, 1000);
    };

    const handleBulkDownload = () => {
        const itemsToDownload = vaultContent.filter(item => selectedItems.has(item.id));
        if (itemsToDownload.length === 0) return;

        itemsToDownload.forEach((item, index) => {
            setTimeout(() => {
                const link = document.createElement('a');
                link.href = item.url;
                link.download = item.filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }, index * 300);
        });

        addToast(`Started download for ${itemsToDownload.length} items.`, 'info');
        setSelectedItems(new Set());
    };
    
    const handlePreview = (item: VaultContentItem) => {
        if (!currentUser) return;
        const playableItem: ContentItem = {
            id: item.id,
            tenantId: currentUser.tenantId,
            title: item.filename,
            type: 'Custom Audio',
            artist: item.category,
            duration: item.duration,
            date: new Date().toISOString(),
            url: item.url,
        };
        if (isPlayableContent(playableItem)) {
            playPreview(playableItem);
        }
    };

    const handleGenerateAudio = async () => {
        if (!aiPrompt || !currentUser) return;
        const canProceed = await deductCredits(AUDIO_GENERATION_COST, 'AI Soundscape Generation');
        if (!canProceed) return;

        setIsGenerating(true);
        setGeneratedAudioUrl(null);
        setGeneratedAudioBlob(null);
        setNewAudioTitle('');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: aiPrompt }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: 'Zephyr' },
                        },
                    },
                }
            });

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!base64Audio) throw new Error("TTS generation failed to return audio data.");

            const pcmBytes = decode(base64Audio);
            const wavBlob = pcmToWav(pcmBytes, 24000, 1, 16);

            setGeneratedAudioBlob(wavBlob);
            setGeneratedAudioUrl(URL.createObjectURL(wavBlob));
            setNewAudioTitle(aiPrompt);
            addToast(`Audio generated for "${aiPrompt}"!`, 'success');

        } catch (error) {
            handleAiError(error, addToast);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveAudio = async () => {
        if (!generatedAudioBlob || !newAudioTitle || !currentUser) return;
    
        setIsSaving(true);
        const filename = `${newAudioTitle}.wav`;
        const audioFile = new File([generatedAudioBlob], filename, { type: 'audio/wav' });
    
        const duration = generatedAudioUrl ? await getDuration(generatedAudioUrl) : '0:00';
    
        const newItem: AudioContent = {
            id: `ai-audio-${Date.now()}`,
            tenantId: currentUser.tenantId,
            type: 'Jingle', // Save as Jingle by default
            filename,
            artist: 'AI Generator',
            duration,
            genre: 'Generated',
            announceTrack: false,
            announcementVoice: 'AI-David',
            announcementWithBackgroundMusic: false,
            dateTime: new Date().toISOString(),
            totalPlays: 0,
            lastPlayed: 'Never',
            published: true,
            file: audioFile
        };
    
        await db.saveAudioContent(newItem);
        await loadImportedContent();
        addToast(`"${filename}" saved to your Audio Content library!`, 'success');
    
        setAiPrompt('');
        setGeneratedAudioUrl(null);
        setGeneratedAudioBlob(null);
        setNewAudioTitle('');
        setIsSaving(false);
    };

    return (
        <div className="space-y-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                    <SparklesIcon className="h-6 w-6 text-purple-500" />
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">AI Music & Soundscape Generation</h2>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Describe a short jingle, stinger, or music bed, and the AI will generate a unique, royalty-free audio clip for your station.
                </p>
                <div className="flex items-center space-x-2">
                    <input 
                        type="text" 
                        value={aiPrompt} 
                        onChange={(e) => setAiPrompt(e.target.value)} 
                        placeholder="e.g., A high-energy 5-second news stinger with synthwave feel" 
                        className="flex-grow px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue bg-white dark:bg-gray-700"
                        disabled={isGenerating}
                    />
                    <button 
                        onClick={handleGenerateAudio} 
                        disabled={!aiPrompt || isGenerating} 
                        className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 focus:outline-none disabled:bg-purple-400 whitespace-nowrap"
                    >
                        {isGenerating ? 'Generating...' : `Generate (${AUDIO_GENERATION_COST} Credits)`}
                    </button>
                </div>

                {generatedAudioUrl && (
                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-4">
                        <h3 className="font-semibold text-gray-800 dark:text-white">Generated Audio</h3>
                        <audio controls src={generatedAudioUrl} className="w-full">Your browser does not support the audio element.</audio>
                        <div className="flex items-center space-x-2">
                            <input 
                                type="text" 
                                value={newAudioTitle} 
                                onChange={(e) => setNewAudioTitle(e.target.value)} 
                                placeholder="Enter a title for your new audio..." 
                                className="flex-grow px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700"
                                disabled={isSaving}
                            />
                            <button 
                                onClick={handleSaveAudio} 
                                disabled={!newAudioTitle || isSaving}
                                className="px-4 py-2 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none disabled:bg-blue-400 whitespace-nowrap"
                            >
                                {isSaving ? 'Saving...' : 'Save to Library'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                {selectedItems.size > 0 ? (
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 p-4 -m-6 mb-0 bg-blue-50 dark:bg-gray-700/50 rounded-t-lg">
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">{selectedItems.size} item(s) selected</h2>
                        <div className="flex items-center gap-4 flex-wrap justify-center">
                            <button onClick={handleBulkImport} className="px-4 py-2 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none disabled:bg-gray-400 disabled:cursor-not-allowed">
                                Add to Library
                            </button>
                            <button onClick={handleBulkDownload} className="flex items-center px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none">
                                <DownloadIcon />
                                <span className="ml-2">Download</span>
                            </button>
                            <button onClick={() => setSelectedItems(new Set())} className="px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg shadow-md hover:bg-gray-600 focus:outline-none">
                                Deselect All
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Production-Ready Library</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Browse and import assets for your station.</p>
                        </div>
                        <div className="relative w-full sm:w-64">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <input type="text" placeholder="Search in category..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue bg-white dark:bg-gray-700" aria-label="Search content vault"/>
                        </div>
                    </div>
                )}
                
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        {vaultCategories.map(category => (
                            <button
                                key={category}
                                onClick={() => setActiveCategory(category)}
                                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                                    activeCategory === category
                                    ? 'border-brand-blue text-brand-blue'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'
                                }`}
                            >
                                {category}
                            </button>
                        ))}
                    </nav>
                </div>
                
                <div className="overflow-x-auto mt-6">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="p-4">
                                    <input 
                                        type="checkbox" 
                                        className="h-4 w-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue" 
                                        onChange={handleSelectAll} 
                                        checked={isAllSelected}
                                        aria-label="Select all non-imported items"
                                    />
                                </th>
                                <th scope="col" className="px-6 py-3 w-12">Preview</th>
                                <th scope="col" className="px-6 py-3">Filename</th>
                                <th scope="col" className="px-6 py-3">Duration</th>
                                <th scope="col" className="px-6 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">Loading vault...</td></tr>
                            ) : filteredContent.length > 0 ? filteredContent.map((item) => {
                                const isImported = importedVaultIds.has(item.id);
                                const isCurrentlyImporting = importingId === item.id;
                                const isCurrentlyPlaying = isPreviewing && currentItem?.id === item.id && isPlaying;
                                const isSelected = selectedItems.has(item.id);
                                return (
                                    <tr key={item.id} className={`border-b dark:border-gray-700 transition-colors ${isSelected ? 'bg-blue-50 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'} hover:bg-gray-50 dark:hover:bg-gray-600`}>
                                        <td className="p-4">
                                            <input 
                                                type="checkbox" 
                                                className="h-4 w-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue disabled:bg-gray-200 dark:disabled:bg-gray-600"
                                                checked={isSelected}
                                                onChange={() => handleSelectItem(item.id)}
                                                disabled={isImported}
                                                aria-label={`Select item ${item.filename}`}
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <button onClick={() => handlePreview(item)} className="text-brand-blue hover:text-blue-700" title={isCurrentlyPlaying ? 'Pause' : 'Preview'}>
                                                {isCurrentlyPlaying ? <PauseCircleIcon /> : <PlayCircleIcon />}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{item.filename}</td>
                                        <td className="px-6 py-4">{item.duration}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => handleImport(item)} 
                                                disabled={isImported || isCurrentlyImporting}
                                                className={`px-4 py-2 text-sm font-semibold rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors w-36 text-center ${
                                                    isImported ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 cursor-default'
                                                    : isCurrentlyImporting ? 'bg-gray-200 text-gray-500 dark:bg-gray-600 dark:text-gray-400 cursor-wait'
                                                    : 'bg-brand-blue text-white hover:bg-blue-700 focus:ring-brand-blue'
                                                }`}
                                            >
                                                {isImported ? (
                                                    <span className="flex items-center justify-center space-x-2"><CheckIcon className="h-4 w-4" /> <span>Added</span></span>
                                                ) : isCurrentlyImporting ? 'Adding...' : 'Add to Library'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr><td colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">No content found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ContentVault;
