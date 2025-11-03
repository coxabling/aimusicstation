
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob } from "@google/genai";
import { LiveIcon, AiIcon } from '../components/icons';
import { useToast } from '../contexts/ToastContext';
import { usePlayer } from '../contexts/PlayerContext';
import { useAuth } from '../contexts/AuthContext';

type Status = 'disconnected' | 'connecting' | 'connected' | 'error';

// --- AUDIO HELPER FUNCTIONS ---

function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

function createBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
    };
}

// --- UI COMPONENTS ---

const StatusIndicator: React.FC<{ status: Status }> = ({ status }) => {
    const statusMap = {
        disconnected: { text: 'Disconnected', color: 'bg-gray-400' },
        connecting: { text: 'Connecting...', color: 'bg-yellow-400 animate-pulse' },
        connected: { text: 'Live', color: 'bg-green-400' },
        error: { text: 'Error', color: 'bg-red-400' },
    };
    const { text, color } = statusMap[status];

    return (
        <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${color}`}></div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{text}</span>
        </div>
    );
};

const LiveVoiceChat: React.FC = () => {
    const { addToast } = useToast();
    const { deductCredits } = useAuth();
    const playerContext = usePlayer();
    const [status, setStatus] = useState<Status>('disconnected');
    const [errorMessage, setErrorMessage] = useState('');

    const wasPlayingRef = useRef(false);
    const playerContextRef = useRef(playerContext);
    const sessionPromise = useRef<Promise<LiveSession> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const inputAudioContext = useRef<AudioContext | null>(null);
    const outputAudioContext = useRef<AudioContext | null>(null);
    const scriptProcessor = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSource = useRef<MediaStreamAudioSourceNode | null>(null);
    const outputSources = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextStartTime = useRef(0);
    const logEndRef = useRef<HTMLDivElement>(null);
    const currentInputRef = useRef('');
    const currentOutputRef = useRef('');

    // Refs for visualizer
    const analyserNodeRef = useRef<AnalyserNode | null>(null);
    // FIX: Initialize canvasRef with null
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationFrameIdRef = useRef<number | null>(null);
    
    // FIX: Move useState declarations for transcriptionHistory, currentInput, and currentOutput to the top of the component.
    const [transcriptionHistory, setTranscriptionHistory] = useState<string[]>([]);
    const [currentInput, setCurrentInput] = useState('');
    const [currentOutput, setCurrentOutput] = useState('');
    
    useEffect(() => {
        playerContextRef.current = playerContext;
    }, [playerContext]);
    
    const draw = useCallback(() => {
        // FIX: Ensure canvasRef.current is checked
        if (status !== 'connected' || !analyserNodeRef.current || !canvasRef.current) {
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
                animationFrameIdRef.current = null;
            }
            return;
        }

        animationFrameIdRef.current = requestAnimationFrame(draw);

        const bufferLength = analyserNodeRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserNodeRef.current.getByteTimeDomainData(dataArray);

        const canvas = canvasRef.current;
        const canvasCtx = canvas.getContext('2d');
        if (!canvasCtx) return;

        const WIDTH = canvas.width;
        const HEIGHT = canvas.height;
        
        const isDark = document.documentElement.classList.contains('dark');
        canvasCtx.fillStyle = isDark ? 'rgb(31 41 55)' : 'rgb(249 250 251)';
        canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
        
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = '#1a73e8';

        canvasCtx.beginPath();

        const sliceWidth = WIDTH * 1.0 / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * HEIGHT / 2;

            if (i === 0) {
                canvasCtx.moveTo(x, y);
            } else {
                canvasCtx.lineTo(x, y);
            }
            x += sliceWidth;
        }

        canvasCtx.lineTo(WIDTH, HEIGHT / 2);
        canvasCtx.stroke();
    }, [status]);

    const cleanup = useCallback(() => {
        // FIX: Ensure cleanup function correctly stops all media tracks and audio contexts.
        streamRef.current?.getTracks().forEach(track => track.stop());
        scriptProcessor.current?.disconnect();
        mediaStreamSource.current?.disconnect();
        analyserNodeRef.current?.disconnect();
        
        // FIX: Ensure AudioContexts are closed properly
        inputAudioContext.current?.close().catch(e => console.error("Error closing input audio context:", e));
        outputAudioContext.current?.close().catch(e => console.error("Error closing output audio context:", e));
        
        if (animationFrameIdRef.current) {
            cancelAnimationFrame(animationFrameIdRef.current);
            animationFrameIdRef.current = null;
        }
        
        outputSources.current.forEach(source => {
            try { source.stop(); } catch(e) {}
        });

        streamRef.current = null;
        inputAudioContext.current = null;
        outputAudioContext.current = null;
        scriptProcessor.current = null;
        mediaStreamSource.current = null;
        analyserNodeRef.current = null;
        outputSources.current.clear();
        nextStartTime.current = 0;
    }, []);

    const handleStartSession = async () => {
        if (status !== 'disconnected' && status !== 'error') return;
        
        const SESSION_COST = 10;
        const canProceed = await deductCredits(SESSION_COST, 'Live Voice Chat Session');
        if (!canProceed) {
            return;
        }

        if (playerContext.playbackState === 'playing') {
            wasPlayingRef.current = true;
            playerContext.togglePlayPause();
            addToast("Station playout paused for live chat.", "info");
        } else {
            wasPlayingRef.current = false;
        }

        setStatus('connecting');
        // Clear previous transcription history
        setTranscriptionHistory([]); 
        setCurrentInput('');
        setCurrentOutput('');
        currentInputRef.current = '';
        currentOutputRef.current = '';

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            inputAudioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            sessionPromise.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
                    outputAudioTranscription: {},
                    inputAudioTranscription: {},
                },
                callbacks: {
                    onopen: () => {
                        setStatus('connected');
                        if (!inputAudioContext.current || !streamRef.current) return;
                        
                        mediaStreamSource.current = inputAudioContext.current.createMediaStreamSource(streamRef.current);
                        scriptProcessor.current = inputAudioContext.current.createScriptProcessor(4096, 1, 1);
                        
                        analyserNodeRef.current = inputAudioContext.current.createAnalyser();
                        analyserNodeRef.current.fftSize = 2048;

                        scriptProcessor.current.onaudioprocess = (audioEvent) => {
                            const inputData = audioEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            // FIX: Ensure sendRealtimeInput is wrapped in sessionPromise.current?.then to avoid stale closures.
                            sessionPromise.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };

                        mediaStreamSource.current.connect(analyserNodeRef.current);
                        analyserNodeRef.current.connect(scriptProcessor.current);
                        scriptProcessor.current.connect(inputAudioContext.current.destination);
                        
                        draw(); // Start visualizer
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.serverContent?.inputTranscription) {
                            currentInputRef.current += message.serverContent.inputTranscription.text;
                            setCurrentInput(currentInputRef.current);
                        }
                        if (message.serverContent?.outputTranscription) {
                            currentOutputRef.current += message.serverContent.outputTranscription.text;
                            setCurrentOutput(currentOutputRef.current);
                        }
                        
                        if (message.serverContent?.turnComplete) {
                            const finalInput = currentInputRef.current;
                            const finalOutput = currentOutputRef.current;
                            
                            currentInputRef.current = '';
                            currentOutputRef.current = '';
                            setCurrentInput('');
                            setCurrentOutput('');
                            
                            if (finalInput.trim() || finalOutput.trim()) {
                                setTranscriptionHistory(prev => [...prev, `You: ${finalInput.trim()}`, `AI: ${finalOutput.trim()}`]);
                            }
                        }

                        const audioPart = message.serverContent?.modelTurn?.parts?.find(p => p.inlineData);
                        const audioData = audioPart?.inlineData?.data;
                        if (audioData && outputAudioContext.current) {
                            const ctx = outputAudioContext.current;
                            nextStartTime.current = Math.max(nextStartTime.current, ctx.currentTime);
                            
                            const audioBuffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
                            const source = ctx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(ctx.destination);
                            
                            source.addEventListener('ended', () => {
                                outputSources.current.delete(source);
                            });

                            source.start(nextStartTime.current);
                            nextStartTime.current += audioBuffer.duration;
                            outputSources.current.add(source);
                        }
                    },
                    onclose: () => {
                        setStatus('disconnected');
                        cleanup();
                    },
                    onerror: (e) => {
                        console.error('Session error:', e);
                        setStatus('error');
                        addToast('An error occurred with the voice session.', 'error');
                        cleanup();
                    },
                }
            });
            await sessionPromise.current;

        } catch (error) {
            console.error('Failed to start session:', error);
            addToast('Could not get microphone permission.', 'error');
            setStatus('error');
            cleanup();
        }
    };

    const handleEndSession = () => {
        // FIX: Ensure session.close() is called when ending the session.
        sessionPromise.current?.then(session => session.close());
        sessionPromise.current = null;
        setStatus('disconnected');
        cleanup();

        if (wasPlayingRef.current && playerContext.playbackState !== 'playing') {
            playerContext.togglePlayPause();
            addToast("Resuming station playout.", "info");
        }
        wasPlayingRef.current = false;
    };
    
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcriptionHistory, currentInput, currentOutput]);

    useEffect(() => {
        return () => {
            // FIX: Ensure session.close() is called on component unmount.
            sessionPromise.current?.then(s => s.close()).catch(() => {});
            cleanup();
            
            if (wasPlayingRef.current && playerContextRef.current.playbackState !== 'playing') {
                playerContextRef.current.togglePlayPause();
            }
        };
    }, [cleanup]);
    
    const renderContent = () => {
        switch (status) {
            case 'connected':
                return (
                    <div className="flex flex-col flex-grow min-h-0">
                        <div className="flex-grow bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 overflow-y-auto space-y-4 mb-4">
                            {transcriptionHistory.map((line, index) => {
                                const isUser = line.startsWith('You:');
                                const isAi = line.startsWith('AI:');
                                const message = isUser ? line.substring(5) : isAi ? line.substring(4) : line;

                                return (
                                    <div key={index} className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
                                        {!isUser && <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 text-brand-blue"><AiIcon /></div>}
                                        <div className={`max-w-[80%] p-3 rounded-xl ${isUser ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
                                            <p className="text-sm">{message}</p>
                                        </div>
                                    </div>
                                )
                            })}
                            {currentInput && (
                                <div className="flex justify-end">
                                    <div className="max-w-[80%] p-3 rounded-xl bg-blue-500/80 text-white/80 italic">
                                        <p className="text-sm">{currentInput}</p>
                                    </div>
                                </div>
                            )}
                            {currentOutput && (
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 text-brand-blue"><AiIcon /></div>
                                    <div className="max-w-[80%] p-3 rounded-xl bg-gray-200/80 dark:bg-gray-700/80 text-gray-800/80 dark:text-gray-200/80 italic">
                                        <p className="text-sm">{currentOutput}</p>
                                    </div>
                                </div>
                            )}
                            <div ref={logEndRef} />
                        </div>
                        <div className="flex-shrink-0">
                            <canvas ref={canvasRef} width="600" height="100" className="w-full h-24 bg-gray-100 dark:bg-gray-800 rounded-lg"></canvas>
                            <div className="flex items-center justify-between mt-4">
                                <StatusIndicator status={status} />
                                <button
                                    onClick={handleEndSession}
                                    className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none"
                                >
                                    End Session
                                </button>
                            </div>
                        </div>
                    </div>
                );
            case 'connecting':
                return (
                    <div className="flex flex-col items-center justify-center flex-grow bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <svg className="animate-spin h-8 w-8 text-brand-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="mt-4 text-gray-600 dark:text-gray-300">Connecting to voice session...</p>
                    </div>
                );
            case 'disconnected':
            case 'error':
            default:
                return (
                    <div className="flex flex-col items-center justify-center flex-grow bg-gray-50 dark:bg-gray-900/50 rounded-lg text-center p-8">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 text-brand-blue rounded-full flex items-center justify-center mb-4">
                           <LiveIcon />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">Ready to talk?</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 mb-6 max-w-sm">
                            Click the button below to start a live, real-time voice conversation with the AI. Make sure your microphone is enabled.
                        </p>
                        {status === 'error' && <p className="text-red-500 mb-4">Something went wrong. Please try again.</p>}
                        <button
                            onClick={handleStartSession}
                            className="px-6 py-3 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none"
                        >
                            Start Live Session (10 Credits)
                        </button>
                    </div>
                );
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-4xl mx-auto flex flex-col h-[calc(100vh-10rem)]">
            <div className="flex items-center space-x-3 mb-2">
                <LiveIcon />
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Live Voice Chat</h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Have a real-time conversation with the AI. Start the session and begin speaking.
            </p>
            {renderContent()}
        </div>
    );
};

export default LiveVoiceChat;