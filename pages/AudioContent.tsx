import React, { useState, ChangeEvent, useEffect, useCallback, useRef, useMemo } from 'react';
import { MusicIcon, PencilIcon, TrashIcon, PlaylistAddIcon, PlayCircleIcon, PauseCircleIcon, DownloadIcon, ArrowUpIcon, ArrowDownIcon, SortIcon, ExclamationCircleIcon, QueueAddIcon } from '../components/icons';
import type { AudioContent as AudioContentType, Playlist, ContentItem, MusicContent, AdContent, CustomAudioContent, ClonedVoice, User } from '../types';
import Modal from '../components/Modal';
import InputField from '../components/InputField';
import ToggleSwitch from '../components/ToggleSwitch';
import { usePlayer } from '../contexts/PlayerContext';
import { isPlayableContent } from '../types';
import * as db from '../services/db';
import { useToast } from '../contexts/ToastContext';
import { useContent } from '../contexts/ContentContext';
import { useAuth } from '../contexts/AuthContext';

// --- HELPERS ---

const Checkmark: React.FC<{ checked: boolean }> = ({ checked }) => (
    <span className={checked ? 'text-green-500' : 'text-gray-400'}>{checked ? <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>}</span>
);

const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => (
    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-4 my-2 overflow-hidden">
        <div className="bg-brand-blue h-4 rounded-full flex items-center justify-center text-white text-xs font-semibold leading-4 transition-all duration-300 ease-in-out" style={{ width: `${progress}%` }}>{progress > 10 ? `${Math.round(progress)}%` : ''}</div>
    </div>
);

const getAudioDuration = (file: File): Promise<string> => {
    return new Promise((resolve) => {
        const audio = document.createElement('audio');
        audio.src = URL.createObjectURL(file);
        audio.onloadedmetadata = () => {
            const duration = Math.round(audio.duration);
            const minutes = Math.floor(duration / 60);
            const seconds = duration % 60;
            resolve(`${minutes}:${seconds.toString().padStart(2, '0')}`);
            URL.revokeObjectURL(audio.src);
        };
        audio.onerror = () => { resolve('0:00'); URL.revokeObjectURL(audio.src); };
    });
};

const mapAudioToContentItem = (audio: AudioContentType, currentUser: User): ContentItem | null => {
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
    if (audio.type === 'Jingle' || audio.type === 'Ad') {
        return {
            id: audio.id,
            tenantId: currentUser.tenantId,
            title: audio.filename,
            type: audio.type === 'Jingle' ? 'Custom Audio' : 'Ad',
            artist: audio.artist || (audio.type === 'Jingle' ? 'Station Audio' : 'Advertisement'),
            duration: audio.duration,
            date: audio.dateTime,
            url: audio.url,
            file: audio.file,
        };
    }
    return null;
}

// --- SINGLE & BULK UPLOAD FORMS ---

