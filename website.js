
document.addEventListener('DOMContentLoaded', () => {
    const PUBLIC_WEBSITE_DATA_KEY = 'publicWebsiteData';

    const noContentMessage = document.getElementById('no-content-message');
    const mainContent = document.querySelector('main');

    try {
        const rawData = localStorage.getItem(PUBLIC_WEBSITE_DATA_KEY);
        if (!rawData) {
            if (mainContent) mainContent.style.display = 'none';
            if (noContentMessage) noContentMessage.style.display = 'block';
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
        if (scheduleSection && !settings.showSchedule) scheduleSection.style.display = 'none';

        const blogSection = document.getElementById('blog-section');
        if (blogSection && !settings.showBlog) blogSection.style.display = 'none';

        // --- Populate Schedule ---
        const scheduleListEl = document.getElementById('schedule-list');
        if (scheduleListEl && settings.showSchedule) {
            if (schedule && schedule.length > 0) {
                scheduleListEl.innerHTML = schedule.map(item => `
                    <div class="p-3 bg-gray-50 rounded-md flex justify-between items-center">
                        <div>
                            <p class="font-semibold text-gray-800">${item.title}</p>
                            <p class="text-sm text-gray-500">${item.artist || item.type}</p>
                        </div>
                        <span class="text-sm font-mono text-gray-400">${item.duration}</span>
                    </div>
                `).join('');
            } else {
                scheduleListEl.innerHTML = '<p class="text-gray-500">The station is currently offline. Check back soon!</p>';
            }
        }

        // --- Populate Blog Posts ---
        const blogPostsEl = document.getElementById('blog-posts');
        if (blogPostsEl && settings.showBlog) {
            if (articles && articles.length > 0) {
                blogPostsEl.innerHTML = articles.map(article => `
                    <article class="border-b pb-6">
                        <h4 class="text-xl font-bold hover:text-blue-600">
                            <a href="#">${article.title}</a>
                        </h4>
                        <p class="text-sm text-gray-500 mb-2">Posted on ${new Date(article.date).toLocaleDateString()}</p>
                        <p class="text-gray-600">${(article.content || '').substring(0, 150)}...</p>
                    </article>
                `).join('');
            } else {
                blogPostsEl.innerHTML = '<p class="text-gray-500">No recent blog posts.</p>';
            }
        }

    } catch (error) {
        console.error("Failed to load and render website data:", error);
        if (mainContent) mainContent.style.display = 'none';
        if (noContentMessage) noContentMessage.style.display = 'block';
    }
});
