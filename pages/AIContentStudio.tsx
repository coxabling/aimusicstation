import React, { useState, useEffect, useMemo } from 'react';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import { SparklesIcon, HistoryIcon, TrashIcon, TrophyIcon } from '../components/icons';
import { generateWithRetry, handleAiError } from '../services/ai';
import { useToast } from '../contexts/ToastContext';
import { useContent } from '../contexts/ContentContext';
import * as db from '../services/db';
import { ArticleHistoryItem, ArticleContent, RssFeedSettings, ClonedVoice, AudioContent, CustomAudioContent } from '../types';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { fetchRssFeed, RssArticle } from '../services/rss';
import { usePlayer } from '../contexts/PlayerContext';
import { useLocalization, Language } from '../App';

type AiTool = 'article' | 'news' | 'summarizer' | 'stationId' | 'jingle' | 'ad' | 'sportsUpdate';

const CREDIT_COSTS = {
    ARTICLE: 100,
    NEWS_SEGMENT: 250,
    SUMMARIZER: 50,
    SCRIPT: 25,
    AUDIO_GENERATION: 50,
    SPORTS_UPDATE: 150,
};

// --- AUDIO HELPERS ---

const getDuration = (url: string): Promise<string> => new Promise(resolve => {
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
        const duration = audio.duration;
        resolve(`${Math.floor(duration / 60)}:${Math.round(duration % 60).toString().padStart(2, '0')}`);
    };
    audio.onerror = () => resolve('0:00');
    audio.src = url;
});


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

