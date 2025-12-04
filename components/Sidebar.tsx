import React from 'react';
import { LayoutDashboard, MessageSquare, ListTodo, ShieldAlert, LogOut } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'tickets', label: 'Ticket Manager', icon: <ListTodo size={20} /> },
    { id: 'chat', label: 'AI Support', icon: <MessageSquare size={20} /> },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0 z-10">
      <div className="p-6 flex items-center gap-3 border-b border-gray-100">
        <div className="bg-yellow-500 text-white font-bold p-2 rounded shadow-md">UBI</div>
        <div>
          <h1 className="font-bold text-gray-800 tracking-tight">Ulticon Builders</h1>
          <p className="text-xs text-gray-500">IT Management System</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
              activeTab === item.id
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100">
         <div className="bg-red-50 p-3 rounded-lg mb-4 flex items-start gap-2">
            <ShieldAlert className="text-red-500 shrink-0" size={16} />
            <div>
                <p className="text-xs font-bold text-red-700">Cybersecurity Alert</p>
                <p className="text-[10px] text-red-600 leading-tight mt-1">Report Phishing/Malware directly to supervisor immediately.</p>
            </div>
         </div>
         
         <div className="flex items-center gap-3 px-4 py-2 text-gray-500 hover:text-red-500 cursor-pointer transition-colors">
            <LogOut size={18} />
            <span className="text-sm font-medium">Logout</span>
         </div>
      </div>
    </div>
  );
};

export default Sidebar;