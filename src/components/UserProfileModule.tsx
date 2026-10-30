import React, { useState } from 'react';
import { SystemUser, Student, StudentCategory } from '../types';
import {
  User,
  Mail,
  Phone,
  Camera,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Sparkles,
  Award,
  HeartPulse,
  Save,
  KeyRound,
  FileCode2,
} from 'lucide-react';
import { updateUserProfile } from '../utils/auth';

interface Props {
  currentUser: SystemUser | null;
  currentStudent: Student | null;
  onUpdateUser: (user: SystemUser) => void;
  onUpdateStudent?: (student: Student) => void;
}

export const UserProfileModule: React.FC<Props> = ({
  currentUser,
  currentStudent,
  onUpdateUser,
  onUpdateStudent,
}) => {
  // Personal Info Form State
  const isPlayerOrParent =
    currentUser?.role === 'player' ||
    (currentUser?.role as string) === 'parent' ||
    Boolean(currentUser?.assignedStudentId);

  const [name, setName] = useState(currentUser?.name || currentStudent?.fullName || '');
  const [email, setEmail] = useState(currentUser?.email || currentStudent?.tutorEmail || '');
  const [phone, setPhone] = useState(currentUser?.phone || currentStudent?.whatsapp || '');

  // Student specific attributes if student
  const [birthDate, setBirthDate] = useState(currentStudent?.birthDate || '');
  const [category, setCategory] = useState<StudentCategory>(currentStudent?.category || 'Sub 23');
  const [jerseyNumber, setJerseyNumber] = useState(currentStudent?.jerseyNumber || 0);
  const [branch, setBranch] = useState<'Femenil' | 'Varonil'>(currentStudent?.branch || 'Femenil');
  const [allergies, setAllergies] = useState(currentStudent?.allergies || 'Ninguna reportada');
  const [chronicCondition, setChronicCondition] = useState(currentStudent?.chronicCondition || 'Ninguna');
  const [emergencyPhone, setEmergencyPhone] = useState(currentStudent?.emergencyPhone || '');
  const [tutorName, setTutorName] = useState(currentStudent?.tutorName || '');
  const [tutorPhone, setTutorPhone] = useState(currentStudent?.tutorPhone || '');

  // Photo / Avatar State
  const [avatarUrl, setAvatarUrl] = useState<string>(
    currentUser?.avatarUrl || currentStudent?.photoUrl || ''
  );
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Status feedback
  const [infoSuccess, setInfoSuccess] = useState<string | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [isSavingInfo, setIsSavingInfo] = useState(false);

  const [passSuccess, setPassSuccess] = useState<string | null>(null);
  const [passError, setPassError] = useState<string | null>(null);
  const [isSavingPass, setIsSavingPass] = useState(false);

  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlCard, setShowSqlCard] = useState(false);

  const sqlSupportScript = `-- ====================================================================
-- GECKO´S VEOLEIBOL - MÓDULO DE PERFIL Y FOTOGRAFÍAS
-- Habilitar columnas de foto de perfil en Supabase
-- ====================================================================

-- 1. Columna de foto para usuarios (Admins y Entrenadores)
ALTER TABLE public.system_users 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Columna de foto para alumnos y jugadores
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 3. Notificar a PostgREST para recargar el esquema
NOTIFY pgrst, 'reload schema';
`;

  // Compress & convert image to lightweight Data URL (max 400x400)
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setInfoError('Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP).');
      return;
    }

    setIsUploadingPhoto(true);
    setInfoError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setAvatarUrl(compressedDataUrl);

          // Update current user avatar automatically
          if (currentUser) {
            updateUserProfile(currentUser.id, { avatarUrl: compressedDataUrl }).then((res) => {
              if (res.success && res.user) {
                onUpdateUser(res.user);
              }
            });
          }

          // If student, update photoUrl
          if (currentStudent && onUpdateStudent) {
            onUpdateStudent({
              ...currentStudent,
              photoUrl: compressedDataUrl,
            });
          }

          setInfoSuccess('¡Fotografía actualizada y guardada correctamente!');
          setTimeout(() => setInfoSuccess(null), 3500);
        }
        setIsUploadingPhoto(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = async () => {
    setAvatarUrl('');
    if (currentUser) {
      const res = await updateUserProfile(currentUser.id, { avatarUrl: '' });
      if (res.success && res.user) {
        onUpdateUser(res.user);
      }
    }
    if (currentStudent && onUpdateStudent) {
      onUpdateStudent({
        ...currentStudent,
        photoUrl: '',
      });
    }
    setInfoSuccess('Fotografía eliminada.');
    setTimeout(() => setInfoSuccess(null), 3000);
  };

  // Submit Personal Data
  const handleSavePersonalInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfoError(null);
    setInfoSuccess(null);
    setIsSavingInfo(true);

    try {
      if (!name.trim()) {
        throw new Error('El nombre no puede estar vacío.');
      }

      // 1. Update SystemUser
      if (currentUser) {
        const res = await updateUserProfile(currentUser.id, {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          avatarUrl,
        });

        if (!res.success) {
          throw new Error(res.error || 'No fue posible guardar los cambios de usuario.');
        }

        if (res.user) {
          onUpdateUser(res.user);
        }
      }

      // 2. If student, update Student record
      if (currentStudent && onUpdateStudent) {
        const updatedStudent: Student = {
          ...currentStudent,
          fullName: name.trim(),
          whatsapp: phone.trim(),
          tutorEmail: email.trim() || currentStudent.tutorEmail,
          birthDate,
          category,
          jerseyNumber: Number(jerseyNumber) || 0,
          branch,
          allergies: allergies.trim() || 'Ninguna reportada',
          chronicCondition: chronicCondition.trim() || 'Ninguna',
          emergencyPhone: emergencyPhone.trim() || phone.trim(),
          tutorName: tutorName.trim() || currentStudent.tutorName,
          tutorPhone: tutorPhone.trim() || currentStudent.tutorPhone,
          photoUrl: avatarUrl,
        };
        onUpdateStudent(updatedStudent);
      }

      setInfoSuccess('¡Tus datos personales han sido actualizados y sincronizados con éxito!');
      setTimeout(() => setInfoSuccess(null), 4000);
    } catch (err: any) {
      setInfoError(err.message || 'Error al guardar los datos.');
    } finally {
      setIsSavingInfo(false);
    }
  };

  // Submit Password Change
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(null);
    setIsSavingPass(true);

    try {
      if (!newPassword || newPassword.length < 6) {
        throw new Error('La nueva contraseña debe tener al menos 6 caracteres.');
      }

      if (newPassword !== confirmPassword) {
        throw new Error('Las contraseñas nuevas no coinciden. Verifica que estén escritas idénticamente.');
      }

      // Check current password (unless user has no password set or is admin)
      if (currentUser?.password && currentUser.password !== currentPassword.trim()) {
        throw new Error('La contraseña actual ingresada es incorrecta.');
      }

      if (!currentUser) {
        throw new Error('No hay sesión de usuario activa.');
      }

      const res = await updateUserProfile(currentUser.id, {
        password: newPassword.trim(),
      });

      if (!res.success) {
        throw new Error(res.error || 'Error al actualizar la contraseña.');
      }

      if (res.user) {
        onUpdateUser(res.user);
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPassSuccess('¡Contraseña actualizada exitosamente! Recuerda utilizar tu nueva clave en tu próximo ingreso.');
      setTimeout(() => setPassSuccess(null), 5000);
    } catch (err: any) {
      setPassError(err.message || 'Error al cambiar contraseña.');
    } finally {
      setIsSavingPass(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlSupportScript);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const getRoleLabel = () => {
    switch (currentUser?.role) {
      case 'head_coach':
        return 'Director General / Administrador';
      case 'coach_assistant':
        return 'Entrenador Asistente';
      case 'player':
        return 'Alumno / Deportista';
      default:
        return isPlayerOrParent ? 'Alumno / Padre de Familia' : 'Usuario';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* 1. Tarjeta de Presentación y Fotografía de Perfil */}
      <div className="bg-white rounded-3xl border border-neutral-200/90 shadow-sm p-5 sm:p-7">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Contenedor de la Fotografía: Limpia y sin encapsulación */}
          <div className="relative group shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={name || 'Foto de Perfil'}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover shadow-sm transition hover:opacity-95"
              />
            ) : (
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-[#363435] text-white flex flex-col items-center justify-center font-black text-2xl shadow-sm">
                <span>{name ? name.charAt(0).toUpperCase() : 'G'}</span>
                <span className="text-[10px] font-normal tracking-wide text-amber-300 mt-0.5">Sin foto</span>
              </div>
            )}

            {/* Input oculto para subir fotografía */}
            <label
              htmlFor="profile-photo-input"
              className="absolute -bottom-2 -right-2 p-2 bg-[#363435] hover:bg-black text-white rounded-xl shadow-md cursor-pointer transition transform hover:scale-105"
              title="Cambiar fotografía de perfil"
            >
              <Camera className="w-4 h-4 text-amber-400" />
              <input
                id="profile-photo-input"
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
                disabled={isUploadingPhoto}
              />
            </label>
          </div>

          {/* Información Principal del Perfil */}
          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 bg-neutral-100 text-neutral-800 text-[11px] font-bold rounded-lg border border-neutral-200">
                {getRoleLabel()}
              </span>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[11px] font-semibold rounded-lg border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Cuenta Activa
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight truncate">
              {name || 'Mi Perfil'}
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              Usuario: <strong className="text-neutral-700">@{currentUser?.username || 'usuario'}</strong>
              {currentUser?.email ? ` · ${currentUser.email}` : ''}
            </p>

            {/* Botones de acción para la fotografía */}
            <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <label
                htmlFor="profile-photo-input"
                className="px-3.5 py-1.5 bg-neutral-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                <span>{avatarUrl ? 'Cambiar Fotografía' : 'Subir Fotografía'}</span>
              </label>

              {avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Quitar Foto</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowSqlCard(!showSqlCard)}
                className="px-3 py-1.5 bg-neutral-50 hover:bg-neutral-100 text-neutral-600 border border-neutral-200 text-xs font-medium rounded-xl transition flex items-center gap-1.5"
              >
                <FileCode2 className="w-3.5 h-3.5 text-neutral-500" />
                <span>SQL Supabase</span>
              </button>
            </div>
          </div>
        </div>

        {/* Notificación informativa sobre la foto */}
        {isUploadingPhoto && (
          <div className="mt-4 p-3 bg-neutral-50 rounded-xl text-xs text-neutral-600 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>Optimizando y guardando imagen...</span>
          </div>
        )}

        {/* Tarjeta desplegable de SQL para Supabase */}
        {showSqlCard && (
          <div className="mt-5 p-4 rounded-2xl bg-neutral-900 text-white border border-neutral-800 animate-in fade-in">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-neutral-200">
                  SQL para soporte de Fotos en Supabase (Opcional)
                </span>
              </div>
              <button
                onClick={handleCopySql}
                className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-lg transition cursor-pointer"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Copiado' : 'Copiar SQL'}</span>
              </button>
            </div>
            <p className="text-[11px] text-neutral-400 mb-2">
              Si deseas almacenar las fotos directamente en Supabase, ejecuta esta consulta en el SQL Editor:
            </p>
            <pre className="p-2.5 rounded-xl bg-neutral-950 font-mono text-[11px] text-amber-300/90 overflow-x-auto border border-neutral-800">
              {sqlSupportScript}
            </pre>
          </div>
        )}
      </div>

      {/* 2. Sección: Actualización de Datos Personales */}
      <div className="bg-white rounded-3xl border border-neutral-200/90 shadow-sm p-5 sm:p-7">
        <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-neutral-100">
          <User className="w-5 h-5 text-[#363435]" />
          <div>
            <h2 className="text-base font-extrabold text-neutral-900">Datos Personales y Contacto</h2>
            <p className="text-xs text-neutral-500">
              Actualiza tu información oficial de contacto registrada en Geckos Voleibol.
            </p>
          </div>
        </div>

        {infoSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{infoSuccess}</span>
          </div>
        )}

        {infoError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{infoError}</span>
          </div>
        )}

        <form onSubmit={handleSavePersonalInfo} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nombre Completo */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Nombre Completo *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#363435] focus:ring-2 focus:ring-[#363435]/10 bg-neutral-50/50 hover:bg-white transition"
              />
            </div>

            {/* Teléfono / WhatsApp */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Teléfono de Contacto (WhatsApp) *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  placeholder="+52 55..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#363435] focus:ring-2 focus:ring-[#363435]/10 bg-neutral-50/50 hover:bg-white transition"
                />
              </div>
            </div>

            {/* Correo Electrónico */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  placeholder="ejemplo@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#363435] focus:ring-2 focus:ring-[#363435]/10 bg-neutral-50/50 hover:bg-white transition"
                />
              </div>
            </div>

            {/* Campos deportivos adicionales si es Alumno / Deportista */}
            {isPlayerOrParent && currentStudent && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Categoría Deportiva
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as StudentCategory)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#363435] bg-neutral-50/50"
                  >
                    <option value="Sub 23">Sub 23</option>
                    <option value="Juvenil">Juvenil</option>
                    <option value="Infantil">Infantil</option>
                    <option value="Mini">Mini</option>
                    <option value="Sub-13">Sub-13</option>
                    <option value="Sub-15">Sub-15</option>
                    <option value="Sub-18">Sub-18</option>
                    <option value="Libre Femenil">Libre Femenil</option>
                    <option value="Libre Varonil">Libre Varonil</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Rama Deportiva
                  </label>
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value as 'Femenil' | 'Varonil')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#363435] bg-neutral-50/50"
                  >
                    <option value="Femenil">Femenil</option>
                    <option value="Varonil">Varonil</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Número de Camiseta (Jersey)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={jerseyNumber}
                    onChange={(e) => setJerseyNumber(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#363435] bg-neutral-50/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Fecha de Nacimiento
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#363435] bg-neutral-50/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Contacto de Emergencia (Teléfono)
                  </label>
                  <input
                    type="tel"
                    placeholder="Teléfono adicional para urgencias"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#363435] bg-neutral-50/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Alergias o Medicamentos
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Penicilina, polen o Ninguna"
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#363435] bg-neutral-50/50"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Condición Médica o Padecimiento Crónico
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Asma o Ninguno"
                    value={chronicCondition}
                    onChange={(e) => setChronicCondition(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#363435] bg-neutral-50/50"
                  />
                </div>

                {currentStudent.registrationType === 'minor' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Nombre del Tutor
                      </label>
                      <input
                        type="text"
                        value={tutorName}
                        onChange={(e) => setTutorName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#363435] bg-neutral-50/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Teléfono del Tutor
                      </label>
                      <input
                        type="tel"
                        value={tutorPhone}
                        onChange={(e) => setTutorPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#363435] bg-neutral-50/50"
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          <div className="pt-3 flex justify-end">
            <button
              type="submit"
              disabled={isSavingInfo}
              className="px-5 py-2.5 bg-[#363435] hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <Save className="w-4 h-4 text-amber-400" />
              <span>{isSavingInfo ? 'Guardando...' : 'Guardar Datos Personales'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 3. Sección: Cambio de Contraseña */}
      <div className="bg-white rounded-3xl border border-neutral-200/90 shadow-sm p-5 sm:p-7">
        <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-neutral-100">
          <KeyRound className="w-5 h-5 text-[#363435]" />
          <div>
            <h2 className="text-base font-extrabold text-neutral-900">Seguridad & Contraseña</h2>
            <p className="text-xs text-neutral-500">
              Cambia tu contraseña de acceso al sistema para mantener tu cuenta protegida.
            </p>
          </div>
        </div>

        {passSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{passSuccess}</span>
          </div>
        )}

        {passError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{passError}</span>
          </div>
        )}

        <form onSubmit={handleSavePassword} className="space-y-4 max-w-xl">
          {/* Contraseña Actual */}
          {currentUser?.password && (
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Contraseña Actual *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  required
                  placeholder="Tu contraseña actual"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#363435] focus:ring-2 focus:ring-[#363435]/10 bg-neutral-50/50 hover:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-1"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Nueva Contraseña */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Nueva Contraseña (mínimo 6 caracteres) *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showNewPass ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="Escribe la nueva contraseña"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#363435] focus:ring-2 focus:ring-[#363435]/10 bg-neutral-50/50 hover:bg-white transition"
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-1"
              >
                {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirmar Nueva Contraseña */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Confirmar Nueva Contraseña *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showConfirmPass ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="Repite la nueva contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#363435] focus:ring-2 focus:ring-[#363435]/10 bg-neutral-50/50 hover:bg-white transition"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPass(!showConfirmPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-1"
              >
                {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSavingPass}
              className="px-5 py-2.5 bg-neutral-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>{isSavingPass ? 'Actualizando...' : 'Actualizar Contraseña'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
