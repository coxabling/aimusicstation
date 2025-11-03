import type { ContentItem, AudioContent, ArticleHistoryItem, SavedSchedule, Playlist, ClonedVoice, User, RssFeedSettings, SocialPost, Submission, Campaign, CreditUsageLog, Clockwheel, Webhook } from '../types';

const DB_NAME = 'ai-music-station-db';
// Increment DB version to add new webhooks object store.
const DB_VERSION = 13; // Increment version for schema change
const CONTENT_STORE = 'contentItems';
const AUDIO_STORE = 'audioContent';
const HISTORY_STORE = 'articleHistory';
const SAVED_SCHEDULES_STORE = 'savedSchedules';
const PLAYLISTS_STORE = 'playlists';
const CLONED_VOICES_STORE = 'clonedVoices';
const USERS_STORE = 'users';
const RSS_FEEDS_STORE = 'rssFeedSettings';
const SOCIAL_POSTS_STORE = 'socialPosts';
const SUBMISSIONS_STORE = 'submissions';
const CAMPAIGNS_STORE = 'campaigns';
const CREDIT_LOGS_STORE = 'creditUsageLogs';
const CLOCKWHEELS_STORE = 'clockwheels';
const WEBHOOKS_STORE = 'webhooks';


let db: IDBDatabase;

const dbReady = new Promise<IDBDatabase>((resolve, reject) => {
    const openRequest = indexedDB.open(DB_NAME, DB_VERSION);

    openRequest.onerror = () => {
        console.error("Error opening IndexedDB", openRequest.error);
        reject(openRequest.error);
    };

    openRequest.onsuccess = () => {
        db = openRequest.result;
        resolve(db);
    };

    openRequest.onupgradeneeded = (event) => {
        const tempDb = (event.target as IDBOpenDBRequest).result;
        const storeNames = tempDb.objectStoreNames;

        const createStoreWithIndex = (storeName: string) => {
            if (!storeNames.contains(storeName)) {
                 const store = tempDb.createObjectStore(storeName, { keyPath: 'id' });
                 store.createIndex('tenantId', 'tenantId', { unique: false });
            }
        };
        
        createStoreWithIndex(CONTENT_STORE);
        createStoreWithIndex(AUDIO_STORE);
        createStoreWithIndex(HISTORY_STORE);
        createStoreWithIndex(SAVED_SCHEDULES_STORE);
        createStoreWithIndex(PLAYLISTS_STORE);
        createStoreWithIndex(CLONED_VOICES_STORE);
        createStoreWithIndex(RSS_FEEDS_STORE);
        createStoreWithIndex(SOCIAL_POSTS_STORE);
        createStoreWithIndex(SUBMISSIONS_STORE);
        createStoreWithIndex(CAMPAIGNS_STORE);
        createStoreWithIndex(CREDIT_LOGS_STORE);
        createStoreWithIndex(CLOCKWHEELS_STORE);
        createStoreWithIndex(WEBHOOKS_STORE);

        if (!storeNames.contains(USERS_STORE)) {
            const userStore = tempDb.createObjectStore(USERS_STORE, { keyPath: 'id' });
            userStore.createIndex('tenantId', 'tenantId', { unique: false });
        }
    };
});

