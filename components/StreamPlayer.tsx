

import React, { useMemo } from 'react';
import {
    PlayIcon, PauseIcon, VolumeUpIcon, VolumeOffIcon, MusicIcon, ArrowLeftIcon,
    RadioIcon, DocumentTextIcon, ChevronUpIcon, ChevronDownIcon, TrashIcon, XIcon, ShuffleIcon, SkipBackIcon, SkipForwardIcon
} from './icons';
import { usePlayer } from '../contexts/PlayerContext';
import { isPlayableContent, ContentItem } from '../types';

interface PlayerProps {
  isVisible: boolean;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  onHide: () => void;
  stationLogo: string | null;
}

const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds) || timeInSeconds < 0) return '0:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const getArtistOrSource = (item: ContentItem) => {
    switch (item.type) {
        case 'Music': case 'Custom Audio': return item.artist;
        case 'RSS Feed': return item.source;
        case 'Relay Stream': return 'External Stream';
        default: return item.type;
    }
};

const ProgressBar: React.FC<{currentTime: number, duration: number, onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void, onMouseDown: () => void, onMouseUp: () => void, disabled: boolean, className?: string}> = 
({currentTime, duration, onSeek, onMouseDown, onMouseUp, disabled, className=""}) => (
    <div className={`w-full flex items-center space-x-2 text-white ${className}`}>
        <span className="text-xs font-mono w-10 text-right">{formatTime(currentTime)}</span>
        <input
            type="range"
            min={0}
            max={duration || 1}
            value={currentTime}
            onChange={onSeek}
            onMouseDown={onMouseDown}
            onMouseUp={onMouseUp}
            className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer transition-all
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3
                       [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md
                       hover:[&::-webkit-slider-thumb]:h-4 hover:[&::-webkit-slider-thumb]:w-4
                       disabled:cursor-not-allowed disabled:opacity-50
                       disabled:[&::-webkit-slider-thumb]:bg-gray-400"
            aria-label="Track progress"
            disabled={disabled}
        />
        <span className="text-xs font-mono w-10">{formatTime(duration)}</span>
    </div>
);


const StreamPlayer: React.FC<PlayerProps> = ({ isVisible, isExpanded, setIsExpanded, onHide, stationLogo }) => {
    const player = usePlayer();
    const { 
        currentItem, playbackState, isPreviewing, currentTime, duration, playoutQueue, currentQueueIndex,
        volume, setVolume, isMuted, setIsMuted,
        seek, beginSeek, endSeek, albumArtUrl
    } = player;

    const isCurrentlyPlayable = currentItem ? isPlayableContent(currentItem) : false;

    const upNextItems = useMemo(() => {
        if (!isPreviewing && currentQueueIndex >= 0) return playoutQueue.slice(currentQueueIndex + 1);
        return [];
    }, [playoutQueue, currentQueueIndex, isPreviewing]);

    const fallbackIcon = useMemo(() => {
        if (stationLogo) {
            return <img src={stationLogo} alt="Station Logo" className="w-full h-full object-cover" />;
        }
        if (currentItem) {
            if (currentItem.type === 'Relay Stream') return <RadioIcon />;
            if (isPlayableContent(currentItem)) return <MusicIcon />;
            return <DocumentTextIcon />;
        }
        return <RadioIcon />;
    }, [stationLogo, currentItem]);

    if (!currentItem) {
        return (
            <div className={`fixed bottom-0 left-0 lg:left-64 z-40 transition-transform duration-500 ease-in-out ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}>
                 <div className="h-24 bg-gray-800 dark:bg-black text-white p-4 flex items-center justify-center border-t border-gray-700 w-screen lg:w-auto">
                    <p className="text-gray-400">Playout is offline. Go to the Schedule page to start.</p>
                </div>
            </div>
        );
    }
    
    return (
        <div className={`transition-all duration-500 ease-in-out fixed z-40
            bottom-0 right-0 left-0 lg:left-64
            ${isExpanded ? 'h-96' : 'h-24'}
            ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}
            bg-gray-900/80 dark:bg-black/80 backdrop-blur-md shadow-2xl border-t border-white/10 text-white flex flex-col`}
        >
            {/* Collapsed View */}
            <div className={`h-24 p-4 flex flex-col justify-center transition-opacity duration-200 ${isExpanded ? 'opacity-0 invisible' : 'opacity-100'}`}>
                <div className="flex items-center w-full">
                    <div className="flex items-center space-x-3 min-w-0 w-1/3">
                        {isPreviewing && <button onClick={player.returnToPlayout} className="p-2 rounded-full text-gray-400 hover:bg-white/10" title="Return to Playout"><ArrowLeftIcon /></button>}
                        <div className="w-12 h-12 bg-white/10 rounded-md flex items-center justify-center flex-shrink-0 text-white overflow-hidden">
                           {albumArtUrl ? (
                                <img src={albumArtUrl} alt={currentItem.title} className="w-full h-full object-cover" />
                            ) : (
                                fallbackIcon
                            )}
                        </div>
                        <div className="truncate"><p className="font-bold text-sm truncate">{currentItem.title}</p><p className="text-xs text-gray-400 truncate">{getArtistOrSource(currentItem)}</p></div>
                    </div>
                    <div className="flex items-center justify-center w-1/3 space-x-2">
                        <button onClick={player.playPrevious} disabled={isPreviewing || currentQueueIndex <= 0} className="p-2 rounded-full text-white hover:bg-white/10 focus:outline-none disabled:text-gray-500 disabled:cursor-not-allowed" aria-label="Previous track">
                            <SkipBackIcon />
                        </button>
                        <button onClick={player.togglePlayPause} className="p-3 rounded-full bg-white text-black hover:scale-105 focus:outline-none transition-transform" aria-label={playbackState === 'playing' ? 'Pause' : 'Play'}>
                            {playbackState === 'playing' ? <PauseIcon /> : <PlayIcon />}
                        </button>
                         <button onClick={player.playNext} disabled={isPreviewing || currentQueueIndex >= playoutQueue.length - 1} className="p-2 rounded-full text-white hover:bg-white/10 focus:outline-none disabled:text-gray-500 disabled:cursor-not-allowed" aria-label="Next track">
                            <SkipForwardIcon />
                        </button>
                    </div>
                    <div className="flex items-center justify-end space-x-2 w-1/3">
                        <button
                            onClick={player.shuffleQueue}
                            disabled={isPreviewing || upNextItems.length < 2}
                            className="p-2 rounded-full text-gray-400 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed hover:bg-white/10"
                            title="Shuffle Queue"
                        >
                            <ShuffleIcon />
                        </button>
                        <button onClick={() => setIsMuted(!isMuted)} className="text-gray-400 hover:text-white" aria-label={isMuted ? 'Unmute' : 'Mute'}>{isMuted || volume === 0 ? <VolumeOffIcon /> : <VolumeUpIcon />}</button>
                        <input type="range" min="0" max="1" step="0.01" value={isMuted ? 0 : volume} onChange={e => { const v = parseFloat(e.target.value); setVolume(v); if (v > 0) setIsMuted(false); }} className="w-24 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer" aria-label="Volume"/>
                        <button onClick={() => setIsExpanded(true)} className="p-2 rounded-full text-gray-400 hover:bg-white/10" title="Expand Player"><ChevronUpIcon /></button>
                        <button onClick={onHide} className="p-2 rounded-full text-gray-400 hover:bg-white/10" title="Hide Player"><XIcon /></button>
                    </div>
                </div>
                <ProgressBar currentTime={currentTime} duration={duration} onSeek={(e) => seek(parseFloat(e.target.value))} onMouseDown={beginSeek} onMouseUp={endSeek} disabled={!isCurrentlyPlayable} className='-mt-2'/>
            </div>

            {/* Expanded View */}
            <div className={`h-full p-6 flex flex-col transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0 invisible'}`}>
                 <div className="flex-1 grid grid-cols-3 gap-8 overflow-hidden">
                    <div className="col-span-1 flex flex-col items-center justify-center text-center">
                         <div className="w-48 h-48 bg-white/10 rounded-lg flex items-center justify-center mb-4 text-white overflow-hidden shadow-lg">
                            {albumArtUrl ? (
                                <img src={albumArtUrl} alt={currentItem.title} className="w-full h-full object-cover" />
                            ) : (
                                fallbackIcon
                            )}
                         </div>
                         <p className="font-bold text-2xl truncate max-w-full">{currentItem.title}</p>
                         <p className="text-lg text-gray-400 truncate max-w-full">{getArtistOrSource(currentItem)}</p>
                    </div>
                    <div className="col-span-2 flex flex-col overflow-hidden">
                         <div className="flex justify-between items-center mb-2">
                             <h3 className="text-lg font-semibold text-gray-300">Up Next</h3>
                             <div className="flex items-center">
                                <button onClick={() => setIsExpanded(false)} className="p-2 rounded-full text-gray-400 hover:bg-white/10" title="Collapse Player"><ChevronDownIcon /></button>
                                <button onClick={onHide} className="p-2 rounded-full text-gray-400 hover:bg-white/10" title="Hide Player"><XIcon /></button>
                             </div>
                         </div>
                         <ul className="flex-1 space-y-2 overflow-y-auto pr-2">
                            {upNextItems.length > 0 ? upNextItems.map((item, index) => (
                                <li key={item.id} className="p-2 flex justify-between items-center bg-white/5 hover:bg-white/10 rounded-md transition-colors">
                                    <div className="truncate"><p className="text-sm font-medium truncate">{item.title}</p><p className="text-xs text-gray-400 truncate">{getArtistOrSource(item)}</p></div>
                                    <div className="flex items-center space-x-3 flex-shrink-0 ml-2">
                                        <span className="text-xs font-mono text-gray-400">{item.duration}</span>
                                        <button onClick={() => player.removeFromQueue(currentQueueIndex + 1 + index)} className="text-gray-500 hover:text-red-500" title="Remove"><TrashIcon /></button>
                                    </div>
                                </li>
                            )) : <p className="text-gray-500 text-sm mt-4 text-center">End of playout queue.</p>}
                         </ul>
                    </div>
                 </div>
                 <div className="pt-4 mt-auto grid grid-cols-3 items-center">
                     <div className="flex items-center justify-start">
                         {isPreviewing && <button onClick={player.returnToPlayout} className="flex items-center space-x-2 text-sm p-2 rounded-lg text-gray-400 hover:bg-white/10" title="Return to Playout"><ArrowLeftIcon /><span>Return to Playout</span></button>}
                     </div>
                     <div className="flex items-center justify-center space-x-4">
                        <button
                            onClick={player.shuffleQueue}
                            disabled={isPreviewing || upNextItems.length < 2}
                            className="p-3 rounded-full text-gray-400 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed hover:bg-white/10"
                            title="Shuffle Queue"
                        >
                            <ShuffleIcon />
                        </button>
                        <button onClick={player.playPrevious} disabled={isPreviewing || currentQueueIndex <= 0} className="p-3 rounded-full text-white hover:bg-white/10 focus:outline-none disabled:text-gray-500 disabled:cursor-not-allowed" aria-label="Previous track">
                            <SkipBackIcon />
                        </button>
                        <button onClick={player.togglePlayPause} className="p-4 rounded-full bg-white text-black hover:scale-105 focus:outline-none transition-transform" aria-label={playbackState === 'playing' ? 'Pause' : 'Play'}>{playbackState === 'playing' ? <PauseIcon /> : <PlayIcon />}</button>
                        <button onClick={player.playNext} disabled={isPreviewing || currentQueueIndex >= playoutQueue.length - 1} className="p-3 rounded-full text-white hover:bg-white/10 focus:outline-none disabled:text-gray-500 disabled:cursor-not-allowed" aria-label="Next track">
                            <SkipForwardIcon />
                        </button>
                     </div>
                     <div className="flex items-center justify-end space-x-3">
                         <button onClick={() => setIsMuted(!isMuted)} className="text-gray-400 hover:text-white" aria-label={isMuted ? 'Unmute' : 'Mute'}>{isMuted || volume === 0 ? <VolumeOffIcon /> : <VolumeUpIcon />}</button>
                         <input type="range" min="0" max="1" step="0.01" value={isMuted ? 0 : volume} onChange={e => { const v = parseFloat(e.target.value); setVolume(v); if(v > 0) setIsMuted(false);}} className="w-24 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer" aria-label="Volume"/>
                     </div>
                 </div>
                 <ProgressBar currentTime={currentTime} duration={duration} onSeek={(e) => seek(parseFloat(e.target.value))} onMouseDown={beginSeek} onMouseUp={endSeek} disabled={!isCurrentlyPlayable} className='mt-2' />
            </div>
        </div>
    );
};

export default StreamPlayer;