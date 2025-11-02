

import React from 'react';
import { MenuIcon, SunIcon, MoonIcon, CheckIcon, BroadcastIcon, GlobeIcon } from './icons';
import type { Page, Theme, Language } from '../App';
import { useAuth } from '../contexts/AuthContext';
import ActionHub from './ActionHub';
import { useLocalization } from '../App';

interface HeaderProps {
    title: string;
    onMenuClick: () => void;
    theme: Theme;
    setTheme: (theme: Theme) => void;
    setActivePage: (page: Page) => void;
    onActionTrigger: (page: Page, trigger: string) => void;
    onGoLiveClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ title, onMenuClick, theme, setTheme, setActivePage, onActionTrigger, onGoLiveClick }) => {
    const { currentUser, users, switchUser, logout } = useAuth();
    const { language, setLanguage, t } = useLocalization();
    const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
    const [isLangDropdownOpen, setIsLangDropdownOpen] = React.useState(false);

    const languages: Record<Language, string> = {
        en: 'English',
        es: 'Español',
        fr: 'Français',
    };

    const toggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    return (
        <header className="bg-white dark:bg-gray-800 shadow-md p-4 flex items-center justify-between z-10">
            <div className="flex items-center">
                 <button className="lg:hidden text-gray-600 dark:text-gray-300 mr-4" onClick={onMenuClick} aria-label="Open sidebar">
                    <MenuIcon />
                </button>
                <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">{title}</h1>
            </div>
            
            <div className="flex items-center space-x-4">
                 <button 
                    onClick={onGoLiveClick}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-red-500 transition-colors"
                >
                    <BroadcastIcon />
                    <span>Go Live</span>
                </button>
                <ActionHub onActionTrigger={onActionTrigger} onNavigate={setActivePage} />

                 {/* User Switcher Dropdown */}
                 <div className="relative">
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none"
                    >
                        <div className="text-right">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{currentUser?.username}</span>
                          <span className="block text-xs text-brand-blue font-semibold">{currentUser?.credits.toLocaleString()} Credits</span>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-brand-blue dark:bg-blue-900/50 dark:text-blue-300">{currentUser?.role}</span>
                    </button>
                    {isDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-700 rounded-md shadow-lg py-1 z-20">
                            <div className="px-4 py-2 border-b dark:border-gray-600">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{currentUser?.username}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{currentUser?.email}</p>
                            </div>
                             <button
                                onClick={() => { setActivePage('userProfile'); setIsDropdownOpen(false); }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                            >
                                My Profile
                            </button>
                            <div className="border-t dark:border-gray-600 my-1"></div>
                             <button
                                onClick={() => { logout(); setIsDropdownOpen(false); }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                            >
                                Logout
                            </button>
                            <div className="border-t dark:border-gray-600 my-1"></div>
                            <p className="px-4 pt-2 pb-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Switch User</p>
                            {users.map(user => (
                                <button
                                    key={user.id}
                                    onClick={() => { switchUser(user.id); setIsDropdownOpen(false); }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 flex justify-between items-center"
                                >
                                    <span>{user.username}</span>
                                    {currentUser?.id === user.id && <CheckIcon className="h-4 w-4 text-brand-blue" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Language Switcher */}
                <div className="relative">
                    <button
                        onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                        className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue"
                        aria-label="Switch language"
                    >
                        <GlobeIcon />
                    </button>
                    {isLangDropdownOpen && (
                         <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-700 rounded-md shadow-lg py-1 z-20">
                             <p className="px-4 pt-1 pb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{t('header.switchLanguage')}</p>
                             {Object.keys(languages).map((langCode) => (
                                 <button
                                     key={langCode}
                                     onClick={() => { setLanguage(langCode as Language); setIsLangDropdownOpen(false); }}
                                     className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 flex justify-between items-center"
                                 >
                                     <span>{languages[langCode as Language]}</span>
                                     {language === langCode && <CheckIcon className="h-4 w-4 text-brand-blue" />}
                                 </button>
                             ))}
                         </div>
                    )}
                </div>

                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue"
                    aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                >
                    {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                </button>
            </div>
        </header>
    );
};

export default Header;