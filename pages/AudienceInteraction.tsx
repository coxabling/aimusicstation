import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Submission, ArticleContent, MusicContent, AudioContent, ContentItem, User, isPlayableContent, CustomAudioContent } from '../types';
import * as db from '../services/db';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { usePlayer } from '../contexts/PlayerContext';
import { useContent } from '../contexts/ContentContext';
import { UsersIcon, CheckIcon, XIcon, TrashIcon, MusicIcon, ThumbsUpIcon, ThumbsDownIcon, ExclamationCircleIcon, RadioIcon, SparklesIcon } from '../components/icons';
import { generateWithRetry, handleAiError } from '../services/ai';
import { GoogleGenAI, Modality, Type } from '@google/genai';

type StatusFilter = 'pending' | 'approved' | 'rejected';

interface ModerationResult {
    sentiment: 'Positive' | 'Negative' | 'Neutral';
    profanity: boolean;
}

// --- AUDIO HELPERS ---

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

function getAnnouncerVoiceName(voice: string): string {
    switch (voice) {
        case 'AI-David': return 'Puck';
        case 'AI-Sarah': return 'Kore';
        case 'AI-Ayo (African Male)': return 'Fenrir';
        case 'AI-Zola (African Female)': return 'Charon';
        default: return 'Zephyr';
    }
}


/**
 * Converts an AudioContent object into a standard, playable ContentItem object.
 * This ensures consistency when adding items from different libraries to the playout queue.
 */
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
    if (audio.type === 'Jingle') {
        return {
            id: audio.id,
            tenantId: currentUser.tenantId,
            title: audio.filename,
            type: 'Custom Audio',
            artist: audio.artist || 'Jingle',
            duration: audio.duration,
            date: audio.dateTime,
            url: audio.url,
            file: audio.file,
        };
    }
    if (audio.type === 'Ad') {
        return {
            id: audio.id,
            tenantId: currentUser.tenantId,
            title: audio.filename,
            type: 'Ad',
            duration: audio.duration,
            date: audio.dateTime,
            url: audio.url,
            file: audio.file,
        };
    }
    return null;
}

