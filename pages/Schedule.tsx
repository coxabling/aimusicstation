import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { Station, ContentItem, CalendarEvent, Playlist, SavedSchedule, AudioContent, MusicContent, Campaign, Clockwheel } from '../types';
import { usePlayer } from '../contexts/PlayerContext';
import { useContent } from '../contexts/ContentContext';
import { MusicIcon, RadioIcon, DragHandleIcon, TrashIcon, DocumentTextIcon, PlaylistAddIcon, ChevronLeftIcon, ChevronRightIcon, SaveIcon, FolderOpenIcon, SparklesIcon, RefreshIcon, VoiceIcon } from '../components/icons';
import { isPlayableContent } from '../types';
import Modal from '../components/Modal';
import InputField from '../components/InputField';
import * as db from '../services/db';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import ToggleSwitch from '../components/ToggleSwitch';

const parseDurationToSeconds = (durationStr: string): number => {
    if (!durationStr || typeof durationStr !== 'string' || !durationStr.includes(':')) return 0;
    const parts = durationStr.split(':').map(Number).filter(n => !isNaN(n));
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 1) return parts[0];
    return 0;
};

const processQueueToEvents = (queue: ContentItem[], startIndex: number): CalendarEvent[] => {
    const events: CalendarEvent[] = [];
    if (queue.length === 0) return events;

    let currentTime = new Date();
    
    queue.forEach((item, index) => {
        const durationSeconds = parseDurationToSeconds(item.duration);
        if (durationSeconds > 0) {
            const startTime = new Date(currentTime.getTime());
            const endTime = new Date(startTime.getTime() + durationSeconds * 1000);
            
            if (index >= startIndex) {
                 events.push({ id: item.id, title: item.title, start: startTime, end: endTime, type: item.type });
            }
           
            currentTime = endTime;
        }
    });
    return events;
};

const getEventColor = (type: ContentItem['type']) => {
    const colors: Record<ContentItem['type'], string> = {
        'Music': 'bg-blue-500 border-blue-700',
        'Article': 'bg-green-500 border-green-700',
        'Ad': 'bg-yellow-500 border-yellow-700',
        'Custom Audio': 'bg-indigo-500 border-indigo-700',
        'RSS Feed': 'bg-purple-500 border-purple-500',
    };
    return colors[type] || 'bg-gray-500 border-gray-700';
}