// A helper function to promisify IDBRequest
function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// --- Seeding ---
export const seedInitialData = async () => {
    const db = await dbReady;
    const tx = db.transaction(USERS_STORE, 'readonly');
    const store = tx.objectStore(USERS_STORE);
    const count = await promisifyRequest(store.count());
    if (count === 0) {
        console.log("Seeding initial data...");
        const seedTx = db.transaction([USERS_STORE, SUBMISSIONS_STORE, CAMPAIGNS_STORE, CONTENT_STORE], 'readwrite');
        const userStore = seedTx.objectStore(USERS_STORE);
        const submissionStore = seedTx.objectStore(SUBMISSIONS_STORE);
        const campaignStore = seedTx.objectStore(CAMPAIGNS_STORE);
        const contentStore = seedTx.objectStore(CONTENT_STORE);

        const defaultTenantId = 'default-tenant';
        const renewalDate = new Date();
        renewalDate.setFullYear(renewalDate.getFullYear() + 1);
        const isoRenewalDate = renewalDate.toISOString();
        
        await Promise.all([
            promisifyRequest(userStore.put({ id: 'admin@test.com', email: 'admin@test.com', username: 'admin', role: 'Admin', tenantId: defaultTenantId, avatar: null, credits: 50000, subscriptionPlan: 'Pro Broadcaster', renewalDate: isoRenewalDate, status: 'active' })),
            promisifyRequest(userStore.put({ id: 'user@test.com', email: 'user@test.com', username: 'user', role: 'User', tenantId: defaultTenantId, avatar: null, credits: 5000, subscriptionPlan: 'Hobby', renewalDate: isoRenewalDate, status: 'active' })),
            promisifyRequest(submissionStore.put({ id: 'sub1', tenantId: defaultTenantId, type: 'Shoutout', from: 'Sarah', location: 'London', message: 'Big shoutout to the whole team working late tonight! Keep the tunes coming!', status: 'pending', createdAt: new Date().toISOString() })),
            promisifyRequest(submissionStore.put({ id: 'sub2', tenantId: defaultTenantId, type: 'Song Request', from: 'Mark', message: 'Cybernetic Dreams', status: 'pending', createdAt: new Date(Date.now() - 3600000).toISOString() })),
            promisifyRequest(submissionStore.put({ id: 'sub3', tenantId: defaultTenantId, type: 'Song Request', from: 'Jen', message: 'Ocean Drive by Miami Nights', status: 'approved', createdAt: new Date(Date.now() - 7200000).toISOString() })),
            promisifyRequest(submissionStore.put({ id: 'sub4', tenantId: defaultTenantId, type: 'Shoutout', from: 'Anonymous', message: 'This station is the best!', status: 'rejected', createdAt: new Date(Date.now() - 10800000).toISOString() })),
            
            // Seed Ads
            promisifyRequest(contentStore.put({ id: 'ad-seed-1', tenantId: defaultTenantId, type: 'Ad', title: 'TechCorp Ad Spot', duration: '0:30', date: new Date().toISOString(), url: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Monplaisir/Antigravity/Monplaisir_-_04_-_Antigravity.mp3' })),
            promisifyRequest(contentStore.put({ id: 'ad-seed-2', tenantId: defaultTenantId, type: 'Ad', title: 'Coffee House Promo', duration: '0:15', date: new Date().toISOString(), url: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/ccCommunity/E_s_Jammy_Jams/The_Jazz_Piano/E_s_Jammy_Jams_-_The_Jazz_Piano.mp3' })),

            // Seed Campaigns
            promisifyRequest(campaignStore.put({ id: 'camp-1', tenantId: defaultTenantId, name: 'Summer Sale 2024', sponsor: 'TechCorp', startDate: new Date('2024-07-01').toISOString(), endDate: new Date('2024-08-31').toISOString(), status: 'active', impressionGoal: 1000, impressions: 125, creativeIds: ['ad-seed-1'] })),
            promisifyRequest(campaignStore.put({ id: 'camp-2', tenantId: defaultTenantId, name: 'Morning Brew Special', sponsor: 'Coffee House', startDate: new Date('2024-07-15').toISOString(), endDate: new Date('2024-07-31').toISOString(), status: 'active', impressionGoal: 500, impressions: 250, creativeIds: ['ad-seed-2'] })),
            promisifyRequest(campaignStore.put({ id: 'camp-3', tenantId: defaultTenantId, name: 'Past Campaign', sponsor: 'Old Sponsor', startDate: new Date('2024-05-01').toISOString(), endDate: new Date('2024-05-31').toISOString(), status: 'completed', impressionGoal: 200, impressions: 200, creativeIds: [] }))
        ]);
        console.log("Seeding complete.");
    }
};

// --- Users ---
export const getAllUsers = async (): Promise<User[]> => {
    const db = await dbReady;
    const tx = db.transaction(USERS_STORE, 'readonly');
    return promisifyRequest(tx.objectStore(USERS_STORE).getAll());
};

export const getUsersByTenant = async (tenantId: string): Promise<User[]> => {
    const db = await dbReady;
    const tx = db.transaction(USERS_STORE, 'readonly');
    const store = tx.objectStore(USERS_STORE);
    const index = store.index('tenantId');
    return promisifyRequest(index.getAll(tenantId));
};

export const getUser = async (id: string): Promise<User | undefined> => {
    const db = await dbReady;
    const tx = db.transaction(USERS_STORE, 'readonly');
    return promisifyRequest(tx.objectStore(USERS_STORE).get(id));
};

export const saveUser = async (user: User): Promise<void> => {
    const db = await dbReady;
    const tx = db.transaction(USERS_STORE, 'readwrite');
    await promisifyRequest(tx.objectStore(USERS_STORE).put(user));
};

export const deleteUser = (id: string, tenantId: string): Promise<void> => {
    return deleteItems(USERS_STORE, [id], tenantId);
};

// --- Generic Tenant-Scoped Functions ---
const getAllByTenant = async <T>(storeName: string, tenantId: string): Promise<T[]> => {
    const db = await dbReady;
    const tx = db.transaction(storeName, 'readonly');
    const index = tx.objectStore(storeName).index('tenantId');
    return promisifyRequest(index.getAll(tenantId));
};

const getByIdAndTenant = async <T>(storeName: string, id: string, tenantId: string): Promise<T | undefined> => {
    const db = await dbReady;
    const item = await promisifyRequest(db.transaction(storeName, 'readonly').objectStore(storeName).get(id)) as T & { tenantId?: string };
    return item && item.tenantId === tenantId ? item : undefined;
};

const saveItem = async <T>(storeName: string, item: T): Promise<void> => {
    const db = await dbReady;
    const tx = db.transaction(storeName, 'readwrite');
    await promisifyRequest(tx.objectStore(storeName).put(item));
};

const bulkSaveItems = async <T>(storeName: string, items: T[]): Promise<void> => {
    const db = await dbReady;
    const tx = db.transaction(storeName, 'readwrite');
    await Promise.all(items.map(item => promisifyRequest(tx.objectStore(storeName).put(item))));
};

const deleteItems = (storeName: string, ids: string[], tenantId: string): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!ids || ids.length === 0) {
                return resolve();
            }

            const db = await dbReady;
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);

            tx.oncomplete = () => resolve();
            tx.onerror = (event) => reject((event.target as IDBTransaction).error);
            tx.onabort = (event) => reject((event.target as IDBTransaction).error);

            // Queue up all the checks and deletions. The transaction will not complete
            // until all these requests are processed.
            ids.forEach(id => {
                const getRequest = store.get(id);
                // Errors will bubble up to the transaction's onerror/onabort
                getRequest.onsuccess = () => {
                    const item = getRequest.result as { tenantId?: string } | undefined;
                    if (item && item.tenantId === tenantId) {
                        store.delete(id);
                    }
                };
            });
        } catch (error) {
            reject(error);
        }
    });
};

