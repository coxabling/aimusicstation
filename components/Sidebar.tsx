

import React from 'react';
import type { Page } from '../App';
import { DashboardIcon, SettingsIcon, LinkIcon, MusicIcon, PlaylistIcon, AnalyticsIcon, RadioIcon, XIcon, AudioWaveIcon, ScheduleIcon, SparklesIcon, VaultIcon, MapIcon, VoiceIcon, CodeIcon, RssIcon, LiveIcon, HelpIcon, ShareIcon, UsersIcon, DollarSignIcon, ClipboardListIcon, PieChartIcon, SlidersIcon, GlobeIcon, InboxIcon } from './icons';
import { Station } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  activePage: Page;
  setActivePage: (page: Page) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  station: Station;
}

const NavLink: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
  <a
    href="#"
    onClick={(e) => {
      e.preventDefault();
      onClick();
    }}
    className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
      isActive
        ? 'bg-brand-blue text-white'
        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
    }`}
  >
    {icon}
    <span className="ml-3">{label}</span>
  </a>
);

const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage, sidebarOpen, setSidebarOpen, station }) => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'Admin';

  const handleNavClick = (page: Page) => {
    setActivePage(page);
    setSidebarOpen(false); // Close sidebar on selection
  };
  
  return (
    <>
      <div className={`fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity lg:hidden ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setSidebarOpen(false)}></div>
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-gray-900 text-white h-full flex flex-col transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <div className="p-5 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center space-x-3">
                {station.logo ? (
                    <img src={station.logo} alt={`${station.name} logo`} className="h-8 w-8 rounded-full object-cover" />
                ) : (
                    <RadioIcon />
                )}
                <h1 className="text-xl font-bold tracking-wider">{station.name}</h1>
            </div>
            <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
                <XIcon />
            </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            <NavLink icon={<DashboardIcon />} label="Dashboard" isActive={activePage === 'dashboard'} onClick={() => handleNavClick('dashboard')} />
            <NavLink icon={<InboxIcon />} label="Control Room" isActive={activePage === 'controlRoom'} onClick={() => handleNavClick('controlRoom')} />
            {isAdmin && <NavLink icon={<SettingsIcon />} label="Station Settings" isActive={activePage === 'settings'} onClick={() => handleNavClick('settings')} /> }
            {isAdmin && <NavLink icon={<UsersIcon />} label="User Management" isActive={activePage === 'userManagement'} onClick={() => handleNavClick('userManagement')} /> }
            {isAdmin && <NavLink icon={<DollarSignIcon />} label="AI Credits & Billing" isActive={activePage === 'billing'} onClick={() => handleNavClick('billing')} /> }
            <NavLink icon={<LinkIcon />} label="Link Azuracast" isActive={activePage === 'azuracast'} onClick={() => handleNavClick('azuracast')} />
            <NavLink icon={<LinkIcon />} label="Link Shoutcast" isActive={activePage === 'shoutcast'} onClick={() => handleNavClick('shoutcast')} />
            <NavLink icon={<CodeIcon />} label="Liquidsoap" isActive={activePage === 'liquidsoap'} onClick={() => handleNavClick('liquidsoap')} />
            <NavLink icon={<MusicIcon />} label="Content" isActive={activePage === 'content'} onClick={() => handleNavClick('content')} />
            <NavLink icon={<AudioWaveIcon />} label="Audio Content" isActive={activePage === 'audioContent'} onClick={() => handleNavClick('audioContent')} />
            <NavLink icon={<VaultIcon />} label="Content Vault" isActive={activePage === 'contentVault'} onClick={() => handleNavClick('contentVault')} />
            <NavLink icon={<SparklesIcon />} label="AI Content Studio" isActive={activePage === 'aiContentStudio'} onClick={() => handleNavClick('aiContentStudio')} />
            <NavLink icon={<VoiceIcon />} label="AI Voice Cloning" isActive={activePage === 'aiVoiceCloning'} onClick={() => handleNavClick('aiVoiceCloning')} />
            <NavLink icon={<ClipboardListIcon />} label="Show Prep" isActive={activePage === 'showPrep'} onClick={() => handleNavClick('showPrep')} />
            <NavLink icon={<SlidersIcon />} label="Podcast Studio" isActive={activePage === 'podcastStudio'} onClick={() => handleNavClick('podcastStudio')} />
            <NavLink icon={<LiveIcon />} label="Live Voice Chat" isActive={activePage === 'live'} onClick={() => handleNavClick('live')} />
            <NavLink icon={<ShareIcon />} label="Social Media" isActive={activePage === 'social'} onClick={() => handleNavClick('social')} />
            <NavLink icon={<UsersIcon />} label="Audience" isActive={activePage === 'audience'} onClick={() => handleNavClick('audience')} />
            <NavLink icon={<CodeIcon />} label="Integrations" isActive={activePage === 'integrations'} onClick={() => handleNavClick('integrations')} />
            <NavLink icon={<GlobeIcon />} label="Website CMS" isActive={activePage === 'websiteCms'} onClick={() => handleNavClick('websiteCms')} />
            <NavLink icon={<RssIcon />} label="RSS Automation" isActive={activePage === 'rssAutomation'} onClick={() => handleNavClick('rssAutomation')} />
            <NavLink icon={<PlaylistIcon />} label="Playlists" isActive={activePage === 'playlists'} onClick={() => handleNavClick('playlists')} />
            <NavLink icon={<PieChartIcon />} label="Show Designer" isActive={activePage === 'showDesigner'} onClick={() => handleNavClick('showDesigner')} />
            <NavLink icon={<ScheduleIcon />} label="Schedule" isActive={activePage === 'schedule'} onClick={() => handleNavClick('schedule')} />
            <NavLink icon={<AnalyticsIcon />} label="Analytics" isActive={activePage === 'analytics'} onClick={() => handleNavClick('analytics')} />
            <NavLink icon={<DollarSignIcon />} label="Ad Manager" isActive={activePage === 'adManager'} onClick={() => handleNavClick('adManager')} />
            <NavLink icon={<MapIcon />} label="Traffic & Weather" isActive={activePage === 'trafficWeather'} onClick={() => handleNavClick('trafficWeather')} />
            <NavLink icon={<HelpIcon />} label="Help" isActive={activePage === 'help'} onClick={() => handleNavClick('help')} />
        </nav>
        <div className="p-4 mt-auto border-t border-gray-700 text-xs text-gray-500">
            <p>© 2024 AI music station</p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;