const getDuration = (url: string): Promise<string> => new Promise(resolve => {
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

const AudienceInteraction: React.FC = () => {
    const { currentUser, deductCredits } = useAuth();
    const { addToast } = useToast();
    const { addToQueue } = usePlayer();
    const { contentItems, audioContentItems } = useContent();

    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<StatusFilter>('pending');
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [moderationResults, setModerationResults] = useState<Record<string, ModerationResult>>({});
    const [isModerating, setIsModerating] = useState(false);
    const [generatingShoutoutId, setGeneratingShoutoutId] = useState<string | null>(null);
    const [approvingId, setApprovingId] = useState<string | null>(null);

    const runModeration = useCallback(async (subs: Submission[]) => {
        if (!currentUser) return;
        const submissionsToModerate = subs.filter(s => s.status === 'pending' && !moderationResults[s.id]);
        if (submissionsToModerate.length === 0) return;

        setIsModerating(true);
        try {
            const moderationPrompt = `Analyze the following user submissions for radio broadcast suitability. For each submission, determine its sentiment (Positive, Negative, or Neutral) and whether it contains any profanity (true or false).
Submissions to analyze:
${submissionsToModerate.map(s => `{"id": "${s.id}", "message": "${s.message.replace(/"/g, '\\"')}"}`).join('\n')}
Return your analysis ONLY as a JSON object with a single key "results", which is an array of objects. Each object in the array must have "id", "sentiment", and "profanity". Do not include any other text or markdown.`;

            const schema = {
                type: Type.OBJECT,
                properties: {
                    results: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.STRING },
                                sentiment: { type: Type.STRING, enum: ['Positive', 'Negative', 'Neutral'] },
                                profanity: { type: Type.BOOLEAN },
                            },
                            required: ['id', 'sentiment', 'profanity'],
                        },
                    },
                },
                required: ['results'],
            };

            const response = await generateWithRetry({ model: 'gemini-2.5-flash', contents: moderationPrompt, config: { responseMimeType: 'application/json', responseSchema: schema } });
            const analysis = JSON.parse(response.text);

            if (analysis.results && Array.isArray(analysis.results)) {
                const newResults: Record<string, ModerationResult> = {};
                analysis.results.forEach((res: any) => {
                    if (res.id && res.sentiment && typeof res.profanity === 'boolean') {
                        newResults[res.id] = { sentiment: res.sentiment, profanity: res.profanity };
                    }
                });
                setModerationResults(prev => ({ ...prev, ...newResults }));
            }

        } catch (e) {
            console.error("AI moderation failed:", e);
            addToast("Could not run AI moderation on new submissions.", "error");
        } finally {
            setIsModerating(false);
        }
    }, [currentUser, moderationResults, addToast]);

    const loadSubmissions = useCallback(async () => {
        if (!currentUser) return;
        setIsLoading(true);
        const subs = await db.getAllSubmissions(currentUser.tenantId);
        setSubmissions(subs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setIsLoading(false);
        await runModeration(subs);
    }, [currentUser, runModeration]);

    useEffect(() => {
        loadSubmissions();
    }, [loadSubmissions]);
    
    const filteredSubmissions = submissions.filter(s => s.status === filter);
    
    const isAllSelected = useMemo(() => filteredSubmissions.length > 0 && selectedItems.length === filteredSubmissions.length, [filteredSubmissions, selectedItems]);

    const handleSelectItem = (id: string, checked: boolean) => {
        setSelectedItems(prev => checked ? [...prev, id] : prev.filter(i => i !== id));
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedItems(e.target.checked ? filteredSubmissions.map(s => s.id) : []);
    };

    const handleUpdateStatus = async (submission: Submission, status: Submission['status']) => {
        const updatedSubmission = { ...submission, status };
        await db.saveSubmission(updatedSubmission);
        setSubmissions(prev => prev.map(s => s.id === submission.id ? updatedSubmission : s));
    };
    
    const handleQueueAsAiShoutout = async (submission: Submission) => {
        if (submission.type !== 'Shoutout' || !currentUser) return;

        setGeneratingShoutoutId(submission.id);

        try {
            const canProceed = await deductCredits(20, 'AI Shoutout Generation');
            if (!canProceed) {
                setGeneratingShoutoutId(null);
                return;
            }

            const textToSpeak = `Here's a shoutout from ${submission.from}${submission.location ? ` in ${submission.location}` : ''}. They say: "${submission.message}"`;
            const announcerVoice = 'AI-David';

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: textToSpeak }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: getAnnouncerVoiceName(announcerVoice) }
                        }
                    }
                }
            });
            
            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!base64Audio) throw new Error("TTS failed to return audio data.");
            
            const pcmBytes = decode(base64Audio);
            const wavBlob = pcmToWav(pcmBytes, 24000, 1, 16);
            const audioUrl = URL.createObjectURL(wavBlob);
            
            const duration = await getDuration(audioUrl);

            const shoutoutItem: CustomAudioContent = {
                id: `shoutout-audio-${submission.id}`,
                originalId: `shoutout-audio-${submission.id}`,
                tenantId: currentUser.tenantId,
                title: `AI Shoutout: ${submission.from}`,
                type: 'Custom Audio',
                artist: 'AI Announcer',
                duration: duration,
                date: new Date().toISOString(),
                url: audioUrl,
            };
            
            addToQueue([shoutoutItem]);
            await handleUpdateStatus(submission, 'approved');
            addToast(`Shoutout from ${submission.from} generated and queued!`, 'success');

        } catch (error) {
            handleAiError(error, addToast);
        } finally {
            setGeneratingShoutoutId(null);
        }
    };

    const handleApprove = async (submission: Submission) => {
        if (!currentUser) return;
        setApprovingId(submission.id);

        try {
            if (submission.type === 'Shoutout') {
                const canProceed = await deductCredits(20, 'AI Shoutout Generation');
                if (!canProceed) return;

                const textToSpeak = `And now, a quick shoutout from ${submission.from}${submission.location ? ` in ${submission.location}` : ''}. They say: "${submission.message}"`;
                const announcerVoice = 'AI-David';

                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const response = await ai.models.generateContent({
                    model: "gemini-2.5-flash-preview-tts",
                    contents: [{ parts: [{ text: textToSpeak }] }],
                    config: {
                        responseModalities: [Modality.AUDIO],
                        speechConfig: {
                            voiceConfig: { prebuiltVoiceConfig: { voiceName: getAnnouncerVoiceName(announcerVoice) } }
                        }
                    }
                });

                const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
                if (!base64Audio) throw new Error("TTS failed to return audio data.");

                const pcmBytes = decode(base64Audio);
                const wavBlob = pcmToWav(pcmBytes, 24000, 1, 16);
                const audioUrl = URL.createObjectURL(wavBlob);
                const duration = await getDuration(audioUrl);

                const shoutoutItem: CustomAudioContent = {
                    id: `shoutout-audio-${submission.id}`,
                    originalId: `shoutout-audio-${submission.id}`,
                    tenantId: currentUser.tenantId,
                    title: `Shoutout: ${submission.from}`,
                    type: 'Custom Audio',
                    artist: 'AI Announcer',
                    duration: duration,
                    date: new Date().toISOString(),
                    url: audioUrl,
                };

                addToQueue([shoutoutItem]);
                addToast(`Shoutout from ${submission.from} generated and queued!`, 'success');

            } else if (submission.type === 'Song Request') {
                const query = submission.message.toLowerCase().trim();
                
                const allMusic = [...contentItems, ...audioContentItems].filter(item => item.type === 'Music');
                const directMatches = allMusic.filter(item => 
                    ((('title' in item && item.title.toLowerCase().includes(query)) || ('filename' in item && item.filename.toLowerCase().includes(query))) ||
                    ('artist' in item && item.artist && item.artist.toLowerCase().includes(query)))
                );

                let sourceItem: ContentItem | AudioContent | undefined = directMatches.length === 1 ? directMatches[0] : undefined;

                if (!sourceItem && directMatches.length === 0) {
                    addToast(`No direct match for "${submission.message}". Asking AI...`, 'info');
                    try {
                        const musicLibrary = allMusic.map(item => ({
                            id: item.id,
                            title: 'title' in item ? item.title : item.filename,
                            artist: ('artist' in item && item.artist) || 'Unknown'
                        })).slice(0, 100);

                        if (musicLibrary.length > 0) {
                            const aiPrompt = `A user requested a song with this text: "${submission.message}". From the following list of available songs, which one is the most likely match?
                            Available songs: ${JSON.stringify(musicLibrary)}
                            Return ONLY the ID of the best match as a JSON object like {"id": "song_id_123"}. If no good match is found, return {"id": null}.`;

                            const response = await generateWithRetry({ model: 'gemini-2.5-flash', contents: aiPrompt });
                            const result = JSON.parse(response.text.replace(/```json|```/g, '').trim());
                            
                            if (result.id) {
                                sourceItem = allMusic.find(item => item.id === result.id);
                                if (sourceItem) {
                                    addToast(`AI matched request to: "${'title' in sourceItem ? sourceItem.title : sourceItem.filename}"`, 'success');
                                }
                            }
                        }
                    } catch (e) {
                        console.error("AI song matching failed:", e);
                        addToast("AI search failed to find a match.", 'error');
                    }
                } else if (directMatches.length > 1) {
                    addToast(`Multiple matches found for "${submission.message}". Please add manually.`, 'info');
                    return;
                }

                if (!sourceItem) {
                    addToast(`Song request "${submission.message}" not found in your library.`, 'error');
                    return;
                }

                let playableItem: ContentItem | null;

                if ('dateTime' in sourceItem) {
                    playableItem = mapAudioToContentItem(sourceItem as AudioContent, currentUser);
                } else {
                    playableItem = sourceItem as ContentItem;
                }

                if (!playableItem) {
                    addToast(`Could not process song request for "${submission.message}". Incompatible item type.`, 'error');
                    return;
                }
                
                if (!isPlayableContent(playableItem)) {
                    addToast(`Song "${playableItem.title}" was found but is not playable (missing audio file/URL).`, 'error');
                    return;
                }
                
                const songToAdd: ContentItem = { 
                    ...playableItem, 
                    id: `request-${submission.id}-${playableItem.originalId || playableItem.id}`, 
                    originalId: playableItem.originalId || playableItem.id,
                    useAiAnnouncer: true,
                    predefinedAnnouncement: `Up next, a request from ${submission.from}. Here's "${playableItem.title}"!`,
                };
                
                addToQueue([songToAdd]);
                addToast(`Request for "${songToAdd.title}" added to the queue.`, 'success');
            }
            await handleUpdateStatus(submission, 'approved');

        } catch (error) {
            handleAiError(error, addToast);
        } finally {
            setApprovingId(null);
        }
    };
    
    const handleDelete = async (id: string) => {
        if (!currentUser) return;
        await db.deleteSubmissions([id], currentUser.tenantId);
        addToast("Submission deleted.", "info");
        await loadSubmissions();
    };

    const handleBulkUpdateStatus = async (status: Submission['status']) => {
        if (selectedItems.length === 0) return;
        const itemsToUpdate = submissions.filter(s => selectedItems.includes(s.id));
        for (const item of itemsToUpdate) {
            await db.saveSubmission({ ...item, status });
        }
        
        let toastMessage = `${selectedItems.length} submissions updated to "${status}".`;
        if (status === 'approved') {
            toastMessage += ' Note: Bulk-approved items are not automatically added to the queue.';
        }
        addToast(toastMessage, 'success');
    
        setSelectedItems([]);
        await loadSubmissions();
    };

    const handleBulkDelete = async () => {
        if (!currentUser || selectedItems.length === 0) return;
        if (window.confirm(`Are you sure you want to permanently delete ${selectedItems.length} submissions?`)) {
            await db.deleteSubmissions(selectedItems, currentUser.tenantId);
            addToast(`${selectedItems.length} submissions deleted.`, 'info');
            setSelectedItems([]);
            await loadSubmissions();
        }
    };

    const getStatusStyles = (status: Submission['status']) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
            case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
            case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center space-x-3 mb-2">
                <UsersIcon />
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Audience Interaction</h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Manage incoming shoutouts and song requests from your listeners.</p>
            
            {selectedItems.length > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4 p-4 border dark:border-gray-700 bg-blue-50 dark:bg-gray-700/50 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{selectedItems.length} selected</h3>
                    <div className="flex items-center gap-2 flex-wrap justify-center">
                        <button onClick={() => handleBulkUpdateStatus('approved')} className="flex items-center px-3 py-1.5 text-sm bg-green-500 text-white font-semibold rounded-lg shadow-sm hover:bg-green-600"><CheckIcon className="h-4 w-4 mr-1"/> Approve</button>
                        <button onClick={() => handleBulkUpdateStatus('rejected')} className="flex items-center px-3 py-1.5 text-sm bg-red-500 text-white font-semibold rounded-lg shadow-sm hover:bg-red-600"><XIcon /> Reject</button>
                        <button onClick={handleBulkDelete} className="flex items-center px-3 py-1.5 text-sm bg-gray-500 text-white font-semibold rounded-lg shadow-sm hover:bg-gray-600"><TrashIcon /> Delete</button>
                        <button onClick={() => setSelectedItems([])} className="px-3 py-1.5 text-sm bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 font-semibold rounded-lg shadow-sm hover:bg-gray-300">Deselect All</button>
                    </div>
                </div>
            )}
            
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6 flex justify-between items-center">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {(['pending', 'approved', 'rejected'] as StatusFilter[]).map(tab => (
                        <button
                            key={tab}
                            onClick={() => { setFilter(tab); setSelectedItems([]); }}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                                filter === tab
                                ? 'border-brand-blue text-brand-blue'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
                 <div className="flex items-center space-x-2">
                    <label htmlFor="select-all" className="text-sm text-gray-500 dark:text-gray-400">Select All</label>
                    <input
                        id="select-all"
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
                        onChange={handleSelectAll}
                        checked={isAllSelected}
                        disabled={filteredSubmissions.length === 0}
                    />
                </div>
            </div>
            
            {isLoading ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-10">Loading submissions...</p>
            ) : filteredSubmissions.length > 0 ? (
                <div className="space-y-4">
                    {filteredSubmissions.map(sub => (
                        <div key={sub.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 flex items-start space-x-4">
                            <input 
                                type="checkbox"
                                className="h-5 w-5 mt-1 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
                                checked={selectedItems.includes(sub.id)}
                                onChange={e => handleSelectItem(sub.id, e.target.checked)}
                                aria-label={`Select submission from ${sub.from}`}
                            />
                            <div className="flex-grow">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                                    <div className="flex-grow">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusStyles(sub.status)}`}>{sub.status}</span>
                                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${sub.type === 'Shoutout' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'}`}>{sub.type}</span>
                                            {moderationResults[sub.id] && (
                                                <div className="flex items-center space-x-2">
                                                    {moderationResults[sub.id].profanity && <div title="Profanity Detected" className="text-red-500"><ExclamationCircleIcon className="h-4 w-4" /></div>}
                                                    {moderationResults[sub.id].sentiment === 'Positive' && <div title="Positive Sentiment" className="text-green-500"><ThumbsUpIcon /></div>}
                                                    {moderationResults[sub.id].sentiment === 'Negative' && <div title="Negative Sentiment" className="text-yellow-500"><ThumbsDownIcon /></div>}
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-lg font-semibold text-gray-800 dark:text-white">"{sub.message}"</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            From: <span className="font-medium">{sub.from}</span>
                                            {sub.location && ` in ${sub.location}`}
                                            {' - '}
                                            <span className="text-xs">{new Date(sub.createdAt).toLocaleString()}</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center space-x-2 mt-4 sm:mt-0 sm:ml-4 flex-shrink-0 flex-wrap gap-2">
                                        {sub.status === 'pending' && (
                                            <>
                                                {sub.type === 'Shoutout' && (
                                                    <button 
                                                        onClick={() => handleQueueAsAiShoutout(sub)}
                                                        disabled={generatingShoutoutId === sub.id || approvingId === sub.id}
                                                        className="flex items-center px-3 py-1.5 text-sm bg-purple-500 text-white font-semibold rounded-lg shadow-sm hover:bg-purple-600 focus:outline-none disabled:bg-purple-300 disabled:cursor-wait">
                                                        <SparklesIcon className="h-4 w-4 mr-1.5" /> 
                                                        <span>{generatingShoutoutId === sub.id ? 'Generating...' : 'Queue as AI Shoutout'}</span>
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => handleApprove(sub)}
                                                    disabled={approvingId === sub.id || generatingShoutoutId === sub.id}
                                                    className="flex items-center px-3 py-1.5 text-sm bg-green-500 text-white font-semibold rounded-lg shadow-sm hover:bg-green-600 focus:outline-none disabled:bg-green-300 disabled:cursor-wait">
                                                    {approvingId === sub.id ? (
                                                        <>
                                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                            <span>Processing...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CheckIcon className="h-4 w-4 mr-1"/> Approve & Queue
                                                        </>
                                                    )}
                                                </button>
                                                <button onClick={() => handleUpdateStatus(sub, 'rejected')} className="flex items-center px-3 py-1.5 text-sm bg-red-500 text-white font-semibold rounded-lg shadow-sm hover:bg-red-600 focus:outline-none">
                                                    <XIcon /> Reject
                                                </button>
                                            </>
                                        )}
                                        <button onClick={() => handleDelete(sub.id)} className="p-2 text-gray-500 hover:text-red-500" title="Delete"><TrashIcon /></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                    <div className="mx-auto h-12 w-12 text-gray-400">
                        {filter === 'pending' ? <MusicIcon /> : <CheckIcon />}
                    </div>
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No {filter} submissions</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">There are currently no submissions with this status.</p>
                </div>
            )}
        </div>
    );
};

export default AudienceInteraction;