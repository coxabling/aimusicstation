
import React, { useState, useEffect } from 'react';
import { RadioIcon, SparklesIcon, MusicIcon, DocumentTextIcon, ScheduleIcon, PlaylistIcon, DollarSignIcon } from '../components/icons';
import StatCard from '../components/StatCard';
import { vaultContent, VaultContentItem, mapVaultItemToAudioContent } from '../services/vaultContent';
import * as db from '../services/db';
import { generateWithRetry } from '../services/ai';
import { useToast } from '../contexts/ToastContext';
import { AudioContent, isPlayableContent, Playlist } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import { useContent } from '../contexts/ContentContext';

const Dashboard: React.FC = () => {
    const { stationSettings, saveStationSettings, currentUser } = useAuth();
    const { addToast } = useToast();
    const { currentItem, playoutQueue, currentQueueIndex, isPreviewing } = usePlayer();
    const { contentItems, audioContentItems } = useContent();

    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(true);

    const handleVibeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (currentUser?.role !== 'Admin') return;
        const newVibe = e.target.value;
        saveStationSettings({ ...stationSettings, vibe: newVibe as any });
    };

    // Recommendations Logic
    const [recommendations, setRecommendations] = useState<VaultContentItem[]>([]);
    const [isLoadingRecs, setIsLoadingRecs] = useState(true);
    
    // Clock Logic
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timerId = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timerId);
    }, []);
    
    useEffect(() => {
        const fetchPlaylists = async () => {
            if (currentUser) {
                setIsLoadingPlaylists(true);
                const loadedPlaylists = await db.getAllPlaylists(currentUser.tenantId);
                setPlaylists(loadedPlaylists);
                setIsLoadingPlaylists(false);
            }
        };
        fetchPlaylists();
    }, [currentUser]);


    useEffect(() => {
        const getRecommendations = async () => {
            if (!currentUser) return;
            setIsLoadingRecs(true);
            try {
                const userAudioContent = await db.getAllAudioContent(currentUser.tenantId);
                const userMusic = userAudioContent.filter(item => item.type === 'Music' && item.genre);

                if (userMusic.length < 3) {
                    setRecommendations(vaultContent.filter(vc => vc.category === 'Music Beds').slice(0, 3));
                    return;
                }

                const genreCounts: Record<string, number> = {};
                userMusic.forEach(track => {
                    if (track.genre) {
                         genreCounts[track.genre] = (genreCounts[track.genre] || 0) + 1;
                    }
                });
                const topGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);

                const availableVaultItems = vaultContent.filter(vc => vc.category === 'Music Beds');

                const prompt = `A user likes these music genres: ${topGenres.join(', ')}. From the following list of available tracks, which 3 would you recommend? Return ONLY a JSON array of the recommended track IDs (e.g., ["vc_music_01", "vc_music_02", "vc_music_03"]). Do not include any other text, explanations, or markdown. Available tracks: ${JSON.stringify(availableVaultItems.map(i => ({id: i.id, filename: i.filename, genre: i.genre})))}`;

                const response = await generateWithRetry({ model: 'gemini-2.5-flash', contents: prompt });
                const responseText = response.text.replace(/```json|```/g, '').trim();
                
                let recommendedIds: string[] = [];
                try {
                    recommendedIds = JSON.parse(responseText);
                } catch(e) {
                    console.error("AI recommendation response was not valid JSON:", responseText);
                    const topGenreSet = new Set(topGenres);
                    recommendedIds = availableVaultItems
                        .filter(item => item.genre && topGenreSet.has(item.genre))
                        .slice(0, 3)
                        .map(item => item.id);
                }

                const recs = recommendedIds.map(id => availableVaultItems.find(item => item.id === id)).filter((i): i is VaultContentItem => !!i);
                setRecommendations(recs);

            } catch (error) {
                console.error("Failed to get AI recommendations:", error);
                setRecommendations(vaultContent.filter(vc => vc.category === 'Music Beds').slice(0, 3));
            } finally {
                setIsLoadingRecs(false);
            }
        };

        getRecommendations();
    }, [currentUser]);

    const handleImport = async (item: VaultContentItem) => {
        if (!currentUser) return;
        const newAudioContentData = mapVaultItemToAudioContent(item);
        const newItem: AudioContent = { 
            id: `imported-${item.id}-${Date.now()}`,
            tenantId: currentUser.tenantId,
            ...newAudioContentData 
        };
        await db.saveAudioContent(newItem);
        addToast(`"${item.filename}" added to your Audio Content!`, 'success');
    };
    
    const nowPlayingItem = !isPreviewing && currentQueueIndex >= 0 ? currentItem : null;
    const upNextItem = !isPreviewing && currentQueueIndex >= 0 ? playoutQueue[currentQueueIndex + 1] : null;

    const getSecondaryInfo = (item: any) => {
       switch(item.type) { case 'Music': case 'Custom Audio': return item.artist; case 'RSS Feed': return item.source; default: return item.type; }
    };
    
    const totalContentCount = contentItems.length + audioContentItems.length;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Station Status" 
          value={nowPlayingItem ? 'On Air' : 'Offline'}
          icon={<RadioIcon />} 
          statusColor={nowPlayingItem ? "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}
        />
        <StatCard 
          title="Total Content" 
          value={totalContentCount.toLocaleString()} 
          icon={<MusicIcon />} 
        />
        <StatCard 
          title="Playlists" 
          value={isLoadingPlaylists ? '...' : playlists.length.toLocaleString()} 
          icon={<PlaylistIcon />} 
        />
        <StatCard 
          title="AI Credits" 
          value={currentUser?.credits.toLocaleString() ?? '0'} 
          icon={<DollarSignIcon />} 
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-4">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Live Playout Status</h3>
            {nowPlayingItem ? (
                <>
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Now Playing</p>
                         <div className="bg-blue-50 dark:bg-gray-700/50 rounded-lg p-3 flex items-center space-x-4 border-l-4 border-brand-blue">
                            <div className="text-brand-blue">{isPlayableContent(nowPlayingItem) ? <MusicIcon /> : <DocumentTextIcon />}</div>
                            <div className="flex-grow">
                                <p className="font-bold text-gray-800 dark:text-white">{nowPlayingItem.title}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{getSecondaryInfo(nowPlayingItem)}</p>
                            </div>
                            <span className="text-sm font-mono text-gray-500 dark:text-gray-400">{nowPlayingItem.duration}</span>
                        </div>
                    </div>
                     <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Up Next</p>
                         {upNextItem ? (
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 flex items-center space-x-4">
                                <div className="text-gray-500">{isPlayableContent(upNextItem) ? <MusicIcon /> : <DocumentTextIcon />}</div>
                                <div className="flex-grow">
                                    <p className="font-medium text-gray-700 dark:text-gray-200">{upNextItem.title}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{getSecondaryInfo(upNextItem)}</p>
                                </div>
                                <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{upNextItem.duration}</span>
                            </div>
                         ) : <p className="text-sm text-gray-500 dark:text-gray-400">End of queue.</p>}
                    </div>
                </>
            ) : (
                <div className="text-center py-10 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                    <p className="font-semibold text-gray-700 dark:text-gray-300">Station is Offline</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Go to the Schedule page to start your broadcast.</p>
                     <button onClick={() => { (document.querySelector('a[data-page="schedule"]') as HTMLElement)?.click(); }} className="mt-4 px-4 py-2 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none flex items-center justify-center space-x-2 mx-auto">
                        <ScheduleIcon />
                        <span>Go to Schedule</span>
                    </button>
                </div>
            )}
        </div>
         <div className="md:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Station Vibe</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {currentUser?.role === 'Admin'
                    ? "Set the mood for your AI DJ. This will change the tone of generated announcements in real-time."
                    : "The current station mood set by an admin. This affects the tone of AI announcements."
                }
            </p>
            <select 
                value={stationSettings.vibe || 'Default'} 
                onChange={handleVibeChange} 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue bg-white dark:bg-gray-700 disabled:bg-gray-100 dark:disabled:bg-gray-700/50 disabled:cursor-not-allowed"
                disabled={currentUser?.role !== 'Admin'}
            >
                <option>Default</option>
                <option>Upbeat</option>
                <option>Chill</option>
                <option>Playful</option>
                <option>Professional</option>
            </select>
            <div className="mt-6">
                 <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Clock</h3>
                 <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 flex flex-col items-center justify-center">
                    <p className="text-3xl font-bold text-gray-800 dark:text-white">
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                     <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                        {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                </div>
            </div>
        </div>
    </div>


      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center text-gray-800 dark:text-white">
            <SparklesIcon className="h-5 w-5 mr-2 text-purple-500" />
            AI Recommendations from the Vault
        </h3>
        {isLoadingRecs ? (
            <p className="text-gray-500 dark:text-gray-400">Analyzing your library to find recommendations...</p>
        ) : recommendations.length > 0 ? (
            <div className="space-y-3">
                {recommendations.map(item => (
                    <div key={item.id} className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg flex justify-between items-center">
                        <div>
                            <p className="font-semibold text-gray-800 dark:text-white">{item.filename}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{item.genre}</p>
                        </div>
                        <button onClick={() => handleImport(item)} className="px-3 py-1 text-sm bg-brand-blue text-white rounded-md hover:bg-blue-700">Add to Library</button>
                    </div>
                ))}
            </div>
        ) : (
            <p className="text-gray-500 dark:text-gray-400">Not enough data to generate recommendations.</p>
        )}
    </div>

    </div>
  );
};

export default Dashboard;
