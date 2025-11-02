

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
export type Language = 'en' | 'es' | 'fr';

// --- LOCALIZATION SYSTEM ---

const translations: Record<Language, Record<string, string>> = {
  en: {
    'pageTitles.dashboard': 'Dashboard',
    'pageTitles.controlRoom': 'Control Room',
    'pageTitles.settings': 'Station Settings',
    'pageTitles.azuracast': 'Link Azuracast',
    'pageTitles.shoutcast': 'Link Shoutcast',
    'pageTitles.liquidsoap': 'Liquidsoap Script Generator',
    'pageTitles.content': 'Content Management',
    'pageTitles.audioContent': 'Audio Content',
    'pageTitles.contentVault': 'Content Vault',
    'pageTitles.aiContentStudio': 'AI Content Studio',
    'pageTitles.aiVoiceCloning': 'AI Voice Cloning',
    'pageTitles.showPrep': 'Show Prep Assistant',
    'pageTitles.podcastStudio': 'Podcast Production Studio',
    'pageTitles.playlists': 'Playlists',
    'pageTitles.schedule': 'Schedule',
    'pageTitles.analytics': 'Analytics',
    'pageTitles.trafficWeather': 'Traffic & Weather',
    'pageTitles.userManagement': 'User Management',
    'pageTitles.rssAutomation': 'RSS Automation',
    'pageTitles.userProfile': 'My Profile',
    'pageTitles.live': 'Live Voice Chat',
    'pageTitles.help': 'Help & Documentation',
    'pageTitles.social': 'AI Social Media Manager',
    'pageTitles.audience': 'Audience Interaction',
    'pageTitles.integrations': 'Integrations & Embeds',
    'pageTitles.adManager': 'Ad Campaign Manager',
    'pageTitles.billing': 'AI Credits & Billing',
    'pageTitles.showDesigner': 'Show Designer',
    'pageTitles.websiteCms': 'Website CMS',

    'sidebar.dashboard': 'Dashboard',
    'sidebar.controlRoom': 'Control Room',
    'sidebar.settings': 'Station Settings',
    'sidebar.userManagement': 'User Management',
    'sidebar.billing': 'AI Credits & Billing',
    'sidebar.azuracast': 'Link Azuracast',
    'sidebar.shoutcast': 'Link Shoutcast',
    'sidebar.liquidsoap': 'Liquidsoap',
    'sidebar.content': 'Content',
    'sidebar.audioContent': 'Audio Content',
    'sidebar.contentVault': 'Content Vault',
    'sidebar.aiContentStudio': 'AI Content Studio',
    'sidebar.aiVoiceCloning': 'AI Voice Cloning',
    'sidebar.showPrep': 'Show Prep',
    'sidebar.podcastStudio': 'Podcast Studio',
    'sidebar.live': 'Live Voice Chat',
    'sidebar.social': 'Social Media',
    'sidebar.audience': 'Audience',
    'sidebar.integrations': 'Integrations',
    'sidebar.websiteCms': 'Website CMS',
    'sidebar.rssAutomation': 'RSS Automation',
    'sidebar.playlists': 'Playlists',
    'sidebar.showDesigner': 'Show Designer',
    'sidebar.schedule': 'Schedule',
    'sidebar.analytics': 'Analytics',
    'sidebar.adManager': 'Ad Manager',
    'sidebar.trafficWeather': 'Traffic & Weather',
    'sidebar.help': 'Help',

    'dashboard.stats.streamStatus': 'Cloud Stream Status',
    'dashboard.stats.totalContent': 'Total Content',
    'dashboard.stats.playlists': 'Playlists',
    'dashboard.stats.aiCredits': 'AI Credits',
    'dashboard.livePlayout.title': 'Live Playout Status',
    'dashboard.livePlayout.nowPlaying': 'Now Playing',
    'dashboard.livePlayout.upNext': 'Up Next',
    'dashboard.livePlayout.offline.title': 'Station is Offline',
    'dashboard.livePlayout.offline.subtitle': 'Go to the Schedule page to start your broadcast.',
    'dashboard.livePlayout.offline.button': 'Go to Schedule',
    'dashboard.vibe.title': 'Station Vibe',
    'dashboard.vibe.description_admin': 'Set the mood for your AI DJ. This will change the tone of generated announcements in real-time.',
    'dashboard.vibe.description_user': 'The current station mood set by an admin. This affects the tone of AI announcements.',
    'dashboard.clock.title': 'Clock',
    'dashboard.listenUrl.title': 'Public Listen URL',
    'dashboard.listenUrl.placeholder': 'Set your public stream URL in Station Settings to share with listeners.',
    'dashboard.recommendations.title': 'AI Recommendations from the Vault',
    'dashboard.recommendations.loading': 'Analyzing your library to find recommendations...',
    'dashboard.recommendations.empty': 'Not enough data to generate recommendations.',
    'dashboard.recommendations.button': 'Add to Library',

    'settings.title': 'Station Settings',
    'settings.stationName.label': 'Station Name',
    'settings.stationDesc.label': 'Station Description',
    'settings.radioFormat.label': 'Radio Format',
    'settings.save': 'Save Settings',
    
    'header.switchLanguage': 'Switch Language',

    'aistudio.translateScript': 'Translate Script',
    'aistudio.translateTo': 'Translate to',
    'aistudio.translate': 'Translate',
    'aistudio.translation': 'Translation',
  },
  es: {
    'pageTitles.dashboard': 'Panel de Control',
    'pageTitles.controlRoom': 'Sala de Control',
    'pageTitles.settings': 'Ajustes de la Estación',
    'pageTitles.audioContent': 'Contenido de Audio',
    'pageTitles.aiContentStudio': 'Estudio de Contenido IA',
    'pageTitles.playlists': 'Listas de Reproducción',
    'pageTitles.schedule': 'Programación',
    'pageTitles.analytics': 'Analíticas',
    'pageTitles.userManagement': 'Gestión de Usuarios',
    'pageTitles.userProfile': 'Mi Perfil',

    'sidebar.dashboard': 'Panel de Control',
    'sidebar.controlRoom': 'Sala de Control',
    'sidebar.settings': 'Ajustes de Estación',
    'sidebar.userManagement': 'Gestión de Usuarios',
    'sidebar.billing': 'Créditos y Facturación',
    'sidebar.azuracast': 'Conectar Azuracast',
    'sidebar.shoutcast': 'Conectar Shoutcast',
    'sidebar.liquidsoap': 'Liquidsoap',
    'sidebar.content': 'Contenido',
    'sidebar.audioContent': 'Contenido de Audio',
    'sidebar.contentVault': 'Bóveda de Contenido',
    'sidebar.aiContentStudio': 'Estudio Contenido IA',
    'sidebar.aiVoiceCloning': 'Clonación de Voz IA',
    'sidebar.showPrep': 'Preparación Show',
    'sidebar.podcastStudio': 'Estudio de Podcast',
    'sidebar.live': 'Chat de Voz en Vivo',
    'sidebar.social': 'Redes Sociales',
    'sidebar.audience': 'Audiencia',
    'sidebar.integrations': 'Integraciones',
    'sidebar.websiteCms': 'CMS del Sitio Web',
    'sidebar.rssAutomation': 'Automatización RSS',
    'sidebar.playlists': 'Listas de Reproducción',
    'sidebar.showDesigner': 'Diseñador de Shows',
    'sidebar.schedule': 'Programación',
    'sidebar.analytics': 'Analíticas',
    'sidebar.adManager': 'Gestor de Anuncios',
    'sidebar.trafficWeather': 'Tráfico y Clima',
    'sidebar.help': 'Ayuda',

    'dashboard.stats.streamStatus': 'Estado de la Transmisión',
    'dashboard.stats.totalContent': 'Contenido Total',
    'dashboard.stats.playlists': 'Listas',
    'dashboard.stats.aiCredits': 'Créditos IA',
    'dashboard.livePlayout.title': 'Estado de Emisión en Vivo',
    'dashboard.livePlayout.nowPlaying': 'Reproduciendo Ahora',
    'dashboard.livePlayout.upNext': 'A Continuación',
    'dashboard.livePlayout.offline.title': 'Estación Desconectada',
    'dashboard.livePlayout.offline.subtitle': 'Ve a la página de Programación para iniciar tu transmisión.',
    'dashboard.livePlayout.offline.button': 'Ir a Programación',
    'dashboard.vibe.title': 'Ambiente de la Estación',
    'dashboard.vibe.description_admin': 'Define el ambiente para tu DJ de IA. Esto cambiará el tono de los anuncios generados en tiempo real.',
    'dashboard.vibe.description_user': 'El ambiente actual de la estación definido por un administrador. Esto afecta el tono de los anuncios de IA.',
    'dashboard.clock.title': 'Reloj',
    'dashboard.listenUrl.title': 'URL Pública de Stream',
    'dashboard.listenUrl.placeholder': 'Configura tu URL pública en Ajustes de Estación para compartirla.',
    'dashboard.recommendations.title': 'Recomendaciones IA de la Bóveda',
    'dashboard.recommendations.loading': 'Analizando tu biblioteca para encontrar recomendaciones...',
    'dashboard.recommendations.empty': 'No hay suficientes datos para generar recomendaciones.',
    'dashboard.recommendations.button': 'Añadir a Biblioteca',
    
    'settings.title': 'Ajustes de la Estación',
    'settings.stationName.label': 'Nombre de la Estación',
    'settings.stationDesc.label': 'Descripción de la Estación',
    'settings.radioFormat.label': 'Formato de Radio',
    'settings.save': 'Guardar Ajustes',
    
    'header.switchLanguage': 'Cambiar Idioma',

    'aistudio.translateScript': 'Traducir Guion',
    'aistudio.translateTo': 'Traducir a',
    'aistudio.translate': 'Traducir',
    'aistudio.translation': 'Traducción',
  },
  fr: {
    'pageTitles.dashboard': 'Tableau de Bord',
    'pageTitles.controlRoom': 'Salle de Contrôle',
    'pageTitles.settings': 'Paramètres de la Station',
    'pageTitles.audioContent': 'Contenu Audio',
    'pageTitles.aiContentStudio': 'Studio de Contenu IA',
    'pageTitles.playlists': 'Playlists',
    'pageTitles.schedule': 'Programme',
    'pageTitles.analytics': 'Analyses',
    'pageTitles.userManagement': 'Gestion des Utilisateurs',
    'pageTitles.userProfile': 'Mon Profil',

    'sidebar.dashboard': 'Tableau de Bord',
    'sidebar.controlRoom': 'Salle de Contrôle',
    'sidebar.settings': 'Paramètres Station',
    'sidebar.userManagement': 'Gestion Utilisateurs',
    'sidebar.billing': 'Crédits et Facturation',
    'sidebar.azuracast': 'Lier Azuracast',
    'sidebar.shoutcast': 'Lier Shoutcast',
    'sidebar.liquidsoap': 'Liquidsoap',
    'sidebar.content': 'Contenu',
    'sidebar.audioContent': 'Contenu Audio',
    'sidebar.contentVault': 'Coffre de Contenu',
    'sidebar.aiContentStudio': 'Studio Contenu IA',
    'sidebar.aiVoiceCloning': 'Clonage Vocal IA',
    'sidebar.showPrep': 'Préparation d\'Émission',
    'sidebar.podcastStudio': 'Studio de Podcast',
    'sidebar.live': 'Chat Vocal en Direct',
    'sidebar.social': 'Réseaux Sociaux',
    'sidebar.audience': 'Audience',
    'sidebar.integrations': 'Intégrations',
    'sidebar.websiteCms': 'CMS Site Web',
    'sidebar.rssAutomation': 'Automatisation RSS',
    'sidebar.playlists': 'Playlists',
    'sidebar.showDesigner': 'Concepteur d\'Émission',
    'sidebar.schedule': 'Programme',
    'sidebar.analytics': 'Analyses',
    'sidebar.adManager': 'Gestion des Pubs',
    'sidebar.trafficWeather': 'Trafic & Météo',
    'sidebar.help': 'Aide',

    'dashboard.stats.streamStatus': 'État du Flux Cloud',
    'dashboard.stats.totalContent': 'Contenu Total',
    'dashboard.stats.playlists': 'Playlists',
    'dashboard.stats.aiCredits': 'Crédits IA',
    'dashboard.livePlayout.title': 'État de la Diffusion',
    'dashboard.livePlayout.nowPlaying': 'En Cours de Lecture',
    'dashboard.livePlayout.upNext': 'À Suivre',
    'dashboard.livePlayout.offline.title': 'Station Hors Ligne',
    'dashboard.livePlayout.offline.subtitle': 'Allez à la page Programme pour démarrer votre diffusion.',
    'dashboard.livePlayout.offline.button': 'Aller au Programme',
    'dashboard.vibe.title': 'Ambiance de la Station',
    'dashboard.vibe.description_admin': 'Définissez l\'ambiance pour votre DJ IA. Cela changera le ton des annonces générées en temps réel.',
    'dashboard.vibe.description_user': 'L\'ambiance actuelle de la station définie par un admin. Cela affecte le ton des annonces de l\'IA.',
    'dashboard.clock.title': 'Horloge',
    'dashboard.listenUrl.title': 'URL de Stream Public',
    'dashboard.listenUrl.placeholder': 'Définissez votre URL de stream dans les Paramètres pour la partager.',
    'dashboard.recommendations.title': 'Recommandations IA du Coffre',
    'dashboard.recommendations.loading': 'Analyse de votre bibliothèque pour des recommandations...',
    'dashboard.recommendations.empty': 'Pas assez de données pour générer des recommandations.',
    'dashboard.recommendations.button': 'Ajouter à la Bibliothèque',

    'settings.title': 'Paramètres de la Station',
    'settings.stationName.label': 'Nom de la Station',
    'settings.stationDesc.label': 'Description de la Station',
    'settings.radioFormat.label': 'Format de la Radio',
    'settings.save': 'Enregistrer',

    'header.switchLanguage': 'Changer de Langue',

    'aistudio.translateScript': 'Traduire le Script',
    'aistudio.translateTo': 'Traduire en',
    'aistudio.translate': 'Traduire',
    'aistudio.translation': 'Traduction',
  },
};

