import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Campaign, AdContent } from '../types';
import * as db from '../services/db';
import { useAuth } from '../contexts/AuthContext';
import { useContent } from '../contexts/ContentContext';
import { useToast } from '../contexts/ToastContext';
import { DollarSignIcon, PencilIcon, TrashIcon, PlusIcon, MusicIcon } from '../components/icons';
import Modal from '../components/Modal';
import InputField from '../components/InputField';

const CampaignStatusBadge: React.FC<{ status: Campaign['status'] }> = ({ status }) => {
    const statusMap = {
        active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    };
    return (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusMap[status]}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
};

const getAudioDuration = (file: File): Promise<string> => {
    return new Promise((resolve) => {
        const audio = document.createElement('audio');
        audio.src = URL.createObjectURL(file);
        audio.onloadedmetadata = () => {
            const duration = Math.round(audio.duration);
            const minutes = Math.floor(duration / 60);
            const seconds = duration % 60;
            resolve(`${minutes}:${seconds.toString().padStart(2, '0')}`);
            URL.revokeObjectURL(audio.src);
        };
        audio.onerror = () => {
            resolve('0:00'); // Resolve with default on error
            URL.revokeObjectURL(audio.src);
        };
    });
};

const AdManager: React.FC = () => {
    const { currentUser } = useAuth();
    const { contentItems, addContentItem } = useContent();
    const { addToast } = useToast();
    
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
    const [isAdModalOpen, setIsAdModalOpen] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState<Partial<Campaign> | null>(null);

    const loadCampaigns = useCallback(async () => {
        if (!currentUser) return;
        setIsLoading(true);
        const campaignsFromDb = await db.getAllCampaigns(currentUser.tenantId);
        setCampaigns(campaignsFromDb.sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
        setIsLoading(false);
    }, [currentUser]);

    useEffect(() => {
        loadCampaigns();
    }, [loadCampaigns]);

    const adCreatives = useMemo(() => {
        return contentItems.filter((item): item is AdContent => item.type === 'Ad');
    }, [contentItems]);
    
    const handleAddNewCampaign = () => {
        setEditingCampaign({
            name: '',
            sponsor: '',
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
            status: 'active',
            impressions: 0,
            impressionGoal: 1000,
            creativeIds: []
        });
        setIsCampaignModalOpen(true);
    };

    const handleEditCampaign = (campaign: Campaign) => {
        setEditingCampaign({
            ...campaign,
            startDate: campaign.startDate.split('T')[0],
            endDate: campaign.endDate.split('T')[0],
        });
        setIsCampaignModalOpen(true);
    };

    const handleDeleteCampaign = async (campaign: Campaign) => {
        if (!currentUser) return;
        if (window.confirm(`Are you sure you want to delete the campaign "${campaign.name}"?`)) {
            await db.deleteCampaign(campaign.id, currentUser.tenantId);
            addToast(`Campaign "${campaign.name}" deleted.`, 'info');
            await loadCampaigns();
        }
    };
    
    const handleSaveCampaign = async (campaignData: Partial<Campaign>) => {
        if (!currentUser) return;

        const campaignToSave: Campaign = {
            id: campaignData.id || `camp-${Date.now()}`,
            tenantId: currentUser.tenantId,
            name: campaignData.name || 'New Campaign',
            sponsor: campaignData.sponsor || 'Unknown Sponsor',
            startDate: new Date(campaignData.startDate || '').toISOString(),
            endDate: new Date(campaignData.endDate || '').toISOString(),
            status: campaignData.status || 'inactive',
            impressions: campaignData.impressions || 0,
            impressionGoal: campaignData.impressionGoal || 0,
            creativeIds: campaignData.creativeIds || [],
        };
        
        await db.saveCampaign(campaignToSave);
        addToast(`Campaign "${campaignToSave.name}" saved successfully.`, 'success');
        setIsCampaignModalOpen(false);
        setEditingCampaign(null);
        await loadCampaigns();
    };
    
    const handleSaveAd = (adData: Partial<AdContent>, file?: File) => {
        addContentItem({ ...adData, type: 'Ad' }, file);
        setIsAdModalOpen(false);
    };

    return (
        <>
            <Modal isOpen={isCampaignModalOpen} onClose={() => setIsCampaignModalOpen(false)} title={editingCampaign?.id ? 'Edit Campaign' : 'Create New Campaign'}>
                {editingCampaign && (
                    <CampaignForm
                        campaign={editingCampaign}
                        adCreatives={adCreatives}
                        onSave={handleSaveCampaign}
                        onCancel={() => setIsCampaignModalOpen(false)}
                    />
                )}
            </Modal>
            
            <Modal isOpen={isAdModalOpen} onClose={() => setIsAdModalOpen(false)} title="Create New Ad Creative">
                <AdCreativeForm onSave={handleSaveAd} onCancel={() => setIsAdModalOpen(false)} />
            </Modal>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div className="flex items-center space-x-3">
                        <DollarSignIcon />
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Ad Campaign Manager</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Create, manage, and track your advertising campaigns.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button onClick={() => setIsAdModalOpen(true)} className="flex items-center justify-center w-full sm:w-auto px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none">
                            <PlusIcon />
                            <span className="ml-2">Create Ad Creative</span>
                        </button>
                        <button onClick={handleAddNewCampaign} className="flex items-center justify-center w-full sm:w-auto px-4 py-2 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none">
                            <PlusIcon />
                            <span className="ml-2">Create Campaign</span>
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    {isLoading ? (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-10">Loading campaigns...</p>
                    ) : campaigns.length > 0 ? (
                        campaigns.map(campaign => (
                            <div key={campaign.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                                    <div className="flex-grow">
                                        <div className="flex items-center space-x-3">
                                            <CampaignStatusBadge status={campaign.status} />
                                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">{campaign.name}</h3>
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            Sponsor: <span className="font-medium text-gray-700 dark:text-gray-300">{campaign.sponsor}</span>
                                            <span className="mx-2">|</span>
                                            {new Date(campaign.startDate).toLocaleDateString()} - {new Date(campaign.endDate).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center space-x-3 mt-3 sm:mt-0 sm:ml-4 flex-shrink-0">
                                        <button onClick={() => handleEditCampaign(campaign)} className="p-2 text-blue-500 hover:text-blue-600" title="Edit"><PencilIcon/></button>
                                        <button onClick={() => handleDeleteCampaign(campaign)} className="p-2 text-red-500 hover:text-red-600" title="Delete"><TrashIcon/></button>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <div className="flex justify-between text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                                        <span>Impressions</span>
                                        <span>{campaign.impressions.toLocaleString()} / {(campaign.impressionGoal || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                                        <div className="bg-brand-blue h-2.5 rounded-full" style={{ width: `${Math.min(100, ((campaign.impressions || 0) / (campaign.impressionGoal || 1)) * 100)}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-16 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">No campaigns found</h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by creating a new campaign.</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

interface CampaignFormProps {
    campaign: Partial<Campaign>;
    adCreatives: AdContent[];
    onSave: (campaign: Partial<Campaign>) => void;
    onCancel: () => void;
}

const CampaignForm: React.FC<CampaignFormProps> = ({ campaign, adCreatives, onSave, onCancel }) => {
    const [formData, setFormData] = useState(campaign);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCreativeSelect = (creativeId: string) => {
        setFormData(prev => {
            const currentCreatives = new Set(prev?.creativeIds || []);
            if (currentCreatives.has(creativeId)) {
                currentCreatives.delete(creativeId);
            } else {
                currentCreatives.add(creativeId);
            }
            return { ...prev, creativeIds: Array.from(currentCreatives) };
        });
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <InputField label="Campaign Name" name="name" value={formData.name || ''} onChange={handleChange} placeholder="e.g., Summer Sale 2024" />
            <InputField label="Sponsor" name="sponsor" value={formData.sponsor || ''} onChange={handleChange} placeholder="e.g., TechCorp" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField label="Start Date" name="startDate" type="date" value={formData.startDate || ''} onChange={handleChange} placeholder="" />
                <InputField label="End Date" name="endDate" type="date" value={formData.endDate || ''} onChange={handleChange} placeholder="" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                    <select id="status" name="status" value={formData.status || 'inactive'} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue bg-white dark:bg-gray-700">
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>
                <InputField label="Impression Goal" name="impressionGoal" type="number" value={String(formData.impressionGoal || '')} onChange={e => setFormData(prev => ({...prev, impressionGoal: Number(e.target.value)}))} placeholder="e.g., 1000" />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ad Creatives</label>
                <div className="space-y-2 max-h-48 overflow-y-auto border dark:border-gray-600 rounded-md p-3">
                    {adCreatives.length > 0 ? adCreatives.map(ad => (
                        <label key={ad.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.creativeIds?.includes(ad.id)}
                                onChange={() => handleCreativeSelect(ad.id)}
                                className="h-4 w-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
                            />
                            <span className="text-sm text-gray-800 dark:text-gray-200">{ad.title} ({ad.duration})</span>
                        </label>
                    )) : <p className="text-sm text-center text-gray-500 dark:text-gray-400 p-4">No ad content found. Create one using the "Create Ad Creative" button.</p>}
                </div>
            </div>

            <div className="flex justify-end pt-4 space-x-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 font-semibold rounded-lg shadow-md hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">Save Campaign</button>
            </div>
        </form>
    );
};

const AdCreativeForm: React.FC<{
    onSave: (item: Partial<AdContent>, file?: File) => void;
    onCancel: () => void;
}> = ({ onSave, onCancel }) => {
    const [title, setTitle] = useState('');
    const [file, setFile] = useState<File | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !file) {
            alert('Please provide a title and select a file.');
            return;
        }
        const duration = await getAudioDuration(file);
        onSave({ title, duration }, file);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <InputField label="Ad Title" name="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Summer Sale Spot" />
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Audio File</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                        <MusicIcon />
                        <div className="flex text-sm text-gray-600 dark:text-gray-400">
                            <label htmlFor="ad-file-upload" className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-brand-blue hover:text-blue-700 focus-within:outline-none">
                                <span>Upload a file</span>
                                <input id="ad-file-upload" name="file-upload" type="file" className="sr-only" onChange={e => setFile(e.target.files?.[0] || null)} accept="audio/*" />
                            </label>
                        </div>
                        {file ? <p className="text-xs text-green-500">{file.name}</p> : <p className="text-xs text-gray-500 dark:text-gray-400">MP3, WAV, etc.</p>}
                    </div>
                </div>
            </div>
             <div className="flex justify-end pt-4 space-x-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 font-semibold rounded-lg shadow-md hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">Save Ad</button>
            </div>
        </form>
    );
};

export default AdManager;