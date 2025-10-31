export interface RssArticle {
    title: string;
    content: string;
    date: string;
    link: string;
}

const mockFeeds: Record<string, RssArticle[]> = {
    'default': [
        { title: 'AI Takes Over the Music Industry', content: 'In a stunning turn of events, AI has become the dominant force in music creation, curation, and distribution. Artists and labels are scrambling to adapt to the new landscape.', date: '2024-07-15T10:00:00Z', link: 'https://example.com/ai-music' },
        { title: 'New Breakthrough in Quantum Computing Affects Audio Processing', content: 'Scientists today announced a major breakthrough in quantum computing that could revolutionize real-time audio processing, promising lossless quality at incredibly high speeds.', date: '2024-07-14T15:30:00Z', link: 'https://example.com/quantum-audio' },
        { title: 'The Rise of Retro Futurism in Modern Art and Music', content: 'A new art movement, blending 80s aesthetics with futuristic concepts, is sweeping the globe. We explore how this trend is influencing everything from synthwave music to graphic design.', date: '2024-07-13T09:00:00Z', link: 'https://example.com/retro-futurism' },
    ],
    'rss.com/tech': [
        { title: 'Tech Giant Releases New Smart Radio with AI Integration', content: 'TechCorp has unveiled its latest innovation, the "Aether Radio," which uses AI to create personalized stations and generate live commentary on the fly.', date: '2024-07-15T11:00:00Z', link: 'https://example.com/tech/smart-radio' },
        { title: '5G Rollout Faces Unexpected Delays Due to Solar Flares', content: 'The global rollout of 5G technology has hit a snag as recent solar activity has interfered with satellite communications, causing widespread delays.', date: '2024-07-14T18:00:00Z', link: 'https://example.com/tech/5g-delay' },
    ]
};

export const fetchRssFeed = (url: string): Promise<RssArticle[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const key = Object.keys(mockFeeds).find(k => url.includes(k)) || 'default';
            resolve(mockFeeds[key]);
        }, 1000);
    });
};
