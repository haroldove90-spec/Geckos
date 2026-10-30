import React, { useState } from 'react';
import { SystemUser } from '../../types';
import {
  UserPlus,
  Shield,
  Key,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  XCircle,
  Trash2,
  Eye,
  EyeOff,
  UserCheck,
  AlertCircle,
  Copy,
  Check,
  Sparkles,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';
import { registerCoach, deleteCoach, toggleCoachActive } from '../../utils/auth';
import { generateSecurePassword, evaluatePasswordStrength } from '../StudentRegistrationForm';

interface Props {
  coaches: SystemUser[];
  onCoachesUpdated: () => void;
  sedes: string[];
}

export const CoachesManagement: React.FC<Props> = ({
  coaches,
  onCoachesUpdated,
  sedes,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [campus, setCampus] = useState(sedes[0] || 'Tlalnepantla');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCreateCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim() || !username.trim() || !password.trim()) {
      setErrorMessage('Por favor ingresa nombre, usuario y contraseña para el entrenador.');
      return;
    }

    const res = await registerCoach({
      name: name.trim(),
      username: username.trim(),
      password: password.trim(),
      phone: phone.trim(),
      email: email.trim(),
      campus,
    });

    if (res.success) {
      setSuccessMessage(`Entrenador "${name}" registrado con éxito. Ya puede iniciar sesión con el usuario "${username.trim().toLowerCase()}".`);
      setName('');
      setUsername('');
      setPassword('');
      setPhone('');
      setEmail('');
      setIsModalOpen(false);
      onCoachesUpdated();
      setTimeout(() => setSuccessMessage(null), 5000);
    } else {
      setErrorMessage(res.error || 'No se pudo registrar el entrenador.');
    }
  };

  const handleToggle = async (coach: SystemUser) => {
    await toggleCoachActive(coach.id, !coach.isActive);
    onCoachesUpdated();
  };

  const [coachToDelete, setCoachToDelete] = useState<SystemUser | null>(null);

  const handleConfirmDelete = async () => {
    if (!coachToDelete) return;
    const res = await deleteCoach(coachToDelete.id);
    if (res.success) {
      setSuccessMessage(`Entrenador "${coachToDelete.name}" eliminado correctamente.`);
      onCoachesUpdated();
      setTimeout(() => setSuccessMessage(null), 4000);
    } else {
      setErrorMessage(res.error || 'No se pudo eliminar el entrenador.');
    }
    setCoachToDelete(null);
  };

  const handleDelete = (coach: SystemUser) => {
    setCoachToDelete(coach);
  };

  const handleCopyCredentials = (coach: SystemUser) => {
    const text = `🏐 *Credenciales de Acceso - Geckos Voleibol*\n👤 Usuario: ${coach.username}\n🔑 Contraseña: ${coach.password || 'Asignada'}\n🔗 Plataforma: https://greckos.vercel.app/`;
    navigator.clipboard.writeText(text);
    setCopiedId(coach.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleShareWhatsApp = (coach: SystemUser) => {
    const phoneClean = (coach.phone || '').replace(/\D/g, '');
    const message = encodeURIComponent(
      `🏐 *Geckos Voleibol - Credenciales de Acceso*\n\n¡Hola ${coach.name}! Aquí están tus datos para ingresar al portal oficial:\n\n🌐 Plataforma: https://greckos.vercel.app/\n👤 Usuario: ${coach.username}\n🔑 Contraseña: ${coach.password || 'Asignada'}\n\nIngresa desde cualquier navegador o dispositivo.`
    );
    if (phoneClean.length >= 10) {
      window.open(`https://wa.me/${phoneClean}?text=${message}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${message}`, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera del Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-200">
        <div>
          <h2 className="text-lg sm:text-2xl font-extrabold text-neutral-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-[#363435]" />
            <span>Gestión de Entrenadores y Staff</span>
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Da de alta entrenadores para que ingresen directamente desde el formulario de acceso con su usuario y contraseña.
          </p>
        </div>

        <button
          onClick={() => {
            setIsModalOpen(true);
            setErrorMessage(null);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#363435] hover:bg-[#252324] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Registrar Entrenador</span>
        </button>
      </div>

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Lista de Entrenadores Registrados */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-neutral-900">
            Entrenadores Activos ({coaches.length})
          </h3>
          <span className="text-xs text-neutral-500">
            Los entrenadores pueden consultar alumnos, asistencias y dar seguimiento a pagos.
          </span>
        </div>

        {coaches.length === 0 ? (
          <div className="p-10 text-center text-xs text-neutral-400">
            <UserCheck className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
            <p className="font-semibold text-neutral-700">No hay entrenadores registrados aún</p>
            <p className="mt-1">Haz clic en "+ Registrar Entrenador" para crear el primer usuario de staff.</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {coaches.map((coach) => (
              <div
                key={coach.id}
                className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-neutral-50/50 transition"
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-sm font-extrabold text-[#363435] shrink-0">
                    {coach.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-neutral-900 truncate">
                        {coach.name}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 border border-neutral-200">
                        @{coach.username}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          coach.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {coach.isActive ? 'Activo' : 'Desactivado'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-neutral-500 mt-1 flex-wrap">
                      {coach.campus && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-neutral-400" />
                          {coach.campus}
                        </span>
                      )}
                      {coach.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-neutral-400" />
                          {coach.phone}
                        </span>
                      )}
                      {coach.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-neutral-400" />
                          {coach.email}
                        </span>
                      )}
                      <span className="flex items-center gap-1 font-mono text-[11px] bg-neutral-50 px-1.5 py-0.5 rounded border border-neutral-200">
                        <Key className="w-3 h-3 text-neutral-400" />
                        Pass: {coach.password || '••••••••'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                  <button
                    onClick={() => handleCopyCredentials(coach)}
                    title="Copiar credenciales de acceso"
                    className="p-2 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 text-xs font-medium transition flex items-center gap-1 cursor-pointer"
                  >
                    {copiedId === coach.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 text-[11px]">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="text-[11px]">Copiar datos</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleShareWhatsApp(coach)}
                    title="Enviar credenciales y enlace por WhatsApp"
                    className="p-2 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium transition flex items-center gap-1 cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-[11px] hidden sm:inline">WhatsApp</span>
                  </button>

                  <button
                    onClick={() => handleToggle(coach)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                      coach.isActive
                        ? 'border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    {coach.isActive ? 'Desactivar' : 'Activar'}
                  </button>

                  <button
                    onClick={() => handleDelete(coach)}
                    title="Eliminar entrenador"
                    className="p-2 rounded-lg border border-neutral-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal para Crear Entrenador */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 border border-neutral-200 shadow-xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-neutral-100 text-[#363435]">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-neutral-900">
                    Registrar Nuevo Entrenador
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Crea credenciales para acceso al sistema
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateCoach} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Nombre Completo del Entrenador *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Carlos López"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#363435]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Nombre de Usuario *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. coach_juan"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#363435]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-neutral-700">
                      Contraseña de Acceso *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const newPass = generateSecurePassword();
                        setPassword(newPass);
                        setShowPassword(true);
                      }}
                      className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200 transition cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-amber-600" />
                      <span>Generar Contraseña Segura</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Ej. Coach#2026"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3.5 pr-10 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#363435]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Advertencia / Guía de Contraseña Segura */}
                  <div className="mt-1.5 p-2 bg-neutral-50 rounded-lg border border-neutral-200 text-[10px] space-y-1">
                    <div className="font-semibold text-neutral-700 flex items-center gap-1">
                      <Shield className="w-3 h-3 text-[#363435]" />
                      <span>Requisitos de seguridad:</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-neutral-600">
                      <span className={/^[A-ZÁÉÍÓÚÑ]/.test(password) ? 'text-emerald-700 font-bold' : ''}>
                        • Inicia con Mayúscula (A-Z)
                      </span>
                      <span className={password.length >= 8 ? 'text-emerald-700 font-bold' : ''}>
                        • Mínimo 8 caracteres
                      </span>
                      <span className={/\d/.test(password) ? 'text-emerald-700 font-bold' : ''}>
                        • Al menos un número (0-9)
                      </span>
                      <span className={/[!@#$%^&*(),.?":{}|<>_\-#+=\[\]\\/`~;]/.test(password) ? 'text-emerald-700 font-bold' : ''}>
                        • Caracter especial (!@#$%&*)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="tel"
                    placeholder="Ej. 5512345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#363435]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    placeholder="coach@geckos.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#363435]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Sede Asignada
                </label>
                <select
                  value={campus}
                  onChange={(e) => setCampus(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#363435]"
                >
                  {sedes.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 text-neutral-600 text-xs font-semibold hover:bg-neutral-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#363435] hover:bg-[#252324] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  Guardar y Activar Entrenador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmación para eliminar entrenador */}
      {coachToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-neutral-100 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-neutral-900 mb-1">
              ¿Eliminar Entrenador?
            </h3>
            <p className="text-xs text-neutral-500 mb-5 leading-relaxed">
              ¿Estás seguro de que deseas revocar el acceso y eliminar la cuenta de{' '}
              <span className="font-semibold text-neutral-800">{coachToDelete.name}</span>? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCoachToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white transition shadow-xs cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
