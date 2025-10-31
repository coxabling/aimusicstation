
import React, { useState, useEffect, useCallback } from 'react';
import { generateWithRetry } from '../services/ai';
import { useContent } from '../contexts/ContentContext';
import { useToast } from '../contexts/ToastContext';
import { ArticleContent } from '../types';
import { SparklesIcon, CloudSunIcon, RouteIcon } from '../components/icons';
import { useAuth } from '../contexts/AuthContext';

interface WeatherData {
    city: string;
    temp: number;
    condition: string;
    feels_like: number;
    wind: string;
    humidity: string;
}

const MOCK_WEATHER_DATA: Record<string, Omit<WeatherData, 'city'>> = {
  'new york': { temp: 72, condition: 'Partly Cloudy', feels_like: 74, wind: '10 mph', humidity: '60%' },
  'london': { temp: 60, condition: 'Light Rain', feels_like: 58, wind: '15 mph', humidity: '82%' },
  'tokyo': { temp: 80, condition: 'Sunny', feels_like: 85, wind: '5 mph', humidity: '75%' },
  'sydney': { temp: 65, condition: 'Clear', feels_like: 65, wind: '12 mph', humidity: '50%' },
  'paris': { temp: 68, condition: 'Cloudy', feels_like: 68, wind: '8 mph', humidity: '70%' },
};

