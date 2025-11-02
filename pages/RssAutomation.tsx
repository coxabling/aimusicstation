

import React, { useState, useEffect, useCallback } from 'react';
import { RssFeedSettings, ClonedVoice, Playlist } from '../types';
import InputField from '../components/InputField';
import ToggleSwitch from '../components/ToggleSwitch';
import Slider from '../components/Slider';
import { RssIcon, PlusIcon, TrashIcon, PencilIcon } from '../components/icons';
import { useToast } from '../contexts/ToastContext';
import * as db from '../services/db';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';


const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <fieldset className="p-4 border dark:border-gray-700 rounded-lg">
        <legend className="px-2 text-lg font-semibold text-gray-800 dark:text-white">{title}</legend>
        <div className="space-y-6 pt-2">
            {children}
        </div>
    </fieldset>
);

const RssFeedForm: React.FC<{
    initialSettings: Partial<RssFeedSettings>;
    onSave: (settings: RssFeedSettings) => void;
    onCancel: () => void;
    clonedVoices: ClonedVoice[];
    playlists: Playlist[];
}> = ({ initialSettings, onSave, onCancel, clonedVoices, playlists }) => {
    const { currentUser } = useAuth();
    const [feedSettings, setFeedSettings] = useState<Partial<RssFeedSettings>>(initialSettings);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFeedSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFeedSettings(prev => ({ ...prev, [name]: Number(value) }));
    };

    const handleToggle = (name: keyof RssFeedSettings, value: boolean) => {
        setFeedSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleKeywordChange = (index: number, value: string) => {
        const newKeywords = [...(feedSettings.keywordsToIgnore || [''])];
        newKeywords[index] = value;
        setFeedSettings(prev => ({ ...prev, keywordsToIgnore: newKeywords }));
    };
    const addKeyword = () => {
        setFeedSettings(prev => ({ ...prev, keywordsToIgnore: [...(prev.keywordsToIgnore || []), ''] }));
    };
    const removeKeyword = (index: number) => {
        if ((feedSettings.keywordsToIgnore?.length || 0) > 1) {
            setFeedSettings(prev => ({ ...prev, keywordsToIgnore: prev.keywordsToIgnore!.filter((_, i) => i !== index) }));
        }
    };
    
    const handleStringReplaceChange = (index: number, field: 'from' | 'to', value: string) => {
        const newStrings = [...(feedSettings.stringsToReplace || [{from:'', to:''}])];
        newStrings[index][field] = value;
        setFeedSettings(prev => ({ ...prev, stringsToReplace: newStrings }));
    };
    const addStringReplace = () => {
        setFeedSettings(prev => ({ ...prev, stringsToReplace: [...(prev.stringsToReplace || []), { from: '', to: ''}] }));
    };
    const removeStringReplace = (index: number) => {
        if ((feedSettings.stringsToReplace?.length || 0) > 1) {
            setFeedSettings(prev => ({ ...prev, stringsToReplace: prev.stringsToReplace!.filter((_, i) => i !== index) }));
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;
        const completeSettings: RssFeedSettings = {
            id: feedSettings.id || `rss-${Date.now()}`,
            tenantId: currentUser.tenantId,
            published: feedSettings.published ?? false, name: feedSettings.name ?? '', url: feedSettings.url ?? '', numberOfArticles: feedSettings.numberOfArticles ?? 10,
            parseFrequencyHours: feedSettings.parseFrequencyHours ?? 4, language: feedSettings.language ?? 'American English', voice: feedSettings.voice ?? 'Random',
            readingSpeed: feedSettings.readingSpeed ?? 7, backgroundMusic: feedSettings.backgroundMusic ?? null, autoDeleteOldContent: feedSettings.autoDeleteOldContent ?? false,
            approveBeforeAiring: feedSettings.approveBeforeAiring ?? false, includeTitlesIntoBody: feedSettings.includeTitlesIntoBody ?? false,
            readOnlyTheTitle: feedSettings.readOnlyTheTitle ?? false, mergeArticlesIntoOne: feedSettings.mergeArticlesIntoOne ?? false,
            removePathsUrls: feedSettings.removePathsUrls ?? false, removeDuplicateText: feedSettings.removeDuplicateText ?? false,
            disableSpellingOfCapitalizedWords: feedSettings.disableSpellingOfCapitalizedWords ?? false, summarizeText: feedSettings.summarizeText ?? false,
            correctGrammar: feedSettings.correctGrammar ?? false, reviseText: feedSettings.reviseText ?? false, randomize: feedSettings.randomize ?? false,
            ignoreNegativeSentiment: feedSettings.ignoreNegativeSentiment ?? false, ignoreByKeywords: feedSettings.ignoreByKeywords ?? false,
            keywordsToIgnore: feedSettings.keywordsToIgnore ?? [''], defaultFallbackMessage: feedSettings.defaultFallbackMessage ?? '', introText: feedSettings.introText ?? '',
            outroText: feedSettings.outroText ?? '', stringsToReplace: feedSettings.stringsToReplace ?? [{ from: '', to: '' }],
            schedules: feedSettings.schedules ?? [],
            targetPlaylistId: feedSettings.targetPlaylistId || undefined,
        };
        onSave(completeSettings);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <Section title="General">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField label="Name" name="name" value={feedSettings.name || ''} onChange={handleChange} placeholder="e.g., Tech News Feed" />
                    <InputField label="URL" name="url" value={feedSettings.url || ''} onChange={handleChange} placeholder="https://..." />
                    <div className="md:col-span-2">
                        <ToggleSwitch label="Published" enabled={!!feedSettings.published} onChange={(val) => handleToggle('published', val)} />
                    </div>
                </div>
            </Section>
            <Section title="Parsing & Content">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Slider label="Number of Articles" name="numberOfArticles" value={feedSettings.numberOfArticles ?? 10} onChange={handleSliderChange} min={1} max={10} />
                    <Slider label="Parse Frequency (In Hours)" name="parseFrequencyHours" value={feedSettings.parseFrequencyHours ?? 4} onChange={handleSliderChange} min={1} max={24} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ToggleSwitch label="Auto-Delete Old Content" enabled={!!feedSettings.autoDeleteOldContent} onChange={(v) => handleToggle('autoDeleteOldContent', v)} />
                    <ToggleSwitch label="Approve Before Airing" enabled={!!feedSettings.approveBeforeAiring} onChange={(v) => handleToggle('approveBeforeAiring', v)} />
                </div>
            </Section>
             <Section title="Voice & Audio">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="language" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Language</label>
                        <select id="language" name="language" value={feedSettings.language || 'American English'} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue bg-white dark:bg-gray-700">
                            <option>American English</option>
                            <option>British English</option>
                            <option>Spanish</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="voice" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Voice</label>
                        <select id="voice" name="voice" value={feedSettings.voice || 'Random'} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue bg-white dark:bg-gray-700">
                            <option>Random</option>
                            <optgroup label="Standard Voices">
                                <option>AI-David</option><option>AI-Sarah</option>
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
                    <div className="md:col-span-2">
                        <Slider label="Reading Speed" name="readingSpeed" value={feedSettings.readingSpeed ?? 7} onChange={handleSliderChange} min={1} max={15} />
                    </div>
                </div>
            </Section>
            <Section title="Automation Actions">
                <div>
                    <label htmlFor="targetPlaylistId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Add new articles to playlist</label>
                    <select 
                        id="targetPlaylistId"
                        name="targetPlaylistId"
                        value={feedSettings.targetPlaylistId || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue bg-white dark:bg-gray-700"
                    >
                        <option value="">-- Do not add to a playlist --</option>
                        {playlists.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">If selected, newly parsed articles from this feed will be automatically added to the specified playlist.</p>
                </div>
            </Section>
            {/* Other sections omitted for brevity but would be included in a real component */}
             <div className="flex justify-end pt-4 space-x-3">
                <button type="button" onClick={onCancel} className="px-6 py-2 bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 font-semibold rounded-lg shadow-md hover:bg-gray-300">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">Save Feed</button>
            </div>
        </form>
    );
};

const RssAutomation: React.FC = () => {
    const { addToast } = useToast();
    const { currentUser } = useAuth();
    
    const [feeds, setFeeds] = useState<RssFeedSettings[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFeed, setEditingFeed] = useState<Partial<RssFeedSettings> | null>(null);
    const [clonedVoices, setClonedVoices] = useState<ClonedVoice[]>([]);
    const [playlists, setPlaylists] = useState<Playlist[]>([]);

    const loadFeeds = useCallback(async () => {
        if (!currentUser) return;
        setIsLoading(true);
        const [feedsFromDb, voicesFromDb, playlistsFromDb] = await Promise.all([
            db.getAllRssFeedSettings(currentUser.tenantId),
            db.getAllClonedVoices(currentUser.tenantId),
            db.getAllPlaylists(currentUser.tenantId)
        ]);
        setFeeds(feedsFromDb);
        setClonedVoices(voicesFromDb.filter(v => v.status === 'Ready'));
        setPlaylists(playlistsFromDb);
        setIsLoading(false);
    }, [currentUser]);

    useEffect(() => {
        loadFeeds();
    }, [loadFeeds]);

    const handleAddNew = () => {
        setEditingFeed({});
        setIsModalOpen(true);
    };

    const handleEdit = (feed: RssFeedSettings) => {
        setEditingFeed(feed);
        setIsModalOpen(true);
    };

    const handleDelete = async (feed: RssFeedSettings) => {
        if (!currentUser) return;
        if (window.confirm(`Are you sure you want to delete the feed "${feed.name}"?`)) {
            await db.deleteRssFeedSettings(feed.id, currentUser.tenantId);
            addToast(`Feed "${feed.name}" deleted.`, 'info');
            await loadFeeds();
        }
    };
    
    const handleSave = async (feedToSave: RssFeedSettings) => {
        if (!currentUser) return;
        if (!feedToSave.name || !feedToSave.url) {
            addToast("Feed Name and URL are required.", "error");
            return;
        }
        await db.saveRssFeedSettings(feedToSave);
        addToast(`RSS Feed "${feedToSave.name}" has been saved.`, "success");
        setIsModalOpen(false);
        setEditingFeed(null);
        await loadFeeds();
    };

    return (
        <>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingFeed?.id ? "Edit RSS Feed" : "Add New RSS Feed"}>
                {editingFeed && (
                    <RssFeedForm
                        initialSettings={editingFeed}
                        onSave={handleSave}
                        onCancel={() => setIsModalOpen(false)}
                        clonedVoices={clonedVoices}
                        playlists={playlists}
                    />
                )}
            </Modal>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div className="flex items-center space-x-3">
                        <RssIcon/>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">RSS Automation</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your automated content feeds from around the web.</p>
                        </div>
                    </div>
                     <button onClick={handleAddNew} className="flex items-center justify-center w-full sm:w-auto px-4 py-2 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none">
                        <PlusIcon />
                        <span className="ml-2">Add New Feed</span>
                    </button>
                </div>
                
                <div className="space-y-4">
                    {isLoading ? (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-10">Loading feeds...</p>
                    ) : feeds.length > 0 ? (
                        feeds.map(feed => (
                            <div key={feed.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                                    <div className="flex-grow">
                                        <div className="flex items-center space-x-3">
                                            <span className={`px-2 py-0.5 text-xs rounded-full ${feed.published ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-300'}`}>
                                                {feed.published ? 'Published' : 'Draft'}
                                            </span>
                                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">{feed.name}</h3>
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{feed.url}</p>
                                    </div>
                                    <div className="flex items-center space-x-3 mt-3 sm:mt-0 sm:ml-4 flex-shrink-0">
                                        <button onClick={() => handleEdit(feed)} className="p-2 text-blue-500 hover:text-blue-600" title="Edit"><PencilIcon/></button>
                                        <button onClick={() => handleDelete(feed)} className="p-2 text-red-500 hover:text-red-600" title="Delete"><TrashIcon/></button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                         <div className="text-center py-16 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">No RSS feeds configured</h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by adding a new feed.</p>
                        </div>
                    )}
                </div>

            </div>
        </>
    );
};

export default RssAutomation;