const AudioVoiceSelector: React.FC<{
    clonedVoices: ClonedVoice[];
    selectedVoice: string;
    onSelectVoice: (voice: string) => void;
}> = ({ clonedVoices, selectedVoice, onSelectVoice }) => (
    <div>
        <label htmlFor="voice-selector" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Announcer Voice</label>
        <select
            id="voice-selector"
            value={selectedVoice}
            onChange={e => onSelectVoice(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue bg-white dark:bg-gray-700"
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
);

const AiToolTab: React.FC<{
    label: string;
    isActive: boolean;
    onClick: () => void;
}> = ({ label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`whitespace-nowrap py-4 px-3 sm:px-6 border-b-2 font-medium text-sm transition-colors ${
            isActive
                ? 'border-brand-blue text-brand-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'
        }`}
    >
        {label}
    </button>
);

const ArticleGenerator: React.FC<{ onSave: (title: string, content: string) => void; }> = ({ onSave }) => {
    const { addToast } = useToast();
    const { currentUser, deductCredits } = useAuth();
    const { loadContent } = useContent();
    const { addToQueue } = usePlayer();
    const { t } = useLocalization();
    const [isLoading, setIsLoading] = useState(false);
    const [topic, setTopic] = useState('');
    const [generatedContent, setGeneratedContent] = useState('');
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [articleHistory, setArticleHistory] = useState<ArticleHistoryItem[]>([]);

    const [clonedVoices, setClonedVoices] = useState<ClonedVoice[]>([]);
    const [selectedVoice, setSelectedVoice] = useState('AI-David');
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

    const [isTranslating, setIsTranslating] = useState(false);
    const [targetLang, setTargetLang] = useState<Language>('es');
    const [translatedContent, setTranslatedContent] = useState('');

    useEffect(() => {
        const fetchVoices = async () => {
            if (currentUser) {
                const voices = await db.getAllClonedVoices(currentUser.tenantId);
                setClonedVoices(voices.filter(v => v.status === 'Ready'));
            }
        };
        fetchVoices();
    }, [currentUser]);

    useEffect(() => {
        setAudioUrl(null);
        setAudioBlob(null);
        setTranslatedContent('');
    }, [generatedContent]);

    useEffect(() => {
        const currentUrl = audioUrl;
        return () => { if (currentUrl) URL.revokeObjectURL(currentUrl); };
    }, [audioUrl]);


    const handleGenerate = async () => {
        if (!topic || !currentUser) return;
        
        const canProceed = await deductCredits(CREDIT_COSTS.ARTICLE, 'Article Generation');
        if (!canProceed) return;

        setIsLoading(true);
        setGeneratedContent('');
        try {
            const prompt = `Write a compelling and radio-friendly article about the following topic: "${topic}". The article should be engaging, informative, and easy for a radio host to read aloud. Structure it with a clear introduction, body, and conclusion.`;
            const response = await generateWithRetry({ model: 'gemini-2.5-flash', contents: prompt });
            const newContent = response.text;
            setGeneratedContent(newContent);
            const historyItem: ArticleHistoryItem = { id: new Date().toISOString(), tenantId: currentUser.tenantId, topic, content: newContent, date: new Date().toISOString() };
            await db.saveGeneratedArticle(historyItem);
            addToast("Article generated successfully!", "success");
        } catch (error) {
            handleAiError(error, addToast);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleOpenHistory = async () => {
        if (!currentUser) return;
        const history = await db.getAllGeneratedArticles(currentUser.tenantId);
        setArticleHistory(history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setIsHistoryModalOpen(true);
    };

    const handleUseHistoryItem = (topic: string, content: string) => {
        setTopic(topic);
        setGeneratedContent(content);
        setIsHistoryModalOpen(false);
    };
    
    const handleDeleteHistoryItem = async (id: string) => {
        if (!currentUser) return;
        await db.deleteGeneratedArticle(id, currentUser.tenantId);
        setArticleHistory(prev => prev.filter(item => item.id !== id));
        addToast("Deleted item from history.", "info");
    };

    const handleQueueArticle = () => {
        if (!generatedContent || !currentUser) return;
        const newItem: ArticleContent = {
            id: `ai-article-queue-${Date.now()}`,
            tenantId: currentUser.tenantId,
            type: 'Article',
            title: topic || 'AI Generated Article',
            content: generatedContent,
            date: new Date().toISOString(),
            duration: '0:00', // Placeholder
            useAiAnnouncer: true,
            announcerVoice: 'AI-Ayo (African Male)'
        };
        addToQueue([newItem]);
        addToast(`"${newItem.title}" added to the playout queue.`, 'success');
    };

    const handleTranslate = async () => {
        if (!generatedContent) return;
        setIsTranslating(true);
        setTranslatedContent('');
        try {
            const langName = { es: 'Spanish', fr: 'French', en: 'English' }[targetLang];
            const prompt = `Translate the following text into ${langName}:\n\n${generatedContent}`;
            const response = await generateWithRetry({ model: 'gemini-2.5-flash', contents: prompt });
            setTranslatedContent(response.text);
        } catch (error) {
            handleAiError(error, addToast);
        } finally {
            setIsTranslating(false);
        }
    };

    const handleGenerateAudio = async () => {
        if (!generatedContent) return;
        const canProceed = await deductCredits(CREDIT_COSTS.AUDIO_GENERATION, `AI Audio Generation (Article)`);
        if (!canProceed) return;

        setIsGeneratingAudio(true);
        setAudioUrl(null);
        setAudioBlob(null);

        try {
            const sanitizedScript = generatedContent.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
            if (!sanitizedScript) {
                addToast('Script is empty after removing cues.', 'error');
                throw new Error('Empty script for TTS.');
            }
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: sanitizedScript }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: getAnnouncerVoiceName(selectedVoice) }
                        }
                    }
                }
            });
            
            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!base64Audio) throw new Error("TTS generation failed to return audio data.");

            const pcmBytes = decode(base64Audio);
            const wavBlob = pcmToWav(pcmBytes, 24000, 1, 16);

            setAudioBlob(wavBlob);
            setAudioUrl(URL.createObjectURL(wavBlob));
            addToast(`Audio generated for article!`, 'success');
        } catch (error) {
            handleAiError(error, addToast);
        } finally {
            setIsGeneratingAudio(false);
        }
    };
    
    const handleSaveAudio = async () => {
        if (!audioBlob || !currentUser) return;

        const filename = `AI Article - ${topic.substring(0, 20).trim()}.wav`;
        const audioFile = new File([audioBlob], filename, { type: 'audio/wav' });

        const duration = audioUrl ? await getDuration(audioUrl) : '0:00';

        const newItem: AudioContent = {
            id: `audio-${Date.now()}`,
            tenantId: currentUser.tenantId,
            type: 'Jingle', // Treat as a jingle/spoken word piece
            filename,
            artist: 'AI Article',
            duration,
            genre: 'Spoken Word',
            announceTrack: false,
            announcementVoice: selectedVoice,
            announcementWithBackgroundMusic: false,
            dateTime: new Date().toISOString(),
            totalPlays: 0,
            lastPlayed: 'Never',
            published: true,
            file: audioFile
        };

        await db.saveAudioContent(newItem);
        await loadContent();
        addToast(`"${filename}" saved to your Audio Content library!`, 'success');
    };

    const handleQueueAudio = async () => {
        if (!audioBlob || !currentUser) return;
        const filename = `AI Article - ${topic.substring(0, 20).trim()}.wav`;
        const url = URL.createObjectURL(audioBlob);
        const duration = await getDuration(url);

        const newItem: CustomAudioContent = {
            id: `ai-audio-queue-${Date.now()}`,
            tenantId: currentUser.tenantId,
            type: 'Custom Audio',
            title: filename,
            artist: 'AI Article',
            duration,
            date: new Date().toISOString(),
            url,
        };
        addToQueue([newItem]);
        addToast(`"${filename}" added to the playout queue.`, 'success');
    };

    return (
        <>
        <Modal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} title="Generated Article History">
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {articleHistory.length > 0 ? articleHistory.map(item => (
                    <div key={item.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <p className="font-semibold text-gray-800 dark:text-white">Topic: {item.topic}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Generated on {new Date(item.date).toLocaleString()}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 mb-3">{item.content}</p>
                        <div className="flex justify-end space-x-2">
                            <button onClick={() => handleDeleteHistoryItem(item.id)} className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900"><TrashIcon/></button>
                            <button onClick={() => handleUseHistoryItem(item.topic, item.content)} className="px-3 py-1 text-sm bg-blue-100 text-brand-blue rounded-md hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900">Use This Version</button>
                        </div>
                    </div>
                )) : <p className="text-center text-gray-500 dark:text-gray-400">No generated articles in history.</p>}
            </div>
        </Modal>
        <div className="space-y-4">
            <div className="flex items-center space-x-2">
                <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="Enter a topic..." className="flex-grow px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue bg-white dark:bg-gray-700" />
                <button onClick={handleOpenHistory} className="p-2.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500" title="View History"><HistoryIcon /></button>
                <button onClick={handleGenerate} disabled={isLoading || !topic} className="flex items-center px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 focus:outline-none disabled:bg-purple-400 whitespace-nowrap"><SparklesIcon className="h-4 w-4 mr-2"/>{isLoading ? 'Generating...' : `Generate (${CREDIT_COSTS.ARTICLE} Credits)`}</button>
            </div>
            <textarea value={generatedContent} onChange={e => setGeneratedContent(e.target.value)} placeholder="Your generated article will appear here..." rows={12} className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700/50"/>
            <div className="flex justify-end space-x-2">
                <button onClick={handleQueueArticle} disabled={!generatedContent} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none disabled:bg-green-400">Add to Queue</button>
                <button onClick={() => onSave(topic, generatedContent)} disabled={!generatedContent} className="px-4 py-2 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none disabled:bg-blue-400">Save as Article</button>
            </div>

            {generatedContent && (
                 <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">{t('aistudio.translateScript')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div className="md:col-span-2">
                            <label htmlFor="target-lang" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('aistudio.translateTo')}</label>
                            <select id="target-lang" value={targetLang} onChange={e => setTargetLang(e.target.value as Language)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue bg-white dark:bg-gray-700">
                                <option value="es">Español</option>
                                <option value="fr">Français</option>
                            </select>
                        </div>
                        <button onClick={handleTranslate} disabled={isTranslating} className="flex items-center justify-center px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 focus:outline-none disabled:bg-purple-400 whitespace-nowrap">
                            <SparklesIcon className="h-4 w-4 mr-2"/>
                            {isTranslating ? 'Translating...' : t('aistudio.translate')}
                        </button>
                    </div>
                    {translatedContent && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('aistudio.translation')}</label>
                            <textarea value={translatedContent} readOnly rows={8} className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700/50"/>
                        </div>
                    )}
                </div>
            )}

            {generatedContent && (
                 <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Generate Audio Version</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                        <AudioVoiceSelector clonedVoices={clonedVoices} selectedVoice={selectedVoice} onSelectVoice={setSelectedVoice}/>
                        <button onClick={handleGenerateAudio} disabled={isGeneratingAudio} className="flex items-center justify-center px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 focus:outline-none disabled:bg-purple-400 whitespace-nowrap">
                            <SparklesIcon className="h-4 w-4 mr-2"/>
                            {isGeneratingAudio ? 'Generating...' : `Generate Audio (${CREDIT_COSTS.AUDIO_GENERATION} Credits)`}
                        </button>
                    </div>

                    {audioUrl && (
                        <div className="space-y-4">
                            <audio controls src={audioUrl} className="w-full">Your browser does not support the audio element.</audio>
                            <div className="flex justify-end space-x-2">
                                <button onClick={handleQueueAudio} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700">Add to Queue</button>
                                <button onClick={handleSaveAudio} className="px-4 py-2 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">Save to Audio Library</button>
                            </div>
                        </div>
                    )}
                 </div>
            )}
        </div>
        </>
    );
};

