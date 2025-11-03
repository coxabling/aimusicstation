
import React, { useState } from 'react';
import type { Page } from '../App';
import { 
    DashboardIcon, SettingsIcon, LinkIcon, MusicIcon, PlaylistIcon, AnalyticsIcon, RadioIcon, XIcon, 
    AudioWaveIcon, ScheduleIcon, SparklesIcon, VaultIcon, MapIcon, VoiceIcon, CodeIcon, RssIcon, 
    LiveIcon, HelpIcon, ShareIcon, UsersIcon, DollarSignIcon, ClipboardListIcon, PieChartIcon, 
    SlidersIcon, GlobeIcon, InboxIcon, ChevronDownIcon 
} from './icons';
import { Station } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useLocalization } from '../App';

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
  isNested?: boolean;
}> = ({ icon, label, isActive, onClick, isNested = false }) => (
  <a
    href="#"
    onClick={(e) => {
      e.preventDefault();
      onClick();
    }}
    className={`flex items-center py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 group ${
      isActive
        ? 'bg-brand-blue text-white'
        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
    } ${isNested ? 'px-3' : 'px-4'}`}
  >
    <span className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}>{icon}</span>
    <span className="ml-3">{label}</span>
  </a>
);

const CollapsibleNavGroup: React.FC<{
    title: string;
    icon: React.ReactNode;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}> = ({ title, icon, isOpen, onToggle, children }) => (
    <div>
        <button
            onClick={onToggle}
            className="flex items-center w-full px-4 py-2.5 text-sm font-medium text-left text-gray-200 rounded-lg hover:bg-gray-700 focus:outline-none"
            aria-expanded={isOpen}
        >
            <span className="text-gray-400">{icon}</span>
            <span className="ml-3 flex-1">{title}</span>
            <ChevronDownIcon className={`h-5 w-5 text-gray-400 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96' : 'max-h-0'}`}>
            <div className="pl-6 pt-1 pb-1 space-y-1">
                {children}
            </div>
        </div>
    </div>
);


