import React, { useState } from 'react';
import { Header } from './components/header/Header';
import { OffensePanel } from './components/offense/OffensePanel';
import { DefensePanel } from './components/defense/DefensePanel';
import { BasketballCourt } from './components/court/BasketballCourt';
import { TacticalTimeline } from './components/timeline/TacticalTimeline';
import { Users, Shield, LayoutGrid } from 'lucide-react';

export function App() {
  const [mobileTab, setMobileTab] = useState<'court' | 'offense' | 'defense'>('court');

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden">
      {/* Top Navigation & Status Bar */}
      <Header />

      {/* Mobile Tab Switcher (Visible on small screens < 1024px) */}
      <div className="lg:hidden flex items-center justify-around bg-slate-900 border-b border-slate-800 p-1 text-xs">
        <button
          onClick={() => setMobileTab('offense')}
          className={`flex items-center gap-1.5 py-1.5 px-3 rounded-md transition font-medium ${
            mobileTab === 'offense'
              ? 'bg-sky-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Tấn công</span>
        </button>

        <button
          onClick={() => setMobileTab('court')}
          className={`flex items-center gap-1.5 py-1.5 px-3 rounded-md transition font-medium ${
            mobileTab === 'court'
              ? 'bg-slate-800 text-white shadow border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          <span>Sa bàn (Court)</span>
        </button>

        <button
          onClick={() => setMobileTab('defense')}
          className={`flex items-center gap-1.5 py-1.5 px-3 rounded-md transition font-medium ${
            mobileTab === 'defense'
              ? 'bg-red-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Phòng thủ</span>
        </button>
      </div>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col p-2 sm:p-3 gap-2 overflow-hidden">
        {/* Desktop 3-Column Layout / Tablet & Mobile Adaptive View */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2 min-h-0">
          {/* Left Sidebar: Offense Controls (3 columns on desktop) */}
          <aside
            className={`lg:col-span-3 h-full overflow-hidden ${
              mobileTab === 'offense' ? 'block' : 'hidden lg:block'
            }`}
          >
            <OffensePanel />
          </aside>

          {/* Center: Interactive Basketball Court (6 columns on desktop) */}
          <section
            className={`lg:col-span-6 flex flex-col items-center justify-center bg-slate-900/60 border border-slate-800/80 rounded-xl p-1 sm:p-2 overflow-hidden shadow-inner ${
              mobileTab === 'court' ? 'flex' : 'hidden lg:flex'
            }`}
          >
            <BasketballCourt />
          </section>

          {/* Right Sidebar: Defense Controls (3 columns on desktop) */}
          <aside
            className={`lg:col-span-3 h-full overflow-hidden ${
              mobileTab === 'defense' ? 'block' : 'hidden lg:block'
            }`}
          >
            <DefensePanel />
          </aside>
        </div>

        {/* Bottom Area: Playback Controls & Tactical Timeline */}
        <footer className="w-full shrink-0">
          <TacticalTimeline />
        </footer>
      </main>
    </div>
  );
}

export default App;
