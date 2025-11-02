import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useToast } from '../contexts/ToastContext';
import { CodeIcon, DiscordIcon, SlackIcon, WebhookIcon, PlusIcon, TrashIcon } from '../components/icons';
import * as db from '../services/db';
import { Submission, Webhook, WebhookService } from '../types';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import InputField from '../components/InputField';
import { usePlayer } from '../contexts/PlayerContext';

const WebhookForm: React.FC<{
    webhook: Partial<Webhook>;
    onSave: (webhook: Webhook) => void;
    onCancel: () => void;
}> = ({ webhook, onSave, onCancel }) => {
    const { currentUser } = useAuth();
    const [formData, setFormData] = useState(webhook);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !formData.name || !formData.url) return;
        const webhookToSave: Webhook = {
            id: formData.id || `wh-${Date.now()}`,
            tenantId: currentUser.tenantId,
            name: formData.name,
            url: formData.url,
            service: formData.service || 'custom',
        };
        onSave(webhookToSave);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <InputField label="Webhook Name" name="name" value={formData.name || ''} onChange={handleChange} placeholder="e.g., Discord Now Playing" />
            <InputField label="Webhook URL" name="url" value={formData.url || ''} onChange={handleChange} placeholder="Paste your webhook URL here" />
            <p className="text-xs text-gray-500 dark:text-gray-400">Your URL will be stored securely. For Discord/Slack, use the "Webhook URL" they provide.</p>
            <div className="flex justify-end pt-4 space-x-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 font-semibold rounded-lg shadow-md hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">Save Webhook</button>
            </div>
        </form>
    );
};