const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage, sidebarOpen, setSidebarOpen, station }) => {
  const { currentUser } = useAuth();
  const { t } = useLocalization();
  const isAdmin = currentUser?.role === 'Admin';
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['Main', 'Library']));

  const handleNavClick = (page: Page) => {
    setActivePage(page);
    setSidebarOpen(false); // Close sidebar on selection
  };
  
  const toggleSection = (section: string) => {
    setOpenSections(prev => {
        const newSet = new Set(prev);
        if (newSet.has(section)) {
            newSet.delete(section);
        } else {
            newSet.add(section);
        }
        return newSet;
    });
  };
  
  return (
    <>
      <div className={`fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity lg:hidden ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setSidebarOpen(false)}></div>
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-gray-900 text-white h-full flex flex-col transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <div className="p-5 border-b border-gray-700 flex items-center justify-between">
            <a
                href="#"
                onClick={(e) => {
                    e.preventDefault();
                    handleNavClick('dashboard');
                }}
                className="flex items-center space-x-3 transition-opacity hover:opacity-80"
                title="Go to Dashboard"
            >
                {station.logo ? (
                    <img src={station.logo} alt={`${station.name} logo`} className="h-8 w-8 rounded-full object-cover" />
                ) : (
                    <RadioIcon />
                )}
                <h1 className="text-xl font-bold tracking-wider">{station.name}</h1>
            </a>
            <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
                <XIcon />
            </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            
            <CollapsibleNavGroup title="Main" icon={<RadioIcon />} isOpen={openSections.has('Main')} onToggle={() => toggleSection('Main')}>
                <NavLink icon={<DashboardIcon />} label={t('sidebar.dashboard')} isActive={activePage === 'dashboard'} onClick={() => handleNavClick('dashboard')} isNested />
                <NavLink icon={<InboxIcon />} label={t('sidebar.controlRoom')} isActive={activePage === 'controlRoom'} onClick={() => handleNavClick('controlRoom')} isNested />
                <NavLink icon={<AnalyticsIcon />} label={t('sidebar.analytics')} isActive={activePage === 'analytics'} onClick={() => handleNavClick('analytics')} isNested />
                <NavLink icon={<UsersIcon />} label={t('sidebar.audience')} isActive={activePage === 'audience'} onClick={() => handleNavClick('audience')} isNested />
            </CollapsibleNavGroup>
            
            <CollapsibleNavGroup title="Library" icon={<MusicIcon />} isOpen={openSections.has('Library')} onToggle={() => toggleSection('Library')}>
                <NavLink icon={<MusicIcon />} label={t('sidebar.content')} isActive={activePage === 'content'} onClick={() => handleNavClick('content')} isNested />
                <NavLink icon={<AudioWaveIcon />} label={t('sidebar.audioContent')} isActive={activePage === 'audioContent'} onClick={() => handleNavClick('audioContent')} isNested />
                <NavLink icon={<PlaylistIcon />} label={t('sidebar.playlists')} isActive={activePage === 'playlists'} onClick={() => handleNavClick('playlists')} isNested />
                <NavLink icon={<VaultIcon />} label={t('sidebar.contentVault')} isActive={activePage === 'contentVault'} onClick={() => handleNavClick('contentVault')} isNested />
            </CollapsibleNavGroup>

            <CollapsibleNavGroup title="Playout" icon={<ScheduleIcon />} isOpen={openSections.has('Playout')} onToggle={() => toggleSection('Playout')}>
                 <NavLink icon={<ScheduleIcon />} label={t('sidebar.schedule')} isActive={activePage === 'schedule'} onClick={() => handleNavClick('schedule')} isNested />
                 <NavLink icon={<PieChartIcon />} label={t('sidebar.showDesigner')} isActive={activePage === 'showDesigner'} onClick={() => handleNavClick('showDesigner')} isNested />
            </CollapsibleNavGroup>

            <CollapsibleNavGroup title="AI Studio" icon={<SparklesIcon />} isOpen={openSections.has('AI Studio')} onToggle={() => toggleSection('AI Studio')}>
                <NavLink icon={<SparklesIcon />} label={t('sidebar.aiContentStudio')} isActive={activePage === 'aiContentStudio'} onClick={() => handleNavClick('aiContentStudio')} isNested />
                <NavLink icon={<ClipboardListIcon />} label={t('sidebar.showPrep')} isActive={activePage === 'showPrep'} onClick={() => handleNavClick('showPrep')} isNested />
                <NavLink icon={<VoiceIcon />} label={t('sidebar.aiVoiceCloning')} isActive={activePage === 'aiVoiceCloning'} onClick={() => handleNavClick('aiVoiceCloning')} isNested />
                <NavLink icon={<ShareIcon />} label={t('sidebar.social')} isActive={activePage === 'social'} onClick={() => handleNavClick('social')} isNested />
                <NavLink icon={<SlidersIcon />} label={t('sidebar.podcastStudio')} isActive={activePage === 'podcastStudio'} onClick={() => handleNavClick('podcastStudio')} isNested />
                <NavLink icon={<LiveIcon />} label={t('sidebar.live')} isActive={activePage === 'live'} onClick={() => handleNavClick('live')} isNested />
                <NavLink icon={<MapIcon />} label={t('sidebar.trafficWeather')} isActive={activePage === 'trafficWeather'} onClick={() => handleNavClick('trafficWeather')} isNested />
            </CollapsibleNavGroup>
            
            <CollapsibleNavGroup title="Automation & Monetization" icon={<RssIcon />} isOpen={openSections.has('Automation')} onToggle={() => toggleSection('Automation')}>
                 <NavLink icon={<RssIcon />} label={t('sidebar.rssAutomation')} isActive={activePage === 'rssAutomation'} onClick={() => handleNavClick('rssAutomation')} isNested />
                 <NavLink icon={<DollarSignIcon />} label={t('sidebar.adManager')} isActive={activePage === 'adManager'} onClick={() => handleNavClick('adManager')} isNested />
            </CollapsibleNavGroup>

            <CollapsibleNavGroup title="Publishing & Connectivity" icon={<LinkIcon />} isOpen={openSections.has('Connectivity')} onToggle={() => toggleSection('Connectivity')}>
                <NavLink icon={<CodeIcon />} label={t('sidebar.integrations')} isActive={activePage === 'integrations'} onClick={() => handleNavClick('integrations')} isNested />
                <NavLink icon={<GlobeIcon />} label={t('sidebar.websiteCms')} isActive={activePage === 'websiteCms'} onClick={() => handleNavClick('websiteCms')} isNested />
                <NavLink icon={<LinkIcon />} label={t('sidebar.azuracast')} isActive={activePage === 'azuracast'} onClick={() => handleNavClick('azuracast')} isNested />
                <NavLink icon={<LinkIcon />} label={t('sidebar.shoutcast')} isActive={activePage === 'shoutcast'} onClick={() => handleNavClick('shoutcast')} isNested />
                <NavLink icon={<CodeIcon />} label={t('sidebar.liquidsoap')} isActive={activePage === 'liquidsoap'} onClick={() => handleNavClick('liquidsoap')} isNested />
            </CollapsibleNavGroup>

            {isAdmin && (
                <CollapsibleNavGroup title="Administration" icon={<SettingsIcon />} isOpen={openSections.has('Admin')} onToggle={() => toggleSection('Admin')}>
                    <NavLink icon={<SettingsIcon />} label={t('sidebar.settings')} isActive={activePage === 'settings'} onClick={() => handleNavClick('settings')} isNested />
                    <NavLink icon={<UsersIcon />} label={t('sidebar.userManagement')} isActive={activePage === 'userManagement'} onClick={() => handleNavClick('userManagement')} isNested />
                    <NavLink icon={<DollarSignIcon />} label={t('sidebar.billing')} isActive={activePage === 'billing'} onClick={() => handleNavClick('billing')} isNested />
                </CollapsibleNavGroup>
            )}

            <NavLink icon={<HelpIcon />} label={t('sidebar.help')} isActive={activePage === 'help'} onClick={() => handleNavClick('help')} />

        </nav>
        <div className="p-4 mt-auto border-t border-gray-700 text-xs text-gray-500">
            <p>© 2024 AI music station</p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
