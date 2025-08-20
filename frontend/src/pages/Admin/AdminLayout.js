import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { FiMenu } from 'react-icons/fi';
import AdminSidebar from '../../components/Admin/AdminSidebar';

const AdminLayout = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="lg:hidden sticky top-0 z-40 bg-white border-b">
        <div className="h-14 flex items-center justify-between px-4">
          <button onClick={() => setOpen(v => !v)} className="p-2 rounded-md hover:bg-gray-100">
            <FiMenu size={20} />
          </button>
          <span className="text-sm font-semibold text-green-700">Admin</span>
        </div>
      </div>

      <div className="flex">
        <AdminSidebar isOpen={open} onToggle={setOpen} />
        <main className="flex-1 p-4 lg:p-6 lg:ml-64">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;