const TrafficWeather: React.FC = () => {
    const { addContentItem } = useContent();
    const { addToast } = useToast();
    const { deductCredits } = useAuth();
    
    // Weather State
    const [city, setCity] = useState('');
    const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
    const [isLoadingWeather, setIsLoadingWeather] = useState(true);
    const [weatherError, setWeatherError] = useState<string | null>(null);
    const [weatherScript, setWeatherScript] = useState('');
    const [isGeneratingWeather, setIsGeneratingWeather] = useState(false);
    const WEATHER_COST = 20;

    // Traffic State
    const [locations, setLocations] = useState('');
    const [trafficScript, setTrafficScript] = useState('');
    const [isGeneratingTraffic, setIsGeneratingTraffic] = useState(false);
    const TRAFFIC_COST = 20;

    const fetchWeather = useCallback(async (query: string) => {
        setIsLoadingWeather(true);
        setWeatherError(null);
        setWeatherScript(''); // Clear old script on new fetch
        // Simulate API call
        await new Promise(res => setTimeout(res, 500));
        
        const data = MOCK_WEATHER_DATA[query.toLowerCase()];
        if (data) {
            setWeatherData({ city: query.charAt(0).toUpperCase() + query.slice(1), ...data });
        } else {
            setWeatherError(`Could not find weather for "${query}". Try "New York" or "London".`);
            setWeatherData(null);
        }
        setIsLoadingWeather(false);
    }, []);

    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                // In a real app, you'd use a reverse geocoding API here.
                // For this demo, we'll just default to a known city.
                addToast("Location detected! Showing weather for New York as a demo.", "info");
                fetchWeather('New York');
            },
            (error) => {
                console.warn(`Geolocation error: ${error.message}`);
                addToast("Could not get location. Please search for a city.", "info");
                fetchWeather('New York'); // Default on error
            },
            { timeout: 5000 }
        );
    }, [fetchWeather, addToast]);
    
    const handleWeatherSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (city) fetchWeather(city);
    };

    const handleGenerateWeatherScript = async () => {
        if (!weatherData) return;

        const canProceed = await deductCredits(WEATHER_COST, "Weather Script Generation");
        if (!canProceed) return;

        setIsGeneratingWeather(true);
        setWeatherScript('');
        try {
            const weatherDetails = `City: ${weatherData.city}, Temperature: ${weatherData.temp} degrees, Condition: ${weatherData.condition}, Feels Like: ${weatherData.feels_like} degrees, Wind: ${weatherData.wind}, Humidity: ${weatherData.humidity}.`;
            const prompt = `You are a friendly radio host. Write a short and engaging weather report script based on these details: ${weatherDetails}. Keep it concise and upbeat.`;
            const response = await generateWithRetry({ model: 'gemini-2.5-flash', contents: prompt });
            setWeatherScript(response.text);
            addToast("Weather script generated!", "success");
        } catch (error) {
            console.error("Error generating weather script:", error);
            addToast("Failed to generate weather script.", "error");
        } finally {
            setIsGeneratingWeather(false);
        }
    };
    
    const handleSaveWeatherScript = () => {
        if (!weatherScript) return;
        const newItem: Partial<ArticleContent> = {
            type: 'Article',
            title: `Weather for ${weatherData?.city || 'N/A'} - ${new Date().toLocaleDateString()}`,
            content: weatherScript,
            useAiAnnouncer: true,
            announcerVoice: 'AI-Ayo (African Male)'
        };
        addContentItem(newItem);
        addToast('Weather script saved to Content Library.', 'success');
    };
    
    const handleGenerateTraffic = async () => {
        if (!locations) return;

        const canProceed = await deductCredits(TRAFFIC_COST, "Traffic Script Generation");
        if (!canProceed) return;

        setIsGeneratingTraffic(true);
        setTrafficScript('');
        try {
            const prompt = `You are a professional radio traffic reporter. Create a concise, clear, and engaging traffic report script based on the following locations and issues: "${locations}". Mention main highways, expected delays, and any alternative routes if possible. The script should be easy to read aloud.`;
            const response = await generateWithRetry({ model: 'gemini-2.5-flash', contents: prompt });
            setTrafficScript(response.text);
            addToast("Traffic report generated!", "success");
        } catch (error) {
            console.error("Error generating traffic report:", error);
            addToast("Failed to generate traffic report.", "error");
        } finally {
            setIsGeneratingTraffic(false);
        }
    };

    const handleSaveTrafficScript = () => {
        if (!trafficScript) return;
        const newItem: Partial<ArticleContent> = {
            type: 'Article',
            title: `Traffic Report - ${new Date().toLocaleDateString()}`,
            content: trafficScript,
            useAiAnnouncer: true,
            announcerVoice: 'AI-Ayo (African Male)'
        };
        addContentItem(newItem);
        addToast('Traffic script saved to Content Library.', 'success');
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Weather Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 flex flex-col">
                <div className="flex items-center space-x-3 mb-4">
                    <CloudSunIcon />
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">AI Weather Report</h2>
                </div>

                <form onSubmit={handleWeatherSearch} className="flex items-center gap-2 mb-4">
                    <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Search for a city..."
                        className="flex-grow px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue bg-white dark:bg-gray-700"
                    />
                    <button type="submit" className="px-4 py-2 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none">Search</button>
                </form>

                <div className="mb-4">
                    {isLoadingWeather ? (
                        <div className="text-center text-gray-500 dark:text-gray-400 py-10"><p>Loading weather data...</p></div>
                    ) : weatherError ? (
                        <div className="text-center text-red-500 dark:text-red-400 p-4 bg-red-50 dark:bg-red-900/50 rounded-lg"><p>{weatherError}</p></div>
                    ) : weatherData ? (
                        <div className="text-center bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-white">{weatherData.city}</h3>
                            <div className="flex items-center justify-center space-x-4 my-1">
                                <div className="text-5xl font-bold text-brand-blue">{weatherData.temp}°</div>
                                <p className="text-lg text-gray-600 dark:text-gray-300 font-medium">{weatherData.condition}</p>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                                <div><p className="font-semibold">Feels Like</p><p className="text-gray-500 dark:text-gray-400">{weatherData.feels_like}°</p></div>
                                <div><p className="font-semibold">Wind</p><p className="text-gray-500 dark:text-gray-400">{weatherData.wind}</p></div>
                                <div><p className="font-semibold">Humidity</p><p className="text-gray-500 dark:text-gray-400">{weatherData.humidity}</p></div>
                            </div>
                        </div>
                    ) : null}
                </div>

                <div className="flex flex-col space-y-4 flex-grow">
                    <div className="flex justify-end">
                         <button onClick={handleGenerateWeatherScript} disabled={isGeneratingWeather || !weatherData} className="flex items-center px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 focus:outline-none disabled:bg-purple-400">
                            <SparklesIcon className="h-4 w-4 mr-2" />
                            {isGeneratingWeather ? 'Generating...' : `Generate Script (${WEATHER_COST} Credits)`}
                        </button>
                    </div>

                    <div className="flex-grow flex flex-col">
                        <label htmlFor="weatherScript" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Generated Script</label>
                        <textarea
                            id="weatherScript"
                            value={weatherScript}
                            readOnly
                            placeholder="Your generated weather report will appear here..."
                            rows={6}
                            className="w-full flex-grow p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700/50"
                        />
                    </div>
                     <div className="flex justify-end">
                        <button onClick={handleSaveWeatherScript} disabled={!weatherScript} className="px-4 py-2 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none disabled:bg-blue-400">
                            Save as Script
                        </button>
                    </div>
                </div>
            </div>

            {/* Traffic Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 flex flex-col">
                <div className="flex items-center space-x-3 mb-4">
                    <RouteIcon />
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">AI Traffic Report</h2>
                </div>
                
                <div className="flex flex-col space-y-4 flex-grow">
                    <div>
                        <label htmlFor="locations" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Locations / Routes</label>
                        <textarea
                            id="locations"
                            value={locations}
                            onChange={(e) => setLocations(e.target.value)}
                            placeholder="e.g., Highway 101 southbound near downtown, accident on Main St."
                            rows={3}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus:outline-none focus:ring-brand-blue focus:border-brand-blue"
                        />
                    </div>

                    <div className="flex justify-end">
                        <button onClick={handleGenerateTraffic} disabled={isGeneratingTraffic || !locations} className="flex items-center px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 focus:outline-none disabled:bg-purple-400">
                            <SparklesIcon className="h-4 w-4 mr-2" />
                            {isGeneratingTraffic ? 'Generating...' : `Generate Report (${TRAFFIC_COST} Credits)`}
                        </button>
                    </div>

                    <div className="flex-grow flex flex-col">
                        <label htmlFor="trafficScript" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Generated Script</label>
                        <textarea
                            id="trafficScript"
                            value={trafficScript}
                            readOnly
                            placeholder="Your generated traffic report will appear here..."
                            className="w-full flex-grow p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700/50"
                        />
                    </div>
                     <div className="flex justify-end">
                        <button onClick={handleSaveTrafficScript} disabled={!trafficScript} className="px-4 py-2 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none disabled:bg-blue-400">
                            Save as Script
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrafficWeather;