// --- Playlist Helper ---
const removeTracksFromAllPlaylists = async (trackIdsToRemove: string[], tenantId: string): Promise<void> => {
    if (trackIdsToRemove.length === 0) {
        return;
    }
    const db = await dbReady;
    const tx = db.transaction(PLAYLISTS_STORE, 'readwrite');
    const store = tx.objectStore(PLAYLISTS_STORE);
    const index = store.index('tenantId');
    const openCursorRequest = index.openCursor(IDBKeyRange.only(tenantId));

    const idsToRemoveSet = new Set(trackIdsToRemove);

    return new Promise((resolve, reject) => {
        openCursorRequest.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
                const playlist: Playlist = cursor.value;
                const originalTrackCount = playlist.trackIds.length;
                
                playlist.trackIds = playlist.trackIds.filter(id => !idsToRemoveSet.has(id));

                if (playlist.trackIds.length < originalTrackCount) {
                    cursor.update(playlist);
                }
                cursor.continue();
            } else {
                // When cursor is null, we are done
                resolve();
            }
        };

        openCursorRequest.onerror = () => reject(openCursorRequest.error);
        tx.onabort = () => reject(tx.error);
    });
};


// --- Content Items ---
export const getAllContentItems = (tenantId: string): Promise<ContentItem[]> => getAllByTenant(CONTENT_STORE, tenantId);
export const getContentItem = (id: string, tenantId: string): Promise<ContentItem | undefined> => getByIdAndTenant(CONTENT_STORE, id, tenantId);
export const saveContentItem = (item: ContentItem): Promise<void> => saveItem(CONTENT_STORE, item);
export const bulkSaveContentItems = (items: ContentItem[]): Promise<void> => bulkSaveItems(CONTENT_STORE, items);
export const deleteContentItems = async (ids: string[], tenantId: string): Promise<void> => {
    await removeTracksFromAllPlaylists(ids, tenantId);
    await deleteItems(CONTENT_STORE, ids, tenantId);
};