const NewsSegmentGenerator: React.FC<{ onSave: (title: string, content: string) => void; }> = ({ onSave }) => {
    const { currentUser, deductCredits } = useAuth();
    const { addToast } = useToast();
    const { loadContent } = useContent();
    const { addToQueue } = usePlayer();

    const [rssFeeds, setRssFeeds] = useState<RssFeedSettings[]>([]);
    const [selectedFeedId, setSelectedFeedId] = useState<string>('');
    const [articles, setArticles] = useState<RssArticle[]>([]);
    const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());
    const [isFetchingArticles, setIsFetchingArticles] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedScript, setGeneratedScript] = useState('');
    
    // Audio Generation State
    const [clonedVoices, setClonedVoices] = useState<ClonedVoice[]>([]);
    const [selectedVoice, setSelectedVoice] = useState('AI-David');
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

    useEffect(() => {
        const loadFeedsAndVoices = async () => {
            if (!currentUser) return;
            const [feeds, voices] = await Promise.all([
                db.getAllRssFeedSettings(currentUser.tenantId),
                db.getAllClonedVoices(currentUser.tenantId)
            ]);
            setRssFeeds(feeds.filter(f => f.published));
            setClonedVoices(voices.filter(v => v.status === 'Ready'));
        };
        loadFeedsAndVoices();
    }, [currentUser]);

    useEffect(() => {
        const fetchArticlesForFeed = async () => {
            if (!selectedFeedId) {
                setArticles([]);
                return;
            }
            const selectedFeed = rssFeeds.find(f => f.id === selectedFeedId);
            if (!selectedFeed) return;

            setIsFetchingArticles(true);
            setArticles([]);
            setSelectedArticles(new Set());
            try {
                const fetchedArticles = await fetchRssFeed(selectedFeed.url);
                setArticles(fetchedArticles);
            } catch (error) {
                console.error("Failed to fetch RSS articles:", error);
                addToast("Could not fetch articles from the selected feed.", "error");
            } finally {
                setIsFetchingArticles(false);
            }
        };
        fetchArticlesForFeed();
    }, [selectedFeedId, rssFeeds, addToast]);
    
    useEffect(() => {
        setAudioUrl(null);
        setAudioBlob(null);
    }, [generatedScript]);
    
    useEffect(() => {
        const currentUrl = audioUrl;
        return () => { if (currentUrl) URL.revokeObjectURL(currentUrl); };
    }, [audioUrl]);

    const handleSelectArticle = (link: string) => {
        setSelectedArticles(prev => {
            const newSet = new Set(prev);
            if (newSet.has(link)) newSet.delete(link);
            else newSet.add(link);
            return newSet;
        });
    };

    const handleGenerateScript = async () => {
        if (selectedArticles.size === 0) return;
        
        const canProceed = await deductCredits(CREDIT_COSTS.NEWS_SEGMENT, 'News Segment Generation');
        if (!canProceed) return;

        setIsGenerating(true);
        setGeneratedScript('');
        try {
            const articlesToInclude = articles.filter(a => selectedArticles.has(a.link));
            let articlesContent = articlesToInclude.map(a => `ARTICLE TITLE: ${a.title}\nCONTENT: ${a.content}`).join('\n\n---\n\n');

            const MAX_PROMPT_CHARS = 8000;
            if (articlesContent.length > MAX_PROMPT_CHARS) {
                articlesContent = articlesContent.substring(0, MAX_PROMPT_CHARS) + "\n\n...[CONTENT TRUNCATED]...";
                addToast("Combined article length is too long and has been truncated.", "info");
            }

            const prompt = `You are an expert radio news script writer. Create a cohesive, engaging news segment script for a radio broadcast from the following articles.
The script needs a professional intro, smooth transitions between stories, and an outro. It should be easy for a host to read aloud.
Summarize the key points of each article.

Here are the articles:\n\n${articlesContent}`;
            
            const response = await generateWithRetry({ model: 'gemini-2.5-flash', contents: prompt });
            setGeneratedScript(response.text);
            addToast("News segment script generated!", "success");

        } catch (error) {
            handleAiError(error, addToast);
        } finally {
            setIsGenerating(false);
        }
    };
    
     const handleGenerateAudio = async () => {
        if (!generatedScript) return;
        const canProceed = await deductCredits(CREDIT_COSTS.AUDIO_GENERATION, `AI Audio Generation (News Segment)`);
        if (!canProceed) return;

        setIsGeneratingAudio(true);
        setAudioUrl(null);
        setAudioBlob(null);

        try {
            const sanitizedScript = generatedScript.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
            if (!sanitizedScript) {
                addToast('Script is empty after removing cues.', 'error');
                throw new Error('Empty script for TTS.');
            }

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: sanitizedScript }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: getAnnouncerVoiceName(selectedVoice) }
                        }
                    }
                }
            });
            
            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

            if (!base64Audio) throw new Error("TTS generation failed to return audio data.");

            const pcmBytes = decode(base64Audio);
            const wavBlob = pcmToWav(pcmBytes, 24000, 1, 16);

            setAudioBlob(wavBlob);
            setAudioUrl(URL.createObjectURL(wavBlob));
            addToast(`Audio generated for News Segment!`, 'success');

        } catch (error) {
            handleAiError(error, addToast);
        } finally {
            setIsGeneratingAudio(false);
        }
    };

    const handleSaveAudio = async () => {
        if (!audioBlob || !currentUser) return;

        const filename = `AI News Segment - ${new Date().toLocaleDateString()}.wav`;
        const audioFile = new File([audioBlob], filename, { type: 'audio/wav' });

        const duration = audioUrl ? await getDuration(audioUrl) : '0:00';

        const newItem: AudioContent = {
            id: `audio-${Date.now()}`, tenantId: currentUser.tenantId, type: 'Jingle', filename,
            artist: 'AI News', duration, genre: 'News', announceTrack: false,
            announcementVoice: selectedVoice, announcementWithBackgroundMusic: false,
            dateTime: new Date().toISOString(), totalPlays: 0, lastPlayed: 'Never',
            published: true, file: audioFile
        };

        await db.saveAudioContent(newItem);
        await loadContent();
        addToast(`"${filename}" saved to your Audio Content library!`, 'success');
    };

    const handleQueueAudio = async () => {
        if (!audioBlob || !currentUser) return;
        const filename = `AI News Segment - ${new Date().toLocaleDateString()}.wav`;
        const url = URL.createObjectURL(audioBlob);
        const duration = await getDuration(url);
        const newItem: CustomAudioContent = {
            id: `ai-audio-queue-${Date.now()}`,
            tenantId: currentUser.tenantId,
            type: 'Custom Audio',
            title: filename,
            artist: 'AI News',
            duration,
            date: new Date().toISOString(),
            url,
        };
        addToQueue([newItem]);
        addToast(`"${filename}" added to the playout queue.`, 'success');
    };

    const handleQueueArticle = () => {
        if (!generatedScript || !currentUser) return;
        const title = `News Segment - ${new Date().toLocaleDateString()}`;
        const newItem: ArticleContent = {
            id: `ai-news-queue-${Date.now()}`,
            tenantId: currentUser.tenantId,
            type: 'Article',
            title: title,
            content: generatedScript,
            date: new Date().toISOString(),
            duration: '0:00', // Placeholder
            useAiAnnouncer: true,
            announcerVoice: 'AI-Ayo (African Male)'
        };
        addToQueue([newItem]);
        addToast(`"${title}" added to the playout queue.`, 'success');
    };

    return (
        <div className="space-y-4">
            <div>
                <label htmlFor="rss-feed-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select News Source</label>
                <select 
                    id="rss-feed-select"
                    value={selectedFeedId}
                    onChange={e => setSelectedFeedId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue bg-white dark:bg-gray-700"
                >
                    <option value="">-- Choose a Published RSS Feed --</option>
                    {rssFeeds.map(feed => (
                        <option key={feed.id} value={feed.id}>{feed.name}</option>
                    ))}
                </select>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto border dark:border-gray-600 rounded-md p-3">
                <h4 className="font-semibold text-gray-800 dark:text-white">Select Articles to Include</h4>
                {isFetchingArticles ? <p className="text-gray-500 dark:text-gray-400">Fetching articles...</p>
                : articles.length > 0 ? articles.map(article => (
                     <label key={article.link} className="flex items-start space-x-3 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                        <input type="checkbox" checked={selectedArticles.has(article.link)} onChange={() => handleSelectArticle(article.link)} className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue" />
                        <div>
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{article.title}</span>
                             <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(article.date).toLocaleDateString()}</p>
                        </div>
                    </label>
                )) : <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No articles found for this feed, or no feed selected.</p>}
            </div>
            
            <div className="flex justify-end">
                <button onClick={handleGenerateScript} disabled={isGenerating || selectedArticles.size === 0} className="flex items-center px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 focus:outline-none disabled:bg-purple-400 whitespace-nowrap">
                    <SparklesIcon className="h-4 w-4 mr-2"/>
                    {isGenerating ? 'Generating...' : `Generate Segment (${CREDIT_COSTS.NEWS_SEGMENT} Credits)`}
                </button>
            </div>
            <textarea value={generatedScript} readOnly placeholder="Your generated news segment script will appear here..." rows={10} className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700/50"/>
             <div className="flex justify-end space-x-2">
                <button onClick={handleQueueArticle} disabled={!generatedScript} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none disabled:bg-green-400">Add to Queue</button>
                <button onClick={() => onSave(`News Segment - ${new Date().toLocaleDateString()}`, generatedScript)} disabled={!generatedScript} className="px-4 py-2 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none disabled:bg-blue-400">Save as Script</button>
            </div>

            {generatedScript && (
                 <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Generate Audio</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                        <AudioVoiceSelector clonedVoices={clonedVoices} selectedVoice={selectedVoice} onSelectVoice={setSelectedVoice}/>
                        <button onClick={handleGenerateAudio} disabled={isGeneratingAudio} className="flex items-center justify-center px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 focus:outline-none disabled:bg-purple-400 whitespace-nowrap">
                            <SparklesIcon className="h-4 w-4 mr-2"/>
                            {isGeneratingAudio ? 'Generating...' : `Generate Audio (${CREDIT_COSTS.AUDIO_GENERATION} Credits)`}
                        </button>
                    </div>

                    {audioUrl && (
                        <div className="space-y-4">
                            <audio controls src={audioUrl} className="w-full">Your browser does not support the audio element.</audio>
                             <div className="flex justify-end space-x-2">
                                <button onClick={handleQueueAudio} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700">Add to Queue</button>
                                <button onClick={handleSaveAudio} className="px-4 py-2 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">Save to Audio Library</button>
                            </div>
                        </div>
                    )}
                 </div>
            )}
        </div>
    );
};

