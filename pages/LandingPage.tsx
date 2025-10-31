

import React from 'react';
import type { Page, Theme } from '../App';
import { RadioIcon, SparklesIcon, ScheduleIcon, PlaylistIcon, DocumentTextIcon, AnalyticsIcon, SunIcon, MoonIcon, CheckCircleIcon, VoiceIcon, LiveIcon, ShareIcon, UsersIcon, DollarSignIcon, RssIcon, PieChartIcon, ClipboardListIcon, CodeIcon, CloudIcon, LightbulbIcon, InboxIcon } from '../components/icons';
import { useAuth } from '../contexts/AuthContext';

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode; }> = ({ icon, title, children }) => (
    <div className="bg-white dark:bg-gray-800/50 p-6 rounded-xl shadow-lg transition-transform transform hover:-translate-y-1">
        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-brand-blue text-white mb-4">
            {icon}
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-gray-600 dark:text-gray-300">{children}</p>
    </div>
);

const TestimonialCard: React.FC<{ quote: string; name: string; title: string; }> = ({ quote, name, title }) => (
    <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
        <p className="text-gray-700 dark:text-gray-300 italic mb-4">"{quote}"</p>
        <div>
            <p className="font-bold text-gray-900 dark:text-white">{name}</p>
            <p className="text-sm text-brand-blue">{title}</p>
        </div>
    </div>
);

interface LandingPageProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  onEnterApp?: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ theme, setTheme, onEnterApp }) => {
    const { currentUser, switchUser } = useAuth();

    const handleAction = () => {
        if (currentUser && onEnterApp) {
          onEnterApp();
        } else if (!currentUser) {
          // Log in the default admin user directly for demo purposes
          switchUser('admin@test.com');
        }
    };
    
    const toggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    const ctaText = currentUser ? "Enter Dashboard" : "Sign In";
    const primaryCtaText = currentUser ? "Enter Dashboard" : "Get Started for Free";
    const secondaryCtaText = currentUser ? "Enter Dashboard" : "Start for Free";
    const tertiaryCtaText = currentUser ? "Enter Dashboard" : "Contact Sales";
    const finalCtaText = currentUser ? "Enter Dashboard" : "Start Broadcasting Now";