const AudioContentForm: React.FC<{ item: Partial<AudioContentType>; onSave: (item: Partial<AudioContentType>, file?: File) => void; onCancel: () => void; clonedVoices: ClonedVoice[]; }> = ({ item, onSave, onCancel, clonedVoices }) => {
    const [currentItem, setCurrentItem] = useState<Partial<AudioContentType>>(item.id ? item : { type: 'Music', announceTrack: false, announcementWithBackgroundMusic: false, published: true, ...item });
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setCurrentItem(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleToggle = (name: keyof AudioContentType, value: boolean) => setCurrentItem(prev => ({...prev, [name]: value}));
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => { 
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            const duration = await getAudioDuration(selectedFile);
            setCurrentItem(prev => ({...prev, duration, filename: selectedFile.name}));
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (file && !isUploading) {
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
            if (!currentItem.id && !file) {
                alert("Please select a file to upload.");
                return;
            }
            onSave(currentItem, file);
        }
    };
    
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Audio File</label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
            <div className="space-y-1 text-center">
                <MusicIcon />
                <div className="flex text-sm text-gray-600 dark:text-gray-400">
                    <label htmlFor="file-upload" className={`relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-brand-blue hover:text-blue-700 focus-within:outline-none ${isUploading ? 'cursor-not-allowed text-gray-400' : ''}`}>
                        <span>{currentItem.id ? 'Upload new file' : 'Upload a file'}</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="audio/*" disabled={isUploading} />
                    </label>
                </div>
                {file ? <p className="text-xs text-green-500">{file.name}</p> : <p className="text-xs text-gray-500 dark:text-gray-400">{currentItem.filename || 'MP3, WAV, etc.'}</p>}
            </div>
          </div>
          {isUploading && file && (
            <div className="mt-2">
                 <p className="text-sm text-gray-600 dark:text-gray-400">Uploading: <span className="font-medium text-gray-800 dark:text-gray-200">{file.name}</span></p>
                 <ProgressBar progress={uploadProgress} />
            </div>
          )}
        </div>
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content Type</label>
          <select id="type" name="type" value={currentItem.type || 'Music'} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue bg-white dark:bg-gray-700 disabled:bg-gray-200 dark:disabled:bg-gray-600" disabled={isUploading}>
              <option>Music</option><option>Jingle</option><option>Ad</option>
          </select>
        </div>
        <InputField label="Artist" name="artist" value={currentItem.artist || ''} onChange={handleChange} placeholder="e.g., Synthwave Rider" disabled={isUploading}/>
        <InputField label="Genre" name="genre" value={currentItem.genre || ''} onChange={handleChange} placeholder="e.g., Synthwave" disabled={isUploading}/>
        <div>
            <label htmlFor="announcementVoice" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Announcer Voice</label>
            <select 
                id="announcementVoice"
                name="announcementVoice"
                value={currentItem.announcementVoice || 'AI-Ayo (African Male)'}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue bg-white dark:bg-gray-700 disabled:bg-gray-200 dark:disabled:bg-gray-600"
                disabled={isUploading || currentItem.type !== 'Music'}
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
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <ToggleSwitch label="Announce This Track" enabled={!!currentItem.announceTrack} onChange={(val) => handleToggle('announceTrack', val)} disabled={isUploading || currentItem.type !== 'Music'} />
          {currentItem.announceTrack && currentItem.type === 'Music' && (
              <div className="pl-4 border-l-2 border-gray-200 dark:border-gray-600">
                  <ToggleSwitch 
                      label="Add background music to announcement" 
                      enabled={!!currentItem.announcementWithBackgroundMusic} 
                      onChange={(val) => handleToggle('announcementWithBackgroundMusic', val)} 
                      disabled={isUploading} 
                  />
              </div>
          )}
          <ToggleSwitch label="Published" enabled={!!currentItem.published} onChange={(val) => handleToggle('published', val)} disabled={isUploading} />
        </div>
        <div className="flex justify-end pt-4 space-x-2">
            <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 font-semibold rounded-lg shadow-md hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed" disabled={isUploading}>Cancel</button>
            <button type="submit" className="px-4 py-2 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none disabled:bg-blue-400 dark:disabled:bg-blue-800 disabled:cursor-not-allowed" disabled={isUploading}>{isUploading ? `Uploading... ${Math.round(uploadProgress)}%` : 'Save Audio'}</button>
        </div>
      </form>
    );
};

interface BulkAudioItem extends Partial<Omit<AudioContentType, 'id' | 'dateTime'>> {
    file: File;
    progress: number;
    status: 'pending' | 'uploading' | 'done';
}

