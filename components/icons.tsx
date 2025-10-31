import React from 'react';

const IconWrapper: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = "h-5 w-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        {children}
    </svg>
);

export const BroadcastIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
    <IconWrapper className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586" />
    </IconWrapper>
);

export const RadioIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-brand-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.342c-3.14 0-5.688-2.548-5.688-5.688S8.86 6.966 12 6.966c3.14 0 5.688 2.548 5.688 5.688 0 3.14-2.548 5.688-5.688 5.688z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v2m0 16v2m-9-9H1m18 0h-2m-2.121-7.071l-1.414 1.414m-9.899 9.899l-1.414 1.414m12.727 0l1.414-1.414m-9.899-9.899l1.414-1.414" />
  </svg>
);

export const MenuIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
);

export const XIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

export const DashboardIcon: React.FC = () => (
    <IconWrapper>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </IconWrapper>
);

export const InboxIcon: React.FC = () => (
    <IconWrapper>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </IconWrapper>
);

export const SettingsIcon: React.FC = () => (
    <IconWrapper>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066 2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </IconWrapper>
);

export const LinkIcon: React.FC = () => (
    <IconWrapper>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </IconWrapper>
);

export const MusicIcon: React.FC = () => (
    <IconWrapper>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 6l12-3" />
    </IconWrapper>
);

export const PlaylistIcon: React.FC = () => (
    <IconWrapper>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </IconWrapper>
);

export const AnalyticsIcon: React.FC = () => (
    <IconWrapper>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18" />
    </IconWrapper>
);

export const DollarSignIcon: React.FC = () => (
    <IconWrapper>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 12v-2m0-10a9 9 0 110 18 9 9 0 010-18z" />
    </IconWrapper>
);

export const AudioWaveIcon: React.FC = () => (
    <IconWrapper>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </IconWrapper>
);

export const SunIcon: React.FC = () => (
    <IconWrapper className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </IconWrapper>
);

export const MoonIcon: React.FC = () => (
    <IconWrapper className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </IconWrapper>
);

export const LightbulbIcon: React.FC<{className?: string}> = ({ className = "h-6 w-6" }) => (
    <IconWrapper className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </IconWrapper>
);

export const PencilIcon: React.FC = () => (
    <IconWrapper className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" />
    </IconWrapper>
);

export const TrashIcon: React.FC = () => (
    <IconWrapper className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </IconWrapper>
);

export const PlaylistAddIcon: React.FC = () => (
    <IconWrapper className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </IconWrapper>
);

export const QueueAddIcon: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
    <IconWrapper className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h10" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 17h6m-3-3v6" />
    </IconWrapper>
);

export const PlayCircleIcon: React.FC = () => (
    <IconWrapper className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </IconWrapper>
);

export const PauseCircleIcon: React.FC = () => (
    <IconWrapper className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </IconWrapper>
);

export const DownloadIcon: React.FC = () => (
    <IconWrapper className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </IconWrapper>
);

export const SparklesIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
    <IconWrapper className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-6.857 2.143L12 21l-2.143-6.857L3 12l6.857-2.143L12 3z" />
    </IconWrapper>
);

export const GlobeIcon: React.FC = () => (
    <IconWrapper>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9V3m0 18a9 9 0 009-9m-9 9a9 9 0 00-9-9" />
    </IconWrapper>
);

export const CloudIcon: React.FC = () => (
    <IconWrapper>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999A5.002 5.002 0 105.18 6.64a4.002 4.002 0 00-2.08 8.36" />
    </IconWrapper>
);


export const SortIcon: React.FC = () => (
    <IconWrapper className="h-3 w-3 ml-1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9M3 12h9m-9 4h9m5-4v.01M17 8v.01" />
    </IconWrapper>
);

export const ArrowUpIcon: React.FC = () => (
    <IconWrapper className="h-3 w-3 ml-1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </IconWrapper>
);

export const ArrowDownIcon: React.FC = () => (
    <IconWrapper className="h-3 w-3 ml-1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </IconWrapper>
);

export const CheckIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
    <IconWrapper className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </IconWrapper>
);

export const CheckCircleIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
    <IconWrapper className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </IconWrapper>
);

export const ExclamationCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <IconWrapper className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </IconWrapper>
);

export const InformationCircleIcon: React.FC = () => (
    <IconWrapper>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </IconWrapper>
);

export const HistoryIcon: React.FC = () => (
    <IconWrapper>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </IconWrapper>
);

export const DocumentTextIcon: React.FC = () => (
    <IconWrapper>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </IconWrapper>
);

export const PlayIcon: React.FC = () => (
    <IconWrapper className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    </IconWrapper>
);

export const PauseIcon: React.FC = () => (
    <IconWrapper className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6" />
    </IconWrapper>
);

