document.addEventListener('DOMContentLoaded', () => {
    const PUBLIC_WEBSITE_DATA_KEY = 'publicWebsiteData';

    const noContentMessage = document.getElementById('no-content-message');
    const mainContent = document.querySelector('main');

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
            'Music': 'bg-blue-500',
            'Article': 'bg-green-500',
            'Ad': 'bg-yellow-500',
            'Custom Audio': 'bg-indigo-500',
            'RSS Feed': 'bg-purple-500',
        };
        return colors[type] || 'bg-gray-500';
    }

    try {
        const rawData = localStorage.getItem(PUBLIC_WEBSITE_DATA_KEY);
        if (!rawData) {
            if (mainContent) mainContent.style.display = 'none';
            if (noContentMessage) noContentMessage.classList.remove('hidden');
            console.warn('No public website data found in localStorage.');
            return;
        }

        const data = JSON.parse(rawData);
        const { settings, station, articles, schedule } = data;

        // --- Populate Header & Footer ---
        document.title = station.name || 'AI Music Station';
        const stationNameEl = document.getElementById('station-name');
        if (stationNameEl) stationNameEl.textContent = station.name;
        const footerStationNameEl = document.getElementById('footer-station-name');
        if (footerStationNameEl) footerStationNameEl.textContent = station.name;

        const stationLogoEl = document.getElementById('station-logo');
        if (stationLogoEl && station.logo) {
            stationLogoEl.src = station.logo;
            stationLogoEl.classList.remove('hidden');
        }

        // --- Populate Hero Section ---
        const heroTitleEl = document.getElementById('hero-title');
        if (heroTitleEl) heroTitleEl.textContent = settings.heroTitle;
        const heroSubtitleEl = document.getElementById('hero-subtitle');
        if (heroSubtitleEl) heroSubtitleEl.textContent = settings.heroSubtitle;

        // --- Toggle Sections ---
        const featuredSection = document.getElementById('featured-section');
        if (featuredSection && !settings.showFeatured) featuredSection.style.display = 'none';
        
        const scheduleSection = document.getElementById('schedule-section');
        if (scheduleSection) scheduleSection.style.display = settings.showSchedule ? 'block' : 'none';

        const blogSection = document.getElementById('blog-section');
        if (blogSection) blogSection.style.display = settings.showBlog ? 'block' : 'none';

        // --- Populate Schedule ---
        const scheduleListEl = document.getElementById('schedule-list');
        if (scheduleListEl && settings.showSchedule) {
            if (schedule && schedule.length > 0) {
                scheduleListEl.innerHTML = schedule.map(item => {
                    const itemColorClass = getScheduleItemTypeColor(item.type);
                    const secondaryInfo = getArtistOrSource(item);
                    return `
                        <div class="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md flex justify-between items-center border-l-4 ${itemColorClass.replace('bg-', 'border-')}">
                            <div>
                                <p class="font-semibold text-gray-800 dark:text-white">${item.title}</p>
                                <p class="text-sm text-gray-500 dark:text-gray-400">${secondaryInfo}</p>
                            </div>
                            <span class="text-sm font-mono text-gray-400 dark:text-gray-500">${item.duration || '0:00'}</span>
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
                    <article class="border-b dark:border-gray-700 pb-6">
                        <h4 class="text-xl font-bold text-gray-900 dark:text-white hover:text-blue-600">
                            <a href="#">${article.title}</a>
                        </h4>
                        <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">Posted on ${new Date(article.date).toLocaleDateString()}</p>
                        <p class="text-gray-600 dark:text-gray-300">${(article.content || '').substring(0, 150)}...</p>
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