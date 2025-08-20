import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const pageSize = 10;

const Customers = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('customer');
  const [isVerified, setIsVerified] = useState('all');

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const params = { page, limit: pageSize, role, search: search || undefined };
        if (isVerified !== 'all') params.isVerified = isVerified === 'true';
        const { data } = await axios.get('/api/admin/users', { params });
        setUsers(data.users);
        setTotal(data.total);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load users');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [page, search, role, isVerified]);

  const toggleVerify = async (user) => {
    try {
      const { data } = await axios.put(`/api/admin/users/${user._id}`, { isVerified: !user.isVerified });
      setUsers((prev) => prev.map((u) => (u._id === user._id ? data : u)));
      toast.success(`User ${!user.isVerified ? 'verified' : 'unverified'}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  const deleteUser = async (user) => {
    if (!window.confirm(`Delete ${user.name}? This cannot be undone.`)) return;
    try {
      await axios.delete(`/api/admin/users/${user._id}`);
      setUsers((prev) => prev.filter((u) => u._id !== user._id));
      setTotal((t) => Math.max(0, t - 1));
      toast.success('User deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Search, verify, and remove users. Default view shows customers.</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
          <select
            className="border border-gray-300 rounded-md px-3 py-2"
            value={role}
            onChange={(e) => {
              setPage(1);
              setRole(e.target.value);
            }}
          >
            <option value="customer">Customers</option>
            <option value="farmer">Farmers</option>
            <option value="delivery_partner">Delivery Partners</option>
            <option value="admin">Admins</option>
          </select>
          <select
            className="border border-gray-300 rounded-md px-3 py-2"
            value={isVerified}
            onChange={(e) => {
              setPage(1);
              setIsVerified(e.target.value);
            }}
          >
            <option value="all">All</option>
            <option value="true">Verified</option>
            <option value="false">Unverified</option>
          </select>
          <div className="text-right text-sm text-gray-500 flex items-center justify-end">Page {page} of {totalPages}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Verified</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td className="px-6 py-8" colSpan={5}>Loading...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td className="px-6 py-8 text-gray-500" colSpan={5}>No users found</td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <img className="h-8 w-8 rounded-full object-cover mr-3" src={u.profileImage || '/default-avatar.png'} alt={u.name} />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{u.name}</div>
                        <div className="text-xs text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{u.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{u.role}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${u.isVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {u.isVerified ? 'Verified' : 'Unverified'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => toggleVerify(u)} className="text-primary-600 hover:text-primary-900 mr-4">
                      {u.isVerified ? 'Unverify' : 'Verify'}
                    </button>
                    <button onClick={() => deleteUser(u)} className="text-red-600 hover:text-red-900">Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <button
          className="px-3 py-2 rounded-md border border-gray-300 disabled:opacity-50"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Previous
        </button>
        <div className="text-sm text-gray-600">{(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}</div>
        <button
          className="px-3 py-2 rounded-md border border-gray-300 disabled:opacity-50"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Customers;