const BulkUploadForm: React.FC<{
    files: File[];
    onSave: (items: Partial<Omit<AudioContentType, 'id' | 'dateTime'>>[], files: File[]) => void;
    onCancel: () => void;
}> = ({ files, onSave, onCancel }) => {
    const [bulkItems, setBulkItems] = useState<BulkAudioItem[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        const processFiles = async () => {
            const initialItems = await Promise.all(files.map(async file => {
                const duration = await getAudioDuration(file);
                return {
                    file,
                    filename: file.name,
                    duration,
                    type: 'Music',
                    artist: '',
                    genre: '',
                    progress: 0,
                    status: 'pending'
                } as BulkAudioItem;
            }));
            setBulkItems(initialItems);
        };
        processFiles();
    }, [files]);

    const handleItemChange = (index: number, field: keyof BulkAudioItem, value: string) => {
        setBulkItems(prev =>
            prev.map((item, i) =>
                i === index ? { ...item, [field]: value } : item
            )
        );
    };

    const handleImport = () => {
        setIsImporting(true);
        const itemsToSave = bulkItems.map(item => {
            const { file, progress, status, ...rest } = item;
            return rest;
        });
        const filesToSave = bulkItems.map(item => item.file);
        
        const interval = setInterval(() => {
            let allDone = true;
            setBulkItems(currentItems => currentItems.map((item) => {
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
                                <td className="p-2 align-top">
                                    <select value={item.type} onChange={e => handleItemChange(index, 'type', e.target.value)} className="w-full bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md p-1.5 text-sm">
                                        <option>Music</option><option>Jingle</option><option>Ad</option>
                                    </select>
                                </td>
                                <td className="p-2 align-top"><input type="text" value={item.artist || ''} onChange={e => handleItemChange(index, 'artist', e.target.value)} className="w-full bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md p-1.5 text-sm" /></td>
                                <td className="p-2 align-top"><input type="text" value={item.genre || ''} onChange={e => handleItemChange(index, 'genre', e.target.value)} className="w-full bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md p-1.5 text-sm" /></td>
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

interface AudioContentProps {
    actionTrigger?: string;
    clearActionTrigger?: () => void;
}

const AudioContent: React.FC<AudioContentProps> = ({ actionTrigger, clearActionTrigger }) => {
    const { audioContentItems, loadContent, isLoading } = useContent();
    const { addToast } = useToast();
    const { currentUser } = useAuth();
    const { currentItem, playbackState, isPreviewing, playPreview, addToQueue } = usePlayer();

    const [isSingleItemModalOpen, setIsSingleItemModalOpen] = useState(false);
    const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
    const [filesToBulkUpload, setFilesToBulkUpload] = useState<File[]>([]);
    const [editingItem, setEditingItem] = useState<Partial<AudioContentType> | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('All');
    const [sortConfig, setSortConfig] = useState<{ key: keyof AudioContentType; direction: 'ascending' | 'descending' }>({ key: 'dateTime', direction: 'descending' });
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemsToDelete, setItemsToDelete] = useState<string[]>([]);
    const [clonedVoices, setClonedVoices] = useState<ClonedVoice[]>([]);
    
    const isPlaying = playbackState === 'playing';

    useEffect(() => {
        if (actionTrigger === 'uploadAudio' && clearActionTrigger) {
            setEditingItem({});
            setIsSingleItemModalOpen(true);
            clearActionTrigger();
        }
    }, [actionTrigger, clearActionTrigger]);

    useEffect(() => {
        const fetchVoices = async () => {
            if (currentUser) {
                const voices = await db.getAllClonedVoices(currentUser.tenantId);
                setClonedVoices(voices.filter(v => v.status === 'Ready'));
            }
        };
        fetchVoices();
    }, [currentUser]);

    const requestSort = (key: keyof AudioContentType) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: keyof AudioContentType) => {
        if (sortConfig.key !== key) return <SortIcon />;
        if (sortConfig.direction === 'ascending') return <ArrowUpIcon />;
        return <ArrowDownIcon />;
    };

    const processedContent = useMemo(() => {
        let items = [...audioContentItems];
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            items = items.filter(item => 
                item.filename.toLowerCase().includes(query) || 
                (item.artist && item.artist.toLowerCase().includes(query)) ||
                (item.genre && item.genre.toLowerCase().includes(query))
            );
        }
        if (typeFilter !== 'All') items = items.filter(item => item.type === typeFilter);
        
        items.sort((a, b) => {
            const valA = (a as any)[sortConfig.key] ?? '';
            const valB = (b as any)[sortConfig.key] ?? '';
            if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
        return items;
    }, [audioContentItems, searchQuery, typeFilter, sortConfig]);
    
    const isAllSelected = useMemo(() => processedContent.length > 0 && selectedItems.length === processedContent.length, [processedContent, selectedItems]);

    const handleSelectItem = (id: string, checked: boolean) => {
        setSelectedItems(prev => checked ? [...prev, id] : prev.filter(i => i !== id));
    };
    
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedItems(e.target.checked ? processedContent.map(i => i.id) : []);
    };

    const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files ? Array.from(e.target.files) : [];
        if (files.length === 0) return;
        if (files.length > 1) {
            setFilesToBulkUpload(files);
            setIsBulkUploadModalOpen(true);
        } else {
            setEditingItem({});
            setIsSingleItemModalOpen(true);
            setTimeout(() => {
                const event = new Event('change', { bubbles: true });
                Object.defineProperty(event, 'target', { value: e.target, enumerable: true });
                document.querySelector('#file-upload')?.dispatchEvent(event);
            }, 100);
        }
        e.target.value = '';
    };

    const handleSave = async (itemToSave: Partial<AudioContentType>, file?: File) => {
        if (!currentUser) return;
        const newItem: AudioContentType = {
            id: itemToSave.id || `audio-${Date.now()}`,
            tenantId: currentUser.tenantId,
            dateTime: itemToSave.id ? itemToSave.dateTime! : new Date().toISOString(),
            lastPlayed: itemToSave.lastPlayed || 'Never',
            totalPlays: itemToSave.totalPlays || 0,
            ...itemToSave,
            file,
        } as AudioContentType;
        
        await db.saveAudioContent(newItem);
        await loadContent();
        addToast(`"${newItem.filename}" saved successfully!`, 'success');
        setIsSingleItemModalOpen(false);
        setEditingItem(null);
    };

    const handleBulkSave = async (items: Partial<Omit<AudioContentType, 'id' | 'dateTime'>>[], files: File[]) => {
        if (!currentUser) return;
        const newItems: AudioContentType[] = items.map((item, index) => ({
            id: `audio-${Date.now()}-${index}`,
            tenantId: currentUser.tenantId,
            dateTime: new Date().toISOString(),
            lastPlayed: 'Never',
            totalPlays: 0,
            published: true,
            announceTrack: false,
            announcementWithBackgroundMusic: false,
            announcementVoice: 'AI-Ayo (African Male)',
            ...item,
            file: files[index],
        } as AudioContentType));

        await db.bulkSaveAudioContent(newItems);
        await loadContent();
        setIsBulkUploadModalOpen(false);
    };
    
    const handleDelete = (id: string) => {
        setItemsToDelete([id]);
        setIsDeleteModalOpen(true);
    };
    
    const handleBulkDelete = () => {
        setItemsToDelete([...selectedItems]);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!currentUser || itemsToDelete.length === 0) {
            setIsDeleteModalOpen(false);
            setItemsToDelete([]);
            return;
        }
        await db.deleteAudioContent(itemsToDelete, currentUser.tenantId);
        await loadContent();
        addToast(`${itemsToDelete.length} audio file(s) deleted.`, "info");
        setSelectedItems(prev => prev.filter(id => !itemsToDelete.includes(id)));
        setIsDeleteModalOpen(false);
        setItemsToDelete([]);
    };

    const handleAddToQueue = (item: AudioContentType) => {
        if (!currentUser) return;
        const contentItem = mapAudioToContentItem(item, currentUser);
        if (contentItem) {
            addToQueue([contentItem]);
            addToast(`"${contentItem.title}" added to the playout queue.`, 'success');
        } else {
            addToast(`Could not add "${item.filename}" to queue.`, 'error');
        }
    };
    
    return (
        <>
            <Modal isOpen={isSingleItemModalOpen} onClose={() => { setIsSingleItemModalOpen(false); setEditingItem(null); }} title={editingItem?.id ? 'Edit Audio' : 'Upload Audio'}>
                <AudioContentForm item={editingItem || {}} onSave={handleSave} onCancel={() => { setIsSingleItemModalOpen(false); setEditingItem(null); }} clonedVoices={clonedVoices} />
            </Modal>
            <Modal isOpen={isBulkUploadModalOpen} onClose={() => setIsBulkUploadModalOpen(false)} title={`Bulk Upload (${filesToBulkUpload.length} files)`}>
                <BulkUploadForm files={filesToBulkUpload} onSave={handleBulkSave} onCancel={() => setIsBulkUploadModalOpen(false)} />
            </Modal>
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Deletion">
                <div className="text-center">
                    <ExclamationCircleIcon className="mx-auto h-12 w-12 text-red-600" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Are you sure?</h3>
                    <div className="mt-2 px-7 py-3">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            You are about to permanently delete {itemsToDelete.length} audio file(s). This will also remove them from any playlists they are part of. This action cannot be undone.
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

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                {selectedItems.length > 0 ? (
                     <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 p-4 -m-6 mb-0 bg-blue-50 dark:bg-gray-700/50 rounded-t-lg">
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">{selectedItems.length} item(s) selected</h2>
                        <div className="flex items-center gap-4 flex-wrap justify-center">
                            <button onClick={handleBulkDelete} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700">Delete Selected</button>
                            <button onClick={() => setSelectedItems([])} className="px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg shadow-md hover:bg-gray-600">Deselect All</button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Audio Content</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your station's uploaded music, jingles, and ads.</p>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <label htmlFor="audio-bulk-upload" className="cursor-pointer px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none whitespace-nowrap">Bulk Upload</label>
                            <input id="audio-bulk-upload" type="file" onChange={handleFileSelect} className="hidden" multiple accept="audio/*" />
                        </div>
                    </div>
                )}
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                     <div className="relative w-full sm:w-80">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg></div>
                        <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue bg-white dark:bg-gray-700" />
                    </div>
                    <div>
                        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue bg-white dark:bg-gray-700">
                            <option>All</option><option>Music</option><option>Jingle</option><option>Ad</option>
                        </select>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="p-4">
                                    <input 
                                        type="checkbox" 
                                        className="h-4 w-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
                                        onChange={handleSelectAll}
                                        checked={isAllSelected}
                                        aria-label="Select all items"
                                    />
                                </th>
                                {(['filename', 'type', 'artist', 'duration', 'lastPlayed'] as const).map(key => <th scope="col" className="px-4 py-3" key={key}><button onClick={() => requestSort(key)} className="flex items-center group font-inherit text-inherit uppercase">{key} {getSortIcon(key)}</button></th>)}
                                <th scope="col" className="px-4 py-3 text-center">Published</th>
                                <th scope="col" className="px-4 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? <tr><td colSpan={8} className="text-center py-8">Loading audio library...</td></tr> : processedContent.map((item) => (
                                <tr key={item.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="p-4">
                                        <input 
                                            type="checkbox" 
                                            className="h-4 w-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
                                            checked={selectedItems.includes(item.id)}
                                            onChange={e => handleSelectItem(item.id, e.target.checked)}
                                            aria-label={`Select ${item.filename}`}
                                        />
                                    </td>
                                    <td className="px-4 py-4 font-medium text-gray-900 dark:text-white">{item.filename}</td>
                                    <td className="px-4 py-4">{item.type}</td>
                                    <td className="px-4 py-4">{item.artist || '-'}</td>
                                    <td className="px-4 py-4">{item.duration}</td>
                                    <td className="px-4 py-4">{item.lastPlayed}</td>
                                    <td className="px-4 py-4 text-center"><Checkmark checked={item.published}/></td>
                                    <td className="px-4 py-4"><div className="flex items-center space-x-3">
                                        <button onClick={() => playPreview(item as any)} className="text-brand-blue hover:text-blue-700">{isPreviewing && currentItem?.id === item.id && isPlaying ? <PauseCircleIcon /> : <PlayCircleIcon />}</button>
                                        <button onClick={() => handleAddToQueue(item)} className="text-green-500 hover:text-green-700" title="Add to Playout Queue"><QueueAddIcon /></button>
                                        <button onClick={() => { setEditingItem(item); setIsSingleItemModalOpen(true); }} className="text-brand-blue hover:text-blue-700"><PencilIcon /></button>
                                        <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700"><TrashIcon /></button>
                                    </div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};
export default AudioContent;