const Integrations: React.FC = () => {
    const { addToast } = useToast();
    const { currentUser } = useAuth();
    const { currentItem, playoutQueue, currentQueueIndex, albumArtUrl, handleListenerLike } = usePlayer();
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const [widgetHtml, setWidgetHtml] = useState('');
    const [webhooks, setWebhooks] = useState<Webhook[]>([]);
    const [isLoadingWebhooks, setIsLoadingWebhooks] = useState(true);
    const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
    const [editingWebhook, setEditingWebhook] = useState<Partial<Webhook> | null>(null);

    const loadWebhooks = useCallback(async () => {
        if (!currentUser) return;
        setIsLoadingWebhooks(true);
        const userWebhooks = await db.getAllWebhooks(currentUser.tenantId);
        setWebhooks(userWebhooks);
        setIsLoadingWebhooks(false);
    }, [currentUser]);

    useEffect(() => {
        loadWebhooks();
    }, [loadWebhooks]);

    useEffect(() => {
        fetch('/widget.html')
            .then(response => response.text())
            .then(html => setWidgetHtml(html))
            .catch(error => console.error("Failed to fetch widget HTML:", error));

        const handleMessage = async (event: MessageEvent) => {
            if (event.data && event.data.type === 'ai-station-submission') {
                const submission = event.data.submission as Submission;
                if (submission) {
                    try {
                        await db.saveSubmission(submission);
                        const iframe = iframeRef.current;
                        if (iframe && iframe.contentWindow) {
                            iframe.contentWindow.postMessage({ type: 'ai-station-submission-success' }, '*');
                        }
                    } catch (error) {
                        console.error('Failed to save submission from widget:', error);
                    }
                }
            } else if (event.data && event.data.type === 'ai-station-like') {
                const { trackTitle, trackId } = event.data;
                if (currentItem && currentItem.id === trackId) {
                    addToast(`Listener liked "${trackTitle}"! AI Program Director is finding a similar track...`, 'info');
                    handleListenerLike(currentItem);
                } else {
                    addToast(`Listener liked "${trackTitle}"! Interaction logged.`, 'success');
                }
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [addToast, currentItem, handleListenerLike]);

    // This effect sends live player data to the widget iframe
    useEffect(() => {
        const iframe = iframeRef.current;
        if (iframe && iframe.contentWindow) {
            const nowPlaying = currentItem ? { ...currentItem, albumArtUrl } : null;
            const upNext = playoutQueue.slice(currentQueueIndex + 1, currentQueueIndex + 6); // Send next 5

            iframe.contentWindow.postMessage({
                type: 'ai-station-update',
                nowPlaying,
                upNext
            }, '*'); // On a real site, restrict this to your app's origin
        }
    }, [currentItem, playoutQueue, currentQueueIndex, albumArtUrl]);

    const handleAddNewWebhook = (service: WebhookService) => {
        setEditingWebhook({ name: '', url: '', service });
        setIsWebhookModalOpen(true);
    };

    const handleDeleteWebhook = async (webhook: Webhook) => {
        if (!currentUser) return;
        if (window.confirm(`Are you sure you want to delete the webhook "${webhook.name}"?`)) {
            await db.deleteWebhook(webhook.id, currentUser.tenantId);
            addToast(`Webhook "${webhook.name}" deleted.`, 'info');
            await loadWebhooks();
        }
    };

    const handleSaveWebhook = async (webhookToSave: Webhook) => {
        await db.saveWebhook(webhookToSave);
        addToast(`Webhook "${webhookToSave.name}" saved.`, 'success');
        setIsWebhookModalOpen(false);
        setEditingWebhook(null);
        await loadWebhooks();
    };

    const embedCode = `<iframe 
  src="https://aimusicstation.live/widget.html" 
  width="100%" 
  height="520" 
  frameborder="0"
  style="max-width: 400px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"
  title="AI music station Submission Widget">
</iframe>`;

    const copyToClipboard = (code: string, label: string) => {
        navigator.clipboard.writeText(code).then(() => {
            addToast(`${label} copied to clipboard!`, 'success');
        }, () => {
            addToast(`Failed to copy ${label}.`, 'error');
        });
    };
    
    const getServiceIcon = (service: WebhookService) => {
        switch(service) {
            case 'discord': return <DiscordIcon />;
            case 'slack': return <SlackIcon />;
            default: return <WebhookIcon />;
        }
    }

    return (
        <>
            <Modal isOpen={isWebhookModalOpen} onClose={() => setIsWebhookModalOpen(false)} title={editingWebhook?.id ? 'Edit Webhook' : 'Add New Webhook'}>
                {editingWebhook && <WebhookForm webhook={editingWebhook} onSave={handleSaveWebhook} onCancel={() => setIsWebhookModalOpen(false)} />}
            </Modal>
            <div className="space-y-12">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                    <div className="flex items-center space-x-3 mb-4">
                        <CodeIcon />
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Listener Engagement Widget</h2>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">Embed Code</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Copy and paste this HTML code into your website where you want the listener widget to appear.</p>
                            <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-green-300 relative">
                                <pre><code>{embedCode}</code></pre>
                                <button onClick={() => copyToClipboard(embedCode, 'Embed code')} className="absolute top-2 right-2 px-3 py-1 bg-gray-700 text-white text-xs rounded-md hover:bg-gray-600">Copy</button>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">Live Preview</h3>
                            <div className="w-full max-w-sm mx-auto border dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
                                <iframe ref={iframeRef} srcDoc={widgetHtml} width="100%" height="520" frameBorder="0" title="Submission Widget Preview" className="w-full" />
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Webhook Integrations</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Send "Now Playing" updates to external services in real-time.</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <button onClick={() => handleAddNewWebhook('discord')} className="flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            <DiscordIcon className="h-10 w-10 text-[#5865F2]"/>
                            <span className="mt-2 font-semibold">Add Discord Webhook</span>
                        </button>
                         <button onClick={() => handleAddNewWebhook('slack')} className="flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            <SlackIcon className="h-10 w-10 text-[#4A154B] dark:text-[#ECB22E]"/>
                            <span className="mt-2 font-semibold">Add Slack Webhook</span>
                        </button>
                         <button onClick={() => handleAddNewWebhook('custom')} className="flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            <WebhookIcon className="h-10 w-10 text-gray-500"/>
                            <span className="mt-2 font-semibold">Add Custom Webhook</span>
                        </button>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Your Configured Webhooks</h3>
                    <div className="space-y-3">
                        {isLoadingWebhooks ? <p>Loading...</p> : webhooks.length > 0 ? webhooks.map(hook => (
                            <div key={hook.id} className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg flex justify-between items-center">
                                <div className="flex items-center space-x-3">
                                    <div className="text-gray-500 dark:text-gray-400">{getServiceIcon(hook.service)}</div>
                                    <div>
                                        <p className="font-semibold text-gray-800 dark:text-white">{hook.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{hook.url.replace(/.\/\//, '$&...').slice(0, 50)}...</p>
                                    </div>
                                </div>
                                <button onClick={() => handleDeleteWebhook(hook)} className="p-2 text-red-500 hover:text-red-700" title="Delete"><TrashIcon /></button>
                            </div>
                        )) : (
                             <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                                <p className="text-sm text-gray-500 dark:text-gray-400">No webhooks configured yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default Integrations;