import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Role } from '../types';
import { TrashIcon } from '../components/icons';
import InputField from '../components/InputField';

const UserManagement: React.FC = () => {
    const { users, addUser, deleteUser, currentUser } = useAuth();
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserRole, setNewUserRole] = useState<Role>('User');
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    return (
        <div className="space-y-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">Add New User</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Invite a new user to collaborate on your station.</p>
                <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <InputField
                        label="Email Address"
                        name="email"
                        type="email"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="user@example.com"
                    />
                    <div>
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
                        className="px-4 py-2 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none disabled:bg-blue-400 dark:disabled:bg-blue-800"
                    >
                        {isSubmitting ? 'Adding...' : 'Add User'}
                    </button>
                </form>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Manage Users</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-6 py-3">Username</th>
                                <th scope="col" className="px-6 py-3">Email</th>
                                <th scope="col" className="px-6 py-3">Role</th>
                                <th scope="col" className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                        {user.username}
                                    </td>
                                    <td className="px-6 py-4">
                                        {user.email}
                                        {user.id === currentUser?.id && <span className="text-xs text-blue-500 ml-2">(You)</span>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.role === 'Admin' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-300'}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => deleteUser(user.id)}
                                            disabled={user.id === currentUser?.id}
                                            className="text-red-500 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                                            title={user.id === currentUser?.id ? "You cannot delete yourself" : "Delete User"}
                                        >
                                            <TrashIcon />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;