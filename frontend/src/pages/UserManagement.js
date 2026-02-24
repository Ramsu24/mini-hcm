import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editForm, setEditForm] = useState({ start: '09:00', end: '18:00' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Change this state
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const usersData = [];
      snapshot.forEach(doc => usersData.push({ id: doc.id, ...doc.data() }));
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      setMessage({ type: 'error', text: 'Failed to load users' });
    }
    setLoading(false);
  };

  const updateSchedule = async (userId) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', userId), {
        schedule: editForm
      });
      setEditingUserId(null);
      setMessage({ type: 'success', text: 'Schedule updated successfully!' });
      fetchUsers();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error updating schedule:', error);
      setMessage({ type: 'error', text: 'Failed to update schedule' });
    }
    setLoading(false);
  };

  const startEditing = (user) => {
    setEditingUserId(user.id);
    setEditForm(user.schedule || { start: '09:00', end: '18:00' });
  };

  const cancelEditing = () => {
    setEditingUserId(null);
    setEditForm({ start: '09:00', end: '18:00' });
  };

  // Update this function
  const handleChangePassword = (user) => {
    setSelectedUser(user);
    setPasswordModalOpen(true);
  };

  // Handle modal close
  const handleModalClose = (passwordChanged) => {
    setPasswordModalOpen(false);
    setSelectedUser(null);
    if (passwordChanged) {
      // Refresh user list if needed
      fetchUsers();
    }
  };

  return (
    <div className="p-6">
      {/* ChangePasswordModal removed per request */}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
        <button
          onClick={fetchUsers}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Refresh List
        </button>
      </div>

      {/* Success/Error Message */}
      {message.text && (
        <div className={`mb-4 p-3 rounded ${
          message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Current Schedule
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map(user => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{user.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{user.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    user.role === 'admin' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {user.role || 'employee'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingUserId === user.id ? (
                    <div className="flex space-x-2 items-center">
                      <input
                        type="time"
                        value={editForm.start}
                        onChange={e => setEditForm({...editForm, start: e.target.value})}
                        className="border rounded px-2 py-1 text-sm w-24"
                      />
                      <span>to</span>
                      <input
                        type="time"
                        value={editForm.end}
                        onChange={e => setEditForm({...editForm, end: e.target.value})}
                        className="border rounded px-2 py-1 text-sm w-24"
                      />
                    </div>
                  ) : (
                    <div className="text-sm text-gray-900">
                      {user.schedule?.start || '09:00'} - {user.schedule?.end || '18:00'}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {editingUserId === user.id ? (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => updateSchedule(user.id)}
                        disabled={loading}
                        className="text-green-600 hover:text-green-900 disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex space-x-3">
                      <button
                        onClick={() => startEditing(user)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit Schedule
                      </button>
                      <button
                        onClick={() => handleChangePassword(user)}
                        className="text-red-600 hover:text-red-900 font-medium"
                      >
                        Change Password
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          No users found
        </div>
      )}
    </div>
  );
}

export default UserManagement;