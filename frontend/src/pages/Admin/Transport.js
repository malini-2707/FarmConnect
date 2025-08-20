import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Transport = () => {
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [rows, setRows] = useState([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/admin/transport', { params: { page, limit: 10 } });
      setRows(data.transport || []);
      setTotalPages(data.totalPages || 1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [page]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-800">Transport</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Type</th>
              <th className="text-left p-3">Contact</th>
              <th className="text-left p-3">Active</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" className="p-6 text-center text-gray-500">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan="4" className="p-6 text-center text-gray-500">No data</td></tr>
            ) : (
              rows.map(t => (
                <tr key={t._id} className="border-t">
                  <td className="p-3">{t.name}</td>
                  <td className="p-3 capitalize">{t.type}</td>
                  <td className="p-3">{t.contactPerson} ({t.phone})</td>
                  <td className="p-3">{t.isActive ? 'Yes' : 'No'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="h-9 px-3 rounded-md border disabled:opacity-50">Prev</button>
        <span className="text-sm text-gray-600">{page} / {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="h-9 px-3 rounded-md border disabled:opacity-50">Next</button>
      </div>
    </div>
  );
};

export default Transport;



