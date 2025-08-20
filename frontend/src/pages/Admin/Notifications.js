import React, { useState } from 'react';

const Notifications = () => {
  const [target, setTarget] = useState('all');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    // Placeholder: Integrate with backend broadcast if available
    setTitle(''); setMessage('');
  };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-gray-800">Notifications</h1>
      <form onSubmit={submit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Target</label>
            <select value={target} onChange={e => setTarget(e.target.value)} className="w-full h-10 px-3 rounded-md border">
              <option value="all">All</option>
              <option value="farmer">Farmers</option>
              <option value="customer">Customers</option>
              <option value="delivery_partner">Transport</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="w-full h-10 px-3 rounded-md border" placeholder="Title" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Message</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} className="w-full h-28 px-3 py-2 rounded-md border" placeholder="Your message" />
        </div>
        <div className="flex justify-end">
          <button type="submit" className="h-10 px-4 rounded-md bg-green-600 text-white">Send</button>
        </div>
      </form>
    </div>
  );
};

export default Notifications;