const ContentSummarizer: React.FC<{ onSave: (title: string, content: string) => void; }> = ({ onSave }) => {
    const { addToast } = useToast();
    const { deductCredits, currentUser } = useAuth();
    const { loadContent } = useContent();
    const { addToQueue } = usePlayer();
    const [isLoading, setIsLoading] = useState(false);
    const [originalContent, setOriginalContent] = useState('');
    const [summarizedContent, setSummarizedContent] = useState('');
    
    // Audio Generation State
    const [clonedVoices, setClonedVoices] = useState<ClonedVoice[]>([]);
    const [selectedVoice, setSelectedVoice] = useState('AI-David');
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    
    useEffect(() => {
        const fetchVoices = async () => {
            if (currentUser) {
                const voices = await db.getAllClonedVoices(currentUser.tenantId);
                setClonedVoices(voices.filter(v => v.status === 'Ready'));
            }
        };
        fetchVoices();
    }, [currentUser]);

    useEffect(() => {
        setAudioUrl(null);
        setAudioBlob(null);
    }, [summarizedContent]);
    
     useEffect(() => {
        const currentUrl = audioUrl;
        return () => { if (currentUrl) URL.revokeObjectURL(currentUrl); };
    }, [audioUrl]);

    const handleSummarize = async () => {
        if (!originalContent) return;

        const canProceed = await deductCredits(CREDIT_COSTS.SUMMARIZER, 'Content Summarization');
        if (!canProceed) return;

        setIsLoading(true);
        setSummarizedContent('');
        try {
            let contentToSummarize = originalContent;
            const MAX_PROMPT_CHARS = 8000;
            if (contentToSummarize.length > MAX_PROMPT_CHARS) {
                contentToSummarize = contentToSummarize.substring(0, MAX_PROMPT_CHARS) + "\n\n...[CONTENT TRUNCATED]...";
                addToast("Input text is too long and has been truncated.", "info");
            }

            const prompt = `Summarize the following text into a concise, engaging script suitable for a radio broadcast. The summary should capture the key points and be easy for a host to read. The output should be the summarized text only, without any introductory phrases like "Here is the summary:".\n\nTEXT:\n${contentToSummarize}`;
            const response = await generateWithRetry({ model: 'gemini-2.5-flash', contents: prompt });
            setSummarizedContent(response.text);
            addToast("Content summarized!", "success");
        } catch (error) {
            handleAiError(error, addToast);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGenerateAudio = async () => { /* Similar to other generators */ };
    const handleSaveAudio = async () => { /* Similar to other generators */ };
    const handleQueueAudio = async () => { /* Similar to other generators */ };
    const handleQueueArticle = () => {
        if (!summarizedContent || !currentUser) return;
        const newItem: ArticleContent = {
            id: `ai-summary-queue-${Date.now()}`, tenantId: currentUser.tenantId, type: 'Article', title: 'Summarized Content',
            content: summarizedContent, date: new Date().toISOString(), duration: '0:00', useAiAnnouncer: true, announcerVoice: selectedVoice
        };
        addToQueue([newItem]);
        addToast(`"Summarized Content" added to the playout queue.`, 'success');
    };

    return (
        <div className="space-y-4">
            <textarea
                value={originalContent}
                onChange={e => setOriginalContent(e.target.value)}
                placeholder="Paste any text here to summarize it into a radio script..."
                rows={8}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
            />
            <div className="flex justify-end">
                <button
                    onClick={handleSummarize}
                    disabled={isLoading || !originalContent}
                    className="flex items-center px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 disabled:bg-purple-400"
                >
                    <SparklesIcon className="h-4 w-4 mr-2" />
                    {isLoading ? 'Summarizing...' : `Summarize (${CREDIT_COSTS.SUMMARIZER} Credits)`}
                </button>
            </div>
            <textarea
                value={summarizedContent}
                readOnly
                placeholder="Your summarized script will appear here..."
                rows={8}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700/50"
            />
             <div className="flex justify-end space-x-2">
                <button onClick={handleQueueArticle} disabled={!summarizedContent} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 disabled:bg-green-400">Add to Queue</button>
                <button onClick={() => onSave('Summarized Content', summarizedContent)} disabled={!summarizedContent} className="px-4 py-2 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-blue-400">Save as Article</button>
            </div>
        </div>
    );
};

const ScriptGenerator: React.FC<{
    onSave: (title: string, content: string, type: 'Ad' | 'Jingle' | 'StationID' | 'Promo') => void;
}> = ({ onSave }) => {
    const { stationSettings, deductCredits } = useAuth();
    const { addToast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [scriptType, setScriptType] = useState<'stationId' | 'jingle' | 'ad' | 'promo'>('stationId');
    const [prompt, setPrompt] = useState('');
    const [generatedScript, setGeneratedScript] = useState('');

    const handleGenerate = async () => {
        if (!prompt) return;
        const canProceed = await deductCredits(CREDIT_COSTS.SCRIPT, 'Script Generation');
        if (!canProceed) return;
        setIsLoading(true);
        try {
            const fullPrompt = `You are a professional radio script writer for a station named "${stationSettings.name}". The station's vibe is "${stationSettings.vibe || 'energetic'}".
Write a short, punchy script for a "${scriptType}" based on this prompt: "${prompt}".
The script should be under 15 seconds when read aloud.
Return only the script text.`;
            const response = await generateWithRetry({ model: 'gemini-2.5-flash', contents: fullPrompt });
            setGeneratedScript(response.text);
        } catch (error) { handleAiError(error, addToast); } finally { setIsLoading(false); }
    };

    return (
        <div className="space-y-4">
            {/* Form elements for script type, prompt, etc. */}
            <p>Script Generator UI goes here...</p>
        </div>
    );
};

const SportsUpdateGenerator: React.FC<{ onSave: (title: string, content: string) => void; }> = ({ onSave }) => {
     const { addToast } = useToast();
     const { deductCredits } = useAuth();
     const [isLoading, setIsLoading] = useState(false);
     const [topic, setTopic] = useState('');
     const [generatedScript, setGeneratedScript] = useState('');

     const handleGenerate = async () => {
        if (!topic) return;
        const canProceed = await deductCredits(CREDIT_COSTS.SPORTS_UPDATE, 'Sports Update Generation');
        if (!canProceed) return;
        setIsLoading(true);
        try {
            const prompt = `You are a sports radio announcer. Generate a short, exciting sports update script about "${topic}". Use web search to find the latest results, scores, or news.`;
            const response = await generateWithRetry({ model: 'gemini-2.5-flash', contents: prompt, config: { tools: [{ googleSearch: {} }] } });
            setGeneratedScript(response.text);
        } catch (error) { handleAiError(error, addToast); } finally { setIsLoading(false); }
    };
    
    return (
        <div className="space-y-4">
            <div className="flex items-center space-x-2">
                <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g., latest premier league results" className="flex-grow px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md" />
                <button onClick={handleGenerate} disabled={isLoading || !topic} className="flex items-center px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg"><TrophyIcon className="mr-2"/>{isLoading ? 'Searching...' : `Generate (${CREDIT_COSTS.SPORTS_UPDATE} Credits)`}</button>
            </div>
            <textarea value={generatedScript} readOnly rows={10} className="w-full p-3 border dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700/50" />
            <div className="flex justify-end">
                <button onClick={() => onSave(`Sports: ${topic}`, generatedScript)} disabled={!generatedScript} className="px-4 py-2 bg-brand-blue text-white rounded-lg">Save as Script</button>
            </div>
        </div>
    );
};


const AIContentStudio: React.FC = () => {
    const { addContentItem } = useContent();
    const { addToast } = useToast();
    const [activeTool, setActiveTool] = useState<AiTool>('article');

    const handleSave = (title: string, content: string) => {
        const newItem: Partial<ArticleContent> = {
            type: 'Article',
            title: title,
            content: content,
            useAiAnnouncer: true
        };
        addContentItem(newItem);
        addToast(`"${title}" saved to Content Library.`, 'success');
    };
    
    const handleSaveScript = (title: string, content: string, type: 'Ad' | 'Jingle' | 'StationID' | 'Promo') => {
        // Here we would create an AudioContent item, but first we need to generate audio
        // For now, we'll save it as an Article-type script
        handleSave(`${type}: ${title}`, content);
        addToast("Script saved. Go to its 'Edit' page to generate audio.", 'info');
    };

    const renderTool = () => {
        switch (activeTool) {
            case 'article': return <ArticleGenerator onSave={handleSave} />;
            case 'news': return <NewsSegmentGenerator onSave={handleSave} />;
            case 'summarizer': return <ContentSummarizer onSave={handleSave} />;
            case 'sportsUpdate': return <SportsUpdateGenerator onSave={handleSave} />;
            // case 'stationId':
            // case 'jingle':
            // case 'ad':
            //     return <ScriptGenerator onSave={handleSaveScript} />;
            default: return <p>This tool is under construction.</p>;
        }
    };
    
    const tabs: { id: AiTool, label: string }[] = [
        { id: 'article', label: 'Article Generator' },
        { id: 'news', label: 'News Segment' },
        { id: 'summarizer', label: 'Content Summarizer' },
        { id: 'sportsUpdate', label: 'Sports Update' },
        // { id: 'stationId', label: 'Station ID' },
        // { id: 'jingle', label: 'Jingle/Ad Script' },
    ];

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center space-x-3 mb-2">
                <SparklesIcon />
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">AI Content Studio</h2>
            </div>
             <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Your creative hub for generating broadcast-ready content, from news articles to custom jingles.</p>
            
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-2 sm:space-x-6 overflow-x-auto" aria-label="Tabs">
                    {tabs.map(tab => (
                        <AiToolTab key={tab.id} label={tab.label} isActive={activeTool === tab.id} onClick={() => setActiveTool(tab.id)} />
                    ))}
                </nav>
            </div>
            
            <div className="mt-6">
                {renderTool()}
            </div>
        </div>
    );
};

export default AIContentStudio;
