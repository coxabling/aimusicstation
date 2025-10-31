import React, { useState, useMemo, useCallback } from 'react';
import { GlobeIcon, TrendingUpIcon, ClockIcon, MusicIcon, DocumentTextIcon, RadioIcon, SparklesIcon } from '../components/icons';
import { usePlayer } from '../contexts/PlayerContext';
import { ContentItem } from '../types';
import GeographicDistributionMap from '../components/GeographicDistributionMap';
import { countryCoordinates } from '../data/countryCoordinates';
import type { Theme } from '../App';
import { useContent } from '../contexts/ContentContext';
import { useAuth } from '../contexts/AuthContext';
import * as db from '../services/db';
import { generateWithRetry, handleAiError } from '../services/ai';
import { marked } from 'marked';
import { useToast } from '../contexts/ToastContext';


const mockGeoData: Record<string, number> = {
    US: 18342, CA: 7802, GB: 6103, DE: 5021, BR: 4500, AU: 3200, FR: 2800, JP: 2100,
    IN: 1800, MX: 1500, RU: 1200, CN: 1100, ES: 900, IT: 850, NL: 800,
};

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-5 flex items-center space-x-4">
        <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900 text-brand-blue">{icon}</div>
        <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
        </div>
    </div>
);

const ChartCard: React.FC<{ title: string; children: React.ReactNode, className?: string }> = ({ title, children, className }) => (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">{title}</h3>
        <div>{children}</div>
    </div>
);

