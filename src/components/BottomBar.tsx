import React, { useRef, useEffect, useState } from 'react';
import { UserRole, SystemUser } from '../types';
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
  UserCheck,
  Megaphone,
  Grid,
  X,
  ChevronRight,
} from 'lucide-react';

interface Props {
  activeRole: UserRole;
  currentTab: string;
  onSelectTab: (tab: string) => void;
  currentUser?: SystemUser | null;
  pendingCount?: number;
  unreadNotifsCount?: number;
}

export const BottomBar: React.FC<Props> = ({
  activeRole,
  currentTab,
  onSelectTab,
  currentUser,
  pendingCount = 0,
  unreadNotifsCount = 0,
}) => {
  const isCoach = activeRole === 'head_coach' || activeRole === 'coach_assistant';
  const isAdmin =
    activeRole === 'head_coach' ||
    currentUser?.role === 'head_coach' ||
    currentUser?.username?.toLowerCase() === 'haroldo90' ||
    currentUser?.username?.toLowerCase() === 'clubgeckosvoleibol';

  const [isGridModalOpen, setIsGridModalOpen] = useState(false);
  const activeBtnRef = useRef<HTMLButtonElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Módulos completos para Rol Coach / Administrador
  const coachTabs = [
    { id: 'dashboard', label: 'Panel', icon: LayoutDashboard },
    ...(isAdmin ? [{ id: 'coaches', label: 'Entrenadores', icon: UserCheck }] : []),
    { id: 'announcements', label: 'Comunicados', icon: Megaphone },
    { id: 'registered_students', label: 'Alumnos', icon: Users },
    { id: 'players', label: 'Pagos', icon: CreditCard },
    {
      id: 'validation',
      label: 'Validar',
      icon: CheckCircle2,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    { id: 'billing', label: 'Cobranza', icon: BellRing },
    { id: 'profile', label: 'Mi Perfil', icon: UserCircle },
    { id: 'social', label: 'Redes', icon: Share2 },
  ];

  // Módulos completos para Rol Alumno / Padre
  const parentTabs = [
    { id: 'account', label: 'Cuenta', icon: LayoutDashboard },
    { id: 'announcements', label: 'Comunicados', icon: Megaphone },
    { id: 'register_payment', label: 'Pagar', icon: CreditCard },
    { id: 'history', label: 'Historial', icon: History },
    {
      id: 'notifications',
      label: 'Avisos',
      icon: Bell,
      badge: unreadNotifsCount > 0 ? unreadNotifsCount : undefined,
    },
    { id: 'profile', label: 'Mi Perfil', icon: UserCircle },
    { id: 'social', label: 'Redes', icon: Share2 },
  ];

  const tabs = isCoach ? coachTabs : parentTabs;

  // Auto-centrar el botón activo en la barra horizontal móvil
  useEffect(() => {
    if (activeBtnRef.current) {
      activeBtnRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [currentTab]);

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200 shadow-xl pb-safe w-full max-w-full">
        {/* Contenedor con scroll horizontal fluido y botón de Todos los Módulos */}
        <div className="flex items-center justify-between px-1 py-1 max-w-2xl mx-auto w-full min-w-0">
          <div
            ref={containerRef}
            className="flex-1 flex items-center overflow-x-auto no-scrollbar scroll-smooth gap-1 px-1 py-0.5"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive =
                currentTab === tab.id ||
                (!isCoach && tab.id === 'account' && currentTab === 'dashboard');

              return (
                <button
                  key={tab.id}
                  ref={isActive ? activeBtnRef : null}
                  onClick={() => onSelectTab(tab.id)}
                  className={`flex flex-col items-center justify-center py-1.5 px-2.5 rounded-xl min-w-[66px] sm:min-w-[74px] shrink-0 cursor-pointer transition-all ${
                    isActive
                      ? 'bg-[#363435] text-white shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/70'
                  }`}
                >
                  <div className="relative">
                    <Icon
                      className={`w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform ${
                        isActive ? 'scale-110 text-white' : ''
                      }`}
                    />
                    {tab.badge !== undefined && (
                      <span className="absolute -top-1.5 -right-3 px-1 py-0.2 bg-amber-500 text-white text-[9px] font-bold rounded-full min-w-[14px] text-center shadow-xs">
                        {tab.badge}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] mt-1 whitespace-nowrap tracking-tight ${
                      isActive ? 'font-bold text-white' : 'font-medium'
                    }`}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Botón flotante para ver cuadrícula completa de módulos */}
          <button
            type="button"
            onClick={() => setIsGridModalOpen(true)}
            title="Ver todos los módulos"
            className="shrink-0 ml-1 p-2 rounded-xl text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 border-l border-neutral-200 flex flex-col items-center justify-center min-w-[48px] cursor-pointer"
          >
            <Grid className="w-4 h-4 text-[#363435]" />
            <span className="text-[9px] font-bold text-neutral-700 mt-0.5">Menú</span>
          </button>
        </div>
      </nav>

      {/* MODAL BOTTOM SHEET: Todos los Módulos del Rol (Móvil y Tablet) */}
      {isGridModalOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-neutral-200 max-h-[85vh] overflow-y-auto space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-neutral-100 text-[#363435]">
                  <Grid className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-neutral-900">
                    Todos los Módulos ({tabs.length})
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    {isCoach ? (isAdmin ? 'Administrador General' : 'Entrenador Asistente') : 'Alumno / Tutor'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGridModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive =
                  currentTab === tab.id ||
                  (!isCoach && tab.id === 'account' && currentTab === 'dashboard');

                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      onSelectTab(tab.id);
                      setIsGridModalOpen(false);
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition cursor-pointer relative ${
                      isActive
                        ? 'border-[#363435] bg-neutral-900 text-white shadow-md'
                        : 'border-neutral-200 bg-neutral-50/70 hover:bg-neutral-100 text-neutral-800'
                    }`}
                  >
                    <div className="relative mb-1.5">
                      <Icon className={`w-5 h-5 ${isActive ? 'text-amber-400' : 'text-[#363435]'}`} />
                      {tab.badge !== undefined && (
                        <span className="absolute -top-1 -right-2.5 px-1 py-0.2 bg-amber-500 text-white text-[9px] font-bold rounded-full min-w-[14px]">
                          {tab.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold leading-tight">
                      {tab.label}
                    </span>
                    {isActive && (
                      <span className="text-[9px] text-amber-300 font-semibold mt-1">
                        Activo
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsGridModalOpen(false)}
                className="w-full py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cerrar Menú
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
