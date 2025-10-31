// FIX: Import ClockwheelBlockType to resolve type errors.
import type { ContentItem, Campaign, Clockwheel, ClockwheelBlock, Station, ClockwheelBlockType } from '../types';
import { isPlayableContent } from '../types';
import { generateWithRetry } from './ai';

const musicRadioFormat: ClockwheelBlockType[] = [ 'StationID', 'Music', 'Music', 'Ad', 'Jingle', 'Music', 'Music', 'News', 'Music', 'Promo' ];
const talkRadioFormat: ClockwheelBlockType[] = [ 'StationID', 'Article', 'Jingle', 'News', 'Ad', 'Weather', 'Article', 'Promo', 'Music', 'Jingle' ];

const parseDurationToSeconds = (durationStr: string): number => {
    if (!durationStr || typeof durationStr !== 'string' || !durationStr.includes(':')) return 0;
    const parts = durationStr.split(':').map(Number).filter(n => !isNaN(n));
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 1) return parts[0];
    return 0;
};

const mapBlockToContentType = (block: ClockwheelBlockType): ContentItem['type'][] => {
    switch (block) {
        case 'Music': return ['Music'];
        case 'Article': case 'News': case 'Weather': return ['Article', 'RSS Feed'];
        case 'Ad': return ['Ad'];
        case 'Jingle': case 'StationID': case 'Promo': return ['Custom Audio'];
        default: return [];
    }
}

export const generateSchedule = (
    content: ContentItem[],
    activeCampaigns: Campaign[],
    format: 'Music Radio' | 'Talk Radio',
    scheduleLength: number = 20
): ContentItem[] => {
    const schedule: ContentItem[] = [];
    const formatSequence = format === 'Music Radio' ? musicRadioFormat : talkRadioFormat;
    
    const availableContentByType: { [key in ContentItem['type']]?: ContentItem[] } = {};
    content.forEach(item => {
        if (!availableContentByType[item.type]) {
            availableContentByType[item.type] = [];
        }
        availableContentByType[item.type]!.push(item);
    });
    
    const activeCreativeIds = new Set(activeCampaigns.flatMap(c => c.creativeIds));

    let sequenceIndex = 0;
    let attempts = 0;
    const maxAttempts = scheduleLength * 5;

    while (schedule.length < scheduleLength && attempts < maxAttempts) {
        if (formatSequence.length === 0) break;
        
        const findRandomPlayableItem = (types: ContentItem['type'][]): ContentItem | null => {
            const pool = types.flatMap(type => availableContentByType[type] || []);
            if (pool.length === 0) return null;
            
            const shuffledPool = [...pool].sort(() => 0.5 - Math.random());
            for (const item of shuffledPool) {
                const isAudio = ['Music', 'Ad', 'Custom Audio'].includes(item.type);
                if ((isAudio && isPlayableContent(item)) || !isAudio) {
                    if (schedule.length > 0 && item.id === schedule[schedule.length - 1].originalId && pool.length > 1) {
                        continue;
                    }
                    return item;
                }
            }
            return null;
        }

        const block = formatSequence[sequenceIndex % formatSequence.length];
        let foundItem: ContentItem | null = null;
        
        if (block === 'Ad' && activeCampaigns.length > 0) {
            const adPool = (availableContentByType['Ad'] || []).filter(ad => activeCreativeIds.has(ad.id));
            if (adPool.length > 0) {
                const randomAd = adPool[Math.floor(Math.random() * adPool.length)];
                const campaign = activeCampaigns.find(c => c.creativeIds.includes(randomAd.id));
                if (campaign) {
                    foundItem = { ...randomAd, campaignId: campaign.id };
                }
            }
        }
        
        if (!foundItem) {
            foundItem = findRandomPlayableItem(mapBlockToContentType(block));
        }
        
        if (!foundItem) { // Fallback to music if preferred content not found
            foundItem = findRandomPlayableItem(['Music']);
        }
        
        if (foundItem) {
            schedule.push({ 
                ...foundItem, 
                id: `${foundItem.id}-${Date.now()}-${schedule.length}`,
                originalId: foundItem.id,
            });
        }

        sequenceIndex++;
        attempts++;
    }

    if (attempts >= maxAttempts && schedule.length < scheduleLength) {
        console.warn("Playout generator reached max attempts. The schedule may be incomplete.");
    }

    return schedule;
};


