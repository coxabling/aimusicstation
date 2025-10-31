import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Type, GoogleGenAI } from '@google/genai';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import { useToast } from '../contexts/ToastContext';
import * as db from '../services/db';
import { SocialPost } from '../types';
import { ShareIcon, SparklesIcon, XIcon, FacebookIcon, TrashIcon, PencilIcon, CheckIcon, DownloadIcon } from '../components/icons';
import { generateWithRetry } from '../services/ai';
import Modal from '../components/Modal';
import InputField from '../components/InputField';

const PostCard: React.FC<{
    post: SocialPost;
    onUpdate: (post: SocialPost) => void;
    onDelete: (id: string) => void;
}> = ({ post, onUpdate, onDelete }) => {
    const { addToast } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(post.content);
    const [isScheduling, setIsScheduling] = useState(false);
    const [scheduleDate, setScheduleDate] = useState('');

    const handleCopy = () => {
        navigator.clipboard.writeText(post.content);
        addToast('Post content copied to clipboard!', 'success');
    };

    const handleSaveEdit = () => {
        onUpdate({ ...post, content: editContent });
        setIsEditing(false);
    };

    const handleScheduleClick = () => {
        const now = new Date();
        now.setHours(now.getHours() + 1);
        now.setMinutes(0);
        const defaultScheduleTime = now.toISOString().slice(0, 16);
        setScheduleDate(defaultScheduleTime);
        setIsScheduling(true);
    };

    const handleConfirmSchedule = () => {
        if (!scheduleDate) {
            addToast('Please select a valid date and time.', 'error');
            return;
        }
        onUpdate({ ...post, status: 'scheduled', scheduledAt: new Date(scheduleDate).toISOString() });
        setIsScheduling(false);
    };

    const platformIcon = post.platform === 'X'
        ? <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center flex-shrink-0"><XIcon/></div>
        : <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0"><FacebookIcon/></div>;

    const renderActions = () => {
        if (isEditing) {
            return (
                <>
                    <button onClick={() => setIsEditing(false)} className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                    <button onClick={handleSaveEdit} className="px-3 py-1 text-xs bg-blue-500 text-white rounded-md">Save</button>
                </>
            );
        }
        if (isScheduling) {
             return (
                <div className="w-full flex items-center gap-2">
                    <input 
                        type="datetime-local"
                        value={scheduleDate}
                        onChange={e => setScheduleDate(e.target.value)}
                        className="flex-grow p-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                    />
                    <button onClick={() => setIsScheduling(false)} className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                    <button onClick={handleConfirmSchedule} className="px-3 py-1 text-xs bg-blue-500 text-white rounded-md">Confirm</button>
                </div>
            );
        }

        switch (post.status) {
            case 'draft':
                return (
                    <>
                        <button onClick={handleScheduleClick} className="flex items-center px-3 py-1 text-xs bg-blue-500 text-white rounded-md">Schedule</button>
                        <button onClick={() => onUpdate({ ...post, status: 'sent' })} className="flex items-center px-3 py-1 text-xs bg-green-500 text-white rounded-md">Post Now</button>
                        <button onClick={() => setIsEditing(true)} className="p-2 text-yellow-500 hover:text-yellow-600"><PencilIcon/></button>
                        <button onClick={() => onDelete(post.id)} className="p-2 text-red-500 hover:text-red-700"><TrashIcon/></button>
                    </>
                );
            case 'scheduled':
                return (
                    <>
                        <button onClick={() => onUpdate({ ...post, status: 'draft', scheduledAt: null })} className="flex items-center px-3 py-1 text-xs bg-yellow-500 text-white rounded-md">Unschedule</button>
                        <button onClick={() => onUpdate({ ...post, status: 'sent', scheduledAt: null })} className="flex items-center px-3 py-1 text-xs bg-green-500 text-white rounded-md">Post Now</button>
                        <button onClick={() => onDelete(post.id)} className="p-2 text-red-500 hover:text-red-700"><TrashIcon/></button>
                    </>
                );
            case 'sent':
                return (
                    <>
                        <button onClick={handleCopy} className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-600 rounded-md">Copy Text</button>
                        <button onClick={() => onDelete(post.id)} className="p-2 text-red-500 hover:text-red-700"><TrashIcon/></button>
                    </>
                );
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex flex-col">
            <div className="flex items-start space-x-3 mb-3">
                {platformIcon}
                <div className="flex-grow">
                    <p className="font-bold text-gray-800 dark:text-white">{post.platform}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {post.status === 'scheduled' && post.scheduledAt ? `Scheduled for ${new Date(post.scheduledAt).toLocaleString()}`
                        : post.status === 'sent' ? `Sent (originally generated ${new Date(post.createdAt).toLocaleDateString()})`
                        : `Generated on ${new Date(post.createdAt).toLocaleDateString()}`}
                    </p>
                </div>
            </div>
            {isEditing ? (
                <textarea 
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={5}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 mb-2"
                />
            ) : (
                <p className="text-sm text-gray-700 dark:text-gray-300 flex-grow whitespace-pre-wrap">{post.content}</p>
            )}
            <div className="flex justify-end items-center space-x-2 mt-4 pt-3 border-t dark:border-gray-700">
                {renderActions()}
            </div>
        </div>
    );
};

const VideoSnippetGenerator: React.FC = () => {
    const { currentItem } = usePlayer();
    const { deductCredits } = useAuth();
    const { addToast } = useToast();
    const [hasVeoKey, setHasVeoKey] = useState(false);
    const [isVeoModalOpen, setIsVeoModalOpen] = useState(false);
    const [veoStatus, setVeoStatus] = useState<'idle' | 'generating' | 'done' | 'error'>('idle');
    const [veoProgressMessage, setVeoProgressMessage] = useState('');
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const VEO_COST = 1000;

    useEffect(() => {
        const checkKey = async () => {
            if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
                const hasKey = await window.aistudio.hasSelectedApiKey();
                setHasVeoKey(hasKey);
            }
        };
        checkKey();
    }, []);

    const handleSelectKey = async () => {
        if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
            await window.aistudio.openSelectKey();
            setHasVeoKey(true); // Optimistically set to true
        }
    };
    
    const handleGenerateVideo = async () => {
        if (!currentItem || currentItem.type !== 'Music') {
            addToast('Video snippets can only be generated for currently playing music tracks.', 'error');
            return;
        }

        const canProceed = await deductCredits(VEO_COST, 'Veo Video Snippet');
        if (!canProceed) return;
        
        setIsVeoModalOpen(true);
        setVeoStatus('generating');
        setVideoUrl(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `A short, 7-second dynamic video for social media promoting the song '${currentItem.title}' by '${currentItem.artist}'. Include an audio waveform visualizer and text overlays with the song title and artist name. The mood should be upbeat and exciting.`;
            
            setVeoProgressMessage('Initializing video generation...');

            let operation = await ai.models.generateVideos({
                model: 'veo-3.1-fast-generate-preview',
                prompt: prompt,
                config: {
                    numberOfVideos: 1,
                    resolution: '720p',
                    aspectRatio: '9:16'
                }
            });
            
            setVeoProgressMessage('AI is storyboarding your video...');

            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                setVeoProgressMessage('Rendering frames... this can take a few minutes.');
                operation = await ai.operations.getVideosOperation({ operation: operation });
            }

            setVeoProgressMessage('Finalizing video...');
            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (!downloadLink) {
                throw new Error('Video generation finished, but no download link was provided.');
            }

            const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
            if (!response.ok) {
                 throw new Error(`Failed to download video file: ${response.statusText}`);
            }
            const videoBlob = await response.blob();
            const url = URL.createObjectURL(videoBlob);
            setVideoUrl(url);
            setVeoStatus('done');
            
        } catch (error: any) {
            console.error('Video generation failed:', error);
            if (error.message?.includes('Requested entity was not found')) {
                setVeoStatus('error');
                setVeoProgressMessage('API Key is invalid or expired. Please select a valid key.');
                setHasVeoKey(false);
            } else {
                setVeoStatus('error');
                setVeoProgressMessage(`An unexpected error occurred: ${error.message}`);
            }
        }
    };

    const isMusicPlaying = currentItem?.type === 'Music';

    return (
        <>
        <Modal isOpen={isVeoModalOpen} onClose={() => setIsVeoModalOpen(false)} title="Generating Video Snippet">
            <div className="text-center p-8">
                {(veoStatus === 'generating' || veoStatus === 'error') && (
                    <>
                        {veoStatus === 'generating' && (
                             <svg className="animate-spin h-12 w-12 text-brand-blue mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        )}
                        <p className="mt-4 text-lg font-semibold text-gray-700 dark:text-gray-200">{veoProgressMessage}</p>
                    </>
                )}
                {veoStatus === 'done' && videoUrl && (
                    <>
                        <h3 className="text-xl font-bold text-green-500 mb-4">Video Ready!</h3>
                        <video controls src={videoUrl} className="w-full max-w-sm mx-auto rounded-lg shadow-lg"></video>
                        <div className="mt-6 flex justify-center space-x-4">
                            <a href={videoUrl} download={`${currentItem?.title || 'video'}.mp4`} className="flex items-center px-6 py-2 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">
                                <DownloadIcon />
                                <span className="ml-2">Download</span>
                            </a>
                            <button onClick={() => setIsVeoModalOpen(false)} className="px-6 py-2 bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 font-semibold rounded-lg shadow-md hover:bg-gray-300">Close</button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
        <div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Automated Video Snippets</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Instantly generate a short promotional video for your currently playing song, perfect for social media.</p>
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Now Playing</p>
                <p className="text-lg font-bold text-gray-800 dark:text-white">{isMusicPlaying ? currentItem.title : 'No music playing'}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">{isMusicPlaying ? currentItem.artist : 'Start your broadcast to enable this feature.'}</p>
                
                <div className="mt-4">
                    {hasVeoKey ? (
                        <button onClick={handleGenerateVideo} disabled={!isMusicPlaying || veoStatus === 'generating'} className="flex items-center justify-center px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 focus:outline-none disabled:bg-purple-400 disabled:cursor-not-allowed">
                            <SparklesIcon className="h-5 w-5 mr-2" />
                            {veoStatus === 'generating' ? 'Generating...' : `Generate Video Snippet (${VEO_COST} Credits)`}
                        </button>
                    ) : (
                        <div>
                             <button onClick={handleSelectKey} className="px-4 py-2 bg-yellow-500 text-white font-semibold rounded-lg shadow-md hover:bg-yellow-600 focus:outline-none">
                                Select API Key for Video Generation
                            </button>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Video generation is a premium feature. An API key with billing enabled is required. See <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline">billing details</a>.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
        </>
    );
};

const ComposePostForm: React.FC<{
    onSave: (post: Partial<SocialPost>) => void;
    onCancel: () => void;
}> = ({ onSave, onCancel }) => {
    const [platform, setPlatform] = useState<'X' | 'Facebook'>('X');
    const [content, setContent] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;
        onSave({ platform, content });
    };
    
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="platform" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Platform</label>
                <select id="platform" value={platform} onChange={e => setPlatform(e.target.value as any)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue bg-white dark:bg-gray-700">
                    <option>X</option>
                    <option>Facebook</option>
                </select>
            </div>
            <InputField 
                label="Content"
                name="content"
                isTextarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="What's on your mind?"
            />
                <div className="flex justify-end pt-4 space-x-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 font-semibold rounded-lg shadow-md hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">Save as Draft</button>
            </div>
        </form>
    );
}

interface SocialMediaManagerProps {
    actionTrigger?: string;
    clearActionTrigger?: () => void;
}

const SocialMediaManager: React.FC<SocialMediaManagerProps> = ({ actionTrigger, clearActionTrigger }) => {
    const { stationSettings, currentUser, deductCredits } = useAuth();
    const player = usePlayer();
    const { addToast } = useToast();
    const [posts, setPosts] = useState<SocialPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);
    const POSTS_COST = 40;

    useEffect(() => {
        if (actionTrigger === 'composePost' && clearActionTrigger) {
            setIsComposeModalOpen(true);
            clearActionTrigger();
        }
    }, [actionTrigger, clearActionTrigger]);

    useEffect(() => {
        const loadPosts = async () => {
            if (!currentUser) return;
            setIsLoading(true);
            const savedPosts = await db.getAllSocialPosts(currentUser.tenantId);
            setPosts(savedPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
            setIsLoading(false);
        };
        loadPosts();
    }, [currentUser]);

    useEffect(() => {
        const interval = setInterval(async () => {
            if (!currentUser) return;
            const now = new Date();
            const postsToSend = posts.filter(p => p.status === 'scheduled' && p.scheduledAt && new Date(p.scheduledAt) <= now);
            
            if (postsToSend.length > 0) {
                const updatedPosts = postsToSend.map(p => ({ ...p, status: 'sent' as const, scheduledAt: null }));
                
                for (const post of updatedPosts) {
                    await db.saveSocialPost(post);
                }
                
                setPosts(prev => prev.map(p => {
                    const updated = updatedPosts.find(up => up.id === p.id);
                    return updated || p;
                }));
                addToast(`${updatedPosts.length} scheduled post(s) have been sent.`, 'info');
            }
        }, 30 * 1000); // Check every 30 seconds

        return () => clearInterval(interval);
    }, [posts, currentUser, addToast]);


    const handleGeneratePosts = async () => {
        if (!currentUser) return;

        const canProceed = await deductCredits(POSTS_COST, "Social Post Generation");
        if (!canProceed) {
            return;
        }

        setIsGenerating(true);
        try {
            const nowPlaying = player.currentItem ? `The current song is "${player.currentItem.title}".` : "The station is currently between tracks.";
            const upNextItem = player.playoutQueue[player.currentQueueIndex + 1];
            const upNext = upNextItem ? `The next song will be "${upNextItem.title}".` : "";

            const prompt = `You are a creative social media manager for an online radio station called "${stationSettings.name}". The station's overall vibe is "${stationSettings.vibe || 'energetic'}".
Your task is to generate 4 engaging social media posts. Create a mix of posts for X (formerly Twitter) and Facebook.
The posts should be relevant to what's happening on the station.
Current station status: ${nowPlaying} ${upNext}
      
Post ideas:
- Announce the currently playing or upcoming song.
- Ask an engaging question related to a song, artist, or genre.
- Create a promotional post about the station itself.
- Include relevant hashtags (e.g., #NowPlaying, #${stationSettings.name.replace(/\s/g, '')}, #Music).

Return the posts ONLY as a JSON object with a single key "posts" which is an array of objects.
Each object must have "platform" ("X" or "Facebook") and "content" (the text of the post).
Do not include any other text, explanations, or markdown in your response.`;

            const schema = {
                type: Type.OBJECT,
                properties: {
                    posts: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                platform: { type: Type.STRING, enum: ["X", "Facebook"] },
                                content: { type: Type.STRING },
                            },
                            required: ["platform", "content"],
                        },
                    },
                },
                required: ["posts"],
            };

            const response = await generateWithRetry({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: schema,
                },
            });

            const result = JSON.parse(response.text);

            if (result.posts && Array.isArray(result.posts)) {
                const newPosts: SocialPost[] = result.posts.map((p: any) => ({
                    id: `${Date.now()}-${Math.random()}`,
                    tenantId: currentUser.tenantId,
                    platform: p.platform,
                    content: p.content,
                    status: 'draft',
                    createdAt: new Date().toISOString(),
                }));
                await db.bulkSaveSocialPosts(newPosts);
                setPosts(prev => [...newPosts, ...prev]);
                addToast(`${newPosts.length} new post drafts generated!`, 'success');
            } else {
                throw new Error("AI response was not in the expected format.");
            }

        } catch (error) {
            console.error("Error generating social posts:", error);
            addToast("Failed to generate social media posts.", "error");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleUpdatePost = async (post: SocialPost) => {
        await db.saveSocialPost(post);
        setPosts(prev => prev.map(p => p.id === post.id ? post : p));
        if(post.status === 'sent') {
            addToast('Post has been sent!', 'success');
        }
    };

    const handleDeletePost = async (id: string) => {
        if (!currentUser) return;
        await db.deleteSocialPosts([id], currentUser.tenantId);
        setPosts(prev => prev.filter(p => p.id !== id));
        addToast('Post deleted.', 'info');
    };

    const handleSaveComposedPost = async (post: Partial<SocialPost>) => {
        if (!currentUser) return;
        const newPost: SocialPost = {
            id: `post-${Date.now()}`,
            tenantId: currentUser.tenantId,
            platform: post.platform!,
            content: post.content!,
            status: 'draft',
            createdAt: new Date().toISOString(),
        };
        await db.saveSocialPost(newPost);
        setPosts(prev => [newPost, ...prev]);
        addToast('New post saved as draft.', 'success');
        setIsComposeModalOpen(false);
    };

    const drafts = useMemo(() => posts.filter(p => p.status === 'draft'), [posts]);
    const scheduledPosts = useMemo(() => posts.filter(p => p.status === 'scheduled').sort((a,b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime()), [posts]);
    const sentPosts = useMemo(() => posts.filter(p => p.status === 'sent'), [posts]);

    return (
        <>
            <Modal isOpen={isComposeModalOpen} onClose={() => setIsComposeModalOpen(false)} title="Compose New Social Post">
                <ComposePostForm onSave={handleSaveComposedPost} onCancel={() => setIsComposeModalOpen(false)} />
            </Modal>
            <div className="space-y-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                        <div className="flex items-center space-x-3">
                            <ShareIcon />
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">AI Social Media Manager</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Generate, schedule, and manage social media content for your station.</p>
                            </div>
                        </div>
                        <button
                            onClick={handleGeneratePosts}
                            disabled={isGenerating}
                            className="flex items-center justify-center w-full sm:w-auto px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 focus:outline-none disabled:bg-purple-400 whitespace-nowrap"
                        >
                            <SparklesIcon className="h-5 w-5 mr-2" />
                            {isGenerating ? 'Generating...' : `Generate New Drafts (${POSTS_COST} Credits)`}
                        </button>
                    </div>

                    {isGenerating && (
                        <div className="text-center p-8">
                            <svg className="animate-spin h-8 w-8 text-brand-blue mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="mt-4 text-gray-600 dark:text-gray-300">The AI is crafting some fresh posts for you...</p>
                        </div>
                    )}
                </div>

                {isLoading ? (
                    <div className="text-center p-8"><p className="text-gray-500 dark:text-gray-400">Loading posts...</p></div>
                ) : (
                    <div className="space-y-8">
                        {/* Drafts Section */}
                        <div>
                            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Drafts ({drafts.length})</h3>
                            {drafts.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {drafts.map(post => (
                                        <PostCard key={post.id} post={post} onUpdate={handleUpdatePost} onDelete={handleDeletePost} />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                                    <p className="text-gray-500 dark:text-gray-400">No drafts to show.</p>
                                    <p className="text-sm text-gray-400 dark:text-gray-500">Click "Generate New Drafts" to get started.</p>
                                </div>
                            )}
                        </div>

                        {/* Scheduled Section */}
                        <div>
                            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Scheduled ({scheduledPosts.length})</h3>
                            {scheduledPosts.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {scheduledPosts.map(post => (
                                        <PostCard key={post.id} post={post} onUpdate={handleUpdatePost} onDelete={handleDeletePost} />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                                    <p className="text-gray-500 dark:text-gray-400">You haven't scheduled any posts yet.</p>
                                </div>
                            )}
                        </div>

                        {/* Sent Section */}
                        <div>
                            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Sent ({sentPosts.length})</h3>
                            {sentPosts.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {sentPosts.map(post => (
                                        <PostCard key={post.id} post={post} onUpdate={handleUpdatePost} onDelete={handleDeletePost} />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                                    <p className="text-gray-500 dark:text-gray-400">No posts have been sent yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                    <VideoSnippetGenerator />
                </div>

            </div>
        </>
    );
};

export default SocialMediaManager;