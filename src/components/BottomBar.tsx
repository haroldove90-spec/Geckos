import React from 'react';
import { UserRole } from '../types';
import {
  LayoutDashboard,
  Users,
  CheckCircle2,
  BellRing,
  Share2,
  CreditCard,
  History,
  Bell,
  UserCircle,
} from 'lucide-react';

interface Props {
  activeRole: UserRole;
  currentTab: string;
  onSelectTab: (tab: string) => void;
  pendingCount?: number;
  unreadNotifsCount?: number;
}

export const BottomBar: React.FC<Props> = ({
  activeRole,
  currentTab,
  onSelectTab,
  pendingCount = 0,
  unreadNotifsCount = 0,
}) => {
  const isCoach = activeRole === 'head_coach' || activeRole === 'coach_assistant';

  const coachTabs = [
    { id: 'dashboard', label: 'Panel', icon: LayoutDashboard },
    { id: 'registered_students', label: 'Alumnos', icon: Users },
    { id: 'players', label: 'Pagos', icon: CreditCard },
    {
      id: 'validation',
      label: 'Validar',
      icon: CheckCircle2,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    { id: 'billing', label: 'Cobro', icon: BellRing },
    { id: 'profile', label: 'Perfil', icon: UserCircle },
  ];

  const parentTabs = [
    { id: 'account', label: 'Cuenta', icon: LayoutDashboard },
    { id: 'register_payment', label: 'Pagar', icon: CreditCard },
    { id: 'history', label: 'Historial', icon: History },
    {
      id: 'notifications',
      label: 'Avisos',
      icon: Bell,
      badge: unreadNotifsCount > 0 ? unreadNotifsCount : undefined,
    },
    { id: 'profile', label: 'Perfil', icon: UserCircle },
  ];

  const tabs = isCoach ? coachTabs : parentTabs;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200 shadow-lg pb-safe w-full max-w-full overflow-hidden">
      <div className={`grid ${tabs.length >= 6 ? 'grid-cols-6' : 'grid-cols-5'} h-16 items-center px-1 max-w-lg mx-auto w-full min-w-0`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            currentTab === tab.id || (!isCoach && tab.id === 'account' && currentTab === 'dashboard');
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1 relative min-h-[44px] cursor-pointer transition-colors ${
                isActive ? 'text-[#363435]' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 text-[#000000]' : ''
                  }`}
                />
                {tab.badge !== undefined && (
                  <span className="absolute -top-1 -right-2.5 px-1 py-0.2 bg-amber-500 text-white text-[9px] font-bold rounded-full min-w-[14px] text-center">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] mt-1 whitespace-nowrap tracking-tight ${
                  isActive ? 'font-bold text-[#000000]' : 'font-medium'
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <div className="w-5 h-0.5 bg-[#363435] rounded-full mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
