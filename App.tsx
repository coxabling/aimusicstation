



import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import StationSettings from './pages/StationSettings';
import AzuracastLink from './pages/AzuracastLink';
import ShoutcastLink from './pages/ShoutcastLink';
import ContentManagement from './pages/ContentManagement';
import Playlists from './pages/Playlists';
import Schedule from './pages/Schedule';
import Analytics from './pages/Analytics';
import AudioContent from './pages/AudioContent';
import AIContentStudio from './pages/AIContentStudio';
import AIVoiceCloning from './pages/AIVoiceCloning';
import ShowPrep from './pages/ShowPrep';
import ContentVault from './pages/ContentVault';
import TrafficWeather from './pages/TrafficWeather';
import UserManagement from './pages/UserManagement';
import Liquidsoap from './pages/Liquidsoap';
import StreamPlayer from './components/StreamPlayer';
import RssAutomation from './pages/RssAutomation';
import UserProfile from './pages/UserProfile';
import { PlayerProvider } from './contexts/PlayerContext';
import { ContentProvider } from './contexts/ContentContext';
import { ToastProvider } from './contexts/ToastContext';
import ToastContainer from './components/Toast';
import LandingPage from './pages/LandingPage';
import { MusicIcon } from './components/icons';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LiveVoiceChat from './pages/LiveVoiceChat';
import Help from './pages/Help';
import SocialMediaManager from './pages/SocialMediaManager';
import AudienceInteraction from './pages/AudienceInteraction';
import Integrations from './pages/Integrations';
import AdManager from './pages/AdManager';
import Billing from './pages/Billing';
import ShowDesigner from './pages/ShowDesigner';
import PodcastStudio from './pages/PodcastStudio';
import WebsiteCMS from './pages/WebsiteCMS';
import ControlRoom from './pages/ControlRoom';
import CoPilot from './components/CoPilot';
import LiveDJModal from './components/LiveDJModal';

export type Page = 'dashboard' | 'controlRoom' | 'settings' | 'azuracast' | 'shoutcast' | 'liquidsoap' | 'content' | 'audioContent' | 'contentVault' | 'aiContentStudio' | 'aiVoiceCloning' | 'showPrep' | 'playlists' | 'schedule' | 'analytics' | 'trafficWeather' | 'userManagement' | 'rssAutomation' | 'userProfile' | 'live' | 'help' | 'social' | 'audience' | 'integrations' | 'adManager' | 'billing' | 'showDesigner' | 'podcastStudio' | 'websiteCms';
export type Theme = 'light' | 'dark';

