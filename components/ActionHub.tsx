import React, { useState, useRef, useEffect } from 'react';
import { Page } from '../App';
import { PlusIcon, UploadIcon, SparklesIcon, PlaylistIcon, DollarSignIcon, ShareIcon, XIcon } from './icons';

interface ActionHubProps {
    onActionTrigger: (page: Page, trigger: string) => void;
    onNavigate: (page: Page) => void;
}

const ActionHub: React.FC<ActionHubProps> = ({ onActionTrigger, onNavigate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const actions = [
        { icon: <UploadIcon />, label: 'Upload Audio', action: () => onActionTrigger('audioContent', 'uploadAudio') },
        { icon: <SparklesIcon />, label: 'Generate AI Content', action: () => onNavigate('aiContentStudio') },
        { icon: <PlaylistIcon />, label: 'Create Playlist', action: () => onActionTrigger('playlists', 'createPlaylist') },
        { icon: <DollarSignIcon />, label: 'New Ad Campaign', action: () => onActionTrigger('adManager', 'newCampaign') },
        { icon: <ShareIcon />, label: 'Compose Social Post', action: () => onActionTrigger('social', 'composePost') },
    ];
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleActionClick = (action: () => void) => {
        action();
        setIsOpen(false);
    };

    return (
        <div ref={wrapperRef} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-3 rounded-full bg-brand-blue text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white transition-all transform hover:scale-110"
                aria-label="Create new content"
            >
                {isOpen ? <XIcon /> : <PlusIcon className="h-6 w-6" />}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg py-2 z-20 border dark:border-gray-700">
                    <p className="px-4 pt-1 pb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Create New</p>
                    {actions.map(({ icon, label, action }) => (
                        <button
                            key={label}
                            onClick={() => handleActionClick(action)}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3"
                        >
                            <span className="text-gray-500 dark:text-gray-400">{icon}</span>
                            <span>{label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ActionHub;
