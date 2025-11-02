document.addEventListener('DOMContentLoaded', () => {
    const noContentMessage = document.getElementById('no-content-message');
    const mainContent = document.querySelector('main');
    let contentRendered = false;

    /**
     * Generates a user-friendly secondary line of text for a schedule item.
     * @param {object} item The schedule item.
     * @returns {string} The secondary info text.
     */
    const getSecondaryInfo = (item) => {
        switch (item.type) {
            case 'Music':
            case 'Custom Audio':
                return item.artist || 'Unknown Artist';
            case 'RSS Feed':
                return `From: ${item.source || 'RSS'}`;
            case 'Ad':
                return 'Advertisement';
            case 'Article':
                return 'Station News';
            default:
                return item.type;
        }
    };

    /**
     * Truncates text to a specified length, avoiding broken words and trailing punctuation.
     * @param {string} text The text to truncate.
     * @param {number} maxLength The maximum length of the output string.
     * @returns {string} The truncated text.
     */
    const truncateText = (text, maxLength) => {
        if (!text || text.length <= maxLength) {
            return text;
        }
        const lastSpace = text.lastIndexOf(' ', maxLength);
        let truncated = lastSpace > 0 ? text.substring(0, lastSpace) : text.substring(0, maxLength);
        return truncated.replace(/[.,;:]\s*$/, '') + '...';
    };

    /**
     * Renders the entire page content based on the data received from the CMS.
     * @param {object} data The PublicWebsiteData object.
     */
    const renderContent = (data) => {
        try {
            if (!data || !data.settings || !data.station) {
                throw new Error("Incomplete data received from CMS.");
            }
            
            contentRendered = true;
            if (mainContent) mainContent.style.display = 'block';
            if (noContentMessage) noContentMessage.style.display = 'none';

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
                stationLogoEl.alt = `${station.name} Logo`;
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
                                <p class="text-sm text-gray-500">${getSecondaryInfo(item)}</p>
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
                            <p class="text-gray-600">${truncateText(article.content, 150)}</p>
                        </article>
                    `).join('');
                } else {
                    blogPostsEl.innerHTML = '<p class="text-gray-500">No recent blog posts.</p>';
                }
            }
        } catch (error) {
            console.error("Failed to render website data:", error);
            if (mainContent) mainContent.style.display = 'none';
            if (noContentMessage) noContentMessage.style.display = 'block';
        }
    };

    // Listen for data from the CMS dashboard via postMessage
    window.addEventListener('message', (event) => {
        // In a production environment, you should validate event.origin for security.
        // e.g., if (event.origin !== "https://your-dashboard-domain.com") return;
        
        if (event.data && event.data.station && event.data.settings) {
            console.log('Received data from CMS:', event.data);
            renderContent(event.data);
        }
    });

    // Fallback in case data isn't received from the CMS
    setTimeout(() => {
        if (!contentRendered) {
            if (mainContent) mainContent.style.display = 'none';
            if (noContentMessage) noContentMessage.style.display = 'block';
            console.warn('No data received from CMS after 3 seconds. Displaying fallback message.');
        }
    }, 3000);
});