const LocalizationContext = React.createContext({
  language: 'en' as Language,
  setLanguage: (lang: Language) => {},
  t: (key: string) => key,
});

export const useLocalization = () => React.useContext(LocalizationContext);

const LocalizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    try {
      return (localStorage.getItem('language') as Language) || 'en';
    } catch (e) {
      return 'en';
    }
  });
  
  useEffect(() => {
    try {
      localStorage.setItem('language', language);
    } catch (e) {
      console.error("Could not save language to localStorage:", e);
    }
  }, [language]);

  const t = (key: string): string => {
    return translations[language]?.[key] || translations['en'][key] || key;
  };
  
  return (
    <LocalizationContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LocalizationContext.Provider>
  );
};


const AppContent: React.FC = () => {
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { stationSettings, saveStationSettings, currentUser } = useAuth();
  const { t } = useLocalization();
  
  const [appEntered, setAppEntered] = useState(() => {
    try {
      return sessionStorage.getItem('appEntered') === 'true';
    } catch (e) {
      return false;
    }
  });
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
      try {
        sessionStorage.removeItem('appEntered');
      } catch(e) {}
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
    try {
      sessionStorage.setItem('appEntered', 'true');
    } catch (e) {}
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
    dashboard: t('pageTitles.dashboard'),
    controlRoom: t('pageTitles.controlRoom'),
    settings: t('pageTitles.settings'),
    azuracast: t('pageTitles.azuracast'),
    shoutcast: t('pageTitles.shoutcast'),
    liquidsoap: t('pageTitles.liquidsoap'),
    content: t('pageTitles.content'),
    audioContent: t('pageTitles.audioContent'),
    contentVault: t('pageTitles.contentVault'),
    aiContentStudio: t('pageTitles.aiContentStudio'),
    aiVoiceCloning: t('pageTitles.aiVoiceCloning'),
    showPrep: t('pageTitles.showPrep'),
    podcastStudio: t('pageTitles.podcastStudio'),
    playlists: t('pageTitles.playlists'),
    schedule: t('pageTitles.schedule'),
    analytics: t('pageTitles.analytics'),
    trafficWeather: t('pageTitles.trafficWeather'),
    userManagement: t('pageTitles.userManagement'),
    rssAutomation: t('pageTitles.rssAutomation'),
    userProfile: t('pageTitles.userProfile'),
    live: t('pageTitles.live'),
    help: t('pageTitles.help'),
    social: t('pageTitles.social'),
    audience: t('pageTitles.audience'),
    integrations: t('pageTitles.integrations'),
    adManager: t('pageTitles.adManager'),
    billing: t('pageTitles.billing'),
    showDesigner: t('pageTitles.showDesigner'),
    websiteCms: t('pageTitles.websiteCms'),
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
        <LiveDJModal isOpen={isLiveDjModalOpen} onClose={() => setIsLiveDjModalOpen(false)} theme={theme} />
      </PlayerProvider>
    </ContentProvider>
  );
};


const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <LocalizationProvider>
          <AppContent />
        </LocalizationProvider>
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;