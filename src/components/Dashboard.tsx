import React from 'react';
import { DASHBOARD_STATS, PMS_QUARTER_STATS } from '../constants';
import { Monitor, Printer, Laptop, Server } from 'lucide-react';

const Dashboard: React.FC = () => {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Dashboard &bull; PMS</h2>
        <p className="text-gray-500 text-sm mt-1">Overview of IT Assets and Maintenance Status</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                <Monitor size={28} />
            </div>
            <div>
                <h3 className="text-gray-500 text-sm font-medium">System Unit</h3>
                <p className="text-2xl font-bold text-blue-600">{DASHBOARD_STATS.systemUnit}</p>
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                <Printer size={28} />
            </div>
            <div>
                <h3 className="text-gray-500 text-sm font-medium">Printer</h3>
                <p className="text-2xl font-bold text-blue-600">{DASHBOARD_STATS.printer}</p>
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                <Laptop size={28} />
            </div>
            <div>
                <h3 className="text-gray-500 text-sm font-medium">Laptop</h3>
                <p className="text-2xl font-bold text-blue-600">{DASHBOARD_STATS.laptop}</p>
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                <Server size={28} />
            </div>
            <div>
                <h3 className="text-gray-500 text-sm font-medium">Server</h3>
                <p className="text-2xl font-bold text-blue-600">{DASHBOARD_STATS.server}</p>
            </div>
        </div>
      </div>

      {/* PMS By Quarter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-6">PMS By Quarter</h3>
        <div className="space-y-6">
            {PMS_QUARTER_STATS.map((stat, index) => (
                <div key={index} className="flex items-center gap-4">
                    <div className="w-10 h-10 flex items-center justify-center bg-red-500 text-white rounded-lg font-bold shrink-0">
                        S
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-gray-600">{stat.label}</span>
                            <span className="text-xs text-gray-400">{new Date().getFullYear()} {stat.percent}% completed</span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                             <div 
                                className="bg-blue-400 h-1.5 rounded-full" 
                                style={{ width: `${stat.percent}%` }}
                             ></div>
                        </div>
                    </div>
                    <div className="text-gray-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;