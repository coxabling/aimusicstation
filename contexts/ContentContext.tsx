import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback, useRef } from 'react';
import type { ContentItem, AudioContent } from '../types';
import * as db from '../services/db';
import { useAuth } from './AuthContext';

interface ContentContextType {
    contentItems: ContentItem[];
    audioContentItems: AudioContent[];
    isLoading: boolean;
    loadContent: () => Promise<void>;
    addContentItem: (item: Partial<ContentItem>, file?: File) => Promise<void>;
    bulkAddContentItems: (items: Partial<Omit<ContentItem, 'id' | 'date' | 'tenantId'>>[], files: File[]) => Promise<void>;
    bulkAddTextContentItems: (items: Partial<Omit<ContentItem, 'id' | 'date' | 'tenantId'>>[]) => Promise<ContentItem[]>;
    updateContentItem: (item: ContentItem) => Promise<void>;
    deleteContentItems: (ids: string[]) => Promise<void>;
    bulkUpdateContentItems: (ids: string[], changes: Partial<Omit<ContentItem, 'id'>>) => Promise<void>;
}

const ContentContext = createContext<ContentContextType | undefined>(undefined);

export const ContentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { currentUser } = useAuth();
    const [contentItems, setContentItems] = useState<ContentItem[]>([]);
    const [audioContentItems, setAudioContentItems] = useState<AudioContent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const createdUrlsRef = useRef<string[]>([]);

    useEffect(() => {
        return () => {
            createdUrlsRef.current.forEach(URL.revokeObjectURL);
        };
    }, []);

    const processBlobs = useCallback(<T extends AudioContent | ContentItem>(items: T[]): T[] => {
        return items.map(item => {
            if ('file' in item && item.file && item.file instanceof Blob && !item.url?.startsWith('blob:')) {
                const url = URL.createObjectURL(item.file);
                createdUrlsRef.current.push(url);
                return { ...item, url };
            }
            return item;
        });
    }, []);

    const loadContent = useCallback(async () => {
        if (!currentUser) {
            setContentItems([]);
            setAudioContentItems([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        
        const [itemsFromDb, audioFromDb] = await Promise.all([
            db.getAllContentItems(currentUser.tenantId),
            db.getAllAudioContent(currentUser.tenantId)
        ]);
        
        setContentItems(processBlobs(itemsFromDb));
        setAudioContentItems(processBlobs(audioFromDb));

        setIsLoading(false);
    }, [processBlobs, currentUser]);

    useEffect(() => {
        loadContent();
    }, [loadContent]);

    const addContentItem = async (itemData: Partial<ContentItem>, file?: File) => {
        if (!currentUser) return;
        const newItem: ContentItem = {
            id: new Date().toISOString(),
            tenantId: currentUser.tenantId,
            date: new Date().toISOString().split('T')[0],
            duration: '0:00',
            ...itemData,
        } as ContentItem;

        if (file) {
            (newItem as any).file = file;
        }
        await db.saveContentItem(newItem);
        await loadContent();
    };

    const bulkAddContentItems = async (itemsData: Partial<Omit<ContentItem, 'id' | 'date' | 'tenantId'>>[], files: File[]) => {
        if (!currentUser) return;
        const newItems: ContentItem[] = itemsData.map((itemData, index) => ({
            id: `${new Date().toISOString()}-${index}`,
            tenantId: currentUser.tenantId,
            date: new Date().toISOString().split('T')[0],
            ...itemData,
            file: files[index],
        } as ContentItem));
    
        await db.bulkSaveContentItems(newItems);
        await loadContent();
    };
    
    const bulkAddTextContentItems = async (itemsData: Partial<Omit<ContentItem, 'id' | 'date' | 'tenantId'>>[]): Promise<ContentItem[]> => {
        if (!currentUser) return [];
        const newItems: ContentItem[] = itemsData.map((itemData, index) => ({
            id: `${new Date().toISOString()}-${index}`,
            tenantId: currentUser.tenantId,
            date: new Date().toISOString().split('T')[0],
            duration: 'N/A', // default duration for articles
            ...itemData,
        } as ContentItem));
    
        await db.bulkSaveContentItems(newItems);
        await loadContent(); // Only reload once
        return newItems;
    };

    const updateContentItem = async (updatedItemData: ContentItem) => {
        if (!currentUser || updatedItemData.tenantId !== currentUser.tenantId) return;
        const existingItem = await db.getContentItem(updatedItemData.id, currentUser.tenantId);
        if (!existingItem) {
            console.error("Item to update not found in DB or tenant mismatch.");
            return;
        }
        
        const mergedItem = { ...existingItem, ...updatedItemData };
        const itemForDb = { ...mergedItem };
        if ('url' in itemForDb && itemForDb.url?.startsWith('blob:')) {
            delete (itemForDb as any).url;
        }
    
        await db.saveContentItem(itemForDb);
        await loadContent();
    };

    const deleteContentItems = async (ids: string[]) => {
        if (!currentUser) return;
        await db.deleteContentItems(ids, currentUser.tenantId);
        await loadContent();
    };
    
    const bulkUpdateContentItems = async (ids: string[], changes: Partial<Omit<ContentItem, 'id'>>) => {
        if (!currentUser) return;
        await db.bulkUpdateContentItems(ids, changes, currentUser.tenantId);
        await loadContent();
    };

    const value = { 
        contentItems, 
        audioContentItems,
        isLoading, 
        loadContent,
        addContentItem,
        bulkAddContentItems,
        bulkAddTextContentItems,
        updateContentItem, 
        deleteContentItems, 
        bulkUpdateContentItems 
    };

    return (
        <ContentContext.Provider value={value}>
            {children}
        </ContentContext.Provider>
    );
};

export const useContent = (): ContentContextType => {
    const context = useContext(ContentContext);
    if (context === undefined) {
        throw new Error('useContent must be used within a ContentProvider');
    }
    return context;
};