export const VolumeUpIcon: React.FC = () => (
    <IconWrapper className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </IconWrapper>
);

export const VolumeOffIcon: React.FC = () => (
    <IconWrapper className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l-4-4m0 0l-4 4m4-4v12" />
    </IconWrapper>
);

export const ArrowLeftIcon: React.FC = () => (
    <IconWrapper className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </IconWrapper>
);

export const ChevronUpIcon: React.FC = () => (
    <IconWrapper className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </IconWrapper>
);

export const ChevronDownIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
    <IconWrapper className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </IconWrapper>
);

export const ShuffleIcon: React.FC = () => (
    <IconWrapper>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-6 6-4-4-6 6" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 3l6 6" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 21l6-6" />
    </IconWrapper>
);

export const SkipBackIcon: React.FC = () => (
    <IconWrapper>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12.066 11.2a1 1 0 000-2.4l-6.8-4A1 1 0 004 5.6v12.8a1 1 0 001.266.95l6.8-4z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 4v16" />
    </IconWrapper>
);

export const SkipForwardIcon: React.FC = () => (
    <IconWrapper>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.934 12.8a1 1 0 000-1.6l6.8-4a1 1 0 011.266.8v12.8a1 1 0 01-1.266.8l-6.8-4z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v16" />
    </IconWrapper>
);

export const DragHandleIcon: React.FC = () => (
    <IconWrapper className="h-5 w-5 cursor-grab text-gray-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </IconWrapper>
);

export const ChevronLeftIcon: React.FC = () => (
    <IconWrapper>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </IconWrapper>
);

export const ChevronRightIcon: React.FC = () => (
    <IconWrapper>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </IconWrapper>
);

export const SaveIcon: React.FC = () => (
    <IconWrapper>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3l-4 4-4-4z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v-8" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12l-3-3-3 3" />
    </IconWrapper>
);

export const FolderOpenIcon: React.FC = () => (
    <IconWrapper>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
    </IconWrapper>
);

export const CloudSunIcon: React.FC = () => (
    <IconWrapper className="h-8 w-8 text-brand-blue">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </IconWrapper>
);

export const RouteIcon: React.FC = () => (
    <IconWrapper className="h-8 w-8 text-brand-blue">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </IconWrapper>
);

export const PlusIcon: React.FC<{className?: string}> = ({ className = "h-4 w-4" }) => (
    <IconWrapper className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </IconWrapper>
);

export const UploadIcon: React.FC<{className?: string}> = ({className = "h-5 w-5"}) => (
    <IconWrapper className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M12 12v9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15l3-3 3 3" />
    </IconWrapper>
);

export const VaultIcon: React.FC = () => (
    <IconWrapper>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </IconWrapper>
);

export const MapIcon: React.FC = () => (
    <IconWrapper>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </IconWrapper>
);

export const VoiceIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
    <IconWrapper className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </IconWrapper>
);

export const CodeIcon: React.FC = () => (
    <IconWrapper>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </IconWrapper>
);

export const RssIcon: React.FC = () => (
    <IconWrapper>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z" />
    </IconWrapper>
);

export const ScheduleIcon: React.FC = () => (
    <IconWrapper>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </IconWrapper>
);

export const LiveIcon: React.FC = () => (
    <IconWrapper>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </IconWrapper>
);

export const AiIcon: React.FC = () => (
    <IconWrapper>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </IconWrapper>
);

export const UserIcon: React.FC<{ className?: string }> = ({ className = "h-full w-full text-gray-400 dark:text-gray-500" }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
);

export const HelpIcon: React.FC = () => (
    <IconWrapper>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 17.25h.008v.008H12v-.008z" />
    </IconWrapper>
);

export const ShareIcon: React.FC = () => (
    <IconWrapper>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
    </IconWrapper>
);

export const FacebookIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
    </svg>
);


export const ClockIcon: React.FC = () => (
    <IconWrapper>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </IconWrapper>
);

export const TrendingUpIcon: React.FC = () => (
    <IconWrapper>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </IconWrapper>
);

export const UsersIcon: React.FC = () => (
    <IconWrapper>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </IconWrapper>
);

export const RefreshIcon: React.FC = () => (
    <IconWrapper>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 12A8 8 0 1012 4a8 8 0 00-1.2 15.5" />
    </IconWrapper>
);

export const ClipboardListIcon: React.FC = () => (
    <IconWrapper>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </IconWrapper>
);

// FIX: Update TrophyIcon to accept an optional className prop.
export const TrophyIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
    <IconWrapper className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M3 9h2m14 0h2M3 15h2m14 0h2M9 21h6" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21V9.5C12 7.015 10.485 5 8.5 5S5 7.015 5 9.5V17a4 4 0 004 4zm0 0v-1.5m0 1.5c-2.485 0-4.5-2.015-4.5-4.5V9.5C7.5 7.015 9.015 5 11 5s3.5 2.015 3.5 4.5V17a4 4 0 01-4 4z" />
    </IconWrapper>
);

