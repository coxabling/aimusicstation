import React, { useState, useRef, useEffect, useCallback } from 'react';
import { usePlayer } from '../contexts/PlayerContext';
import { useToast } from '../contexts/ToastContext';
import Modal from './Modal';
import { BroadcastIcon } from './icons';
import type { Theme } from '../App';

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'broadcasting' | 'error';

interface LiveDJModalProps {
    isOpen: boolean;
    onClose: () => void;
    theme: Theme;
}

const LiveDJModal: React.FC<LiveDJModalProps> = ({ isOpen, onClose, theme }) => {
    const { startLiveDJBroadcast, endLiveDJBroadcast } = usePlayer();
    const { addToast } = useToast();
    const [status, setStatus] = useState<ConnectionStatus>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserNodeRef = useRef<AnalyserNode | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationFrameIdRef = useRef<number | null>(null);
    
    const isDark = theme === 'dark';

    const draw = useCallback(() => {
        if (status === 'idle' || !analyserNodeRef.current || !canvasRef.current) {
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

        canvasCtx.fillStyle = isDark ? 'rgb(31 41 55)' : 'rgb(243 244 246)';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = '#1a73e8';
        canvasCtx.beginPath();
        const sliceWidth = canvas.width * 1.0 / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * canvas.height / 2;
            if (i === 0) canvasCtx.moveTo(x, y); else canvasCtx.lineTo(x, y);
            x += sliceWidth;
        }
        canvasCtx.lineTo(canvas.width, canvas.height / 2);
        canvasCtx.stroke();
    }, [status, isDark]);
    
    const cleanup = useCallback(() => {
        if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
        streamRef.current?.getTracks().forEach(track => track.stop());
        audioContextRef.current?.close().catch(() => {});
        streamRef.current = null;
        audioContextRef.current = null;
        analyserNodeRef.current = null;
    }, []);

    const handleConnectMic = async () => {
        setStatus('connecting');
        setErrorMessage('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            const context = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = context;
            const source = context.createMediaStreamSource(stream);
            analyserNodeRef.current = context.createAnalyser();
            analyserNodeRef.current.fftSize = 2048;
            source.connect(analyserNodeRef.current);
            setStatus('connected');
            draw();
        } catch (err) {
            console.error("Microphone access denied:", err);
            setErrorMessage('Microphone access was denied. Please check your browser permissions.');
            setStatus('error');
            cleanup();
        }
    };
    
    const handleStartBroadcast = () => {
        startLiveDJBroadcast();
        setStatus('broadcasting');
    };
    
    const handleEndBroadcast = () => {
        endLiveDJBroadcast();
        setStatus('connected');
    };
    
    const handleClose = () => {
        if (status === 'broadcasting') endLiveDJBroadcast();
        cleanup();
        setStatus('idle');
        onClose();
    };

    const getButton = () => {
        switch (status) {
            case 'idle':
            case 'error':
                return <button onClick={handleConnectMic} className="px-6 py-3 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">Connect Microphone</button>;
            case 'connecting':
                return <button disabled className="px-6 py-3 bg-gray-400 text-white font-semibold rounded-lg cursor-wait">Connecting...</button>;
            case 'connected':
                return <button onClick={handleStartBroadcast} className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700">Start Broadcast</button>;
            case 'broadcasting':
                 return <button onClick={handleEndBroadcast} className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700">End Broadcast</button>;
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Live DJ Broadcast">
            <div className="text-center">
                <div className="w-24 h-24 mx-auto bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-brand-blue mb-4">
                    <BroadcastIcon className="w-12 h-12" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                    {status === 'broadcasting' ? 'You are LIVE on air!' : 'Ready to Go Live?'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2 mb-6">
                    {status === 'broadcasting' ? 'Your microphone is being broadcast to all listeners. The Auto DJ will resume when you end the broadcast.' : 'Connect your microphone and click "Start Broadcast" to take over the stream from the Auto DJ.'}
                </p>

                <canvas ref={canvasRef} width="600" height="100" className={`w-full h-24 rounded-lg transition-colors ${status === 'idle' || status === 'error' ? 'bg-gray-200 dark:bg-gray-700' : 'bg-gray-100 dark:bg-gray-800'}`}></canvas>
                
                {errorMessage && <p className="text-red-500 mt-4">{errorMessage}</p>}
                
                <div className="mt-8">
                    {getButton()}
                </div>
            </div>
        </Modal>
    );
};

export default LiveDJModal;