export const generateScheduleFromClockwheel = async (
    allContent: ContentItem[],
    activeCampaigns: Campaign[],
    clockwheel: Clockwheel,
    scheduleLengthHours: number
): Promise<ContentItem[]> => {
    const schedule: ContentItem[] = [];
    const availableContentByType: { [key in ContentItem['type']]?: ContentItem[] } = {};
    allContent.forEach(item => {
        if (!availableContentByType[item.type]) {
            availableContentByType[item.type] = [];
        }
        availableContentByType[item.type]!.push(item);
    });

    const activeCreativeIds = new Set(activeCampaigns.flatMap(c => c.creativeIds));

    const findRandomItem = (type: ClockwheelBlockType, rule: string): ContentItem | null => {
        let pool: ContentItem[] = [];
        switch (type) {
            case 'Music':
                pool = availableContentByType['Music'] || [];
                if (rule.toLowerCase() !== 'any' && rule.trim() !== '') {
                    const rules = rule.toLowerCase().split(',').map(r => r.trim());
                    pool = pool.filter(item => {
                        const musicItem = item as any;
                        const itemTags = [musicItem.genre, musicItem.mood, musicItem.notes].filter(Boolean).join(' ').toLowerCase();
                        return rules.some(r => itemTags.includes(r));
                    });
                }
                break;
            case 'Ad':
                pool = (availableContentByType['Ad'] || []).filter(ad => activeCreativeIds.has(ad.id));
                break;
            case 'Jingle': case 'StationID': case 'Promo':
                pool = availableContentByType['Custom Audio'] || [];
                // You could add rule-based filtering here if CustomAudioContent had tags
                break;
            case 'Article':
            case 'News': case 'Weather':
                pool = [...(availableContentByType['Article'] || []), ...(availableContentByType['RSS Feed'] || [])];
                // You could filter by title containing "News" or "Weather"
                break;
        }

        if (pool.length === 0) return null;

        const shuffledPool = [...pool].sort(() => 0.5 - Math.random());
        for (const item of shuffledPool) {
            const isAudio = ['Music', 'Ad', 'Custom Audio'].includes(item.type);
            if ((isAudio && isPlayableContent(item)) || !isAudio) {
                if (schedule.length > 0 && item.originalId === schedule[schedule.length - 1].originalId && pool.length > 1) {
                    continue;
                }
                return item;
            }
        }
        return null;
    };

    for (let h = 0; h < scheduleLengthHours; h++) {
        for (const block of clockwheel.blocks) {
             if (block.type === 'Thematic') {
                try {
                    const theme = block.rule;
                    const durationMinutes = block.count;
                    const availableContentForTheme = allContent.map(c => ({ 
                        id: c.id, 
                        type: c.type, 
                        title: c.title, 
                        artist: (c as any).artist || '',
                        duration: parseDurationToSeconds(c.duration), 
                        genre: (c as any).genre || '',
                        mood: (c as any).mood || ''
                    }));
                    
                    const prompt = `You are a professional radio program director. Create a playlist for a ${durationMinutes}-minute radio block with the theme "${theme}".
Select from the following content list. The total duration should be as close to ${durationMinutes} minutes as possible without going over.
Return ONLY a JSON array of the content IDs in the correct play order. Do not include any other text, explanations, or markdown.
\nAvailable Content: ${JSON.stringify(availableContentForTheme)}`;
                    
                    const response = await generateWithRetry({ model: 'gemini-2.5-flash', contents: prompt });
                    const responseText = response.text.replace(/```json|```/g, '').trim();
                    const ids = JSON.parse(responseText);

                    if (Array.isArray(ids)) {
                        const themedItems = ids.map(id => allContent.find(c => c.id === id)).filter((item): item is ContentItem => !!item);
                        for (const item of themedItems) {
                             schedule.push({ 
                                ...item, 
                                id: `${item.id}-themed-${Date.now()}-${schedule.length}`,
                                originalId: item.id,
                            });
                        }
                    }
                } catch (error) {
                    console.error(`AI failed to generate thematic block for "${block.rule}":`, error);
                    // Fallback on error: add one music track
                    const fallbackItem = findRandomItem('Music', 'Any');
                    if (fallbackItem) {
                         schedule.push({ 
                            ...fallbackItem, 
                            id: `${fallbackItem.id}-cw-fallback-${Date.now()}-${schedule.length}`,
                            originalId: fallbackItem.id,
                        });
                    }
                }
            } else {
                for (let i = 0; i < block.count; i++) {
                    let foundItem = findRandomItem(block.type, block.rule);
                    
                    if (!foundItem) {
                        foundItem = findRandomItem('Music', 'Any'); // Global fallback to any music
                    }

                    if (foundItem) {
                        let campaignId: string | undefined;
                        if (foundItem.type === 'Ad') {
                            const campaign = activeCampaigns.find(c => c.creativeIds.includes(foundItem!.id));
                            campaignId = campaign?.id;
                        }

                        schedule.push({ 
                            ...foundItem, 
                            id: `${foundItem.id}-cw-${Date.now()}-${schedule.length}`,
                            originalId: foundItem.id,
                            campaignId: campaignId,
                        });
                    } else {
                        console.warn(`Could not find any content for block type: ${block.type} with rule: ${block.rule}`);
                    }
                }
            }
        }
    }

    return schedule;
};