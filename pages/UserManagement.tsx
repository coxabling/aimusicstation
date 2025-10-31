import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Role } from '../types';
import { TrashIcon, EnvelopeIcon, UserIcon, RefreshIcon } from '../components/icons';
import { useToast } from '../contexts/ToastContext';

const UserManagement: React.FC = () => {
    const { users, addUser, deleteUser, currentUser } = useAuth();
    const { addToast } = useToast();
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserRole, setNewUserRole] = useState<Role>('User');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const activeUsers = useMemo(() => users.filter(u => u.status === 'active'), [users]);
    const pendingUsers = useMemo(() => users.filter(u => u.status === 'pending'), [users]);

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUserEmail) return;
        setIsSubmitting(true);
        const success = await addUser(newUserEmail, newUserRole);
        if (success) {
            setNewUserEmail('');
            setNewUserRole('User');
        }
        setIsSubmitting(false);
    };

    const handleRevoke = (userId: string) => {
        if (window.confirm('Are you sure you want to revoke this invitation?')) {
            deleteUser(userId);
        }
    };

    const handleResend = (email: string) => {
        addToast(`Invitation re-sent to ${email}.`, 'info');
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">Invite New User</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Invite a new user to collaborate on your station.</p>
                <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                    <div className="md:col-span-3 relative">
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                        <div className="absolute inset-y-0 left-0 top-6 pl-3 flex items-center pointer-events-none">
                            <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            value={newUserEmail}
                            onChange={(e) => setNewUserEmail(e.target.value)}
                            placeholder="user@example.com"
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue bg-white dark:bg-gray-700"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                        <select
                            id="role"
                            value={newUserRole}
                            onChange={(e) => setNewUserRole(e.target.value as Role)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue bg-white dark:bg-gray-700"
                        >
                            <option value="User">User</option>
                            <option value="Admin">Admin</option>
                        </select>
                    </div>
                    <button
                        type="submit"
                        disabled={isSubmitting || !newUserEmail}
                        className="md:col-span-1 w-full px-4 py-2 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none disabled:bg-blue-400 dark:disabled:bg-blue-800"
                    >
                        {isSubmitting ? 'Inviting...' : 'Invite'}
                    </button>
                </form>
            </div>

            {pendingUsers.length > 0 && (
                 <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Pending Invitations ({pendingUsers.length})</h2>
                    <div className="space-y-3">
                        {pendingUsers.map((user) => (
                            <div key={user.id} className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-white">{user.email}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Role: {user.role}</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button onClick={() => handleResend(user.email)} className="flex items-center px-3 py-1.5 text-xs bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200 rounded-md hover:bg-gray-300"><RefreshIcon /> <span className="ml-1.5">Resend</span></button>
                                    <button onClick={() => handleRevoke(user.id)} className="flex items-center px-3 py-1.5 text-xs bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200 rounded-md hover:bg-red-200"><TrashIcon /> <span className="ml-1.5">Revoke</span></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Active Team Members ({activeUsers.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeUsers.map((user) => (
                        <div key={user.id} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                                    {user.avatar ? (
                                        <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                                    ) : (
                                        <UserIcon />
                                    )}
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900 dark:text-white">{user.username}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {user.email}
                                        {user.id === currentUser?.id && <span className="text-xs text-brand-blue ml-2 font-semibold">(You)</span>}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.role === 'Admin' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-300'}`}>
                                    {user.role}
                                </span>
                                <button
                                    onClick={() => deleteUser(user.id)}
                                    disabled={user.id === currentUser?.id}
                                    className="p-2 text-red-500 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                                    title={user.id === currentUser?.id ? "You cannot delete yourself" : "Delete User"}
                                >
                                    <TrashIcon />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default UserManagement;