const AppContent: React.FC = () => {
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { stationSettings, saveStationSettings, currentUser } = useAuth();
  
  const [appEntered, setAppEntered] = useState(() => sessionStorage.getItem('appEntered') === 'true');
  const [actionTrigger, setActionTrigger] = useState<string | null>(null);

  // Co-pilot state
  const [coPilotOpen, setCoPilotOpen] = useState(false);
  const [selectedContentIds, setSelectedContentIds] = useState<string[]>([]);
  
  // Live DJ Modal State
  const [isLiveDjModalOpen, setIsLiveDjModalOpen] = useState(false);

  useEffect(() => {
    // This effect ensures that on logout (when currentUser becomes null),
    // the user is properly returned to the landing page state.
    if (!currentUser) {
      sessionStorage.removeItem('appEntered');
      setAppEntered(false);
    }
  }, [currentUser]);

  useEffect(() => {
    // Clear content selection when navigating away from the content page
    if (activePage !== 'content') {
        setSelectedContentIds([]);
    }
  }, [activePage]);

  const handleEnterApp = () => {
    sessionStorage.setItem('appEntered', 'true');
    setAppEntered(true);
  };

  const handleActionTrigger = (page: Page, trigger: string) => {
      if (activePage === page) {
          setActionTrigger(trigger);
      } else {
          setActionTrigger(trigger);
          setActivePage(page);
      }
  };

  const clearActionTrigger = () => setActionTrigger(null);


  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const storedTheme = localStorage.getItem('theme');
      if (storedTheme === 'light') {
        return 'light';
      }
    } catch (error) {
      console.error('Could not access localStorage:', error);
    }
    return 'dark'; // Default to dark mode
  });

  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const [isPlayerVisible, setIsPlayerVisible] = useState(true);

  useEffect(() => {
    try {
        localStorage.setItem('theme', theme);
    } catch (error) {
        console.error('Could not access localStorage:', error);
    }
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const pageTitles: Record<Page, string> = {
    dashboard: 'Dashboard',
    controlRoom: 'Control Room',
    settings: 'Station Settings',
    azuracast: 'Link Azuracast',
    shoutcast: 'Link Shoutcast',
    liquidsoap: 'Liquidsoap Script Generator',
    content: 'Content Management',
    audioContent: 'Audio Content',
    contentVault: 'Content Vault',
    aiContentStudio: 'AI Content Studio',
    aiVoiceCloning: 'AI Voice Cloning',
    showPrep: 'Show Prep Assistant',
    podcastStudio: 'Podcast Production Studio',
    playlists: 'Playlists',
    schedule: 'Schedule',
    analytics: 'Analytics',
    trafficWeather: 'Traffic & Weather',
    userManagement: 'User Management',
    rssAutomation: 'RSS Automation',
    userProfile: 'My Profile',
    live: 'Live Voice Chat',
    help: 'Help & Documentation',
    social: 'AI Social Media Manager',
    audience: 'Audience Interaction',
    integrations: 'Integrations & Embeds',
    adManager: 'Ad Campaign Manager',
    billing: 'AI Credits & Billing',
    showDesigner: 'Show Designer',
    websiteCms: 'Website CMS',
  };

  const renderPage = () => {
    const pageProps = { actionTrigger, clearActionTrigger };
    
    // Role-based page access
    if (currentUser?.role !== 'Admin' && (activePage === 'settings' || activePage === 'userManagement' || activePage === 'billing')) {
      setActivePage('dashboard');
      return <Dashboard setActivePage={setActivePage} />;
    }

    switch (activePage) {
      case 'dashboard': return <Dashboard setActivePage={setActivePage} />;
      case 'controlRoom': return <ControlRoom />;
      case 'settings': return <StationSettings station={stationSettings} onSave={saveStationSettings} />;
      case 'azuracast': return <AzuracastLink />;
      case 'shoutcast': return <ShoutcastLink />;
      case 'liquidsoap': return <Liquidsoap />;
      case 'content': return <ContentManagement onSelectionChange={setSelectedContentIds} />;
      case 'audioContent': return <AudioContent {...pageProps} />;
      case 'contentVault': return <ContentVault />;
      case 'aiContentStudio': return <AIContentStudio />;
      case 'aiVoiceCloning': return <AIVoiceCloning />;
      case 'showPrep': return <ShowPrep />;
      case 'podcastStudio': return <PodcastStudio />;
      case 'playlists': return <Playlists {...pageProps} />;
      case 'schedule': return <Schedule />;
      case 'analytics': return <Analytics theme={theme} />;
      case 'trafficWeather': return <TrafficWeather />;
      case 'userManagement': return <UserManagement />;
      case 'rssAutomation': return <RssAutomation />;
      case 'userProfile': return <UserProfile />;
      case 'live': return <LiveVoiceChat />;
      case 'help': return <Help />;
      case 'social': return <SocialMediaManager {...pageProps} />;
      case 'audience': return <AudienceInteraction />;
      case 'integrations': return <Integrations />;
      case 'adManager': return <AdManager {...pageProps} />;
      case 'billing': return <Billing />;
      case 'showDesigner': return <ShowDesigner />;
      case 'websiteCms': return <WebsiteCMS />;
      default: return <Dashboard setActivePage={setActivePage} />;
    }
  };

  if (!currentUser || !appEntered) {
    return <LandingPage theme={theme} setTheme={setTheme} onEnterApp={handleEnterApp} />;
  }


  return (
    <ContentProvider>
      <PlayerProvider key={currentUser?.id}>
        <div className={`flex h-screen bg-gray-100 dark:bg-gray-900 theme-${theme}`}>
          <Sidebar 
            activePage={activePage} 
            setActivePage={setActivePage} 
            sidebarOpen={sidebarOpen} 
            setSidebarOpen={setSidebarOpen}
            station={stationSettings}
          />
          <div className="flex-1 flex flex-col overflow-hidden relative">
            <Header 
              title={pageTitles[activePage]} 
              onMenuClick={() => setSidebarOpen(!sidebarOpen)} 
              theme={theme} 
              setTheme={setTheme} 
              setActivePage={setActivePage}
              onActionTrigger={handleActionTrigger}
              onGoLiveClick={() => setIsLiveDjModalOpen(true)}
            />
            <main className={`flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 transition-all duration-300 ${isPlayerVisible && isPlayerExpanded ? 'mb-96' : (isPlayerVisible ? 'mb-24' : 'mb-0')}`}>
              {renderPage()}
            </main>
            
            <StreamPlayer
              isVisible={isPlayerVisible}
              isExpanded={isPlayerExpanded}
              setIsExpanded={setIsPlayerExpanded}
              onHide={() => setIsPlayerVisible(false)}
              stationLogo={stationSettings.logo}
            />
            
            {!isPlayerVisible && (
               <button
                onClick={() => setIsPlayerVisible(true)}
                className="fixed bottom-6 right-6 z-50 p-4 bg-brand-blue text-white rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-brand-blue transition-transform transform hover:scale-110"
                aria-label="Show player"
              >
                <MusicIcon />
              </button>
            )}
          </div>
          <CoPilot
            isOpen={coPilotOpen}
            onToggle={() => setCoPilotOpen(!coPilotOpen)}
            activePage={activePage}
            selectedContentIds={selectedContentIds}
            setActivePage={setActivePage}
          />
        </div>
        <ToastContainer />
        <LiveDJModal isOpen={isLiveDjModalOpen} onClose={() => setIsLiveDjModalOpen(false)} />
      </PlayerProvider>
    </ContentProvider>
  );
};


const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;