const Analytics: React.FC<{ theme: Theme }> = ({ theme }) => { 
    const { playoutHistory } = usePlayer();
    const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
    const { addToast } = useToast();
    const { contentItems, audioContentItems } = useContent();
    const { currentUser, deductCredits } = useAuth();
    const [aiInsights, setAiInsights] = useState<string>('');
    const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
    
    const INSIGHTS_COST = 500;

     const stats = useMemo(() => {
        const totalListeners = Object.values(mockGeoData).reduce((sum, count) => sum + count, 0);
        const peakConcurrents = Math.max(0, ...Object.values(mockGeoData));
        // Using a static average for demonstration, but it's based on the dynamic total.
        const avgListenTimeSeconds = 23 * 60 + 45; // 23m 45s
        const totalListenerSeconds = totalListeners * avgListenTimeSeconds;
        const totalListenerHours = Math.round(totalListenerSeconds / 3600);

        return {
            totalListenerHours: totalListenerHours.toLocaleString(),
            peakConcurrents: peakConcurrents.toLocaleString(),
            avgListenTime: "23m 45s",
        };
     }, []);

    const getIconForItem = (item: ContentItem) => {
        switch (item.type) {
            case 'Music': return <MusicIcon />;
            case 'Article': case 'RSS Feed': return <DocumentTextIcon />;
            case 'Ad': case 'Custom Audio':
            default: return <RadioIcon />;
        }
    };

    const handleGenerateInsights = async () => {
        if (!currentUser) return;
        const canProceed = await deductCredits(INSIGHTS_COST, 'AI Analytics Insights');
        if (!canProceed) return;

        setIsGeneratingInsights(true);
        setAiInsights('');
        try {
            const submissions = await db.getAllSubmissions(currentUser.tenantId);
            const songRequests = submissions.filter(s => s.type === 'Song Request').map(s => s.message);
            const musicLibrary = [...contentItems, ...audioContentItems].filter(item => item.type === 'Music');
            const libraryGenres = [...new Set(musicLibrary.map(item => (item as any).genre).filter(Boolean))];

            const playoutSummary = playoutHistory.length > 0 
                ? `The last ${playoutHistory.length} played items include types: ${[...new Set(playoutHistory.map(i => i.type))].join(', ')}.`
                : "There is no playout history yet.";

            const prompt = `You are an expert radio programming consultant. Analyze the following data for an online radio station and provide 3-4 actionable insights in a markdown list format.

**Station Data:**
- **Playout History Summary:** ${playoutSummary}
- **Recent Song Requests:** ${songRequests.length > 0 ? songRequests.slice(0, 10).join('; ') : 'None.'}
- **Music Library Genres:** ${libraryGenres.length > 0 ? libraryGenres.join(', ') : 'None.'}

**Your Task:**
Based on the data, provide concrete, actionable advice. Examples:
- "Your listeners seem to be requesting a lot of Synthwave. Consider creating a dedicated '80s Power Hour' using the Show Designer to capitalize on this trend."
- "The song 'Cybernetic Dreams' has been requested, but a quick scan of your library genres suggests it might be missing. Consider adding it to broaden your collection."
- "Your playout history is a mix of Music and Articles. To increase engagement, try using the 'Show Prep' feature to create interesting facts for your music segments."

Keep insights clear and concise. Format your response as a markdown list, with each item starting with a bolded title (e.g., "**Focus on Synthwave:** ...").`;

            const response = await generateWithRetry({ model: 'gemini-2.5-pro', contents: prompt });
            setAiInsights(response.text);
        } catch (error) {
            handleAiError(error, addToast);
        } finally {
            setIsGeneratingInsights(false);
        }
    };
    
     const generatedHtml = useMemo(() => {
        if (!aiInsights) return '';
        return marked(aiInsights, { breaks: true });
    }, [aiInsights]);


    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Listener Hours" value={stats.totalListenerHours} icon={<TrendingUpIcon />} />
                <StatCard title="Peak Concurrents" value={stats.peakConcurrents} icon={<GlobeIcon />} />
                <StatCard title="Average Listen Time" value={stats.avgListenTime} icon={<ClockIcon />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard title="Geographic Listener Distribution" className="lg:col-span-1">
                    <GeographicDistributionMap 
                        data={mockGeoData} 
                        selectedCountry={selectedCountry}
                        onSelectCountry={setSelectedCountry}
                        theme={theme}
                    />
                    {selectedCountry && countryCoordinates[selectedCountry] && (
                        <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-900 rounded-lg ring-1 ring-brand-blue">
                            <h4 className="font-bold text-gray-800 dark:text-white">{countryCoordinates[selectedCountry].name}</h4>
                            <p className="text-lg font-semibold text-brand-blue">{mockGeoData[selectedCountry]?.toLocaleString()} listeners</p>
                        </div>
                    )}
                </ChartCard>
                <div className="lg:col-span-1 space-y-6">
                    <ChartCard title="Recent Playout History">
                        {playoutHistory.length > 0 ? (
                            <ul className="space-y-3 max-h-[250px] overflow-y-auto">
                                {playoutHistory.map(item => (
                                    <li key={`${item.id}-${item.playedAt.getTime()}`} className="flex items-center space-x-3">
                                        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-500 dark:text-gray-300">
                                            {getIconForItem(item)}
                                        </div>
                                        <div className="flex-grow truncate">
                                            <p className="font-medium text-sm truncate text-gray-800 dark:text-gray-200">{item.title}</p>
                                            <p className="text-xs truncate text-gray-500 dark:text-gray-400">
                                                Played {Math.round((Date.now() - item.playedAt.getTime()) / 60000)} mins ago
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-center text-gray-500 dark:text-gray-400 py-10">
                                <p>No playout history yet.</p>
                                <p className="text-xs">Start a broadcast from the Schedule page to see history.</p>
                            </div>
                        )}
                    </ChartCard>
                    <ChartCard title="AI-Powered Insights">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            Let our AI analyze your station's data to provide actionable programming advice.
                        </p>
                        <button
                            onClick={handleGenerateInsights}
                            disabled={isGeneratingInsights}
                            className="flex items-center justify-center w-full sm:w-auto px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 focus:outline-none disabled:bg-purple-400 disabled:cursor-wait"
                        >
                            <SparklesIcon className="h-5 w-5 mr-2" />
                            {isGeneratingInsights ? 'Analyzing...' : `Generate Insights (${INSIGHTS_COST} Credits)`}
                        </button>

                        {isGeneratingInsights && (
                            <div className="flex items-center justify-center h-full mt-6">
                                <div className="text-center">
                                    <svg className="animate-spin h-8 w-8 text-brand-blue mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <p className="mt-4 text-gray-600 dark:text-gray-300">The AI is analyzing your station data...</p>
                                </div>
                            </div>
                        )}

                        {aiInsights && !isGeneratingInsights && (
                            <div 
                                className="prose prose-sm dark:prose-invert max-w-none mt-6"
                                dangerouslySetInnerHTML={{ __html: generatedHtml as string }}
                            />
                        )}
                    </ChartCard>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
