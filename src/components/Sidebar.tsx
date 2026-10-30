import React from 'react';
import { SystemUser, UserRole } from '../types';
import {
  LayoutDashboard,
  Users,
  CheckCircle2,
  BellRing,
  Share2,
  CreditCard,
  History,
  Bell,
  Database,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  FileText,
  UserCheck,
  UserCircle,
  Megaphone,
} from 'lucide-react';

interface Props {
  currentUser?: SystemUser | null;
  activeRole: UserRole;
  currentTab: string;
  onSelectTab: (tab: string) => void;
  pendingCount?: number;
  unreadNotifsCount?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenDataReset: () => void;
  onOpenDocPDF?: () => void;
  onSwitchRoleView?: (role: UserRole) => void;
}

export const Sidebar: React.FC<Props> = ({
  currentUser,
  activeRole,
  currentTab,
  onSelectTab,
  pendingCount = 0,
  unreadNotifsCount = 0,
  isCollapsed = false,
  onToggleCollapse,
  onOpenDataReset,
  onOpenDocPDF,
  onSwitchRoleView,
}) => {
  const isCoach = activeRole === 'head_coach' || activeRole === 'coach_assistant';
  const isAdmin =
    activeRole === 'head_coach' ||
    currentUser?.role === 'head_coach' ||
    currentUser?.username?.toLowerCase() === 'haroldo90' ||
    currentUser?.username?.toLowerCase() === 'clubgeckosvoleibol';

  const coachMenuItems = [
    { id: 'dashboard', label: 'Panel de Control', icon: LayoutDashboard },
    ...(isAdmin ? [{ id: 'coaches', label: 'Entrenadores', icon: UserCheck }] : []),
    { id: 'announcements', label: 'Comunicados y PDF', icon: Megaphone },
    { id: 'registered_students', label: 'Alumnos Registrados', icon: Users },
    { id: 'players', label: 'Pagos', icon: CreditCard },
    {
      id: 'validation',
      label: 'Validación de Pagos',
      icon: CheckCircle2,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    { id: 'billing', label: 'Cobranza y Avisos', icon: BellRing },
    { id: 'profile', label: 'Mi Perfil', icon: UserCircle },
    { id: 'social', label: 'Redes Oficiales', icon: Share2 },
  ];

  const parentMenuItems = [
    { id: 'account', label: 'Estado de Cuenta', icon: LayoutDashboard },
    { id: 'announcements', label: 'Comunicados y PDF', icon: Megaphone },
    { id: 'register_payment', label: 'Registrar Pago', icon: CreditCard },
    { id: 'history', label: 'Historial de Pagos', icon: History },
    {
      id: 'notifications',
      label: 'Bandeja de Avisos',
      icon: Bell,
      badge: unreadNotifsCount > 0 ? unreadNotifsCount : undefined,
    },
    { id: 'profile', label: 'Mi Perfil', icon: UserCircle },
    { id: 'social', label: 'Redes Oficiales', icon: Share2 },
  ];

  const menuItems = isCoach ? coachMenuItems : parentMenuItems;

  return (
    <aside
      className={`hidden lg:flex flex-col bg-white border-r border-neutral-200 transition-all duration-300 ${
        isCollapsed ? 'w-18' : 'w-64'
      } shrink-0 select-none min-h-[calc(100vh-5rem)] sticky top-20`}
    >
      {/* Navigation Links */}
      <div className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
        {currentUser && !isCollapsed && (
          <div className="mb-4 p-3 rounded-2xl bg-neutral-50 border border-neutral-200/80">
            <button
              type="button"
              onClick={() => onSelectTab('profile')}
              title="Ver y editar Mi Perfil"
              className="w-full flex items-center gap-2.5 text-left cursor-pointer group"
            >
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full object-cover shrink-0 border border-neutral-300"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#363435] text-white flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-black transition">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-neutral-900 group-hover:text-black truncate leading-tight">
                  {currentUser.name}
                </p>
                <p className="text-[10px] text-neutral-500 group-hover:text-neutral-700 truncate leading-tight mt-0.5">
                  @{currentUser.username} · Mi Perfil
                </p>
              </div>
            </button>
            {isAdmin && onSwitchRoleView && (
              <div className="mt-2.5 pt-2 border-t border-neutral-200/70">
                <p className="text-[9px] uppercase font-bold text-neutral-400 mb-1">
                  Vista de Rol Activa
                </p>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => onSwitchRoleView('head_coach')}
                    className={`py-1 px-1.5 rounded-lg font-semibold truncate transition cursor-pointer text-left ${
                      activeRole === 'head_coach'
                        ? 'bg-[#363435] text-white'
                        : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    👑 Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => onSwitchRoleView('coach_assistant')}
                    className={`py-1 px-1.5 rounded-lg font-semibold truncate transition cursor-pointer text-left ${
                      activeRole === 'coach_assistant'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    📋 Asistente
                  </button>
                  <button
                    type="button"
                    onClick={() => onSwitchRoleView('parent')}
                    className={`py-1 px-1.5 rounded-lg font-semibold truncate transition cursor-pointer text-left ${
                      activeRole === 'parent'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    👨‍👩‍👧 Tutor
                  </button>
                  <button
                    type="button"
                    onClick={() => onSwitchRoleView('player')}
                    className={`py-1 px-1.5 rounded-lg font-semibold truncate transition cursor-pointer text-left ${
                      activeRole === 'player'
                        ? 'bg-amber-600 text-white'
                        : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    🏐 Alumno
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">
          {!isCollapsed && (isCoach ? 'Módulos Deportivos' : 'Portal de Familia')}
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            currentTab === item.id || (!isCoach && item.id === 'account' && currentTab === 'dashboard');
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group cursor-pointer ${
                isActive
                  ? 'bg-[#363435] text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              } ${isCollapsed ? 'justify-center px-0' : ''}`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive ? 'text-amber-400' : 'text-neutral-500 group-hover:text-neutral-900'
                }`}
              />
              {!isCollapsed && (
                <span className="truncate flex-1 text-left">{item.label}</span>
              )}
              {!isCollapsed && item.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                    isActive ? 'bg-amber-400 text-neutral-900' : 'bg-[#363435] text-white'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom info & actions */}
      <div className="p-3 border-t border-neutral-100 space-y-2">
        {onOpenDocPDF && (
          <button
            onClick={onOpenDocPDF}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 transition ${
              isCollapsed ? 'justify-center px-0' : ''
            }`}
            title="Descargar Ficha Técnica / Manual en PDF"
          >
            <FileText className="w-4 h-4 text-rose-600 shrink-0" />
            {!isCollapsed && <span>Ficha Técnica (PDF)</span>}
          </button>
        )}

        <button
          onClick={onOpenDataReset}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition ${
            isCollapsed ? 'justify-center px-0' : ''
          }`}
          title="Gestión de Datos & Supabase"
        >
          <Database className="w-4 h-4 text-neutral-500" />
          {!isCollapsed && <span>Gestión de Datos</span>}
        </button>

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="w-full flex items-center justify-center p-2 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition text-xs"
            title={isCollapsed ? 'Expandir menú' : 'Contraer menú'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {!isCollapsed && <span className="ml-2 text-xs">Plegar panel</span>}
          </button>
        )}

        {!isCollapsed && (
          <div className="px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200/60 text-[11px] text-neutral-500 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="truncate">Geckos Voleibol v2.0</span>
          </div>
        )}
      </div>
    </aside>
  );
};
