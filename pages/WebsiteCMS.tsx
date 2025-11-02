import React, { useState, useEffect } from 'react';
import { useContent } from '../contexts/ContentContext';
import { usePlayer } from '../contexts/PlayerContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { ArticleContent, WebsiteSettings, PublicWebsiteData } from '../types';
import InputField from '../components/InputField';
import ToggleSwitch from '../components/ToggleSwitch';
import { GlobeIcon, ExternalLinkIcon } from '../components/icons';

const WEBSITE_SETTINGS_KEY = 'websiteSettings';

const defaultSettings: WebsiteSettings = {
    heroTitle: 'Welcome to Our Station',
    heroSubtitle: 'Broadcasting the best tunes 24/7, powered by AI.',
    showFeatured: true,
    showSchedule: true,
    showBlog: true,
};

const WebsiteCMS: React.FC = () => {
    const { stationSettings } = useAuth();
    const { contentItems } = useContent();
    const { playoutQueue } = usePlayer();
    const { addToast } = useToast();
    
    const [settings, setSettings] = useState<WebsiteSettings>(defaultSettings);
    const [isPublishing, setIsPublishing] = useState(false);

    useEffect(() => {
        try {
            const savedSettings = localStorage.getItem(WEBSITE_SETTINGS_KEY);
            if (savedSettings) {
                setSettings(JSON.parse(savedSettings));
            }
        } catch (e) {
            console.error("Could not load website settings from localStorage", e);
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleToggle = (name: keyof WebsiteSettings, value: boolean) => {
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    const handlePublish = () => {
        setIsPublishing(true);
        addToast('Opening live site and sending data...', 'info');
    
        try {
            // Save the current CMS settings for persistence within the dashboard
            localStorage.setItem(WEBSITE_SETTINGS_KEY, JSON.stringify(settings));
    
            // Gather all data needed for the public-facing website
            const articles = contentItems.filter(item => item.type === 'Article').slice(0, 5) as ArticleContent[]; // Get latest 5 articles
            const schedule = playoutQueue.slice(0, 10); // Get next 10 items
    
            const publicData: PublicWebsiteData = {
                settings,
                station: stationSettings,
                articles,
                schedule,
            };
    
            // Open the live site in a new window
            const liveSiteWindow = window.open("https://aimusicstation.live/website.html", "_blank");
    
            if (liveSiteWindow) {
                // Wait for the window to load, then send the data via postMessage
                // This is more robust for cross-origin communication than localStorage
                setTimeout(() => {
                    // The targetOrigin MUST match the domain of the live site for security
                    liveSiteWindow.postMessage(publicData, "https://aimusicstation.live");
                    addToast('Website content published successfully!', 'success');
                    setIsPublishing(false);
                }, 2000); // 2-second delay to allow the page to load
            } else {
                addToast('Could not open live site window. Please check your pop-up blocker.', 'error');
                setIsPublishing(false);
            }
    
        } catch (error) {
            console.error("Failed to publish website data:", error);
            addToast('An error occurred while publishing.', 'error');
            setIsPublishing(false);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div className="flex items-center space-x-3">
                    <GlobeIcon />
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Website Content Management</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Control the content and layout of your public-facing radio station website.
                        </p>
                    </div>
                </div>
                <a 
                    href="https://aimusicstation.live/website.html" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-full sm:w-auto px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700 focus:outline-none"
                >
                    <ExternalLinkIcon />
                    <span className="ml-2">View Live Site</span>
                </a>
            </div>


            <div className="space-y-8">
                <div className="p-6 border dark:border-gray-700 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Hero Section</h3>
                    <div className="space-y-4">
                        <InputField label="Main Title" name="heroTitle" value={settings.heroTitle} onChange={handleChange} placeholder="Welcome to..." />
                        <InputField label="Subtitle" name="heroSubtitle" isTextarea value={settings.heroSubtitle} onChange={handleChange} placeholder="Your station's slogan..." />
                    </div>
                </div>

                <div className="p-6 border dark:border-gray-700 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Page Sections</h3>
                    <div className="space-y-4">
                        <ToggleSwitch label="Show Featured Content" enabled={settings.showFeatured} onChange={v => handleToggle('showFeatured', v)} />
                        <ToggleSwitch label="Show Live Schedule" enabled={settings.showSchedule} onChange={v => handleToggle('showSchedule', v)} />
                        <ToggleSwitch label="Show Blog/News Section" enabled={settings.showBlog} onChange={v => handleToggle('showBlog', v)} />
                    </div>
                </div>

                <div className="pt-6 border-t dark:border-gray-700 flex justify-end">
                    <button
                        onClick={handlePublish}
                        disabled={isPublishing}
                        className="px-6 py-3 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none disabled:bg-blue-400 disabled:cursor-wait"
                    >
                        {isPublishing ? 'Publishing...' : 'Publish Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WebsiteCMS;