export const bulkUpdateContentItems = (ids: string[], changes: Partial<Omit<ContentItem, 'id'>>, tenantId: string): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        const db = await dbReady;
        const tx = db.transaction(CONTENT_STORE, 'readwrite');
        const store = tx.objectStore(CONTENT_STORE);

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);

        ids.forEach(id => {
            const getRequest = store.get(id);
            getRequest.onsuccess = () => {
                const item = getRequest.result as ContentItem | undefined;
                if (item && item.tenantId === tenantId) {
                    const updatedItem = { ...item, ...changes };
                    store.put(updatedItem);
                }
            };
        });
    });
};

// --- Audio Content ---
export const getAllAudioContent = (tenantId: string): Promise<AudioContent[]> => getAllByTenant(AUDIO_STORE, tenantId);
export const getAudioContent = (id: string, tenantId: string): Promise<AudioContent | undefined> => getByIdAndTenant(AUDIO_STORE, id, tenantId);
export const saveAudioContent = (item: AudioContent): Promise<void> => saveItem(AUDIO_STORE, item);
export const bulkSaveAudioContent = (items: AudioContent[]): Promise<void> => bulkSaveItems(AUDIO_STORE, items);
export const deleteAudioContent = async (ids: string[], tenantId: string): Promise<void> => {
    await removeTracksFromAllPlaylists(ids, tenantId);
    await deleteItems(AUDIO_STORE, ids, tenantId);
};

// --- Article History ---
export const getAllGeneratedArticles = (tenantId: string): Promise<ArticleHistoryItem[]> => getAllByTenant(HISTORY_STORE, tenantId);
export const saveGeneratedArticle = (item: ArticleHistoryItem): Promise<void> => saveItem(HISTORY_STORE, item);
export const deleteGeneratedArticle = (id: string, tenantId: string): Promise<void> => deleteItems(HISTORY_STORE, [id], tenantId);

// --- Saved Schedules ---
export const getAllSavedSchedules = (tenantId: string): Promise<SavedSchedule[]> => getAllByTenant(SAVED_SCHEDULES_STORE, tenantId);
export const saveSchedule = (schedule: SavedSchedule): Promise<void> => saveItem(SAVED_SCHEDULES_STORE, schedule);
export const deleteSchedule = (id: string, tenantId: string): Promise<void> => deleteItems(SAVED_SCHEDULES_STORE, [id], tenantId);

// --- Playlists ---
export const getAllPlaylists = (tenantId: string): Promise<Playlist[]> => getAllByTenant(PLAYLISTS_STORE, tenantId);
export const savePlaylist = (playlist: Playlist): Promise<void> => saveItem(PLAYLISTS_STORE, playlist);
export const deletePlaylist = (id: string, tenantId: string): Promise<void> => deleteItems(PLAYLISTS_STORE, [id], tenantId);

export const addTracksToPlaylists = (trackIds: string[], playlistIds: string[], tenantId: string): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        const db = await dbReady;
        const tx = db.transaction(PLAYLISTS_STORE, 'readwrite');
        const store = tx.objectStore(PLAYLISTS_STORE);
        const trackIdsToAdd = new Set(trackIds);

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);

        playlistIds.forEach(id => {
            const getRequest = store.get(id);
            getRequest.onsuccess = () => {
                const playlist = getRequest.result as Playlist | undefined;
                if (playlist && playlist.tenantId === tenantId) {
                    const existingTrackIds = new Set(playlist.trackIds);
                    trackIdsToAdd.forEach(trackId => existingTrackIds.add(trackId));
                    const updatedPlaylist: Playlist = { ...playlist, trackIds: Array.from(existingTrackIds) };
                    
                    store.put(updatedPlaylist);
                }
            };
        });
    });
};

// --- Cloned Voices ---
export const getAllClonedVoices = (tenantId: string): Promise<ClonedVoice[]> => getAllByTenant(CLONED_VOICES_STORE, tenantId);
export const saveClonedVoice = (voice: ClonedVoice): Promise<void> => saveItem(CLONED_VOICES_STORE, voice);
export const deleteClonedVoice = (id: string, tenantId: string): Promise<void> => deleteItems(CLONED_VOICES_STORE, [id], tenantId);