const CalendarView: React.FC<{ events: CalendarEvent[] }> = ({ events }) => {
    const [view, setView] = useState<'month' | 'week'>('month');
    const [currentDate, setCurrentDate] = useState(new Date());

    const changeDate = (amount: number) => {
        const newDate = new Date(currentDate);
        if (view === 'month') newDate.setMonth(newDate.getMonth() + amount);
        else newDate.setDate(newDate.getDate() + (amount * 7));
        setCurrentDate(newDate);
    };

    const calendarGrid = useMemo(() => {
        const today = new Date();
        const start = view === 'month' ? new Date(currentDate.getFullYear(), currentDate.getMonth(), 1) : new Date(currentDate);
        if (view === 'week') start.setDate(start.getDate() - start.getDay());

        const days = [];
        const endDate = view === 'month' ? new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0) : new Date(start);
        if (view === 'week') endDate.setDate(endDate.getDate() + 6);

        let day = new Date(start);
        if (view === 'month') {
            day.setDate(day.getDate() - day.getDay());
            endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
        }

        while (day <= endDate) {
            const dateStr = day.toISOString().split('T')[0];
            const dayEvents = events.filter(e => e.start.toISOString().split('T')[0] === dateStr);
            days.push({
                date: new Date(day),
                isCurrentMonth: view === 'month' ? day.getMonth() === currentDate.getMonth() : true,
                isToday: day.toDateString() === today.toDateString(),
                events: dayEvents.sort((a,b) => a.start.getTime() - b.start.getTime()),
            });
            day.setDate(day.getDate() + 1);
        }
        return days;
    }, [currentDate, view, events]);
    
    return (
        <div className="flex flex-col h-full">
            <header className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-2">
                    <button onClick={() => changeDate(-1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronLeftIcon /></button>
                    <h3 className="text-xl font-semibold w-48 text-center">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                    <button onClick={() => changeDate(1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronRightIcon /></button>
                </div>
                <div className="flex items-center space-x-1 p-1 bg-gray-200 dark:bg-gray-700 rounded-lg">
                    <button onClick={() => setView('month')} className={`px-3 py-1 text-sm rounded-md ${view === 'month' ? 'bg-white dark:bg-gray-800 shadow' : ''}`}>Month</button>
                    <button onClick={() => setView('week')} className={`px-3 py-1 text-sm rounded-md ${view === 'week' ? 'bg-white dark:bg-gray-800 shadow' : ''}`}>Week</button>
                </div>
            </header>
            <div className="grid grid-cols-7 text-center font-semibold text-xs text-gray-500 dark:text-gray-400 border-b dark:border-gray-600 pb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 flex-grow min-h-[60vh]">
                {calendarGrid.map(({ date, isCurrentMonth, isToday, events }) => (
                    <div key={date.toString()} className={`border-r border-b dark:border-gray-700 p-1.5 flex flex-col ${isCurrentMonth ? '' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
                        <span className={`text-xs font-semibold self-start px-1.5 py-0.5 rounded-full ${isToday ? 'bg-brand-blue text-white' : ''}`}>{date.getDate()}</span>
                        <div className="mt-1 space-y-1 overflow-y-auto">
                            {events.map(event => (
                                <div key={event.id} title={`${event.title} (${event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`} className={`p-1 text-white text-xs rounded border-l-4 ${getEventColor(event.type)}`}>
                                    <p className="font-bold truncate">{event.title}</p>
                                    <p className="opacity-80">{event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {event.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const Schedule: React.FC = () => {
    const { 
        loadSchedule, playoutQueue, currentQueueIndex, isPreviewing,
        reorderQueue, removeFromQueue, currentItem, addToQueue,
        generateScheduleAndAnnouncements, isGeneratingAnnouncements, announcementGenerationProgress,
        isAiProgramDirectorActive, setIsAiProgramDirectorActive
    } = usePlayer();
    const { contentItems, audioContentItems } = useContent();
    const { addToast } = useToast();
    const { stationSettings, currentUser } = useAuth();
    
    // Playout control state
    const [generationMode, setGenerationMode] = useState<'aiFormat' | 'showDesigner'>('aiFormat');
    const [stationFormat, setStationFormat] = useState<Station['radioFormat']>(stationSettings.radioFormat);
    const [clockwheels, setClockwheels] = useState<Clockwheel[]>([]);
    const [selectedClockwheelId, setSelectedClockwheelId] = useState<string>('');
    const [scheduleLengthHours, setScheduleLengthHours] = useState(2);
    
    // Modal & data state
    const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
    const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
    const [savedSchedules, setSavedSchedules] = useState<SavedSchedule[]>([]);
    const [newScheduleName, setNewScheduleName] = useState(`Schedule - ${new Date().toLocaleDateString()}`);
    const [view, setView] = useState<'list' | 'calendar'>('list');
    const [scheduleEvents, setScheduleEvents] = useState<CalendarEvent[]>([]);

     useEffect(() => {
        const loadData = async () => {
            if (!currentUser) return;
            const [loadedPlaylists, loadedCampaigns, loadedClockwheels] = await Promise.all([
                db.getAllPlaylists(currentUser.tenantId),
                db.getAllCampaigns(currentUser.tenantId),
                db.getAllClockwheels(currentUser.tenantId)
            ]);
            setPlaylists(loadedPlaylists);
            setCampaigns(loadedCampaigns);
            setClockwheels(loadedClockwheels);
            if (loadedClockwheels.length > 0 && !selectedClockwheelId) {
                setSelectedClockwheelId(loadedClockwheels[0].id);
            }
        };
        loadData();
    }, [currentUser, selectedClockwheelId]);

    useEffect(() => {
        const startIndex = isPreviewing || currentQueueIndex < 0 ? 0 : currentQueueIndex;
        const events = processQueueToEvents(playoutQueue, startIndex);
        setScheduleEvents(events);
    }, [playoutQueue, currentQueueIndex, isPreviewing]);

    const allContentById = useMemo(() => {
        const map = new Map<string, ContentItem | AudioContent>();
        contentItems.forEach(item => map.set(item.id, item));
        audioContentItems.forEach(item => map.set(item.id, item));
        return map;
    }, [contentItems, audioContentItems]);

    const handleGoLive = async () => {
        const allContent = [...contentItems, ...audioContentItems.map(audio => {
            if (audio.type === 'Music') {
                 return {
                    id: audio.id, tenantId: audio.tenantId, title: audio.filename, type: 'Music', artist: audio.artist || '', 
                    duration: audio.duration, date: audio.dateTime, url: audio.url,
                    useAiAnnouncer: audio.announceTrack, announcerVoice: audio.announcementVoice,
                    announcementWithBackgroundMusic: audio.announcementWithBackgroundMusic
                } as MusicContent;
            }
            return {
                id: audio.id, tenantId: audio.tenantId, title: audio.filename, type: 'Custom Audio', artist: audio.artist || 'Station Audio',
                duration: audio.duration, date: audio.dateTime, url: audio.url
            } as ContentItem;
        })];
        
        if (generationMode === 'showDesigner') {
            const selectedWheel = clockwheels.find(cw => cw.id === selectedClockwheelId);
            if (!selectedWheel) {
                addToast('Please create and select a show design first.', 'error');
                return;
            }
            await generateScheduleAndAnnouncements(allContent, campaigns, stationFormat, scheduleLengthHours, selectedWheel);
        } else {
            await generateScheduleAndAnnouncements(allContent, campaigns, stationFormat, scheduleLengthHours);
        }
    };

    const handleRestartBroadcast = () => {
        if (playoutQueue.length === 0) return;
        if (window.confirm("Are you sure you want to stop the broadcast and clear the entire schedule? This action cannot be undone.")) {
            loadSchedule([]);
            addToast('Broadcast stopped and schedule cleared.', 'info');
        }
    };

    const handleDragStart = (index: number) => setDraggedItemIndex(index);

    const handleDrop = (targetIndex: number) => {
        if (draggedItemIndex === null || draggedItemIndex === targetIndex) { setDraggedItemIndex(null); return; }
        const startIndex = (currentQueueIndex >= 0 ? currentQueueIndex + 1 : 0) + draggedItemIndex;
        const endIndex = (currentQueueIndex >= 0 ? currentQueueIndex + 1 : 0) + targetIndex;
        reorderQueue(startIndex, endIndex);
        setDraggedItemIndex(null);
    };

    const handleRemove = (index: number) => {
        const fullQueueIndex = (currentQueueIndex >= 0 ? currentQueueIndex + 1 : 0) + index;
        removeFromQueue(fullQueueIndex);
    };
    
    const handleAddPlaylistToQueue = (playlist: Playlist) => {
        if (!currentUser) return;
        const playlistContent = playlist.trackIds
            .map(id => allContentById.get(id))
            .filter((item): item is ContentItem | AudioContent => !!item);
    
        const tracksToAdd: ContentItem[] = playlistContent.map((track, index) => {
            let contentItem: ContentItem;
    
            if ('published' in track) { // Distinguishing property for AudioContent
                const audio = track as AudioContent;
                if (audio.type === 'Music') {
                    contentItem = {
                        id: audio.id, tenantId: currentUser.tenantId, title: audio.filename, type: 'Music', artist: audio.artist || '',
                        duration: audio.duration, date: audio.dateTime, url: audio.url,
                        useAiAnnouncer: audio.announceTrack, 
                        announcerVoice: audio.announcementVoice,
                        announcementWithBackgroundMusic: audio.announcementWithBackgroundMusic,
                    };
                } else if (audio.type === 'Jingle') {
                    contentItem = {
                        id: audio.id, tenantId: currentUser.tenantId, title: audio.filename, type: 'Custom Audio', artist: audio.artist || 'Jingle',
                        duration: audio.duration, date: audio.dateTime, url: audio.url,
                    };
                } else { // Ad
                    contentItem = {
                        id: audio.id, tenantId: currentUser.tenantId, title: audio.filename, type: 'Ad',
                        duration: audio.duration, date: audio.dateTime, url: audio.url,
                    };
                }
            } else {
                contentItem = track as ContentItem;
            }
    
            return {
                ...contentItem,
                id: `${track.id}-${playlist.id}-${Date.now()}-${index}`,
                originalId: track.id,
            };
        });
    
        addToQueue(tracksToAdd);
        setIsPlaylistModalOpen(false);
    };
    
    const handleOpenSaveModal = () => {
        if (playoutQueue.length > 0) {
            setIsSaveModalOpen(true);
        }
    };

    const handleSaveSchedule = async () => {
        if (!currentUser) return;
        if (!newScheduleName.trim()) {
            addToast('Please enter a name for the schedule.', 'error');
            return;
        }
        const scheduleToSave: SavedSchedule = {
            id: new Date().toISOString(),
            tenantId: currentUser.tenantId,
            name: newScheduleName,
            date: new Date().toISOString(),
            trackIds: playoutQueue.map(item => item.originalId || item.id),
        };
        await db.saveSchedule(scheduleToSave);
        addToast(`Schedule "${newScheduleName}" saved.`, 'success');
        setIsSaveModalOpen(false);
        setNewScheduleName(`Schedule - ${new Date().toLocaleDateString()}`);
    };

    const handleOpenLoadModal = async () => {
        if (!currentUser) return;
        const schedules = await db.getAllSavedSchedules(currentUser.tenantId);
        setSavedSchedules(schedules.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setIsLoadModalOpen(true);
    };

    const handleLoadSchedule = (schedule: SavedSchedule) => {
        const newQueue: ContentItem[] = schedule.trackIds.map((originalId, index) => {
            const originalItem = allContentById.get(originalId);
            if (originalItem) {
                return { ...originalItem, id: `${originalId}-loaded-${Date.now()}-${index}`, originalId } as ContentItem;
            }
            return null;
        }).filter((item): item is NonNullable<typeof item> => item !== null);

        if (newQueue.length > 0) {
            loadSchedule(newQueue);
            addToast(`Loaded schedule "${schedule.name}".`, 'success');
            setIsLoadModalOpen(false);
        } else {
            addToast(`Could not load schedule. Content may be missing.`, 'error');
        }
    };
    
    const handleDeleteSchedule = async (id: string) => {
        if (!currentUser) return;
        if (window.confirm('Are you sure you want to delete this saved schedule?')) {
            await db.deleteSchedule(id, currentUser.tenantId);
            setSavedSchedules(prev => prev.filter(s => s.id !== id));
            addToast('Schedule deleted.', 'info');
        }
    };

    const nowPlayingItem = useMemo(() => !isPreviewing && currentQueueIndex >= 0 ? currentItem : null, [currentItem, currentQueueIndex, isPreviewing]);
    const upNextItems = useMemo(() => {
        if (!isPreviewing && currentQueueIndex >= 0) return playoutQueue.slice(currentQueueIndex + 1);
        if (playoutQueue.length > 0 && currentQueueIndex < 0) return playoutQueue;
        return [];
    }, [playoutQueue, currentQueueIndex, isPreviewing]);

    const getSecondaryInfo = (item: ContentItem) => {
        switch(item.type) { case 'Music': case 'Custom Audio': return item.artist; case 'RSS Feed': return item.source; default: return item.type; }
    };

    return (
        <>
        <Modal isOpen={isPlaylistModalOpen} onClose={() => setIsPlaylistModalOpen(false)} title="Add Playlist to Schedule">
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                 {playlists.length > 0 ? playlists.map(playlist => (
                    <div key={playlist.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div>
                            <p className="font-semibold text-gray-800 dark:text-white">{playlist.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{playlist.trackIds.length} tracks</p>
                        </div>
                        <button onClick={() => handleAddPlaylistToQueue(playlist)} className="px-4 py-1.5 bg-brand-blue text-white text-sm font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none">Add</button>
                    </div>
                )) : (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-4">You haven't created any playlists yet.</p>
                )}
            </div>
        </Modal>
        <Modal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} title="Save Schedule">
            <form onSubmit={(e) => { e.preventDefault(); handleSaveSchedule(); }} className="space-y-4">
                <InputField 
                    label="Schedule Name"
                    name="scheduleName"
                    value={newScheduleName}
                    onChange={(e) => setNewScheduleName(e.target.value)}
                    placeholder="Enter a name for your schedule"
                />
                <div className="flex justify-end pt-4 space-x-2">
                    <button type="button" onClick={() => setIsSaveModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 font-semibold rounded-lg shadow-md hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none">Save</button>
                </div>
            </form>
        </Modal>
        <Modal isOpen={isLoadModalOpen} onClose={() => setIsLoadModalOpen(false)} title="Load Schedule">
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {savedSchedules.length > 0 ? savedSchedules.map(schedule => (
                     <div key={schedule.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div>
                            <p className="font-semibold text-gray-800 dark:text-white">{schedule.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Saved on {new Date(schedule.date).toLocaleDateString()} - {schedule.trackIds.length} items
                            </p>
                        </div>
                        <div className="flex items-center space-x-2">
                             <button onClick={() => handleDeleteSchedule(schedule.id)} className="p-2 text-red-500 hover:text-red-700" title="Delete"><TrashIcon /></button>
                             <button onClick={() => handleLoadSchedule(schedule)} className="px-4 py-1.5 bg-brand-blue text-white text-sm font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none">Load</button>
                        </div>
                    </div>
                )) : <p className="text-center text-gray-500 dark:text-gray-400">No saved schedules found.</p>}
            </div>
        </Modal>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 h-fit">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Playout Controls</h2>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="generationMode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Generation Mode</label>
                        <select id="generationMode" name="generationMode" value={generationMode} onChange={(e) => setGenerationMode(e.target.value as any)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue bg-white dark:bg-gray-700">
                            <option value="aiFormat">AI Format</option>
                            <option value="showDesigner">Show Designer</option>
                        </select>
                    </div>

                    {generationMode === 'aiFormat' ? (
                        <div>
                            <label htmlFor="stationFormat" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Station Format</label>
                            <select id="stationFormat" name="stationFormat" value={stationFormat} onChange={(e) => setStationFormat(e.target.value as Station['radioFormat'])} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue bg-white dark:bg-gray-700">
                                <option>Music Radio</option><option>Talk Radio</option>
                            </select>
                        </div>
                    ) : (
                        <div>
                            <label htmlFor="clockwheelSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Show Design (Clockwheel)</label>
                            <select id="clockwheelSelect" value={selectedClockwheelId} onChange={e => setSelectedClockwheelId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue bg-white dark:bg-gray-700" disabled={clockwheels.length === 0}>
                                {clockwheels.length > 0 ? (
                                    clockwheels.map(cw => <option key={cw.id} value={cw.id}>{cw.name}</option>)
                                ) : (
                                    <option disabled>No show designs created yet</option>
                                )}
                            </select>
                        </div>
                    )}
                    <div>
                        <label htmlFor="scheduleLength" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Schedule Length (Hours)</label>
                         <input type="number" id="scheduleLength" value={scheduleLengthHours} onChange={e => setScheduleLengthHours(Math.max(1, Number(e.target.value)))} min="1" max="24" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue bg-white dark:bg-gray-700" />
                    </div>
                </div>

                <div className="mt-6 space-y-3">
                    <div className="p-3 border dark:border-gray-600 rounded-lg">
                        <ToggleSwitch
                            label="AI Program Director Mode"
                            enabled={isAiProgramDirectorActive}
                            onChange={setIsAiProgramDirectorActive}
                        />
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">When active, the AI will dynamically adjust the queue based on listener 'likes' from the public widget.</p>
                    </div>
                    {isGeneratingAnnouncements ? (
                        <div className="bg-purple-100 dark:bg-purple-900/50 p-4 rounded-lg text-center">
                            <p className="font-semibold text-purple-700 dark:text-purple-300">Generating AI Announcements...</p>
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5 mt-2">
                                <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: `${announcementGenerationProgress}%` }}></div>
                            </div>
                            <p className="text-xs mt-1 text-purple-600 dark:text-purple-400">{Math.round(announcementGenerationProgress)}% Complete</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                             <button onClick={handleRestartBroadcast} disabled={playoutQueue.length === 0 || isPreviewing} className="w-full px-4 py-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none flex items-center justify-center space-x-2 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed">
                                <RefreshIcon />
                                <span>Clear & Stop</span>
                            </button>
                            <button onClick={handleGoLive} className="w-full px-4 py-3 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none flex items-center justify-center space-x-2">
                                <RadioIcon />
                                <span>Go Live</span>
                            </button>
                        </div>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center -mt-2">"Go Live" pre-generates AI announcements for the queue (1 credit each).</p>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={handleOpenSaveModal} disabled={playoutQueue.length === 0 || isPreviewing || isGeneratingAnnouncements} className="w-full px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700 focus:outline-none flex items-center justify-center space-x-2 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"><SaveIcon /><span>Save</span></button>
                        <button onClick={handleOpenLoadModal} disabled={isPreviewing || isGeneratingAnnouncements} className="w-full px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700 focus:outline-none flex items-center justify-center space-x-2 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"><FolderOpenIcon /><span>Load</span></button>
                    </div>
                    <button onClick={() => setIsPlaylistModalOpen(true)} className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none flex items-center justify-center space-x-2" disabled={isPreviewing || isGeneratingAnnouncements}><PlaylistAddIcon /><span>Add Playlist to Queue</span></button>
                </div>
            </div>

            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Live Playout Schedule</h2>
                    <div className="flex items-center space-x-1 p-1 bg-gray-200 dark:bg-gray-700 rounded-lg">
                        <button onClick={() => setView('list')} className={`px-3 py-1 text-sm rounded-md ${view === 'list' ? 'bg-white dark:bg-gray-800 shadow' : ''}`}>List</button>
                        <button onClick={() => setView('calendar')} className={`px-3 py-1 text-sm rounded-md ${view === 'calendar' ? 'bg-white dark:bg-gray-800 shadow' : ''}`}>Calendar</button>
                    </div>
                </div>

                {view === 'list' ? (
                    <div className="space-y-6">
                        {/* Now Playing */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">Now Playing</h3>
                            {nowPlayingItem ? (
                                <div className="bg-blue-50 dark:bg-gray-700/50 rounded-lg p-4 flex items-center space-x-4 border-l-4 border-brand-blue">
                                    <div className="text-brand-blue">{isPlayableContent(nowPlayingItem) ? <MusicIcon /> : <DocumentTextIcon />}</div>
                                    <div className="flex-grow">
                                        <p className="font-bold text-gray-800 dark:text-white">{nowPlayingItem.title}</p>
                                        <div className="flex items-center space-x-2">
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{getSecondaryInfo(nowPlayingItem)}</p>
                                            {nowPlayingItem.useAiAnnouncer && (
                                                <div title="AI Announcer Enabled">
                                                    <VoiceIcon className="h-4 w-4 text-purple-500" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-sm font-mono text-gray-500 dark:text-gray-400">{nowPlayingItem.duration}</span>
                                </div>
                            ) : (
                                <div className="text-center text-gray-500 dark:text-gray-400 py-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                                    <p>Station is Offline</p>
                                    <p className="text-xs">Click "Go Live" to start the broadcast.</p>
                                </div>
                            )}
                        </div>

                        {/* Up Next */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">Up Next ({upNextItems.length})</h3>
                            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                                {upNextItems.length > 0 ? upNextItems.map((item, index) => (
                                    <div 
                                        key={item.id}
                                        draggable
                                        onDragStart={() => handleDragStart(index)}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={() => handleDrop(index)}
                                        className={`bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 flex items-center justify-between transition-opacity ${draggedItemIndex === index ? 'opacity-30' : ''}`}
                                    >
                                        <div className="flex items-center space-x-3 truncate">
                                            <DragHandleIcon />
                                            <div className="flex-shrink-0 text-gray-500">{isPlayableContent(item) ? <MusicIcon /> : <DocumentTextIcon />}</div>
                                            <div className="truncate">
                                                <p className="font-medium text-gray-700 dark:text-gray-200 truncate">{item.title}</p>
                                                <div className="flex items-center space-x-2">
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{getSecondaryInfo(item)}</p>
                                                    {item.useAiAnnouncer && (
                                                        <div title="AI Announcer Enabled">
                                                            <VoiceIcon className="h-4 w-4 text-purple-500" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-4 flex-shrink-0 ml-4">
                                            <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{item.duration}</span>
                                            <button onClick={() => handleRemove(index)} className="text-red-500 hover:text-red-700" title="Remove from queue"><TrashIcon /></button>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center text-gray-500 dark:text-gray-400 py-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                                        <p>Schedule is empty.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <CalendarView events={scheduleEvents} />
                )}
            </div>
        </div>
        </>
    );
};
export default Schedule;
