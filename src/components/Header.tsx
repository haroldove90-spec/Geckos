import React, { useState } from 'react';
import { UserRole, Student, SystemUser } from '../types';
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
  onSwitchRoleView?: (role: UserRole) => void;
  onNavigateToProfile?: () => void;
}

export const Header: React.FC<Props> = ({
  currentUser,
  activeRole,
  currentStudent,
  onLogout,
  onOpenDataReset,
  onOpenDocPDF,
  pendingCount = 0,
  onSwitchRoleView,
  onNavigateToProfile,
}) => {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const isAdmin =
    currentUser?.role === 'head_coach' ||
    currentUser?.username?.toLowerCase() === 'haroldo90' ||
    currentUser?.username?.toLowerCase() === 'clubgeckosvoleibol';

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
              <span className="px-1.5 py-0.2 bg-amber-500 text-white text-[9px] font-bold rounded-full animate-pulse shrink-0">
                {pendingCount}
              </span>
            )}
          </button>

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

          {/* Botón de Gestión de Datos (Desktop/Tablet) */}
          <button
            onClick={onOpenDataReset}
            title="Gestión de Datos y Base de Datos"
            className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 text-xs transition"
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Datos</span>
          </button>

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
