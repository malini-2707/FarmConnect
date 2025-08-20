import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const pageSize = 10;
const statusOptions = ['pending', 'accepted', 'rejected', 'completed', 'cancelled'];

const Orders = () => {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const params = { page, limit: pageSize, status: status || undefined, search: search || undefined };
        const { data } = await axios.get('/api/admin/orders', { params });
        setOrders(data.orders);
        setTotal(data.total);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [page, status, search]);

  const updateStatus = async (orderId, newStatus) => {
    try {
      const { data } = await axios.patch(`/api/admin/orders/${orderId}/status`, { status: newStatus });
      setOrders((prev) => prev.map((o) => (o._id === orderId ? data : o)));
      toast.success('Order updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
          <p className="text-gray-600">Review and change status of customer-farmer requests.</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          className="border border-gray-300 rounded-md px-3 py-2"
          placeholder="Search notes/message"
          value={search}
          onChange={(e) => { setPage(1); setSearch(e.target.value); }}
        />
        <select
          className="border border-gray-300 rounded-md px-3 py-2"
          value={status}
          onChange={(e) => { setPage(1); setStatus(e.target.value); }}
        >
          <option value="">All statuses</option>
          {statusOptions.map(s => (<option key={s} value={s}>{s}</option>))}
        </select>
        <div className="text-right md:col-span-2 text-sm text-gray-500 flex items-center justify-end">Page {page} of {totalPages}</div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Buyer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seller</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td className="px-6 py-8" colSpan={7}>Loading...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td className="px-6 py-8 text-gray-500" colSpan={7}>No orders found</td></tr>
            ) : (
              orders.map((o) => (
                <tr key={o._id}>
                  <td className="px-6 py-4 text-sm text-gray-900">{new Date(o.createdAt).toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{o.buyer?.name}<div className="text-xs text-gray-500">{o.buyer?.email}</div></td>
                  <td className="px-6 py-4 text-sm text-gray-900">{o.seller?.name}<div className="text-xs text-gray-500">{o.seller?.email}</div></td>
                  <td className="px-6 py-4 text-sm text-gray-900">{o.product?.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{o.quantity}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">{o.status}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {statusOptions.map((s) => (
                      <button
                        key={s}
                        onClick={() => updateStatus(o._id, s)}
                        className={`ml-2 px-2 py-1 rounded border ${o.status === s ? 'bg-gray-100 text-gray-600' : 'text-primary-600 hover:text-primary-900'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <button className="px-3 py-2 rounded-md border border-gray-300 disabled:opacity-50" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button>
        <div className="text-sm text-gray-600">{(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}</div>
        <button className="px-3 py-2 rounded-md border border-gray-300 disabled:opacity-50" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>
    </div>
  );
};

export default Orders;


