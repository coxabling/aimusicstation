import React, { useState, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import { MusicIcon, UsersIcon, RefreshIcon } from '../components/icons';
import { useContent } from '../contexts/ContentContext';
import { useAuth } from '../contexts/AuthContext';
import * as db from '../services/db';
import { AudioContent } from '../types';

const AZURACAST_CONNECTION_KEY = 'azuracastConnection';

interface ConnectionDetails {
    status: 'disconnected' | 'connecting' | 'connected' | 'error';
    url: string;
    errorMessage?: string;
}

// Mock data to simulate the music library on an Azuracast server
const MOCK_AZURACAST_MUSIC: Omit<AudioContent, 'id' | 'tenantId' | 'dateTime' | 'lastPlayed' | 'totalPlays' | 'published' | 'url'>[] = [
    { filename: 'Resonance.mp3', artist: 'HOME', duration: '3:32', type: 'Music', genre: 'Electronic', announceTrack: false, announcementVoice: 'AI-David', announcementWithBackgroundMusic: false },
    { filename: 'Running in the Night.mp3', artist: 'FM-84', duration: '4:31', type: 'Music', genre: 'Synthwave', announceTrack: false, announcementVoice: 'AI-David', announcementWithBackgroundMusic: false },
    { filename: 'Los Angeles.mp3', artist: 'The Midnight', duration: '6:30', type: 'Music', genre: 'Synthwave', announceTrack: false, announcementVoice: 'AI-David', announcementWithBackgroundMusic: false },
    { filename: 'Nightcall.mp3', artist: 'Kavinsky', duration: '4:19', type: 'Music', genre: 'Electronic', announceTrack: false, announcementVoice: 'AI-David', announcementWithBackgroundMusic: false }, // New track
    { filename: 'Cybernetic Dreams.mp3', artist: 'Synthwave Rider', duration: '4:01', type: 'Music', genre: 'Synthwave', announceTrack: false, announcementVoice: 'AI-David', announcementWithBackgroundMusic: false }, // Assume this is already in library
];

const AzuracastLink: React.FC = () => {
    const [connectionDetails, setConnectionDetails] = useState<ConnectionDetails>({
        status: 'disconnected',
        url: '',
        errorMessage: '',
    });
    const [apiKey, setApiKey] = useState('');
    const { addToast } = useToast();
    const { audioContentItems, loadContent } = useContent();
    const { currentUser } = useAuth();
    const [isSyncing, setIsSyncing] = useState(false);


    useEffect(() => {
        try {
            const saved = localStorage.getItem(AZURACAST_CONNECTION_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                setConnectionDetails({
                    status: data.status || 'disconnected',
                    url: data.url || '',
                });
            }
        } catch (error) {
            console.error('Could not load Azuracast connection from localStorage', error);
        }
    }, []);

    const handleConnect = (e: React.FormEvent) => {
        e.preventDefault();
        setConnectionDetails(prev => ({ ...prev, status: 'connecting', errorMessage: '' }));
        // Simulate API call
        setTimeout(() => {
            let error = '';
            if (!connectionDetails.url.startsWith('http')) {
                error = 'Please enter a valid URL, including http:// or https://';
            } else if (apiKey.length < 20) {
                error = 'The API key seems too short. Please check your Azuracast admin panel.';
            } else if (connectionDetails.url.includes('badurl')) {
                error = `Could not connect to ${connectionDetails.url}. Please check the address and your network connection.`;
            }

            if(error) {
                setConnectionDetails(prev => ({ ...prev, status: 'error', errorMessage: error }));
                return;
            }

            const newDetails: ConnectionDetails = { status: 'connected', url: connectionDetails.url };
            try {
                localStorage.setItem(AZURACAST_CONNECTION_KEY, JSON.stringify(newDetails));
            } catch (error) {
                console.error('Could not save Azuracast connection to localStorage', error);
            }
            setConnectionDetails(newDetails);
            addToast('Successfully connected to Azuracast!', 'success');
        }, 1500);
    };

    const handleDisconnect = () => {
        if (window.confirm('Are you sure you want to disconnect from Azuracast?')) {
            try {
                localStorage.removeItem(AZURACAST_CONNECTION_KEY);
            } catch (error) {
                console.error('Could not remove Azuracast connection from localStorage', error);
            }
            setConnectionDetails({ status: 'disconnected', url: '', errorMessage: '' });
            setApiKey('');
        }
    };
    
    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text).then(() => {
            addToast(`${label} copied to clipboard!`, 'success');
        }, (err) => {
            addToast(`Failed to copy ${label}.`, 'error');
            console.error('Could not copy text: ', err);
        });
    };
    
    const handleSyncLibrary = async () => {
        if (!currentUser || isSyncing) return;
        setIsSyncing(true);

        // Simulate fetching from Azuracast
        await new Promise(resolve => setTimeout(resolve, 1500));

        const existingTracks = new Set(audioContentItems.map(item => `${item.artist}|${item.filename.replace(/\.[^/.]+$/, "")}`.toLowerCase()));
        
        const newTracksToImport = MOCK_AZURACAST_MUSIC.filter(azuraTrack => {
            const trackKey = `${azuraTrack.artist}|${azuraTrack.filename.replace(/\.[^/.]+$/, "")}`.toLowerCase();
            return !existingTracks.has(trackKey);
        });

        if (newTracksToImport.length > 0) {
            const newAudioItems: AudioContent[] = newTracksToImport.map((track, index) => ({
                id: `azura-import-${Date.now()}-${index}`,
                tenantId: currentUser.tenantId,
                ...track,
                dateTime: new Date().toISOString(),
                lastPlayed: 'Never',
                totalPlays: 0,
                published: true,
            }));
            await db.bulkSaveAudioContent(newAudioItems);
            await loadContent(); // This will reload all content in the context
            addToast(`Successfully imported ${newTracksToImport.length} new track(s) from Azuracast!`, 'success');
        } else {
            addToast('Your music library is already up to date.', 'info');
        }

        setIsSyncing(false);
    };
    
    const getStatusIndicator = () => {
        switch (connectionDetails.status) {
            case 'connected': return <span className="text-green-500 font-semibold">Connected</span>;
            case 'connecting': return <span className="text-yellow-500 font-semibold">Connecting...</span>;
            case 'error': return <span className="text-red-500 font-semibold">Connection Failed</span>;
            default: return <span className="text-gray-500 font-semibold">Not Connected</span>;
        }
    };

    const getButtonText = () => {
        switch(connectionDetails.status) {
            case 'connecting': return 'Connecting...';
            case 'error': return 'Try Again';
            default: return 'Connect';
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Link Your Azuracast Radio</h2>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Connect your existing Azuracast instance to sync your station data and leverage AI-powered features.
                </p>
                 <div className="mt-4 p-4 bg-blue-50 dark:bg-gray-700/50 rounded-lg border-l-4 border-brand-blue">
                    <h4 className="font-semibold text-gray-800 dark:text-white">What is Azuracast?</h4>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        Azuracast is a popular, free, and open-source web radio management suite. It provides a web interface for managing your station's media, playlists, and live streaming. You can find your API key in your Azuracast admin panel under "My API Keys".
                    </p>
                </div>


                {connectionDetails.status !== 'connected' ? (
                    <div className="max-w-2xl">
                        <div className="mt-6 mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg flex justify-between items-center">
                            <h3 className="text-lg font-medium">Connection Status:</h3>
                            {getStatusIndicator()}
                        </div>
                        <form onSubmit={handleConnect} className="space-y-6">
                             {connectionDetails.status === 'error' && connectionDetails.errorMessage && (
                                <div className="p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-400 text-red-800 dark:text-red-200" role="alert">
                                    <p className="font-bold">Connection Test Failed</p>
                                    <p className="text-sm">{connectionDetails.errorMessage}</p>
                                </div>
                            )}
                            <div>
                                <label htmlFor="azuracast-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Azuracast URL</label>
                                <input type="text" id="azuracast-url" value={connectionDetails.url} onChange={(e) => setConnectionDetails(prev => ({ ...prev, url: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue bg-white dark:bg-gray-700" placeholder="https://your-radio.azuracast.host" required />
                            </div>
                            <div>
                                <label htmlFor="api-key" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">API Key</label>
                                <input type="password" id="api-key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue bg-white dark:bg-gray-700" placeholder="Enter your Azuracast API Key" required />
                            </div>
                            <div className="pt-5 flex justify-end">
                                <button type="submit" className="px-6 py-2 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none disabled:bg-gray-400 disabled:cursor-not-allowed" disabled={connectionDetails.status === 'connecting'}>
                                    {getButtonText()}
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="mt-8">
                        <div className="mb-6 p-4 bg-green-50 dark:bg-gray-700 rounded-lg flex justify-between items-center border border-green-200 dark:border-green-700">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full text-green-600 dark:text-green-300">{getStatusIndicator()}</div>
                                <div>
                                    <h3 className="text-lg font-medium text-green-800 dark:text-green-200">Connected to Azuracast</h3>
                                    <p className="text-sm text-green-700 dark:text-green-300 truncate">{connectionDetails.url}</p>
                                </div>
                            </div>
                            <button onClick={handleDisconnect} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none">Disconnect</button>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-1 space-y-6">
                                <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                    <h4 className="text-lg font-bold text-gray-800 dark:text-white">Now Playing</h4>
                                    <div className="mt-4 flex flex-col items-center text-center">
                                        <div className="w-32 h-32 bg-gray-200 dark:bg-gray-700 rounded-md shadow-lg overflow-hidden flex items-center justify-center">
                                            <img src="https://i.scdn.co/image/ab67616d0000b273b75563917852a4e591076b6c" alt="Album Art" className="w-full h-full object-cover"/>
                                        </div>
                                        <p className="mt-4 font-bold text-gray-900 dark:text-white">Cybernetic Dreams</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Synthwave Rider</p>
                                    </div>
                                </div>
                                <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-lg flex items-center space-x-4">
                                    <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full text-brand-blue"><UsersIcon /></div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Listeners</p>
                                        <p className="text-2xl font-bold text-gray-800 dark:text-white">1,204 <span className="text-sm font-normal text-gray-500 dark:text-gray-400">(Peak: 1,582)</span></p>
                                    </div>
                                </div>
                            </div>
                            <div className="lg:col-span-2 space-y-6">
                                <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                    <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-3">Stream URLs</h4>
                                    <div className="space-y-3">
                                        {(['/radio/8000/radio.mp3', '/radio/8000/radio.aac', '/radio/8000/radio.ogg'] as const).map(path => {
                                            const url = `${connectionDetails.url.replace(/\/$/, '')}${path}`;
                                            const format = path.split('.').pop()?.toUpperCase();
                                            return (
                                                <div key={path} className="flex items-center space-x-2">
                                                    <span className="font-mono text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-md text-gray-600 dark:text-gray-300">{format}</span>
                                                    <input type="text" readOnly value={url} className="flex-grow px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-sm" />
                                                    <button onClick={() => copyToClipboard(url, 'Stream URL')} className="px-4 py-1.5 text-sm bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Copy</button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                 <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                    <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-3">Library Sync</h4>
                                     <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Sync your Azuracast music library with your AI Music Station content library.</p>
                                     <button onClick={handleSyncLibrary} className="flex items-center px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed" disabled={isSyncing}>
                                        <RefreshIcon />
                                        <span className="ml-2">{isSyncing ? 'Syncing...' : 'Sync Music Library'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AzuracastLink;