
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import * as db from '../services/db';
import { CreditUsageLog } from '../types';
import { DollarSignIcon, CheckCircleIcon } from '../components/icons';

const Billing: React.FC = () => {
    const { currentUser, purchaseCredits, changeSubscription } = useAuth();
    const [usageHistory, setUsageHistory] = useState<CreditUsageLog[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

    useEffect(() => {
        const loadHistory = async () => {
            if (!currentUser) return;
            setIsLoadingHistory(true);
            const logs = await db.getCreditLogsByTenant(currentUser.tenantId);
            setUsageHistory(logs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            setIsLoadingHistory(false);
        };
        loadHistory();
    }, [currentUser]);
    
    if (!currentUser) {
        return <p>Loading billing information...</p>;
    }

    const plans = [
        { name: 'Hobby', price: '$0/mo', credits: '5,000 monthly', features: ['Basic AI Announcer', '1 AI Voice Clone'] },
        { name: 'Pro Broadcaster', price: '$49/mo', credits: '50,000 monthly', features: ['Full AI Content Studio', '5 AI Voice Clones', 'AI Social Media Manager'] },
        { name: 'Network', price: 'Custom', credits: 'Unlimited', features: ['Everything in Pro', 'Dedicated Support', 'API Access'] }
    ];

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Current Plan & Balance</h2>
                    <div className="mt-4 flex flex-col sm:flex-row sm:items-end sm:justify-between space-y-4 sm:space-y-0">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Your Plan</p>
                            <p className="text-2xl font-bold text-brand-blue">{currentUser.subscriptionPlan}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Renews on {new Date(currentUser.renewalDate).toLocaleDateString()}</p>
                        </div>
                        <div className="text-left sm:text-right">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Remaining AI Credits</p>
                            <p className="text-4xl font-extrabold text-gray-800 dark:text-white">{currentUser.credits.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Purchase More Credits</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Top up your account. Credits do not expire.</p>
                    <div className="space-y-2">
                        <button onClick={() => purchaseCredits('small')} className="w-full text-left p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md"><strong>5,000</strong> Credits - $10</button>
                        <button onClick={() => purchaseCredits('medium')} className="w-full text-left p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md"><strong>20,000</strong> Credits - $35</button>
                        <button onClick={() => purchaseCredits('large')} className="w-full text-left p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md"><strong>100,000</strong> Credits - $150</button>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Subscription Tiers</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map(plan => (
                        <div key={plan.name} className={`p-6 rounded-lg border-2 ${currentUser.subscriptionPlan === plan.name ? 'border-brand-blue' : 'border-gray-200 dark:border-gray-700'} flex flex-col`}>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                            <p className="mt-2 text-3xl font-extrabold text-gray-900 dark:text-white">{plan.price}</p>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{plan.credits}</p>
                            <ul className="mt-6 space-y-3 text-sm text-gray-600 dark:text-gray-300 flex-grow">
                                {plan.features.map(feature => (
                                    <li key={feature} className="flex items-start space-x-2">
                                        <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                             <button 
                                onClick={() => changeSubscription(plan.name as any)}
                                disabled={currentUser.subscriptionPlan === plan.name}
                                className={`mt-8 w-full py-2 rounded-lg font-semibold ${currentUser.subscriptionPlan === plan.name ? 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-default' : 'bg-brand-blue text-white hover:bg-blue-700'}`}
                            >
                                {currentUser.subscriptionPlan === plan.name ? 'Current Plan' : 'Switch to ' + plan.name}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Usage History</h2>
                <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0">
                            <tr>
                                <th scope="col" className="px-6 py-3">Date</th>
                                <th scope="col" className="px-6 py-3">Feature Used</th>
                                <th scope="col" className="px-6 py-3 text-right">Credits</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoadingHistory ? (
                                <tr><td colSpan={3} className="text-center py-8">Loading usage history...</td></tr>
                            ) : usageHistory.length > 0 ? (
                                usageHistory.map(log => (
                                    <tr key={log.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                        <td className="px-6 py-4">{new Date(log.date).toLocaleString()}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{log.feature}</td>
                                        <td className="px-6 py-4 text-right font-mono font-semibold text-red-500">-{log.creditsUsed}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={3} className="text-center py-8">No usage history found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Billing;
