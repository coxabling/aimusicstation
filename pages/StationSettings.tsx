import React, { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import InputField from '../components/InputField';
import type { Playlist, Station } from '../types';
import { useToast } from '../contexts/ToastContext';
import ToggleSwitch from '../components/ToggleSwitch';
import * as db from '../services/db';
import { useAuth } from '../contexts/AuthContext';

interface StationSettingsProps {
    station: Station;
    onSave: (station: Station) => void;
}

const StationSettings: React.FC<StationSettingsProps> = ({ station: initialStation, onSave }) => {
    const { addToast } = useToast();
    const { currentUser } = useAuth();
    const [station, setStation] = useState<Station>(initialStation);
    const [playlists, setPlaylists] = useState<Playlist[]>([]);

    useEffect(() => {
        setStation(initialStation);
    }, [initialStation]);

    useEffect(() => {
        if (currentUser) {
            db.getAllPlaylists(currentUser.tenantId).then(setPlaylists);
        }
    }, [currentUser]);

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setStation(prev => ({ ...prev, [name]: value as any }));
    };

    const handleToggle = (name: string, value: boolean) => {
        setStation(prev => ({ ...prev, [name]: value }));
    };

    const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setStation(prev => ({ ...prev, logo: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        try {
            onSave(station);
            addToast('Settings saved successfully!', 'success');
        } catch (error) {
            console.error("Could not save station settings:", error);
            addToast('Failed to save settings.', 'error');
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <div className="max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Station Settings</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <InputField label="Station Name" name="name" type="text" value={station.name} onChange={handleChange} placeholder="e.g., Megadance Radio" />
                    <InputField label="Station Description" name="description" value={station.description} onChange={handleChange} placeholder="Your station's slogan or description" isTextarea />
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Radio Format</label>
                        <fieldset className="mt-2">
                            <legend className="sr-only">Radio Format</legend>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <input
                                        type="radio"
                                        id="music-radio"
                                        name="radioFormat"
                                        value="Music Radio"
                                        checked={station.radioFormat === 'Music Radio'}
                                        onChange={handleChange}
                                        className="sr-only"
                                        aria-labelledby="music-radio-label"
                                        aria-describedby="music-radio-description"
                                    />
                                    <label
                                        htmlFor="music-radio"
                                        id="music-radio-label"
                                        className={`cursor-pointer flex flex-col p-4 border rounded-lg transition-all ${
                                            station.radioFormat === 'Music Radio'
                                                ? 'border-brand-blue ring-2 ring-brand-blue bg-blue-50 dark:bg-gray-700/50'
                                                : 'border-gray-300 dark:border-gray-600 hover:border-brand-blue dark:hover:border-blue-500'
                                        }`}
                                    >
                                        <span className="font-semibold text-gray-800 dark:text-white">Music Radio</span>
                                        <span id="music-radio-description" className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            Prioritizes music with news, ads, and short talk segments.
                                        </span>
                                    </label>
                                </div>
                                <div>
                                    <input
                                        type="radio"
                                        id="talk-radio"
                                        name="radioFormat"
                                        value="Talk Radio"
                                        checked={station.radioFormat === 'Talk Radio'}
                                        onChange={handleChange}
                                        className="sr-only"
                                        aria-labelledby="talk-radio-label"
                                        aria-describedby="talk-radio-description"
                                    />
                                    <label
                                        htmlFor="talk-radio"
                                        id="talk-radio-label"
                                        className={`cursor-pointer flex flex-col p-4 border rounded-lg transition-all ${
                                            station.radioFormat === 'Talk Radio'
                                                ? 'border-brand-blue ring-2 ring-brand-blue bg-blue-50 dark:bg-gray-700/50'
                                                : 'border-gray-300 dark:border-gray-600 hover:border-brand-blue dark:hover:border-blue-500'
                                        }`}
                                    >
                                        <span className="font-semibold text-gray-800 dark:text-white">Talk Radio</span>
                                        <span id="talk-radio-description" className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            Focuses on talk content like articles and news, interspersed with music.
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </fieldset>
                    </div>

                    <div>
                        <label htmlFor="stationVibe" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Station Vibe</label>
                        <select 
                            id="stationVibe"
                            name="vibe"
                            value={station.vibe || 'Default'}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue bg-white dark:bg-gray-700"
                        >
                            <option>Default</option>
                            <option>Upbeat</option>
                            <option>Chill</option>
                            <option>Playful</option>
                            <option>Professional</option>
                        </select>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">The AI announcer will adapt its tone and delivery to this vibe.</p>
                    </div>

                     <ToggleSwitch 
                        label="Enable AI Web Research"
                        enabled={!!station.enableAiWebResearch}
                        onChange={(val) => handleToggle('enableAiWebResearch', val)}
                    />
                    <p className="-mt-4 text-xs text-gray-500 dark:text-gray-400">Allows the AI announcer to search for real-time facts about songs and artists to create more varied announcements.</p>
                    
                     <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">Cloud Broadcasting Settings</h3>
                        <InputField label="Public Stream URL" name="streamUrl" value={station.streamUrl || ''} onChange={handleChange} placeholder="e.g., https://your-stream.com/live" />
                        
                        <div>
                            <label htmlFor="failoverPlaylist" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Failover Playlist</label>
                            <select 
                                id="failoverPlaylist"
                                name="failoverPlaylistId"
                                value={station.failoverPlaylistId || ''}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue bg-white dark:bg-gray-700"
                            >
                                <option value="">-- No Failover --</option>
                                {playlists.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">This playlist will automatically play if the main schedule ends or a live DJ disconnects, preventing dead air.</p>
                        </div>
                    </div>


                    <div>
                        <label htmlFor="timeZone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time Zone</label>
                        <select 
                            id="timeZone"
                            name="timeZone"
                            value={station.timeZone}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue bg-white dark:bg-gray-700"
                        >
                            <option>(UTC-12:00) International Date Line West</option>
                            <option>(UTC-05:00) Eastern Time (US & Canada)</option>
                            <option>(UTC) Coordinated Universal Time</option>
                            <option>(UTC+08:00) Beijing, Perth, Singapore, Hong Kong</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Station Logo (200x200 recommended)</label>
                        <div className="mt-1 flex items-center">
                            <span className="inline-block h-16 w-16 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600">
                                {station.logo ? (
                                    <img src={station.logo} alt="Station Logo" className="h-full w-full object-cover" />
                                ) : (
                                    <svg className="h-full w-full text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                )}
                            </span>
                            <label htmlFor="logo-upload" className="ml-5 cursor-pointer bg-white dark:bg-gray-700 py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none">
                                Change
                            </label>
                            <input id="logo-upload" name="logo-upload" type="file" className="sr-only" onChange={handleLogoChange} accept="image/*" />
                        </div>
                    </div>

                    <div className="pt-5">
                        <div className="flex justify-end">
                            <button type="submit" className="px-4 py-2 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue">
                                Save Settings
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default StationSettings;