    return (
        <div className="bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 min-h-screen">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm">
                <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <RadioIcon />
                        <h1 className="text-2xl font-bold tracking-wider text-gray-900 dark:text-white">AI music station</h1>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue"
                            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                        >
                            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                        </button>
                        <button 
                            onClick={handleAction}
                            className="px-5 py-2.5 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue transition-colors">
                            {ctaText}
                        </button>
                    </div>
                </div>
            </header>

            <main>
                {/* Hero Section */}
                <section className="pt-32 pb-20 text-center bg-white dark:bg-gray-800">
                    <div className="container mx-auto px-6">
                        <h2 className="text-4xl md:text-6xl font-extrabold text-gray-900 dark:text-white leading-tight">
                            Create Your AI-Powered Cloud Radio Station.
                            <br />
                            <span className="text-brand-blue">Instantly.</span>
                        </h2>
                        <p className="mt-6 text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                            Stop juggling complex software. Let our advanced AI automate your content creation, scheduling, and 24/7 cloud playout, so you can focus on building a station your listeners will love.
                        </p>
                        <button 
                            onClick={handleAction}
                            className="mt-10 px-8 py-4 bg-brand-blue text-white text-lg font-semibold rounded-lg shadow-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue transition-transform transform hover:scale-105">
                            {primaryCtaText}
                        </button>
                    </div>
                </section>

                {/* Features Section */}
                <section id="features" className="py-20">
                    <div className="container mx-auto px-6">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">The Future of Broadcasting is Here</h2>
                            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Everything you need to run a professional radio station, supercharged by AI.</p>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                             <FeatureCard icon={<CloudIcon />} title="Always-On Cloud Broadcasting">
                                Run your station 24/7 without leaving a PC on. Our cloud Auto DJ handles the schedule, with seamless handoffs for live DJs connecting from anywhere.
                            </FeatureCard>
                             <FeatureCard icon={<LightbulbIcon />} title="AI Co-pilot">
                                Your persistent AI assistant offers proactive, contextual suggestions. From generating playlists on your dashboard to writing transitions on your schedule, it's always ready to help.
                            </FeatureCard>
                             <FeatureCard icon={<InboxIcon />} title="Unified Control Room">
                                Manage everything from one place. Approve submissions, schedule posts, and initiate any creation task from a central inbox and a universal action button.
                            </FeatureCard>
                            <FeatureCard icon={<SparklesIcon />} title="AI Content Studio">
                                Generate articles, create scripts for ads, get real-time sports updates, and even get instant traffic &amp; weather reports for your broadcast.
                            </FeatureCard>
                             <FeatureCard icon={<PieChartIcon />} title="Show Designer & Clockwheels">
                                Design professional hourly templates (clockwheels) and let our AI intelligently program your broadcast day for ultimate consistency and control.
                            </FeatureCard>
                             <FeatureCard icon={<ClipboardListIcon />} title="Show Prep Assistant">
                                Never run out of things to say. Our AI generates fascinating facts, creative transitions, and audience questions for your playlist, turning hours of prep into seconds.
                            </FeatureCard>
                            <FeatureCard icon={<DocumentTextIcon />} title="Context-Aware AI Announcer">
                                Automatically create professional voice announcements that back-announce previous tracks and smoothly transition to the next, just like a live DJ.
                            </FeatureCard>
                             <FeatureCard icon={<AnalyticsIcon />} title="Real-time Analytics">
                                Understand your audience with an interactive world map and live playout history. See your listener distribution at a glance.
                            </FeatureCard>
                            <FeatureCard icon={<VoiceIcon />} title="AI Voice Cloning">
                                Create a digital replica of your own voice. Give your station a truly unique and personal sound with custom AI announcers.
                            </FeatureCard>
                             <FeatureCard icon={<LiveIcon />} title="Live Voice Chat">
                                Go live and co-host with your AI companion in real-time. Engage your audience with spontaneous, interactive voice chat.
                            </FeatureCard>
                             <FeatureCard icon={<ShareIcon />} title="AI Social Media Manager">
                                Automate your station's social media. Generate engaging posts for X and Facebook based on what's currently playing.
                            </FeatureCard>
                            <FeatureCard icon={<UsersIcon />} title="Audience Interaction">
                                Engage your listeners directly. Approve and queue up song requests and shoutouts from a dedicated dashboard with AI-powered moderation.
                            </FeatureCard>
                        </div>
                    </div>
                </section>
                
                {/* Pricing Section */}
                <section id="pricing" className="py-20 bg-gray-50 dark:bg-gray-800/50">
                    <div className="container mx-auto px-6">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Choose the Plan That's Right for You</h2>
                            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Simple, transparent pricing for stations of all sizes.</p>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
                            {/* Hobby Plan */}
                            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border dark:border-gray-700 flex flex-col">
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Hobby</h3>
                                <p className="mt-4 text-gray-600 dark:text-gray-400">Perfect for getting started and exploring the platform.</p>
                                <div className="mt-6">
                                    <span className="text-4xl font-extrabold text-gray-900 dark:text-white">$0</span>
                                    <span className="text-lg font-medium text-gray-500 dark:text-gray-400">/mo</span>
                                </div>
                                <ul className="mt-8 space-y-4 text-gray-600 dark:text-gray-300 flex-grow">
                                    <li className="flex items-center space-x-3">
                                        <CheckCircleIcon />
                                        <span>1 AI Voice</span>
                                    </li>
                                    <li className="flex items-center space-x-3">
                                        <CheckCircleIcon />
                                        <span>Basic AI Announcer</span>
                                    </li>
                                    <li className="flex items-center space-x-3">
                                        <CheckCircleIcon />
                                        <span>1 Playlist</span>
                                    </li>
                                    <li className="flex items-center space-x-3">
                                        <CheckCircleIcon />
                                        <span>1,000 Listeners</span>
                                    </li>
                                    <li className="flex items-center space-x-3">
                                        <CheckCircleIcon />
                                        <span>Community Support</span>
                                    </li>
                                </ul>
                                <button 
                                    onClick={handleAction}
                                    className="mt-8 w-full px-6 py-3 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                                    {secondaryCtaText}
                                </button>
                            </div>

                            {/* Pro Plan */}
                            <div className="relative bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl border-2 border-brand-blue flex flex-col">
                                <div className="absolute top-0 -translate-y-1/2 w-full flex justify-center">
                                    <span className="bg-brand-blue text-white text-xs font-bold uppercase tracking-wider px-4 py-1 rounded-full">Most Popular</span>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Pro Broadcaster</h3>
                                <p className="mt-4 text-gray-600 dark:text-gray-400">The ultimate toolkit for professional online radio stations.</p>
                                <div className="mt-6">
                                    <span className="text-4xl font-extrabold text-gray-900 dark:text-white">$49</span>
                                    <span className="text-lg font-medium text-gray-500 dark:text-gray-400">/mo</span>
                                </div>
                                <ul className="mt-8 space-y-4 text-gray-600 dark:text-gray-300 flex-grow">
                                    <li className="flex items-center space-x-3">
                                        <CheckCircleIcon />
                                        <span><strong>5</strong> AI Voices (incl. Cloning)</span>
                                    </li>
                                    <li className="flex items-center space-x-3">
                                        <CheckCircleIcon />
                                        <span>AI Content Studio</span>
                                    </li>
                                    <li className="flex items-center space-x-3">
                                        <CheckCircleIcon />
                                        <span>AI Social Media Manager</span>
                                    </li>
                                    <li className="flex items-center space-x-3">
                                        <CheckCircleIcon />
                                        <span><strong>Unlimited</strong> Playlists</span>
                                    </li>
                                    <li className="flex items-center space-x-3">
                                        <CheckCircleIcon />
                                        <span><strong>10,000</strong> Listeners</span>
                                    </li>
                                    <li className="flex items-center space-x-3">
                                        <CheckCircleIcon />
                                        <span>Email & Chat Support</span>
                                    </li>
                                </ul>
                                <button 
                                    onClick={handleAction}
                                    className="mt-8 w-full px-6 py-3 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue transition-colors">
                                    {currentUser ? 'Enter Dashboard' : 'Choose Pro'}
                                </button>
                            </div>

                            {/* Network Plan */}
                            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border dark:border-gray-700 flex flex-col">
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Network</h3>
                                <p className="mt-4 text-gray-600 dark:text-gray-400">For large-scale broadcasters and custom requirements.</p>
                                <div className="mt-6">
                                    <span className="text-4xl font-extrabold text-gray-900 dark:text-white">Custom</span>
                                </div>
                                <ul className="mt-8 space-y-4 text-gray-600 dark:text-gray-300 flex-grow">
                                    <li className="flex items-center space-x-3">
                                        <CheckCircleIcon />
                                        <span><strong>Unlimited</strong> AI Voices</span>
                                    </li>
                                    <li className="flex items-center space-x-3">
                                        <CheckCircleIcon />
                                        <span>Advanced Analytics</span>
                                    </li>
                                    <li className="flex items-center space-x-3">
                                        <CheckCircleIcon />
                                        <span>Custom Listener Limits</span>
                                    </li>
                                    <li className="flex items-center space-x-3">
                                        <CheckCircleIcon />
                                        <span>Dedicated Support & Onboarding</span>
                                    </li>
                                    <li className="flex items-center space-x-3">
                                        <CheckCircleIcon />
                                        <span>API Access</span>
                                    </li>
                                </ul>
                                <button 
                                    onClick={handleAction}
                                    className="mt-8 w-full px-6 py-3 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                                    {tertiaryCtaText}
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Testimonials Section */}
                <section id="testimonials" className="py-20 bg-white dark:bg-gray-800">
                     <div className="container mx-auto px-6">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Loved by Broadcasters Worldwide</h2>
                        </div>
                        <div className="grid lg:grid-cols-3 gap-8">
                            <TestimonialCard 
                                quote="This platform is a game-changer. I'm saving 10+ hours a week on scheduling and content creation. The AI DJ is surprisingly good!"
                                name="Sarah J."
                                title="Host, Indie Pop Radio"
                            />
                            <TestimonialCard 
                                quote="As a one-person team, the AI Content Studio is my secret weapon. I can produce high-quality talk segments and ads without hiring a writer."
                                name="Mike R."
                                title="Community Station Manager"
                            />
                             <TestimonialCard 
                                quote="We migrated from a complex, expensive system, and the difference is night and day. It's intuitive, powerful, and the AI features feel like magic."
                                name="Elena V."
                                title="Director, Campus Radio Network"
                            />
                        </div>
                    </div>
                </section>

                {/* Final CTA Section */}
                <section className="py-20">
                    <div className="container mx-auto px-6 text-center">
                         <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Ready to Launch Your Station?</h2>
                         <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">No credit card required. Get instant access to the full suite of AI broadcasting tools and start building your dream station today.</p>
                         <button 
                            onClick={handleAction}
                            className="mt-8 px-8 py-4 bg-brand-blue text-white text-lg font-semibold rounded-lg shadow-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue transition-transform transform hover:scale-105">
                            {finalCtaText}
                        </button>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                <div className="container mx-auto px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    <p>&copy; {new Date().getFullYear()} AI music station. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;