export const ThumbsUpIcon: React.FC = () => (
    <IconWrapper>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m0 0V5.263a2 2 0 012-2h4.017a2 2 0 011.789 1.106l3.5 7-3.5 7H7z" />
    </IconWrapper>
);

export const ThumbsDownIcon: React.FC = () => (
    <IconWrapper>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.017c.163 0 .326.02.485.06L17 4m0 0v14.737a2 2 0 01-2 2h-4.017a2 2 0 01-1.789-1.106l-3.5-7 3.5-7H17z" />
    </IconWrapper>
);

export const PieChartIcon: React.FC = () => (
    <IconWrapper>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
    </IconWrapper>
);

export const DiscordIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M20.317 4.36988C18.7915 3.74624 17.182 3.28472 15.524 3.00031C15.2955 3.3933 15.0255 3.86993 14.838 4.36988C12.872 3.86993 10.906 3.86993 8.94 4.36988C8.7525 3.86993 8.4825 3.3933 8.254 3.00031C6.596 3.28472 4.9865 3.74624 3.461 4.36988C0.499 9.39527 0 14.7373 1.29 19.6311C2.948 20.9155 4.831 21.6821 6.6315 22.0003C7.273 21.1929 7.8315 20.3021 8.293 19.3279C7.8315 19.0435 7.3285 18.6757 6.908 18.2245C6.7205 18.0163 6.533 17.7873 6.387 17.5375C2.653 16.5016 1.831 13.064 2.809 9.9406C3.4925 7.97587 5.253 6.44971 7.012 5.59973C7.0535 5.55805 7.095 5.51637 7.1365 5.47468C7.1573 5.45384 7.178 5.433 7.1988 5.41216C9.223 4.54134 11.206 4.36988 13.1475 4.49383C13.1683 4.49383 13.189 4.49383 13.2098 4.49383C15.1513 4.36988 17.1343 4.54134 19.1588 5.41216C19.1795 5.433 19.2003 5.45384 19.221 5.47468C19.2625 5.51637 19.304 5.55805 19.3455 5.59973C21.1045 6.44971 22.865 7.97587 23.5485 9.9406C24.5265 13.064 23.7045 16.5016 19.9705 17.5375C19.8245 17.7873 19.637 18.0163 19.4495 18.2245C19.029 18.6757 18.526 19.0435 18.0645 19.3279C18.526 20.3021 19.0845 21.1929 19.726 22.0003C21.5265 21.6821 23.4095 20.9155 25.0675 19.6311C26.3783 14.4529 25.7955 9.31189 22.8125 4.36988H20.317Z"/>
        <path d="M8.22598 12.0002C9.43498 12.0002 10.428 11.0071 10.428 9.79819C10.428 8.58919 9.43498 7.59619 8.22598 7.59619C7.01698 7.59619 6.02398 8.58919 6.02398 9.79819C6.02398 11.0071 7.01698 12.0002 8.22598 12.0002Z"/>
        <path d="M18.138 12.0002C19.347 12.0002 20.34 11.0071 20.34 9.79819C20.34 8.58919 19.347 7.59619 18.138 7.59619C16.929 7.59619 15.936 8.58919 15.936 9.79819C15.936 11.0071 16.929 12.0002 18.138 12.0002Z"/>
    </svg>
);

export const SlackIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523-2.521 2.527 2.527 0 0 1-2.52-2.522V2.522A2.527 2.527 0 0 1 15.168 0a2.528 2.528 0 0 1 2.52 2.522v6.312zM15.168 18.956a2.528 2.528 0 0 1 2.52 2.522A2.528 2.528 0 0 1 15.168 24a2.527 2.527 0 0 1-2.52-2.522v-2.52h2.52zM15.168 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.31z"/>
    </svg>
);

export const WebhookIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => (
    <svg className={className} stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 8a4 4 0 0 0-4 4h-4a4 4 0 0 0 0 8h4a4 4 0 0 0 4-4Z"></path>
        <path d="M6 12H4a4 4 0 0 0 0 8h2"></path>
        <path d="M12 2v2"></path>
        <path d="m6.34 6.34-.7.7"></path>
        <path d="m17.66 6.34.7.7"></path>
    </svg>
);

export const SlidersIcon: React.FC = () => (
    <IconWrapper>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 16v-2m0-8v-2m-4 6v-2m8-4v-2M4 12h2m12 0h2M7 16h2m8 0h2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
    </IconWrapper>
);

export const ExternalLinkIcon: React.FC = () => (
    <IconWrapper className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </IconWrapper>
);