import React, { useState, useEffect, ChangeEvent, FormEvent, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User } from '../types';
import InputField from '../components/InputField';
import { useToast } from '../contexts/ToastContext';
import { UserIcon, CheckCircleIcon } from '../components/icons';

const SubscriptionDetail: React.FC<{ label: string; value: string | React.ReactNode }> = ({ label, value }) => (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 border-b border-gray-200 dark:border-gray-700">
        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</dt>
        <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 font-semibold">{value}</dd>
    </div>
);

const UserProfile: React.FC = () => {
    const { currentUser, updateCurrentUser } = useAuth();
    const [userData, setUserData] = useState<Partial<User>>({});
    const [isLoading, setIsLoading] = useState(false);
    const { addToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Password state
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    
    // Mock subscription data
    const subscriptionData = {
        package: 'Pro Broadcaster',
        aiStudio: true,
        id: 'sub_1P9XyZ2eZvKYlo2CfakeId',
        start: 'July 15, 2024',
        end: 'July 15, 2025',
        listeners: '10,000'
    };

    useEffect(() => {
        if (currentUser) {
            setUserData({
                username: currentUser.username || '',
                email: currentUser.email || '',
                firstName: currentUser.firstName || '',
                lastName: currentUser.lastName || '',
                avatar: currentUser.avatar || null,
            });
        }
    }, [currentUser]);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setUserData(prev => ({ ...prev, [name]: value }));
    };

    const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setUserData(prev => ({ ...prev, avatar: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };
    
    const triggerFileSelect = () => {
        fileInputRef.current?.click();
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!userData.username || !userData.email) {
            addToast('Username and Email are required.', 'error');
            return;
        }
        setIsLoading(true);
        try {
            const dataToUpdate: Partial<User> = {
                username: userData.username,
                firstName: userData.firstName,
                lastName: userData.lastName,
                avatar: userData.avatar,
            };
            await updateCurrentUser(dataToUpdate);
        } catch (error) {
            console.error("Error updating profile:", error);
            addToast('Failed to update profile.', 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleChangePassword = async (e: FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            addToast('New passwords do not match.', 'error');
            return;
        }
        if (newPassword.length < 8) {
            addToast('New password must be at least 8 characters long.', 'error');
            return;
        }
        if (!oldPassword) {
             addToast('Please enter your current password.', 'error');
            return;
        }

        setIsChangingPassword(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Simulate success
        addToast('Password changed successfully!', 'success');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setIsChangingPassword(false);
    };

    if (!currentUser) {
        return <p>Loading profile...</p>;
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
                    <div className="relative w-32 h-32 mx-auto group">
                         <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            {userData.avatar ? (
                                <img src={userData.avatar as string} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <UserIcon />
                            )}
                        </div>
                        <div 
                            onClick={triggerFileSelect}
                            className="absolute inset-0 rounded-full bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center cursor-pointer transition-opacity"
                        >
                            <p className="text-white opacity-0 group-hover:opacity-100 transition-opacity">Change</p>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleAvatarChange}
                        />
                    </div>
                    <h3 className="mt-4 text-2xl font-bold text-gray-800 dark:text-white">{userData.username}</h3>
                    <p className="text-gray-500 dark:text-gray-400">{currentUser.email}</p>
                     <span className={`mt-2 inline-block px-3 py-1 text-sm font-medium rounded-full ${currentUser.role === 'Admin' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-300'}`}>
                        {currentUser.role}
                    </span>
                </div>
                
                 <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
                    <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Subscription Plan</h2>
                    <dl>
                        <SubscriptionDetail label="Package" value={subscriptionData.package} />
                        <SubscriptionDetail 
                            label="AI Studio" 
                            value={
                                <span className={`flex items-center space-x-1 ${subscriptionData.aiStudio ? 'text-green-500' : 'text-red-500'}`}>
                                    <CheckCircleIcon />
                                    <span>{subscriptionData.aiStudio ? 'Enabled' : 'Disabled'}</span>
                                </span>
                            } 
                        />
                        <SubscriptionDetail label="Subscription ID" value={subscriptionData.id} />
                        <SubscriptionDetail label="Subscribed Start" value={subscriptionData.start} />
                        <SubscriptionDetail label="Subscribed End" value={subscriptionData.end} />
                        <SubscriptionDetail label="Simultaneous Listeners" value={subscriptionData.listeners} />
                    </dl>
                </div>
            </div>

            <div className="lg:col-span-2 space-y-8">
                 <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
                    <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Edit Profile Details</h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <InputField 
                            label="Username *" 
                            name="username" 
                            type="text" 
                            value={userData.username || ''} 
                            onChange={handleChange} 
                            placeholder="Your public username" 
                        />
                        <InputField 
                            label="Email *" 
                            name="email" 
                            type="email" 
                            value={userData.email || ''} 
                            onChange={() => {}} // No-op, field is disabled
                            placeholder="your.email@example.com"
                            disabled={true}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputField 
                                label="First Name" 
                                name="firstName" 
                                type="text" 
                                value={userData.firstName || ''} 
                                onChange={handleChange} 
                                placeholder="Your first name" 
                            />
                            <InputField 
                                label="Last Name" 
                                name="lastName" 
                                type="text" 
                                value={userData.lastName || ''} 
                                onChange={handleChange} 
                                placeholder="Your last name" 
                            />
                        </div>
                        <p className="-mt-4 text-xs text-gray-500 dark:text-gray-400">Your email address cannot be changed.</p>
                        <div className="pt-5">
                            <div className="flex justify-end">
                                <button 
                                    type="submit" 
                                    className="px-6 py-2 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue disabled:bg-gray-400"
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
                
                 <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
                    <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Change Password</h2>
                    <form onSubmit={handleChangePassword} className="space-y-6">
                        <InputField 
                            label="Old Password" 
                            name="oldPassword" 
                            type="password" 
                            value={oldPassword} 
                            onChange={(e) => setOldPassword(e.target.value)} 
                            placeholder="Enter your current password" 
                        />
                         <InputField 
                            label="New Password" 
                            name="newPassword" 
                            type="password" 
                            value={newPassword} 
                            onChange={(e) => setNewPassword(e.target.value)} 
                            placeholder="Must be at least 8 characters" 
                        />
                         <InputField 
                            label="Confirm New Password" 
                            name="confirmPassword" 
                            type="password" 
                            value={confirmPassword} 
                            onChange={(e) => setConfirmPassword(e.target.value)} 
                            placeholder="Re-enter your new password" 
                        />
                         <div className="pt-5">
                            <div className="flex justify-end">
                                <button 
                                    type="submit" 
                                    className="px-6 py-2 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue disabled:bg-gray-400"
                                    disabled={isChangingPassword}
                                >
                                    {isChangingPassword ? 'Changing...' : 'Change Password'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default UserProfile;
