import React from 'react';
import { UserRole, Student } from '../types';
import { ShieldCheck, UserCheck, Users, Trophy, Download } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { StudentRegistrationForm } from './StudentRegistrationForm';

interface Props {
  onSelectRole: (role: UserRole) => void;
  onOpenDataReset?: () => void;
  onOpenDocPDF?: () => void;
  sedes: string[];
  onAddSede: (newSede: string) => void;
  onRegisterStudents: (newStudents: Omit<Student, 'id' | 'joinedDate'>[]) => void;
}

export const RoleSelector: React.FC<Props> = ({
  onSelectRole,
  onOpenDataReset,
  onOpenDocPDF,
  sedes,
  onAddSede,
  onRegisterStudents,
}) => {
  const { isInstallable, install } = usePWAInstall();

  const rolesList: { id: UserRole; name: string; icon: React.ReactNode }[] = [
    {
      id: 'head_coach',
      name: 'Administrador / Head Coach',
      icon: <ShieldCheck className="w-8 h-8 text-[#363435]" />,
    },
    {
      id: 'coach_assistant',
      name: 'Entrenador Asistente / Staff',
      icon: <UserCheck className="w-8 h-8 text-[#363435]" />,
    },
    {
      id: 'parent',
      name: 'Padre de Familia / Tutor',
      icon: <Users className="w-8 h-8 text-[#363435]" />,
    },
    {
      id: 'player',
      name: 'Jugador / Alumno',
      icon: <Trophy className="w-8 h-8 text-[#363435]" />,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-between p-3.5 sm:p-6 md:p-10 select-none w-full max-w-full overflow-x-hidden min-w-0">
      {/* Top spacing */}
      <div className="w-full flex justify-end">
        {isInstallable && (
          <button
            onClick={() => install()}
            className="flex items-center gap-1.5 text-xs text-neutral-600 bg-white border border-neutral-200 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg hover:border-neutral-400 shadow-2xs transition"
          >
            <Download className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden xs:inline">Instalar App</span>
            <span className="xs:hidden">Instalar</span>
          </button>
        )}
      </div>

      {/* Main Container: Sin header, logo de negocio completo, formulario de registro y selector limpio */}
      <div className="max-w-4xl w-full mx-auto my-auto flex flex-col items-center min-w-0">
        {/* Logo del negocio: No encapsulado, visto de tamaño optimizado */}
        <div className="w-full flex justify-center mb-5 sm:mb-6">
          <img
            src="https://avchpdtkogejgnomkxua.supabase.co/storage/v1/object/public/iconos/geckoslogo.png"
            alt="Gecko´s Veoleibol"
            className="w-full max-w-[192px] xs:max-w-[224px] sm:max-w-[204px] md:max-w-[252px] lg:max-w-[252px] h-auto object-contain transition-transform duration-300 hover:scale-[1.01]"
          />
        </div>

        {/* Formulario de acceso y registro de alumnos (a la vista arriba de los iconos de los roles) */}
        <StudentRegistrationForm
          sedes={sedes}
          onAddSede={onAddSede}
          onRegisterStudents={onRegisterStudents}
        />

        {/* Separador sutil */}
        <div className="w-full flex items-center justify-center gap-3 my-2">
          <div className="h-px bg-neutral-200 flex-1 max-w-[120px]" />
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-neutral-400">
            Acceso por Roles
          </span>
          <div className="h-px bg-neutral-200 flex-1 max-w-[120px]" />
        </div>

        {/* Cuadrícula: 2 Columnas Móvil / 4 Columnas Escritorio */}
        <div className="w-full grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-5 min-w-0 mt-2">
          {rolesList.map((role) => (
            <button
              key={role.id}
              onClick={() => onSelectRole(role.id)}
              className="group relative flex flex-col items-center justify-center p-3.5 sm:p-6 rounded-2xl bg-white border border-neutral-200/90 shadow-2xs hover:shadow-md hover:border-[#363435] transition-all duration-200 active:scale-[0.98] text-center cursor-pointer min-h-[125px] sm:min-h-[160px] min-w-0"
            >
              {/* Subtle top indicator */}
              <div className="w-8 sm:w-10 h-1 bg-transparent group-hover:bg-[#363435] rounded-full mb-2 sm:mb-3 transition-colors" />

              <div className="mb-2 sm:mb-3 p-2 sm:p-2.5 rounded-xl bg-neutral-50 group-hover:bg-neutral-100 transition-colors">
                {role.icon}
              </div>

              {/* Solo nombre del rol */}
              <span className="text-[11px] sm:text-sm font-semibold text-[#363435] group-hover:text-[#000000] tracking-tight leading-tight line-clamp-2">
                {role.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom discreet action bar */}
      <div className="w-full max-w-4xl mx-auto flex flex-wrap items-center justify-between text-xs text-neutral-400 pt-6 gap-2">
        <span>Geckop´s Voleibol · Temporada 2026</span>
        <div className="flex items-center gap-4">
          {onOpenDocPDF && (
            <button
              onClick={onOpenDocPDF}
              className="hover:text-neutral-700 underline underline-offset-2 transition text-neutral-600 font-medium"
            >
              Ficha Técnica en PDF
            </button>
          )}
          {onOpenDataReset && (
            <button
              onClick={onOpenDataReset}
              className="hover:text-neutral-700 underline underline-offset-2 transition"
            >
              Gestión de Datos & Supabase
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
