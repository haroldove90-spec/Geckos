import React, { useState } from 'react';
import { Student, SystemUser } from '../types';
import { Lock, User, Eye, EyeOff, LogIn, UserPlus, AlertCircle, Sparkles, Download, ShieldCheck } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { StudentRegistrationForm } from './StudentRegistrationForm';
import { PWAInstallButton } from './PWAInstallButton';
import { authenticateUser } from '../utils/auth';

interface Props {
  students: Student[];
  onLoginSuccess: (user: SystemUser, student?: Student) => void;
  onOpenDataReset?: () => void;
  onOpenDocPDF?: () => void;
  sedes: string[];
  onAddSede: (newSede: string) => void;
  onRegisterStudents: (newStudents: Omit<Student, 'id' | 'joinedDate'>[]) => Promise<any> | void;
}

export const HomeAuth: React.FC<Props> = ({
  students,
  onLoginSuccess,
  onOpenDataReset,
  onOpenDocPDF,
  sedes,
  onAddSede,
  onRegisterStudents,
}) => {
  const { isInstallable, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Login Form States
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const result = authenticateUser(identifier, password, students);
      if (result.success && result.user) {
        onLoginSuccess(result.user, result.student);
      } else {
        setErrorMessage(result.error || 'Credenciales inválidas. Verifica tu usuario y contraseña.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al procesar el acceso.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegistrationComplete = async (newStudentsList: Omit<Student, 'id' | 'joinedDate'>[]) => {
    return await onRegisterStudents(newStudentsList);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-between p-3.5 sm:p-6 md:p-10 select-none w-full max-w-full overflow-x-hidden min-w-0">
      {/* Barra superior con botón de instalación PWA si aplica */}
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

      {/* Contenedor Principal: Logo + Pestañas de Acceso y Registro */}
      <div className="max-w-xl w-full mx-auto my-auto flex flex-col items-center min-w-0">
        {/* Logotipo del club: Sin encapsular (sin marcos, sin fondos, sin círculos) */}
        <div className="w-full flex justify-center mb-6 sm:mb-8">
          <img
            src="https://avchpdtkogejgnomkxua.supabase.co/storage/v1/object/public/iconos/geckoslogo.png"
            alt="Gecko´s Veoleibol"
            className="w-full max-w-[192px] xs:max-w-[224px] sm:max-w-[204px] md:max-w-[252px] lg:max-w-[252px] h-auto object-contain transition-transform duration-300 hover:scale-[1.01]"
          />
        </div>

        {/* Tarjeta Unificada con Pestañas */}
        <div className="w-full bg-white rounded-3xl border border-neutral-200/90 shadow-sm p-4 sm:p-7 min-w-0">
          {/* Selector de Pestañas: Acceso vs Registro de Alumnos */}
          <div className="flex items-center p-1 bg-neutral-100 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setErrorMessage(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <LogIn className="w-4 h-4 text-[#363435]" />
              <span>Acceso al Sistema</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setErrorMessage(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <UserPlus className="w-4 h-4 text-[#363435]" />
              <span>Registro de Alumnos</span>
            </button>
          </div>

          {/* Pestaña 1: Formulario de Acceso al Sistema */}
          {activeTab === 'login' && (
            <div>
              <div className="mb-5 text-center">
                <h2 className="text-base sm:text-lg font-extrabold text-neutral-900 tracking-tight">
                  Iniciar Sesión
                </h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Ingresa con tus credenciales de Administrador, Entrenador o Alumno registrado.
                </p>
              </div>

              {errorMessage && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <div className="flex-1 leading-relaxed">{errorMessage}</div>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Campo Usuario / Correo / WhatsApp */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Usuario, Correo o WhatsApp / Teléfono
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      autoComplete="username"
                      required
                      placeholder="Ej. valeria26, valeria@gmail.com o 5512345678"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#363435] focus:ring-2 focus:ring-[#363435]/10 bg-neutral-50/50 hover:bg-white transition"
                    />
                  </div>
                  <span className="text-[10px] text-neutral-400 mt-1 block">
                    Ingresa con tu usuario registrado, tu correo o tu WhatsApp/Teléfono.
                  </span>
                </div>

                {/* Campo Contraseña */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#363435] focus:ring-2 focus:ring-[#363435]/10 bg-neutral-50/50 hover:bg-white transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-1"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Botón de Ingreso */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3 px-4 bg-[#363435] hover:bg-[#252324] text-white font-bold text-sm rounded-xl shadow-xs transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{isLoading ? 'Verificando...' : 'Ingresar al Sistema'}</span>
                </button>
              </form>

              {/* Nota de ayuda para alumnos */}
              <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-neutral-500" />
                  Acceso Seguro
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('register')}
                  className="text-neutral-700 hover:text-black font-semibold underline underline-offset-2 transition"
                >
                  ¿Alumno nuevo? Regístrate aquí
                </button>
              </div>
            </div>
          )}

          {/* Pestaña 2: Formulario de Registro de Alumnos */}
          {activeTab === 'register' && (
            <div>
              <div className="mb-4">
                <p className="text-xs text-neutral-500 text-center">
                  Completa el formulario para registrar un nuevo alumno o deportista en Geckos Voleibol.
                </p>
              </div>
              <StudentRegistrationForm
                sedes={sedes}
                onAddSede={onAddSede}
                onRegisterStudents={handleRegistrationComplete}
              />
              {/* Botón oficial para instalar la app debajo del formulario de registro */}
              <PWAInstallButton variant="home_banner" />
            </div>
          )}
        </div>

        {/* Botón de instalación visible también en la pestaña de acceso para máxima accesibilidad */}
        {activeTab === 'login' && (
          <div className="w-full mt-3">
            <PWAInstallButton variant="home_banner" />
          </div>
        )}
      </div>

      {/* Pie de página discreto */}
      <div className="w-full max-w-xl mx-auto flex flex-wrap items-center justify-between text-xs text-neutral-400 pt-6 gap-2">
        <span>Gecko´s Veoleibol · Temporada 2026</span>
        <div className="flex items-center gap-4">
          {onOpenDocPDF && (
            <button
              onClick={onOpenDocPDF}
              className="hover:text-neutral-700 underline underline-offset-2 transition text-neutral-600 font-medium"
            >
              Ficha Técnica (PDF)
            </button>
          )}
          {onOpenDataReset && (
            <button
              onClick={onOpenDataReset}
              className="hover:text-neutral-700 underline underline-offset-2 transition"
            >
              Base de Datos
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
