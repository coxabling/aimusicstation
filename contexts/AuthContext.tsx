

import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { User, Station, Role, CreditUsageLog } from '../types';
import * as db from '../services/db';
import { useToast } from './ToastContext';

const SESSION_STORAGE_KEY = 'currentUser';

const defaultStationSettings: Station = {
    name: 'AI music station',
    description: 'The ultimate station for electronic dance music, powered by AI.',
    timeZone: '(UTC-05:00) Eastern Time (US & Canada)',
    logo: null,
    radioFormat: 'Music Radio',
    vibe: 'Default',
    enableAiWebResearch: true,
};

interface AuthContextType {
    currentUser: User | null;
    stationSettings: Station;
    users: User[]; // List of all users in the current tenant
    isLoading: boolean;
    switchUser: (userId: string) => void;
    logout: () => void;
    saveStationSettings: (newSettings: Station) => void;
    addUser: (email: string, role: Role) => Promise<boolean>;
    deleteUser: (userId: string) => Promise<void>;
    updateCurrentUser: (updatedData: Partial<User>) => Promise<void>;
    deductCredits: (amount: number, feature: string) => Promise<boolean>;
    purchaseCredits: (tier: 'small' | 'medium' | 'large') => void;
    changeSubscription: (plan: User['subscriptionPlan']) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [stationSettings, setStationSettings] = useState<Station>(defaultStationSettings);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { addToast } = useToast();

    const getStationSettingsKey = (tenantId: string) => `stationSettings-${tenantId}`;

    const loadTenantData = useCallback(async (user: User) => {
        // Load station settings for the user's tenant
        const settingsKey = getStationSettingsKey(user.tenantId);
        try {
            const savedSettings = localStorage.getItem(settingsKey);
            setStationSettings(savedSettings ? { ...defaultStationSettings, ...JSON.parse(savedSettings) } : defaultStationSettings);
        } catch (error) {
            console.error("Could not load station settings:", error);
            setStationSettings(defaultStationSettings);
        }

        // If admin, load all users for the tenant
        if (user.role === 'Admin') {
            const tenantUsers = await db.getUsersByTenant(user.tenantId);
            setUsers(tenantUsers.sort((a, b) => a.email.localeCompare(b.email)));
        } else {
            setUsers([user]); // Non-admins only see themselves
        }
    }, []);
    
    useEffect(() => {
        const initializeAuth = async () => {
            setIsLoading(true);
            await db.seedInitialData(); // Ensure DB is seeded
            
            let userToLoad: User | undefined;
            const sessionUser = sessionStorage.getItem(SESSION_STORAGE_KEY);
            if (sessionUser) {
                userToLoad = await db.getUser(sessionUser);
            }
            if (!userToLoad) {
                const allUsers = await db.getAllUsers();
                userToLoad = allUsers.find(u => u.role === 'Admin'); // Default to first admin
            }

            if (userToLoad) {
                setCurrentUser(userToLoad);
                await loadTenantData(userToLoad);
            }
            setIsLoading(false);
        };
        initializeAuth();
    }, [loadTenantData]);

    const switchUser = useCallback(async (userId: string) => {
        const user = await db.getUser(userId);
        if (user) {
            setCurrentUser(user);
            sessionStorage.setItem(SESSION_STORAGE_KEY, user.id);
            await loadTenantData(user);
            addToast(`Switched to user: ${user.email}`, 'info');
        }
    }, [loadTenantData, addToast]);

    const logout = useCallback(() => {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        setCurrentUser(null);
        setUsers([]);
        setStationSettings(defaultStationSettings);
        addToast("You have been logged out.", "info");
    }, [addToast]);

    const saveStationSettings = useCallback((newSettings: Station) => {
        if (!currentUser) return;
        const settingsKey = getStationSettingsKey(currentUser.tenantId);
        try {
            localStorage.setItem(settingsKey, JSON.stringify(newSettings));
            setStationSettings(newSettings);
        } catch (error) {
            console.error("Could not save station settings:", error);
            throw error;
        }
    }, [currentUser]);
    
