import React, { useState, ChangeEvent } from 'react';
import { Type } from '@google/genai';
import { SlidersIcon, SparklesIcon, TrashIcon } from '../components/icons';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { generateWithRetry, handleAiError } from '../services/ai';

const PODCAST_ANALYSIS_COST = 500;

interface EditSuggestion {
    timestamp: string;
    suggestion: string;
}
interface JinglePoint {
    timestamp: string;
    reason: string;
}
interface AnalysisResult {
    cleaned_transcript: string;
    edit_suggestions: EditSuggestion[];
    jingle_points: JinglePoint[];
}

const ResultCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 dark:text-white mb-2">{title}</h3>
        {children}
    </div>
);

const PodcastStudio: React.FC = () => {
    const { currentUser, deductCredits } = useAuth();
    const { addToast } = useToast();
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setAudioFile(e.target.files[0]);
            setAnalysisResult(null); // Reset results when a new file is chosen
        }
    };

    const handleProcessAudio = async () => {
        if (!audioFile || !currentUser) return;
        
        const canProceed = await deductCredits(PODCAST_ANALYSIS_COST, 'Podcast Production Analysis');
        if (!canProceed) return;

        setIsAnalyzing(true);
        setAnalysisResult(null);

        try {
            // NOTE: In a real-world scenario, you would upload the audio file, get a transcript from a speech-to-text API,
            // and then pass that transcript to this model. For this demo, we'll use a placeholder transcript
            // and ask the AI to imagine the content based on the filename.
            const placeholderTranscript = `(Sound of intro music fades)\nHost: Welcome back to Tech Forward, I'm your host Alex. Today, we're diving deep into the future of AI in creative industries. Um, it's a really, really hot topic right now. With me is Dr. Evelyn Reed, a leading researcher in generative models. Welcome, Evelyn.\nDr. Reed: Thanks for having me, Alex. It's, uh, a pleasure to be here. The field is moving so fast, it's, it's almost hard to keep up...\n(Long pause)\nHost: So, let's start with the big question. Is AI a tool, or is it a replacement for human creativity? I mean, people are worried.`;

            const prompt = `You are a professional podcast producer. I have uploaded an audio file named "${audioFile.name}".
Based on this title and the following placeholder transcript, your task is to analyze the content and provide production notes.
Your analysis should help me edit this into a polished, professional-sounding podcast episode.

Placeholder Transcript:
---
${placeholderTranscript}
---

Please perform the following actions and return the result as a single JSON object matching the required schema:
1.  **Clean the Transcript**: Remove all filler words (like "um", "uh", "like"), stutters, and repeated words to create a clean, readable script.
2.  **Suggest Edits**: Identify areas that need editing. This includes long pauses, awkward phrasing, or sections that could be shortened. Provide a timestamp range and a clear suggestion for each.
3.  **Find Jingle Points**: Suggest timestamps where a jingle, sound effect, or music bed could be inserted to improve the flow and production value. Explain why it's a good spot (e.g., "transition between topics").

Return a JSON object that strictly adheres to the provided schema.`;

            const schema = {
                type: Type.OBJECT,
                properties: {
                    cleaned_transcript: {
                        type: Type.STRING,
                        description: 'The podcast transcript with all filler words, stutters, and major repetitions removed.'
                    },
                    edit_suggestions: {
                        type: Type.ARRAY,
                        description: 'An array of suggestions for editing the podcast.',
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                timestamp: { type: Type.STRING, description: 'The approximate time range for the suggested edit, e.g., "00:15-00:20".' },
                                suggestion: { type: Type.STRING, description: 'A brief, actionable suggestion, e.g., "Remove long pause." or "Shorten this section for clarity."' }
                            },
                            required: ['timestamp', 'suggestion']
                        }
                    },
                    jingle_points: {
                        type: Type.ARRAY,
                        description: 'An array of timestamps where a jingle or music bed could be inserted.',
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                timestamp: { type: Type.STRING, description: 'The approximate timestamp for the insertion, e.g., "05:30".' },
                                reason: { type: Type.STRING, description: 'A brief explanation for the insertion, e.g., "Good transition point between topics."' }
                            },
                            required: ['timestamp', 'reason']
                        }
                    }
                },
                required: ['cleaned_transcript', 'edit_suggestions', 'jingle_points']
            };

            const response = await generateWithRetry({
                model: 'gemini-2.5-pro',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: schema,
                }
            });

            const result = JSON.parse(response.text);
            setAnalysisResult(result);
            addToast('Podcast analysis complete!', 'success');

        } catch (error) {
            handleAiError(error, addToast);
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
            <div className="flex items-center space-x-3 mb-2">
                <SlidersIcon />
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Podcast Production Studio</h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Upload a long-form audio file (like an interview) and let the AI assist with your post-production workflow.
            </p>
            
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-4">
                 <div>
                    <label htmlFor="audio-upload" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Upload Audio File</label>
                    <div className="flex items-center space-x-4">
                        <input
                            id="audio-upload"
                            type="file"
                            onChange={handleFileChange}
                            accept="audio/*"
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-brand-blue hover:file:bg-blue-100 dark:file:bg-gray-700 dark:file:text-blue-300 dark:hover:file:bg-gray-600"
                        />
                        {audioFile && (
                            <button onClick={() => setAudioFile(null)} className="p-2 text-red-500 hover:text-red-700" title="Clear file">
                                <TrashIcon />
                            </button>
                        )}
                    </div>
                 </div>
                 <button
                    onClick={handleProcessAudio}
                    disabled={!audioFile || isAnalyzing}
                    className="flex items-center justify-center w-full px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 focus:outline-none disabled:bg-purple-400 disabled:cursor-not-allowed"
                >
                    <SparklesIcon className="h-5 w-5 mr-2" />
                    {isAnalyzing ? 'Analyzing...' : `Start AI Production (${PODCAST_ANALYSIS_COST} Credits)`}
                </button>
            </div>
            
            {isAnalyzing && (
                <div className="text-center p-8">
                    <svg className="animate-spin h-8 w-8 text-brand-blue mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="mt-4 text-gray-600 dark:text-gray-300">The AI is analyzing your audio. This may take a moment...</p>
                </div>
            )}
            
            {analysisResult && (
                <div className="mt-8 space-y-6">
                    <ResultCard title="Cleaned Transcript">
                        <textarea
                            readOnly
                            value={analysisResult.cleaned_transcript}
                            rows={10}
                            className="w-full p-2 text-sm border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                        />
                    </ResultCard>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ResultCard title="Edit Suggestions">
                            <ul className="space-y-2 text-sm">
                                {analysisResult.edit_suggestions.map((item, index) => (
                                    <li key={index} className="flex items-start">
                                        <span className="font-mono text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-md mr-3 flex-shrink-0">{item.timestamp}</span>
                                        <span className="text-gray-600 dark:text-gray-300">{item.suggestion}</span>
                                    </li>
                                ))}
                            </ul>
                        </ResultCard>

                        <ResultCard title="Jingle & Music Bed Opportunities">
                             <ul className="space-y-2 text-sm">
                                {analysisResult.jingle_points.map((item, index) => (
                                    <li key={index} className="flex items-start">
                                        <span className="font-mono text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-md mr-3 flex-shrink-0">{item.timestamp}</span>
                                        <span className="text-gray-600 dark:text-gray-300">{item.reason}</span>
                                    </li>
                                ))}
                            </ul>
                        </ResultCard>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PodcastStudio;
