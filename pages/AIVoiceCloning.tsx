import React, { useState, useCallback, useEffect, useRef } from 'react';
import { PlayCircleIcon, TrashIcon, AudioWaveIcon, PauseCircleIcon } from '../components/icons';
import InputField from '../components/InputField';
import { usePlayer } from '../contexts/PlayerContext';
import { useToast } from '../contexts/ToastContext';
import * as db from '../services/db';
import { ClonedVoice, ContentItem, isPlayableContent } from '../types';
import { useAuth } from '../contexts/AuthContext';

const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => (
    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 my-2 overflow-hidden">
        <div 
            className="bg-brand-blue h-2 rounded-full transition-all duration-300 ease-in-out"
            style={{ width: `${progress}%` }}
        />
    </div>
);

const ClonedVoiceCard: React.FC<{ 
    voice: ClonedVoice; 
    onDelete: (id: string) => void; 
    onPreview: (voice: ClonedVoice) => void;
    isPlaying: boolean;
}> = ({ voice, onDelete, onPreview, isPlaying }) => {
    const isReady = voice.status === 'Ready';

    return (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 flex items-center justify-between">
            <div>
                <p className="font-semibold text-gray-800 dark:text-white">{voice.name}</p>
                <div className="flex items-center space-x-2 mt-1">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${isReady ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'}`}>
                        {voice.status}
                    </span>
                    {!isReady && (
                        <div className="w-3 h-3">
                             <svg className="animate-spin h-full w-full text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </div>
                    )}
                </div>
            </div>
            <div className="flex items-center space-x-2">
                <button 
                    onClick={() => onPreview(voice)} 
                    disabled={!isReady}
                    className="p-2 text-brand-blue hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                    title={isPlaying ? "Pause" : "Preview Voice"}
                >
                    {isPlaying ? <PauseCircleIcon /> : <PlayCircleIcon />}
                </button>
                <button 
                    onClick={() => onDelete(voice.id)} 
                    className="p-2 text-red-500 hover:text-red-700"
                    title="Delete Voice"
                >
                    <TrashIcon />
                </button>
            </div>
        </div>
    );
};

const AIVoiceCloning: React.FC = () => {
  const [voices, setVoices] = useState<ClonedVoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newVoiceName, setNewVoiceName] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isCloning, setIsCloning] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  
  const objectUrlRef = useRef<string[]>([]);
  const { addToast } = useToast();
  const { currentItem, playbackState, isPreviewing, playPreview } = usePlayer();
  const isPlayerPlaying = playbackState === 'playing';
  const { currentUser, deductCredits } = useAuth();

  const loadVoices = useCallback(async () => {
      if (!currentUser) return;
      setIsLoading(true);
      
      const voicesFromDb = await db.getAllClonedVoices(currentUser.tenantId);
      
      objectUrlRef.current.forEach(URL.revokeObjectURL);
      objectUrlRef.current = [];
      
      const processedVoices = voicesFromDb.map(voice => {
          if (voice.file && voice.file instanceof Blob && !voice.url) {
              const url = URL.createObjectURL(voice.file);
              objectUrlRef.current.push(url); // Track new URL for cleanup
              return { ...voice, url };
          }
          return voice;
      }).sort((a,b) => b.id.localeCompare(a.id));

      setVoices(processedVoices);
      setIsLoading(false);
  }, [currentUser]);

  useEffect(() => {
      loadVoices();
      return () => { 
          objectUrlRef.current.forEach(URL.revokeObjectURL);
      };
  }, [loadVoices]);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setAudioFile(e.target.files[0]);
    }
  };

  const handleDragEvents = (e: React.DragEvent<HTMLDivElement>, isOver: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(isOver);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    handleDragEvents(e, false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setAudioFile(e.dataTransfer.files[0]);
    }
  };

  const handleCloneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVoiceName || !audioFile || isCloning || !currentUser) return;
    
    const CLONING_COST = 5000;
    const canProceed = await deductCredits(CLONING_COST, 'AI Voice Cloning');
    if (!canProceed) {
        return;
    }

    setIsCloning(true);
    setUploadProgress(0);

    const newVoice: ClonedVoice = { 
      id: new Date().toISOString(),
      tenantId: currentUser.tenantId,
      name: newVoiceName, 
      status: 'Processing',
      file: audioFile
    };

    await db.saveClonedVoice(newVoice);
    await loadVoices(); // Show processing voice immediately

    const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
            const newProgress = prev + Math.random() * 15;
            if (newProgress >= 99) {
                clearInterval(progressInterval);
                return 99;
            }
            return newProgress;
        });
    }, 400);

    // Simulate backend processing time
    setTimeout(async () => {
        clearInterval(progressInterval);
        setUploadProgress(100);

        const processedVoice: ClonedVoice = { ...newVoice, status: 'Ready' };
        await db.saveClonedVoice(processedVoice);

        addToast(`Voice "${newVoice.name}" is now ready!`, 'success');
        setIsCloning(false);
        setNewVoiceName('');
        setAudioFile(null);
        await loadVoices(); // Reload to show ready status and enable preview
    }, 5000);
  };

  const handleDeleteVoice = async (id: string) => {
    if (!currentUser) return;
    if (window.confirm('Are you sure you want to delete this cloned voice? This action cannot be undone.')) {
        await db.deleteClonedVoice(id, currentUser.tenantId);
        addToast("Voice deleted.", "info");
        await loadVoices();
    }
  };
  
  const handlePreviewVoice = (voice: ClonedVoice) => {
    if (!voice.url || !currentUser) return;
    
    const playableItem: ContentItem = {
        id: voice.id,
        tenantId: currentUser.tenantId,
        title: voice.name,
        type: 'Custom Audio',
        artist: 'Cloned Voice Sample',
        duration: '0:30', // Placeholder duration
        date: new Date().toISOString(),
        url: voice.url,
    };
    if (isPlayableContent(playableItem)) {
      playPreview(playableItem);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Your Cloned Voices</h2>
        <p className="mt-2 mb-6 text-gray-600 dark:text-gray-400">Manage your existing AI voices. You can use these voices in your station's announcements and generated content.</p>
        <div className="space-y-4">
            {isLoading ? <p className="text-center text-gray-500 dark:text-gray-400">Loading voices...</p> 
            : voices.length > 0 ? voices.map(voice => (
                <ClonedVoiceCard 
                  key={voice.id} 
                  voice={voice} 
                  onDelete={handleDeleteVoice} 
                  onPreview={handlePreviewVoice}
                  isPlaying={isPreviewing && currentItem?.id === voice.id && isPlayerPlaying}
                />
            )) : (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400">You haven't cloned any voices yet.</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">Get started by cloning a new voice below.</p>
                </div>
            )}
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Clone a New Voice</h2>
        <p className="mt-2 mb-6 text-gray-600 dark:text-gray-400">Upload a high-quality audio sample to create a new AI voice clone.</p>
        <form onSubmit={handleCloneSubmit} className="space-y-6">
            <InputField 
                label="Voice Name"
                name="name"
                value={newVoiceName}
                onChange={(e) => setNewVoiceName(e.target.value)}
                placeholder="e.g., Jane's Morning Show Voice"
                disabled={isCloning}
            />
            
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Audio Sample</label>
                <div
                    onDragOver={(e) => handleDragEvents(e, true)}
                    onDragLeave={(e) => handleDragEvents(e, false)}
                    onDrop={handleDrop}
                    className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors ${dragOver ? 'border-brand-blue bg-blue-50 dark:bg-gray-700/50' : 'border-gray-300 dark:border-gray-600'}`}
                >
                    <div className="space-y-1 text-center">
                        <AudioWaveIcon />
                        <div className="flex text-sm text-gray-600 dark:text-gray-400">
                            <label htmlFor="file-upload" className={`relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-brand-blue hover:text-blue-700 focus-within:outline-none ${isCloning ? 'cursor-not-allowed text-gray-400' : ''}`}>
                                <span>Upload a file</span>
                                <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="audio/*" disabled={isCloning} />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                        </div>
                        {audioFile ? <p className="text-xs text-green-500">{audioFile.name}</p> : <p className="text-xs text-gray-500 dark:text-gray-400">MP3, WAV, etc.</p>}
                    </div>
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">For best results, upload a clean, high-quality audio sample of at least 30 seconds of continuous speech with no background noise.</p>
            </div>
            
             {isCloning && (
                <div className="pt-2">
                     <p className="text-sm text-gray-600 dark:text-gray-400">Cloning in progress... This may take several minutes.</p>
                     <ProgressBar progress={uploadProgress} />
                </div>
            )}

            <div className="flex justify-end">
                <button 
                    type="submit" 
                    disabled={!newVoiceName || !audioFile || isCloning}
                    className="px-6 py-2 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none disabled:bg-gray-400 dark:disabled:bg-blue-800 disabled:cursor-not-allowed"
                >
                    {isCloning ? 'Cloning...' : 'Start Cloning Process (5,000 Credits)'}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default AIVoiceCloning;