import React, { useState, useEffect, useCallback } from 'react';
import { Clockwheel, ClockwheelBlock, ClockwheelBlockType } from '../types';
import * as db from '../services/db';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { PieChartIcon, PlusIcon, TrashIcon, PencilIcon } from '../components/icons';
import Modal from '../components/Modal';
import InputField from '../components/InputField';

const blockTypeLabels: Record<ClockwheelBlockType, string> = {
    'Music': 'Music',
    'Ad': 'Ad Break',
    'Jingle': 'Jingle / Stinger',
    'News': 'News Segment',
    'Weather': 'Weather Report',
    'StationID': 'Station ID',
    'Promo': 'Promo',
    // FIX: Add 'Article' to satisfy the ClockwheelBlockType.
    'Article': 'Article Segment',
    // FIX: Add 'Thematic' to satisfy the ClockwheelBlockType.
    'Thematic': 'Thematic Block',
};

const ClockwheelForm: React.FC<{
    initialWheel: Partial<Clockwheel>;
    onSave: (wheel: Clockwheel) => void;
    onCancel: () => void;
}> = ({ initialWheel, onSave, onCancel }) => {
    const { currentUser } = useAuth();
    const [wheel, setWheel] = useState<Partial<Clockwheel>>(initialWheel.id ? initialWheel : { name: '', blocks: [{ type: 'Music', count: 2, rule: 'Any' }] });

    const handleBlockChange = (index: number, field: keyof ClockwheelBlock, value: any) => {
        const newBlocks = [...(wheel.blocks || [])];
        newBlocks[index] = { ...newBlocks[index], [field]: value };
        setWheel(prev => ({ ...prev, blocks: newBlocks }));
    };

    const addBlock = () => {
        const newBlock: ClockwheelBlock = { type: 'Music', count: 1, rule: 'Any' };
        setWheel(prev => ({ ...prev, blocks: [...(prev.blocks || []), newBlock] }));
    };

    const removeBlock = (index: number) => {
        setWheel(prev => ({ ...prev, blocks: prev.blocks?.filter((_, i) => i !== index) }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !wheel.name || !wheel.blocks || wheel.blocks.length === 0) return;
        const finalWheel: Clockwheel = {
            id: wheel.id || `cw-${Date.now()}`,
            tenantId: currentUser.tenantId,
            name: wheel.name,
            blocks: wheel.blocks,
        };
        onSave(finalWheel);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <InputField label="Design Name" name="name" value={wheel.name || ''} onChange={e => setWheel(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g., Morning Drive" />
            
            <div className="space-y-4">
                <h4 className="font-semibold text-gray-800 dark:text-white">Hour Blocks</h4>
                {wheel.blocks?.map((block, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="md:col-span-4">
                            <label className="text-xs font-medium">Type</label>
                            <select value={block.type} onChange={e => handleBlockChange(index, 'type', e.target.value)} className="w-full mt-1 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700">
                                {Object.keys(blockTypeLabels).map(key => <option key={key} value={key}>{blockTypeLabels[key as ClockwheelBlockType]}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-2">
                             <label className="text-xs font-medium">{block.type === 'Thematic' ? 'Duration (mins)' : 'Count'}</label>
                            <input type="number" value={block.count} onChange={e => handleBlockChange(index, 'count', Math.max(1, Number(e.target.value)))} min="1" className="w-full mt-1 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700" />
                        </div>
                        <div className="md:col-span-5">
                             <label className="text-xs font-medium">{block.type === 'Thematic' ? 'Theme Prompt' : 'Rule / Genre'}</label>
                            <input type="text" value={block.rule} onChange={e => handleBlockChange(index, 'rule', e.target.value)} placeholder={block.type === 'Thematic' ? "e.g., 80s summer beach party" : "e.g., Upbeat, Pop"} className="w-full mt-1 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700" />
                        </div>
                         <div className="md:col-span-1 text-right">
                             <label className="text-xs font-medium hidden md:block">&nbsp;</label>
                            <button type="button" onClick={() => removeBlock(index)} className="mt-1 p-2 text-red-500 hover:text-red-700" title="Remove block"><TrashIcon /></button>
                        </div>
                    </div>
                ))}
                <button type="button" onClick={addBlock} className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">
                    <PlusIcon />
                    <span>Add Block</span>
                </button>
            </div>
             <div className="flex justify-end pt-4 space-x-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 font-semibold rounded-lg shadow-md hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">Save Design</button>
            </div>
        </form>
    );
};

const ShowDesigner: React.FC = () => {
    const { currentUser } = useAuth();
    const { addToast } = useToast();
    const [clockwheels, setClockwheels] = useState<Clockwheel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingWheel, setEditingWheel] = useState<Partial<Clockwheel> | null>(null);

    const loadClockwheels = useCallback(async () => {
        if (!currentUser) return;
        setIsLoading(true);
        const wheels = await db.getAllClockwheels(currentUser.tenantId);
        setClockwheels(wheels);
        setIsLoading(false);
    }, [currentUser]);

    useEffect(() => {
        loadClockwheels();
    }, [loadClockwheels]);

    const handleAddNew = () => {
        setEditingWheel({});
        setIsModalOpen(true);
    };

    const handleEdit = (wheel: Clockwheel) => {
        setEditingWheel(wheel);
        setIsModalOpen(true);
    };

    const handleDelete = async (wheel: Clockwheel) => {
        if (!currentUser) return;
        if (window.confirm(`Are you sure you want to delete the show design "${wheel.name}"?`)) {
            await db.deleteClockwheel(wheel.id, currentUser.tenantId);
            addToast(`"${wheel.name}" deleted.`, 'info');
            await loadClockwheels();
        }
    };

    const handleSave = async (wheelToSave: Clockwheel) => {
        await db.saveClockwheel(wheelToSave);
        addToast(`Show design "${wheelToSave.name}" saved.`, 'success');
        setIsModalOpen(false);
        setEditingWheel(null);
        await loadClockwheels();
    };

    return (
        <>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingWheel?.id ? 'Edit Show Design' : 'Create New Show Design'}>
                {editingWheel && (
                    <ClockwheelForm
                        initialWheel={editingWheel}
                        onSave={handleSave}
                        onCancel={() => setIsModalOpen(false)}
                    />
                )}
            </Modal>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                     <div className="flex items-center space-x-3">
                        <PieChartIcon />
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Show Designer</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Create reusable hourly templates (clockwheels) for professional scheduling.</p>
                        </div>
                    </div>
                     <button onClick={handleAddNew} className="flex items-center justify-center w-full sm:w-auto px-4 py-2 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none">
                        <PlusIcon />
                        <span className="ml-2">Create New Design</span>
                    </button>
                </div>
                 <div className="space-y-4">
                    {isLoading ? (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-10">Loading show designs...</p>
                    ) : clockwheels.length > 0 ? (
                        clockwheels.map(wheel => (
                            <div key={wheel.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                                    <div className="flex-grow">
                                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">{wheel.name}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{wheel.blocks.length} blocks per hour</p>
                                    </div>
                                    <div className="flex items-center space-x-3 mt-3 sm:mt-0 sm:ml-4 flex-shrink-0">
                                        <button onClick={() => handleEdit(wheel)} className="p-2 text-blue-500 hover:text-blue-600" title="Edit"><PencilIcon/></button>
                                        <button onClick={() => handleDelete(wheel)} className="p-2 text-red-500 hover:text-red-600" title="Delete"><TrashIcon/></button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                         <div className="text-center py-16 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">No show designs found</h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by creating a new hourly design.</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default ShowDesigner;