    const addUser = async (email: string, role: Role): Promise<boolean> => {
        if (!currentUser || currentUser.role !== 'Admin') return false;
        const existingUser = await db.getUser(email);
        if (existingUser) {
            addToast(`User with email ${email} already exists.`, 'error');
            return false;
        }
        const renewalDate = new Date();
        renewalDate.setFullYear(renewalDate.getFullYear() + 1);
        const newUser: User = {
            id: email,
            email,
            username: email.split('@')[0],
            role,
            tenantId: currentUser.tenantId,
            credits: 5000,
            subscriptionPlan: 'Hobby',
            renewalDate: renewalDate.toISOString(),
        };
        await db.saveUser(newUser);
        setUsers(prev => [...prev, newUser].sort((a, b) => a.email.localeCompare(b.email)));
        addToast(`User ${email} created successfully.`, 'success');
        return true;
    };
    
    const deleteUser = async (userId: string) => {
        if (!currentUser || currentUser.role !== 'Admin' || userId === currentUser.id) {
            addToast('Cannot delete yourself or insufficient permissions.', 'error');
            return;
        }
        await db.deleteUser(userId, currentUser.tenantId);
        setUsers(prev => prev.filter(u => u.id !== userId));
        addToast(`User ${userId} deleted.`, 'info');
    };
    
    const updateCurrentUser = async (updatedData: Partial<User>) => {
        if (!currentUser) return;

        const updatedUser = { ...currentUser, ...updatedData };
        
        await db.saveUser(updatedUser);
        setCurrentUser(updatedUser);

        setUsers(prevUsers => prevUsers.map(u => u.id === updatedUser.id ? updatedUser : u));
        
        addToast('Profile updated successfully!', 'success');
    };

    const deductCredits = async (amount: number, feature: string): Promise<boolean> => {
        if (!currentUser) return false;
        
        if (currentUser.credits < amount) {
            addToast(`Insufficient credits for: ${feature}. Please purchase more.`, 'error');
            return false;
        }

        const updatedUser = { ...currentUser, credits: currentUser.credits - amount };
        
        await db.saveUser(updatedUser);
        setCurrentUser(updatedUser);
        setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));

        const log: CreditUsageLog = {
            id: `${Date.now()}-${Math.random()}`,
            tenantId: currentUser.tenantId,
            userId: currentUser.id,
            feature,
            creditsUsed: amount,
            date: new Date().toISOString(),
        };
        await db.saveCreditLog(log);

        return true;
    };

    const purchaseCredits = async (tier: 'small' | 'medium' | 'large') => {
        if (!currentUser) return;

        const creditMap = { small: 5000, medium: 20000, large: 100000 };
        const amount = creditMap[tier];
        
        const updatedUser = { ...currentUser, credits: currentUser.credits + amount };
        await db.saveUser(updatedUser);
        setCurrentUser(updatedUser);
        setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
        
        addToast(`${amount.toLocaleString()} credits purchased successfully!`, 'success');
    };

    const changeSubscription = async (plan: User['subscriptionPlan']) => {
        if (!currentUser || currentUser.subscriptionPlan === plan) return;

        const planCredits: Record<User['subscriptionPlan'], number> = {
            'Hobby': 5000,
            'Pro Broadcaster': 50000,
            'Network': 1000000, // A large number for demo "unlimited"
        };

        const renewalDate = new Date();
        renewalDate.setFullYear(renewalDate.getFullYear() + 1);

        const updatedUser = {
            ...currentUser,
            subscriptionPlan: plan,
            // When changing plan, top up credits to the new plan's monthly amount, but don't take away existing credits.
            credits: Math.max(currentUser.credits, planCredits[plan]),
            renewalDate: renewalDate.toISOString(),
        };

        await db.saveUser(updatedUser);
        setCurrentUser(updatedUser);
        setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
        addToast(`Subscription plan changed to ${plan}.`, 'success');
    };

    const value = {
        currentUser,
        stationSettings,
        users,
        isLoading,
        switchUser,
        logout,
        saveStationSettings,
        addUser,
        deleteUser,
        updateCurrentUser,
        deductCredits,
        purchaseCredits,
        changeSubscription,
    };

    return (
        <AuthContext.Provider value={value}>
            {!isLoading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};