document.addEventListener('DOMContentLoaded', () => {
    const PUBLIC_WEBSITE_DATA_KEY = 'publicWebsiteData';

    const noContentMessage = document.getElementById('no-content-message');
    const mainContent = document.querySelector('main');

    // Helper to parse duration string (e.g., "3:45") to seconds
    function parseDurationToSeconds(durationStr) {
        if (!durationStr || typeof durationStr !== 'string' || !durationStr.includes(':')) return 0;
        const parts = durationStr.split(':').map(Number).filter(n => !isNaN(n));
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        if (parts.length === 1) return parts[0];
        return 0;
    }

    // Helper to format seconds into HH:MM or MM:SS
    function formatTime(totalSeconds) {
        if (isNaN(totalSeconds) || totalSeconds < 0) return '0:00';
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    // Helper to get consistent artist/source info
    function getArtistOrSource(item) {
        switch (item.type) {
            case 'Music':
            case 'Custom Audio':
                return item.artist;
            case 'RSS Feed':
                return item.source;
            case 'Article':
                return 'Article'; // For articles, just display 'Article' as the secondary info
            case 'Ad':
                return 'Advertisement';
            default:
                return item.type;
        }
    }

    // Helper to get consistent color classes for content types
    function getScheduleItemTypeColor(type) {
        const colors = {
            'Music': 'bg-blue-500 border-blue-700',
            'Article': 'bg-green-500 border-green-700',
            'Ad': 'bg-yellow-500 border-yellow-700',
            'Custom Audio': 'bg-indigo-500 border-indigo-700',
            'RSS Feed': 'bg-purple-500 border-purple-700',
        };
        return colors[type] || 'bg-gray-500 border-gray-700';
    }

    try {
        const rawData = localStorage.getItem(PUBLIC_WEBSITE_DATA_KEY);
        if (!rawData) {
            if (mainContent) mainContent.style.display = 'none';
            if (noContentMessage) noContentMessage.classList.remove('hidden');
            console.warn('No public website data found in localStorage. The CMS might not have published yet.');
            return;
        }

        const data = JSON.parse(rawData);
        const { settings, station, articles, schedule } = data;

        // --- Populate Header & Footer ---
        document.title = station.name ? `${station.name} - AI Music Station` : 'AI Music Station';
        const stationNameEl = document.getElementById('station-name');
        if (stationNameEl) stationNameEl.textContent = station.name;
        const footerStationNameEl = document.getElementById('footer-station-name');
        if (footerStationNameEl) footerStationNameEl.textContent = station.name;

        const stationLogoEl = document.getElementById('station-logo');
        if (stationLogoEl && station.logo) {
            stationLogoEl.src = station.logo;
            stationLogoEl.classList.remove('hidden');
            stationLogoEl.setAttribute('aria-label', `${station.name} logo`);
        } else if (stationLogoEl) {
            stationLogoEl.classList.add('hidden');
        }

        // --- Populate Hero Section ---
        const heroTitleEl = document.getElementById('hero-title');
        if (heroTitleEl) heroTitleEl.textContent = settings.heroTitle;
        const heroSubtitleEl = document.getElementById('hero-subtitle');
        if (heroSubtitleEl) heroSubtitleEl.textContent = settings.heroSubtitle;

        // --- Toggle Sections ---
        const featuredSection = document.getElementById('featured-section');
        if (featuredSection) featuredSection.style.display = settings.showFeatured ? 'block' : 'none';
        
        const scheduleSection = document.getElementById('schedule-section');
        if (scheduleSection) scheduleSection.style.display = settings.showSchedule ? 'block' : 'none';

        const blogSection = document.getElementById('blog-section');
        if (blogSection) blogSection.style.display = settings.showBlog ? 'block' : 'none';

        // --- Populate Schedule ---
        const scheduleListEl = document.getElementById('schedule-list');
        if (scheduleListEl && settings.showSchedule) {
            if (schedule && schedule.length > 0) {
                let currentTime = new Date(); // Start time for the first item in the visible schedule

                scheduleListEl.innerHTML = schedule.map((item, index) => {
                    const durationSeconds = parseDurationToSeconds(item.duration);
                    const startTime = new Date(currentTime.getTime());
                    const endTime = new Date(startTime.getTime() + durationSeconds * 1000);
                    
                    const itemColorClass = getScheduleItemTypeColor(item.type);
                    const secondaryInfo = getArtistOrSource(item);

                    // Update currentTime for the next item
                    currentTime = endTime;

                    return `
                        <div class="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md flex flex-col sm:flex-row justify-between items-start sm:items-center border-l-4 ${itemColorClass.replace('bg-', 'border-')}">
                            <div class="mb-2 sm:mb-0">
                                <p class="font-semibold text-gray-800 dark:text-white">${item.title}</p>
                                <p class="text-sm text-gray-500 dark:text-gray-400">${secondaryInfo}</p>
                            </div>
                            <span class="text-sm font-mono text-gray-500 dark:text-gray-400" aria-label="Duration">${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    `;
                }).join('');
            } else {
                scheduleListEl.innerHTML = '<p class="text-gray-500 dark:text-gray-400">The station is currently offline or the schedule is empty. Check back soon!</p>';
            }
        }

        // --- Populate Blog Posts ---
        const blogPostsEl = document.getElementById('blog-posts');
        if (blogPostsEl && settings.showBlog) {
            if (articles && articles.length > 0) {
                blogPostsEl.innerHTML = articles.map(article => `
                    <article class="border-b dark:border-gray-700 pb-6 last:border-b-0">
                        <h4 class="text-xl font-bold text-gray-900 dark:text-white hover:text-blue-600" aria-label="Article title: ${article.title}">
                            <a href="#" class="block">${article.title}</a>
                        </h4>
                        <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">Posted on ${new Date(article.date).toLocaleDateString()}</p>
                        <p class="text-gray-600 dark:text-gray-300">${(article.content || '').substring(0, 180)}... <a href="#" class="text-brand-blue hover:underline" aria-label="Read more about ${article.title}">Read More</a></p>
                    </article>
                `).join('');
            } else {
                blogPostsEl.innerHTML = '<p class="text-gray-500 dark:text-gray-400">No recent blog posts to display.</p>';
            }
        }

    } catch (error) {
        console.error("Failed to load and render website data:", error);
        if (mainContent) mainContent.style.display = 'none';
        if (noContentMessage) noContentMessage.classList.remove('hidden');
    }
});