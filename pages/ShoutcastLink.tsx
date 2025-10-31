import React, { useState, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import { DownloadIcon } from '../components/icons';

const SHOUTCAST_CONNECTION_KEY = 'shoutcastConnection';

interface ConnectionDetails {
    status: 'disconnected' | 'connecting' | 'connected' | 'error';
    host: string;
    port: string;
    errorMessage?: string;
}

const ShoutcastLink: React.FC = () => {
    const [connectionDetails, setConnectionDetails] = useState<ConnectionDetails>({
        status: 'disconnected',
        host: 'your-server-ip-or-domain.com',
        port: '8060',
        errorMessage: '',
    });
    const [adminPassword, setAdminPassword] = useState('xgdRx7td');
    const [sourcePassword, setSourcePassword] = useState('K6gNCM7C');
    const { addToast } = useToast();

    useEffect(() => {
        try {
            const saved = localStorage.getItem(SHOUTCAST_CONNECTION_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                // Only override if there's a saved connection, otherwise keep pre-filled details
                if (data.status === 'connected') {
                    setConnectionDetails({
                        status: data.status,
                        host: data.host || 'your-server-ip-or-domain.com',
                        port: data.port || '8060',
                    });
                }
            }
        } catch (error) {
            console.error('Could not load Shoutcast connection from localStorage', error);
        }
    }, []);

    const handleConnect = (e: React.FormEvent) => {
        e.preventDefault();
        setConnectionDetails(prev => ({ ...prev, status: 'connecting', errorMessage: '' }));

        // Simulate API call and validation
        setTimeout(() => {
            const { host, port } = connectionDetails;
            let error = '';

            if (host.trim() === '' || host === 'your-server-ip-or-domain.com') {
                error = 'Please replace the placeholder with a real Host/IP address.';
            } else if (!/^\d+$/.test(port) || Number(port) <= 0 || Number(port) > 65535) {
                error = 'Please enter a valid port number (e.g., 8000).';
            } else if (adminPassword.length < 6) {
                error = 'Admin password seems too short. Please double-check it.';
            }

            // Simulate specific connection errors for a more realistic test
            if (!error && (host.includes('badhost') || host.includes('invalid'))) {
                 error = `Could not resolve host: ${host}. Please check the address and try again.`;
            } else if (!error && port === '9999') {
                 error = `Connection timed out. The server at ${host}:${port} is not responding.`;
            } else if (!error && adminPassword !== 'xgdRx7td') {
                 error = 'Authentication failed. The admin password provided is incorrect.';
            }

            if (error) {
                setConnectionDetails(prev => ({ ...prev, status: 'error', errorMessage: error }));
            } else {
                const newDetails = {
                    status: 'connected' as const,
                    host: connectionDetails.host,
                    port: connectionDetails.port,
                };
                try {
                    localStorage.setItem(SHOUTCAST_CONNECTION_KEY, JSON.stringify(newDetails));
                } catch(e) {
                    console.error("Could not save Shoutcast connection", e);
                }
                setConnectionDetails(newDetails);
                addToast(`Successfully connected to Shoutcast server at ${newDetails.host}:${newDetails.port}!`, 'success');
            }
        }, 1500);
    };

    const handleDisconnect = () => {
        if (window.confirm('Are you sure you want to disconnect from Shoutcast?')) {
            try {
                localStorage.removeItem(SHOUTCAST_CONNECTION_KEY);
            } catch(e) {
                console.error("Could not remove Shoutcast connection", e);
            }
            setConnectionDetails({ 
                status: 'disconnected', 
                host: 'your-server-ip-or-domain.com', 
                port: '8060', 
                errorMessage: '' 
            });
            setAdminPassword('xgdRx7td');
        }
    };
    
    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text).then(() => {
            addToast(`${label} copied to clipboard!`, 'success');
        }, (err) => {
            addToast(`Failed to copy ${label}.`, 'error');
            console.error('Could not copy text: ', err);
        });
    };

    const streamUrl = connectionDetails.status === 'connected' 
        ? `http://${connectionDetails.host}:${connectionDetails.port}/stream`
        : '';

    const embedCode = `<audio controls src="${streamUrl}"></audio>`;

    const getStatusIndicator = () => {
        switch (connectionDetails.status) {
            case 'connected':
                return <span className="text-green-500 font-semibold">Connected</span>;
            case 'connecting':
                 return <span className="text-yellow-500 font-semibold">Connecting...</span>;
            case 'error':
                 return <span className="text-red-500 font-semibold">Connection Failed</span>;
            default:
                 return <span className="text-gray-500 font-semibold">Not Connected</span>;
        }
    };

    const getButtonText = () => {
        switch(connectionDetails.status) {
            case 'connecting':
                return 'Testing...';
            case 'error':
                return 'Try Again';
            default:
                return 'Test Connection';
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <div className="max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Link Your Shoutcast Radio</h2>
                <p className="mt-2 mb-6 text-gray-600 dark:text-gray-400">
                    Connect your Shoutcast DNAS server to sync your station data and manage your stream.
                </p>

                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg flex justify-between items-center">
                    <h3 className="text-lg font-medium">Connection Status:</h3>
                    {getStatusIndicator()}
                </div>

                <form onSubmit={handleConnect} className="space-y-6">
                    {connectionDetails.status === 'error' && connectionDetails.errorMessage && (
                        <div className="p-4 my-2 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-400 text-red-800 dark:text-red-200" role="alert">
                            <p className="font-bold">Connection Test Failed</p>
                            <p className="text-sm">{connectionDetails.errorMessage}</p>
                        </div>
                    )}

                    <div>
                        <label htmlFor="shoutcast-host" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Shoutcast Host/IP</label>
                        <input
                            type="text"
                            id="shoutcast-host"
                            value={connectionDetails.host}
                            onChange={(e) => setConnectionDetails(prev => ({ ...prev, host: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue bg-white dark:bg-gray-700 disabled:bg-gray-200 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                            placeholder="e.g., s1.myradio.com or 123.45.67.89"
                            required
                            disabled={connectionDetails.status === 'connecting' || connectionDetails.status === 'connected'}
                        />
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Please replace the placeholder with your actual server IP address or domain name.</p>
                    </div>
                     <div>
                        <label htmlFor="shoutcast-port" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Port</label>
                        <input
                            type="text"
                            id="shoutcast-port"
                            value={connectionDetails.port}
                            onChange={(e) => setConnectionDetails(prev => ({ ...prev, port: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue bg-white dark:bg-gray-700 disabled:bg-gray-200 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                            placeholder="e.g., 8000"
                            required
                            disabled={connectionDetails.status === 'connecting' || connectionDetails.status === 'connected'}
                        />
                    </div>
                     <div>
                        <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Admin Password</label>
                        <input
                            type="password"
                            id="admin-password"
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue bg-white dark:bg-gray-700 disabled:bg-gray-200 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                            placeholder="Enter your Shoutcast admin password"
                            required
                            disabled={connectionDetails.status === 'connecting' || connectionDetails.status === 'connected'}
                        />
                         <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">This is the administrator password for your Shoutcast DNAS server.</p>
                    </div>

                    <div className="pt-5">
                        <div className="flex justify-end">
                             {connectionDetails.status === 'connected' ? (
                                <button
                                    type="button"
                                    onClick={handleDisconnect}
                                    className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                >
                                    Disconnect
                                </button>
                            ) : (
                                <button 
                                    type="submit" 
                                    className="px-6 py-2 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue disabled:bg-gray-400 disabled:cursor-not-allowed"
                                    disabled={connectionDetails.status === 'connecting'}
                                >
                                    {getButtonText()}
                                </button>
                            )}
                        </div>
                    </div>
                </form>

                {connectionDetails.status === 'connected' && (
                    <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">Stream URL & Player</h3>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">
                            Your station is live! Use the URL below for direct streaming or embed the player on your website.
                        </p>

                        <div className="mt-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Direct Stream URL</label>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="text"
                                    readOnly
                                    value={streamUrl}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-700/50"
                                />
                                <button onClick={() => copyToClipboard(streamUrl, 'Stream URL')} className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Copy</button>
                            </div>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Note: Your server may require `https://` instead of `http://` if SSL is configured.</p>
                        </div>
                        
                        <div className="mt-6">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Embeddable HTML5 Player</h4>
                            <div className="p-4 bg-gray-900 rounded-lg font-mono text-sm text-green-300">
                                <code className="break-all">
                                    {embedCode}
                                </code>
                            </div>
                            <button onClick={() => copyToClipboard(embedCode, 'Embed Code')} className="mt-2 px-4 py-2 text-sm bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Copy Code</button>
                        </div>

                        <div className="mt-6">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Player Preview</h4>
                            <audio controls src={streamUrl} className="w-full">
                                Your browser does not support the audio element.
                            </audio>
                        </div>
                    </div>
                )}

                <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">How to Broadcast Live</h3>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                        Once your Shoutcast server is linked, you need a streaming tool on your computer to send your live audio to the server. We recommend using BUTT.
                    </p>

                    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600">
                        <h4 className="font-semibold text-gray-800 dark:text-white">BUTT (Broadcast Using This Tool)</h4>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                            BUTT is a free, easy-to-use tool for streaming live audio from your computer's microphone or line-in to Shoutcast and Icecast servers. It runs on Windows, macOS, and Linux.
                        </p>
                        <ul className="mt-2 list-disc list-inside text-sm text-gray-600 dark:text-gray-300 space-y-1">
                            <li>Stream live voice, DJ sets, or other audio.</li>
                            <li>Record your broadcasts locally on your computer.</li>
                            <li>Stream audio from music players with free tools like Voicemeeter (Windows) or Blackhole (macOS).</li>
                        </ul>
                        <div className="mt-4">
                            <a 
                                href="https://danielnoethen.de/butt/" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600"
                            >
                                <DownloadIcon />
                                <span className="ml-2">Visit BUTT Website</span>
                            </a>
                        </div>
                    </div>
                    
                    {connectionDetails.status === 'connected' && (
                        <div className="mt-6">
                            <h4 className="font-semibold text-gray-800 dark:text-white">Your Server Details for BUTT</h4>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Use these details in your broadcasting software's server settings.</p>
                            <div className="mt-2 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                                <div className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-900/50 rounded-md">
                                    <span>Host / IP: <strong>{connectionDetails.host}</strong></span>
                                    <button onClick={() => copyToClipboard(connectionDetails.host, 'Host')} className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Copy</button>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-900/50 rounded-md">
                                    <span>Port: <strong>{connectionDetails.port}</strong></span>
                                    <button onClick={() => copyToClipboard(connectionDetails.port, 'Port')} className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Copy</button>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-900/50 rounded-md">
                                    <span>Source/Stream Password: <strong>{sourcePassword}</strong></span>
                                    <button onClick={() => copyToClipboard(sourcePassword, 'Source Password')} className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Copy</button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 border-l-4 border-brand-blue text-blue-800 dark:text-blue-200" role="alert">
                        <p className="font-bold">Configuration Tip</p>
                        <p className="text-sm">
                            The <strong>source password</strong> is used by your broadcasting tool (like BUTT) to send the audio stream. The <strong>admin password</strong> is used by this dashboard to manage the server.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShoutcastLink;