// --- Clockwheels ---
export const getAllClockwheels = (tenantId: string): Promise<Clockwheel[]> => getAllByTenant(CLOCKWHEELS_STORE, tenantId);
export const saveClockwheel = (wheel: Clockwheel): Promise<void> => saveItem(CLOCKWHEELS_STORE, wheel);
export const deleteClockwheel = (id: string, tenantId: string): Promise<void> => deleteItems(CLOCKWHEELS_STORE, [id], tenantId);

// --- Webhooks ---
export const getAllWebhooks = (tenantId: string): Promise<Webhook[]> => getAllByTenant(WEBHOOKS_STORE, tenantId);
export const saveWebhook = (item: Webhook): Promise<void> => saveItem(WEBHOOKS_STORE, item);
export const deleteWebhook = (id: string, tenantId: string): Promise<void> => deleteItems(WEBHOOKS_STORE, [id], tenantId);

// --- RSS Feed Settings ---
export const getAllRssFeedSettings = (tenantId: string): Promise<RssFeedSettings[]> => getAllByTenant(RSS_FEEDS_STORE, tenantId);
export const saveRssFeedSettings = (settings: RssFeedSettings): Promise<void> => saveItem(RSS_FEEDS_STORE, settings);
export const deleteRssFeedSettings = (id: string, tenantId: string): Promise<void> => deleteItems(RSS_FEEDS_STORE, [id], tenantId);

// --- Social Posts ---
export const getAllSocialPosts = (tenantId: string): Promise<SocialPost[]> => getAllByTenant(SOCIAL_POSTS_STORE, tenantId);
export const saveSocialPost = (post: SocialPost): Promise<void> => saveItem(SOCIAL_POSTS_STORE, post);
export const bulkSaveSocialPosts = (posts: SocialPost[]): Promise<void> => bulkSaveItems(SOCIAL_POSTS_STORE, posts);
export const deleteSocialPosts = (ids: string[], tenantId: string): Promise<void> => deleteItems(SOCIAL_POSTS_STORE, ids, tenantId);

// --- Submissions ---
export const getAllSubmissions = (tenantId: string): Promise<Submission[]> => getAllByTenant(SUBMISSIONS_STORE, tenantId);
export const saveSubmission = (item: Submission): Promise<void> => saveItem(SUBMISSIONS_STORE, item);
export const deleteSubmissions = (ids: string[], tenantId: string): Promise<void> => deleteItems(SUBMISSIONS_STORE, ids, tenantId);

// --- Campaigns ---
export const getAllCampaigns = (tenantId: string): Promise<Campaign[]> => getAllByTenant(CAMPAIGNS_STORE, tenantId);
export const saveCampaign = (campaign: Campaign): Promise<void> => saveItem(CAMPAIGNS_STORE, campaign);
export const deleteCampaign = (id: string, tenantId: string): Promise<void> => deleteItems(CAMPAIGNS_STORE, [id], tenantId);

export const incrementCampaignImpressions = async (campaignId: string, tenantId: string) => {
    const db = await dbReady;
    const tx = db.transaction(CAMPAIGNS_STORE, 'readwrite');
    const store = tx.objectStore(CAMPAIGNS_STORE);
    const getRequest = store.get(campaignId);
    return new Promise<void>((resolve, reject) => {
        getRequest.onsuccess = () => {
            const campaign = getRequest.result as Campaign | undefined;
            if (campaign && campaign.tenantId === tenantId) {
                campaign.impressions += 1;
                // Optional: Check if goal is met and update status
                if (campaign.impressionGoal && campaign.impressions >= campaign.impressionGoal) {
                    campaign.status = 'completed';
                }
                const putRequest = store.put(campaign);
                putRequest.onsuccess = () => resolve();
                putRequest.onerror = () => reject(putRequest.error);
            } else {
                resolve(); // Campaign not found or tenant mismatch, do nothing.
            }
        };
        getRequest.onerror = () => reject(getRequest.error);
    });
};

// --- Credit Logs ---
export const getCreditLogsByTenant = (tenantId: string): Promise<CreditUsageLog[]> => getAllByTenant(CREDIT_LOGS_STORE, tenantId);
export const saveCreditLog = (log: CreditUsageLog): Promise<void> => saveItem(CREDIT_LOGS_STORE, log);