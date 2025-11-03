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

const ShoutcastSetupGuide: React.FC = () => (
    <div className="mt-8 prose dark:prose-invert max-w-none bg-gray-50 dark:bg-gray-800/50 p-6 rounded-lg shadow-inner">
        <h2 className="!text-2xl !font-bold">Shoutcast Server Setup Guide</h2>
        <p>Shoutcast is freeware that allows you to take your online radio station or podcast on the air. It only takes a few steps to set up a Shoutcast server and there’s no coding necessary. Read about what the requirements are and follow our step-by-step guide below to get your show streaming.</p>

        <h3 className="!text-xl !font-semibold">What is Shoutcast?</h3>
        <p>Shoutcast is a dedicated server that you can use to make your personal web radio station or WordPress podcast available to listeners. Your audience can then connect to your server from any device and stream your program with VLC or an alternative media player.</p>
        <p>In addition to a Shoutcast server, you need a source, i.e., software for creating the actual stream that is transmitted to the server. You can use Winamp and the Source DSP plugin for Shoutcast to do this.</p>
        
        <div className="bg-blue-50 dark:bg-gray-700/80 border-l-4 border-brand-blue p-4 rounded-r-lg my-4 not-prose">
            <p className="font-bold text-brand-blue">Fact</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">A Shoutcast server is also called a DNAS server. DNAS stands for Distributed Network Audio Server.</p>
        </div>

        <h3 className="!text-xl !font-semibold">What are the requirements for a Shoutcast server?</h3>
        <p>Before you can set up your own Shoutcast server, you need to make sure you have the right hardware. A decisive factor when choosing a server is the bandwidth. The more listeners you have simultaneously connecting to your server, the higher the bandwidth should be. This ensures a smooth stream.</p>
        <p>In order to install Shoutcast Server version 2.6 on your server, you need to make sure your operating system meets one of the following minimum requirements:</p>
        <ul>
            <li>Windows 32-bit: Windows 2000, XP, Vista, Windows 7, 8, 10</li>
            <li>Windows 64-bit: Windows XP, Vista, Windows 7, 8, 10</li>
            <li>Linux 32-bit</li>
            <li>Linux 64-bit</li>
        </ul>

        <h3 className="!text-xl !font-semibold">Which IONOS servers are suitable for a Shoutcast server?</h3>
        <p>To make your web radio station accessible to your audience, you have two main options: You can use your home PC as a server, or you can use an externally hosted server. With the latter, the bandwidth is higher and more stable. If you use your home PC, the speed and stability of the stream will depend on your internet connection. Since upload speeds are usually around 1,000 to 2,000 Kbps and often streamed at 128 Kbps, you will probably only be able to stream to a maximum of 15 listeners. With an externally hosted server, you won’t have to worry about this, because you’ll have higher bandwidth at your disposal.</p>
        <p>You should also consider how often you want to stream and how long each streaming session will be. The more often and longer you stream, the more worthwhile it is to invest in a high-quality server. With server hosting, you can choose between a cloud server, a vServer and a dedicated server.</p>
        
        <div className="bg-blue-50 dark:bg-gray-700/80 border-l-4 border-brand-blue p-4 rounded-r-lg my-4 not-prose">
            <p className="font-bold text-brand-blue">Tip</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">With a vServer, you pay a fixed monthly price. Having a pricing model that doesn’t fluctuate from one month to the next will make it easier for you to plan your budget.</p>
        </div>
        
        <p>Cloud servers offer flexible scaling. This means that more server power can be used during peak times, and you only pay for what you use. A vServer offers you virtual resources that are billed at a fixed monthly price. If you know exactly how much capacity you need, this may be the model for you. Web radio professionals who already have a large listener base may want to take a closer look at dedicated servers. These offer high performance capacities, especially in terms of bandwidth.</p>
        
        <div className="bg-blue-50 dark:bg-gray-700/80 border-l-4 border-brand-blue p-4 rounded-r-lg my-4 not-prose">
            <p className="font-bold text-brand-blue">Tip</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">For newbies who are setting up a web radio server for the first time, we recommend trying a cloud server. With an IONOS Cloud Server, you can test the waters and only pay for what you actually use.</p>
        </div>

        <h3 className="!text-xl !font-semibold">How to set up a Shoutcast server: A step-by-step guide</h3>
        <p>To set up your Shoutcast DNAS server, follow the instructions below. In this tutorial, we are using the IONOS Cloud Server with the Windows 2019 operating system. Of course, it’s also possible to use a different server to set up Shoutcast.</p>

        <h4>Step 1: Set up a connection to the server</h4>
        <p>In order to perform the installation, you’ll need to first establish a connection to your server. To do this, log into your IONOS customer account and go to the Server and Cloud area. Then select your server. You can give it a name so that it’s easier to identify. Here, we’ve named our server “SHOUTcast Server”.</p>
        <p>You will see an overview of the access data and the current load of the server. To set up a remote connection to the server, click on Download. Once the file is downloaded, open it with a double click. When prompted, log in as administrator and enter the initial password. If you are having problems accessing your server, you may still need to unblock the firewall.</p>
        <div className="my-6 p-4 border border-dashed dark:border-gray-600 rounded-lg text-center text-sm text-gray-500 dark:text-gray-400 not-prose">
            <p><em>Image: Screenshot of the server interface of an IONOS Cloud Server.</em></p>
            <p className="mt-1">In this overview, you can see the IP address of the server, which you can connect to remotely.</p>
        </div>

        <h4>Step 2: Set up your Shoutcast station</h4>
        <p>Before you start with the actual installation of the server, you’ll need to first create a Shoutcast account. To do this, go to the Shoutcast website and register your station. You can adjust things at a later point in time if you need to.</p>
        <p>Here you can enter information about your radio station that will later be displayed to your audience. This information can also be used to help people find your station, so make sure to create an accurate and engaging description of your program here. In the next step, specify the language you want to broadcast in. After you are done, your station will be ready, and you’ll be able to see the Shoutcast dashboard.</p>
        
        <h4>Step 3: Install the Shoutcast server</h4>
        <p>Now it’s time for the actual installation of the Shoutcast DNAS server. To do this, go to the online dashboard of your Shoutcast account. Click on your name in the upper right corner and then on Manage your plan.</p>
        <p>Download the server version that is compatible with your operating system. In our example, we use version 2.6.1 for Windows 64-bit. However, you can also install the server on a Linux system. Open the downloaded file with the name <code>sc_serv2_win64_latest.exe</code>. Now follow the installer through the setup process.</p>
        <div className="bg-yellow-50 dark:bg-yellow-900/50 border-l-4 border-yellow-400 p-4 rounded-r-lg my-4 not-prose">
            <p className="font-bold text-yellow-800 dark:text-yellow-200">Caution</p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">Do not install the program in the folder that is automatically suggested. In the Choose Install Location step, create a new folder instead. It is important that the file you choose gives you full editing access, as files will need to be configured later. For example, you can use the following path: <code>C:\Shoutcast\</code></p>
        </div>
        <p>Next, you can select which components of Shoutcast should be installed. Here make sure to check Documentation so that helpful sample files and instructions will be installed. Then click on Install and complete the installation.</p>
        <div className="my-6 p-4 border border-dashed dark:border-gray-600 rounded-lg text-center text-sm text-gray-500 dark:text-gray-400 not-prose">
            <p><em>Image: Screenshot of the Shoutcast server installation process.</em></p>
            <p className="mt-1">When installing your Shoutcast server, make sure to check the box next to Documentation.</p>
        </div>

        <h4>Step 4: Configure your Shoutcast server</h4>
        <p>You’ve already laid the foundations for your Shoutcast server, however, before you connect your source to it, it’s useful to look at some other settings.</p>
        <div className="bg-blue-50 dark:bg-gray-700/80 border-l-4 border-brand-blue p-4 rounded-r-lg my-4 not-prose">
            <p className="font-bold text-brand-blue">Tip</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">In the README files, you will find lots of up-to-date tips for setting up and configuring your Shoutcast server.</p>
        </div>
        <p>Go to your Shoutcast folder and start the <code>setup.bat</code> file with a double click. An input window should open as well as a setup interface in your browser. You can set up the basic configuration of the server and your first stream here.</p>
        <div className="my-6 p-4 border border-dashed dark:border-gray-600 rounded-lg text-center text-sm text-gray-500 dark:text-gray-400 not-prose">
            <p><em>Image: Screenshot of the Shoutcast DNAS setup.</em></p>
            <p className="mt-1">The setup mode lets you configure basic Shoutcast settings.</p>
        </div>
        <p>Now, it’s important to set a general password for the source and the administrator. You’ll need the source password when you connect your stream to the server and the admin password to log in to the administrator dashboard.</p>
        <p>In the field for Maximum Listeners, you can set the amount of people who can connect to your stream at the same time. The maximum number is 512, but if you don’t want to set a maximum number, enter “0”. It is, however, important to note that if too many people dial in and the server gets overloaded, you may encounter stalling issues with your stream.</p>
        <div className="bg-blue-50 dark:bg-gray-700/80 border-l-4 border-brand-blue p-4 rounded-r-lg my-4 not-prose">
            <p className="font-bold text-brand-blue">Tip</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">If you want a large number of people to be able to listen to your stream at the same time, you’ll need to have high-quality hardware. In this case, we recommend using a dedicated server.</p>
        </div>
        <p>The port should be set to 8000. If you want to assign a different port, make a note of it, because it will have to be forwarded later. Then click on Continue.</p>
        <p>In the next step, you can set more information specific to your stream. If you want, you can assign special passwords for the stream. If you don’t enter anything, then the previously assigned passwords will be used automatically. The same applies to the maximum number of listeners.</p>
        <p>Under Listener Stream Path, you can assign an individual URL for users. This allows them to select the stream directly. Here’s an example of what this would look like: <code>http://serveraddress:8000/[name of stream]</code>. Behind “serveraddress:”, enter your server IP address.</p>
        <p>If you want your stream to be found in the Shoutcast Stream Dictionary, enter your stream authhash. You can find it online in the Shoutcast dashboard under Settings &gt; Advanced. Now, you will get an overview of the data you have entered. When you click on Continue, the server information will be saved as <code>sc_serv.conf</code>. Close the input window.</p>
        <p>Now your server is ready. Double-click <code>sc_serv.exe</code> to start the server.</p>
        <div className="bg-blue-50 dark:bg-gray-700/80 border-l-4 border-brand-blue p-4 rounded-r-lg my-4 not-prose">
            <p className="font-bold text-brand-blue">Tip</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">The Shoutcast folder contains a lot of helpful information about how to configure your server. In the Examples folder, you can find preconfigured .conf files that you can use for your server.</p>
        </div>
        <p>Open <code>http://127.0.0.1:8000/admin.cgi</code> and enter “admin” as the username and the admin password you selected. Here you can view and manage all data related to your server and connected users.</p>
        <div className="my-6 p-4 border border-dashed dark:border-gray-600 rounded-lg text-center text-sm text-gray-500 dark:text-gray-400 not-prose">
            <p><em>Image: Screenshot from the admin dashboard of the Shoutcast server.</em></p>
            <p className="mt-1">The admin dashboard is where you manage your server and streams.</p>
        </div>

        <h4>Step 5: Enable port forwarding</h4>
        <p>Lastly, enable port forwarding to allow your source and users to connect to your server. To do this, go back to your IONOS customer account. Go to the Network menu item and then to Share Firewall. Here, you can set up a new port forwarding rule. Select the protocol TCP/UDP then the port 8000 or the port that you selected in the setup and enter a description.</p>
        <p>Now your server is ready. You can connect your source to the server and start streaming.</p>
        <div className="my-6 p-4 border border-dashed dark:border-gray-600 rounded-lg text-center text-sm text-gray-500 dark:text-gray-400 not-prose">
            <p><em>Image: Screenshot of the port share in the IONOS customer account.</em></p>
            <p className="mt-1">Set up a port forwarding for the Shoutcast server in your IONOS server.</p>
        </div>
    </div>
);


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
    const [showSetupGuide, setShowSetupGuide] = useState(false);

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
            <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Link Your Shoutcast Radio</h2>
                <p className="mt-2 mb-6 text-gray-600 dark:text-gray-400">
                    Connect your Shoutcast DNAS server to sync your station data and manage your stream.
                </p>

                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg flex justify-between items-center">
                    <h3 className="text-lg font-medium">Connection Status:</h3>
                    {getStatusIndicator()}
                </div>

                <form onSubmit={handleConnect} className="space-y-6 max-w-2xl">
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
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                        <h3 className="font-semibold text-gray-800 dark:text-white">Don't have a Shoutcast server?</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Learn how to set up your own freeware radio server from scratch.</p>
                        <button onClick={() => setShowSetupGuide(!showSetupGuide)} className="mt-3 text-sm font-semibold text-brand-blue hover:underline">
                            {showSetupGuide ? 'Hide Setup Guide' : 'Show Step-by-Step Guide'}
                        </button>
                    </div>
                    {showSetupGuide && <ShoutcastSetupGuide />}
                </div>

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
