import React, { useState } from 'react';
import { UserRole, Student, SystemUser, SystemNotification } from '../types';
import {
  LogOut,
  User,
  ShieldCheck,
  Database,
  FileText,
  ChevronDown,
  Eye,
  Trophy,
  Users,
  UserCheck,
  Bell,
  CreditCard,
  CheckCircle2,
  ArrowUpRight,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface Props {
  currentUser: SystemUser | null;
  activeRole: UserRole;
  currentStudent?: Student | null;
  onLogout: () => void;
  onOpenDataReset: () => void;
  onOpenDocPDF?: () => void;
  pendingCount?: number;
  unreadNotifsCount?: number;
  recentNotifications?: SystemNotification[];
  onSwitchRoleView?: (role: UserRole) => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToValidation?: () => void;
  onMarkNotifAsRead?: (id: string) => void;
}

export const Header: React.FC<Props> = ({
  currentUser,
  activeRole,
  currentStudent,
  onLogout,
  onOpenDataReset,
  onOpenDocPDF,
  pendingCount = 0,
  unreadNotifsCount = 0,
  recentNotifications = [],
  onSwitchRoleView,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToValidation,
  onMarkNotifAsRead,
}) => {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const isCoach = activeRole === 'head_coach' || activeRole === 'coach_assistant';
  const isAdmin =
    currentUser?.role === 'head_coach' ||
    currentUser?.username?.toLowerCase() === 'haroldo90' ||
    currentUser?.username?.toLowerCase() === 'clubgeckosvoleibol';
  const bellCount = isCoach ? Math.max(unreadNotifsCount, pendingCount) : unreadNotifsCount;

  const getRoleBadgeLabel = () => {
    switch (activeRole) {
      case 'head_coach':
        return 'Administrador';
      case 'coach_assistant':
        return 'Entrenador Asistente';
      case 'parent':
        return 'Padre / Tutor';
      case 'player':
        return 'Alumno / Deportista';
      default:
        return 'Usuario';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200 w-full">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-4 md:px-6 h-15 sm:h-18 flex items-center justify-between gap-2 min-w-0">
        {/* Logotipo del club Gecko´s Veoleibol: Sin encapsular */}
        <div className="flex items-center min-w-0 shrink">
          <img
            src="https://avchpdtkogejgnomkxua.supabase.co/storage/v1/object/public/iconos/geckoslogo.png"
            alt="Gecko´s Veoleibol"
            className="h-8 sm:h-10 md:h-12 w-auto max-w-[120px] sm:max-w-[180px] md:max-w-[220px] object-contain shrink-0"
          />
        </div>

        {/* Zona Derecha: Usuario Autenticado, Navegación de Roles Admin, Opciones y Salir */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 min-w-0">
          {/* Identificación del Usuario Autenticado (Muestra su Nombre y acceso a Perfil) */}
          <button
            type="button"
            onClick={onNavigateToProfile}
            title="Ir a Mi Perfil (actualizar foto, datos y contraseña)"
            className="flex items-center gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200/80 border border-neutral-200 text-neutral-800 text-[11px] sm:text-xs min-w-0 transition cursor-pointer text-left"
          >
            {currentUser?.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover shrink-0 border border-neutral-300"
              />
            ) : (
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#363435] text-white flex items-center justify-center font-bold text-[10px] sm:text-[11px] shrink-0">
                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <div className="flex flex-col min-w-0 text-left">
              <span className="font-extrabold text-neutral-900 truncate max-w-[85px] xs:max-w-[120px] sm:max-w-[180px] md:max-w-[220px] leading-tight">
                {currentUser?.name || 'Usuario'}
              </span>
              <span className="text-[10px] text-neutral-500 font-medium leading-tight truncate">
                {getRoleBadgeLabel()} · Perfil
              </span>
            </div>
            {activeRole === 'head_coach' && pendingCount > 0 && (
              <span className="hidden sm:inline-flex px-1.5 py-0.2 bg-amber-500 text-white text-[9px] font-bold rounded-full shrink-0">
                {pendingCount}
              </span>
            )}
          </button>

          {/* Campana de Notificaciones en Tiempo Real */}
          {onNavigateToNotifications && (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowNotifMenu(!showNotifMenu);
                  setShowRoleMenu(false);
                }}
                title={
                  isCoach
                    ? 'Notificaciones de pagos por autorizar y avisos'
                    : 'Bandeja de avisos y notificaciones'
                }
                className={`relative p-2 rounded-xl border transition cursor-pointer ${
                  bellCount > 0
                    ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
                    : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                }`}
              >
                <Bell className={`w-4 h-4 ${bellCount > 0 ? 'text-amber-600' : ''}`} />
                {bellCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs animate-pulse">
                    {bellCount > 99 ? '99+' : bellCount}
                  </span>
                )}
              </button>

              {showNotifMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowNotifMenu(false)}
                  />
                  <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-16 sm:top-full sm:mt-2 sm:w-88 bg-white rounded-2xl border border-neutral-200 shadow-2xl z-50 overflow-hidden animate-scaleUp">
                    <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-100 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-extrabold text-neutral-900">
                          {isCoach ? 'Alertas y Pagos por Autorizar' : 'Tus Notificaciones'}
                        </p>
                        <p className="text-[10px] text-neutral-500">
                          {isCoach && pendingCount > 0
                            ? `${pendingCount} comprobante(s) pendiente(s) de revisión`
                            : `${unreadNotifsCount} sin leer`}
                        </p>
                      </div>
                      {isCoach && pendingCount > 0 && onNavigateToValidation && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowNotifMenu(false);
                            onNavigateToValidation();
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-900 text-[10px] font-extrabold flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <span>Validar ({pendingCount})</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-neutral-100">
                      {recentNotifications.length === 0 ? (
                        <div className="p-6 text-center text-xs text-neutral-400">
                          <Bell className="w-7 h-7 mx-auto text-neutral-300 mb-1.5" />
                          <p className="font-semibold text-neutral-600">Sin notificaciones recientes</p>
                        </div>
                      ) : (
                        recentNotifications.slice(0, 6).map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => {
                              if (!n.read && onMarkNotifAsRead) {
                                onMarkNotifAsRead(n.id);
                              }
                              setShowNotifMenu(false);
                              if (isCoach && n.type === 'new_payment_submitted' && onNavigateToValidation) {
                                onNavigateToValidation();
                              } else {
                                onNavigateToNotifications();
                              }
                            }}
                            className={`w-full text-left p-3 hover:bg-neutral-50 transition flex items-start gap-2.5 cursor-pointer ${
                              !n.read ? 'bg-amber-50/40' : 'bg-white'
                            }`}
                          >
                            <div
                              className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                                n.type === 'new_payment_submitted'
                                  ? 'bg-amber-100 text-amber-800'
                                  : n.type === 'payment_approved'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-neutral-100 text-neutral-600'
                              }`}
                            >
                              {n.type === 'new_payment_submitted' ? (
                                <CreditCard className="w-3.5 h-3.5" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-bold text-neutral-900 truncate">
                                  {n.title}
                                </p>
                                {!n.read && (
                                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                                )}
                              </div>
                              <p className="text-[11px] text-neutral-600 line-clamp-2 mt-0.5 leading-snug">
                                {n.message}
                              </p>
                              <span className="text-[10px] text-neutral-400 font-mono block mt-1">
                                {n.date}
                              </span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>

                    <div className="p-2.5 bg-neutral-50 border-t border-neutral-100">
                      <button
                        type="button"
                        onClick={() => {
                          setShowNotifMenu(false);
                          onNavigateToNotifications();
                        }}
                        className="w-full py-2 rounded-xl bg-[#363435] hover:bg-black text-white text-xs font-bold transition cursor-pointer"
                      >
                        Ver todas las notificaciones
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Menú de Navegación de Roles para el Administrador */}
          {isAdmin && onSwitchRoleView && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition shadow-2xs cursor-pointer ${
                  activeRole !== 'head_coach'
                    ? 'bg-amber-500 text-neutral-900 border-amber-600 animate-pulse'
                    : 'bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-800'
                }`}
                title="El administrador puede navegar en todos los roles del sistema"
              >
                <Eye className="w-3.5 h-3.5 text-[#363435]" />
                <span className="hidden sm:inline">Navegar Roles</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showRoleMenu ? 'rotate-180' : ''}`} />
              </button>

              {showRoleMenu && (
                <>
                  {/* Backdrop para cerrar al hacer clic afuera */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowRoleMenu(false)}
                  />
                  <div
                    className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-neutral-200 shadow-2xl py-2 z-50 animate-scaleUp"
                  >
                    <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 border-b border-neutral-100 mb-1 flex items-center justify-between">
                      <span>Navegación de Roles</span>
                      <span className="text-[9px] bg-neutral-100 text-neutral-700 font-bold px-1.5 py-0.5 rounded">
                        Admin
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onSwitchRoleView('head_coach');
                        setShowRoleMenu(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold hover:bg-neutral-50 text-left transition cursor-pointer ${
                        activeRole === 'head_coach' ? 'bg-amber-50 text-neutral-900 font-bold border-l-4 border-[#363435]' : 'text-neutral-700'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4 text-[#363435] shrink-0" />
                      <div className="min-w-0">
                        <div className="font-bold">👑 Administrador (Head Coach)</div>
                        <div className="text-[10px] text-neutral-400">Vista principal de gestión completa</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSwitchRoleView('coach_assistant');
                        setShowRoleMenu(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold hover:bg-neutral-50 text-left transition cursor-pointer ${
                        activeRole === 'coach_assistant' ? 'bg-amber-50 text-neutral-900 font-bold border-l-4 border-blue-600' : 'text-neutral-700'
                      }`}
                    >
                      <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-bold">📋 Entrenador Asistente</div>
                        <div className="text-[10px] text-neutral-400">Padrón de alumnos y asistencia</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSwitchRoleView('parent');
                        setShowRoleMenu(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold hover:bg-neutral-50 text-left transition cursor-pointer ${
                        activeRole === 'parent' ? 'bg-amber-50 text-neutral-900 font-bold border-l-4 border-emerald-600' : 'text-neutral-700'
                      }`}
                    >
                      <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-bold">👨‍👩‍👧 Padre de Familia / Tutor</div>
                        <div className="text-[10px] text-neutral-400">Estado de cuenta y registro de pagos</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSwitchRoleView('player');
                        setShowRoleMenu(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold hover:bg-neutral-50 text-left transition cursor-pointer ${
                        activeRole === 'player' ? 'bg-amber-50 text-neutral-900 font-bold border-l-4 border-amber-600' : 'text-neutral-700'
                      }`}
                    >
                      <Trophy className="w-4 h-4 text-amber-600 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-bold">🏐 Alumno / Jugador</div>
                        <div className="text-[10px] text-neutral-400">Carnet deportivo y avisos</div>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Botón de Ficha Técnica / PDF */}
          {onOpenDocPDF && (
            <button
              onClick={onOpenDocPDF}
              title="Descargar Ficha Técnica y Manual en PDF"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold transition"
            >
              <FileText className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">PDF</span>
            </button>
          )}

          {/* Botón de Gestión de Datos (Desktop/Tablet) - Solo Administrador */}
          {isAdmin && (
            <button
              onClick={onOpenDataReset}
              title="Gestión de Datos y Base de Datos"
              className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 text-xs transition"
            >
              <Database className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Datos</span>
            </button>
          )}

          {/* Botón de instalación rápida de la aplicación */}
          <PWAInstallButton variant="header" />

          {/* Botón de cierre de sesión */}
          <button
            onClick={onLogout}
            title="Cerrar sesión"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 hover:text-rose-600 text-xs font-medium transition shadow-2xs active:scale-95 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>
    </header>
  );
};
