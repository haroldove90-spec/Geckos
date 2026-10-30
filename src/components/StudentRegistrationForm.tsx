import React, { useState } from 'react';
import { Student, StudentCategory } from '../types';
import {
  UserCheck,
  Users,
  Plus,
  Trash2,
  CheckCircle2,
  MapPin,
  HeartPulse,
  Phone,
  Calendar,
  Sparkles,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Copy,
  Check,
  ShieldCheck,
  AtSign,
  RefreshCw,
} from 'lucide-react';

interface Props {
  sedes: string[];
  onAddSede: (newSede: string) => void;
  onRegisterStudents: (newStudents: Omit<Student, 'id' | 'joinedDate'>[]) => Promise<any> | void;
}

interface MinorChildForm {
  fullName: string;
  birthDate: string;
  category: StudentCategory;
  branch: 'Femenil' | 'Varonil';
  allergies: string;
  chronicCondition: string;
}

// Verificación de contraseñas seguras según las especificaciones
export const evaluatePasswordStrength = (password: string, confirmPassword: string) => {
  const startsWithUpper = /^[A-ZÁÉÍÓÚÑ]/.test(password);
  const minLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-#+=\[\]\\/`~;]/.test(password);
  const passwordsMatch = Boolean(password && confirmPassword && password === confirmPassword);
  const allValid = startsWithUpper && minLength && hasNumber && hasSpecial && passwordsMatch;

  return {
    startsWithUpper,
    minLength,
    hasNumber,
    hasSpecial,
    passwordsMatch,
    allValid,
  };
};

export const generateSecurePassword = (): string => {
  const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowers = 'abcdefghijkmnpqrstuvwxyz';
  const numbers = '23456789';
  const specials = '!@#$%&*-_+=?';

  // 1. Debe iniciar obligatoriamente con una letra Mayúscula (A-Z)
  const firstUpper = uppers[Math.floor(Math.random() * uppers.length)];

  // 2. Garantizar al menos un número, caracter especial y minúscula
  const charLower = lowers[Math.floor(Math.random() * lowers.length)];
  const charNumber = numbers[Math.floor(Math.random() * numbers.length)];
  const charSpecial = specials[Math.floor(Math.random() * specials.length)];

  // 3. Relleno aleatorio para completar 10-11 caracteres seguros
  const allPool = lowers + numbers + specials + uppers;
  let extra = '';
  for (let i = 0; i < 7; i++) {
    extra += allPool[Math.floor(Math.random() * allPool.length)];
  }

  // Mezclar los caracteres internos garantizando que la primera letra sea mayúscula
  const shuffledBody = (charLower + charNumber + charSpecial + extra)
    .split('')
    .sort(() => 0.5 - Math.random())
    .join('');

  return firstUpper + shuffledBody;
};

// Componente visual interactivo para la lista de verificación de contraseña
const PasswordRulesChecklist: React.FC<{
  password: string;
  confirmPassword: string;
}> = ({ password, confirmPassword }) => {
  const rules = evaluatePasswordStrength(password, confirmPassword);

  const items = [
    { label: 'Iniciar con letra Mayúscula (A-Z)', met: rules.startsWithUpper },
    { label: 'Mínimo 8 caracteres de longitud', met: rules.minLength },
    { label: 'Contener al menos un número (0-9)', met: rules.hasNumber },
    { label: 'Contener un caracter especial (!@#$%&*-_...)', met: rules.hasSpecial },
    { label: 'Las contraseñas coinciden exactamente', met: rules.passwordsMatch },
  ];

  return (
    <div className="p-3 bg-neutral-50/90 rounded-xl border border-neutral-200/90 space-y-2 text-[11px]">
      <div className="font-semibold text-neutral-800 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
          <span>Reglas obligatorias de Contraseña Segura:</span>
        </span>
        {rules.allValid ? (
          <span className="text-emerald-700 font-bold flex items-center gap-1 bg-emerald-100/70 px-2 py-0.5 rounded-md text-[10px]">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            ¡Válida y Segura!
          </span>
        ) : (
          <span className="text-amber-700 font-medium text-[10px] bg-amber-100/70 px-2 py-0.5 rounded-md">
            Cumple todos los puntos
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
        {items.map((item, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-1.5 transition-colors ${
              item.met ? 'text-emerald-700 font-bold' : 'text-neutral-500 font-medium'
            }`}
          >
            {item.met ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : (
              <div className="w-3.5 h-3.5 rounded-full border border-neutral-300 flex items-center justify-center shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-neutral-300" />
              </div>
            )}
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const StudentRegistrationForm: React.FC<Props> = ({
  sedes,
  onAddSede,
  onRegisterStudents,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [mode, setMode] = useState<'adult' | 'minor'>('adult');
  const [showNewSedeInput, setShowNewSedeInput] = useState(false);
  const [newSedeName, setNewSedeName] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formulario Mayor de Edad
  const [adultForm, setAdultForm] = useState({
    fullName: '',
    username: '',
    email: '',
    birthDate: '',
    whatsapp: '',
    campus: sedes[0] || 'Tlalnepantla',
    allergies: '',
    chronicCondition: '',
    emergencyPhone: '',
    category: 'Sub 23' as StudentCategory,
    branch: 'Femenil' as 'Femenil' | 'Varonil',
    password: '',
    confirmPassword: '',
  });
  const [showAdultPass, setShowAdultPass] = useState(false);
  const [copiedAdultPass, setCopiedAdultPass] = useState(false);

  // Formulario Tutor (Menores de edad)
  const [tutorForm, setTutorForm] = useState({
    tutorName: '',
    username: '',
    email: '',
    whatsapp: '',
    campus: sedes[0] || 'Tlalnepantla',
    emergencyPhone: '',
    password: '',
    confirmPassword: '',
  });
  const [showTutorPass, setShowTutorPass] = useState(false);
  const [copiedTutorPass, setCopiedTutorPass] = useState(false);

  const [children, setChildren] = useState<MinorChildForm[]>([
    {
      fullName: '',
      birthDate: '',
      category: 'Juvenil',
      branch: 'Femenil',
      allergies: '',
      chronicCondition: '',
    },
  ]);

  const handleCreateSede = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newSedeName.trim();
    if (!clean) return;
    onAddSede(clean);
    if (mode === 'adult') {
      setAdultForm((prev) => ({ ...prev, campus: clean }));
    } else {
      setTutorForm((prev) => ({ ...prev, campus: clean }));
    }
    setNewSedeName('');
    setShowNewSedeInput(false);
  };

  const handleAddChild = () => {
    setChildren((prev) => [
      ...prev,
      {
        fullName: '',
        birthDate: '',
        category: 'Infantil',
        branch: 'Femenil',
        allergies: '',
        chronicCondition: '',
      },
    ]);
  };

  const handleRemoveChild = (index: number) => {
    if (children.length <= 1) return;
    setChildren((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChildChange = (index: number, field: keyof MinorChildForm, value: string) => {
    setChildren((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Generar contraseña para Mayor de Edad
  const handleGenerateAdultPassword = () => {
    const generated = generateSecurePassword();
    setAdultForm((prev) => ({ ...prev, password: generated, confirmPassword: generated }));
    setShowAdultPass(true);
    setCopiedAdultPass(true);
    try {
      navigator.clipboard.writeText(generated);
    } catch {
      // Ignorar si clipboard API no está permitido en iframe
    }
    setTimeout(() => setCopiedAdultPass(false), 4000);
  };

  // Generar contraseña para Tutor
  const handleGenerateTutorPassword = () => {
    const generated = generateSecurePassword();
    setTutorForm((prev) => ({ ...prev, password: generated, confirmPassword: generated }));
    setShowTutorPass(true);
    setCopiedTutorPass(true);
    try {
      navigator.clipboard.writeText(generated);
    } catch {
      // Ignorar si clipboard API no está permitido en iframe
    }
    setTimeout(() => setCopiedTutorPass(false), 4000);
  };

  const handleSubmitAdult = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!adultForm.fullName.trim() || !adultForm.whatsapp.trim()) {
      setErrorMessage('Por favor ingresa tu nombre completo y número de WhatsApp.');
      return;
    }

    const rules = evaluatePasswordStrength(adultForm.password, adultForm.confirmPassword);
    if (!rules.startsWithUpper) {
      setErrorMessage('La contraseña debe iniciar obligatoriamente con una letra Mayúscula (A-Z).');
      return;
    }
    if (!rules.minLength) {
      setErrorMessage('La contraseña debe contener al menos 8 caracteres de longitud.');
      return;
    }
    if (!rules.hasNumber) {
      setErrorMessage('La contraseña debe contener al menos un número (0-9).');
      return;
    }
    if (!rules.hasSpecial) {
      setErrorMessage('La contraseña debe contener al menos un caracter especial (!@#$%&*-_...).');
      return;
    }
    if (!rules.passwordsMatch) {
      setErrorMessage('Las contraseñas no coinciden. Por favor confirma tu contraseña correctamente.');
      return;
    }

    const cleanPhone = adultForm.whatsapp.trim();
    const finalPassword = adultForm.password.trim();
    const finalUsername = adultForm.username.trim().toLowerCase() || cleanPhone;
    const finalEmail = adultForm.email.trim();

    const newStudent: Omit<Student, 'id' | 'joinedDate'> = {
      fullName: adultForm.fullName.trim(),
      username: finalUsername,
      email: finalEmail,
      birthDate: adultForm.birthDate,
      category: adultForm.category,
      branch: adultForm.branch,
      jerseyNumber: Math.floor(1 + Math.random() * 99),
      campus: adultForm.campus,
      whatsapp: cleanPhone,
      allergies: adultForm.allergies.trim() || 'Ninguna reportada',
      chronicCondition: adultForm.chronicCondition.trim() || 'Ninguna reportada',
      emergencyPhone: adultForm.emergencyPhone.trim() || cleanPhone,
      monthlyFee: 800,
      dueDay: 5,
      tutorName: 'Autónomo (Mayor de edad)',
      tutorPhone: cleanPhone,
      tutorEmail: finalEmail,
      currentBalance: 0,
      status: 'al_corriente',
      registrationType: 'adult',
      password: finalPassword,
    };

    setIsSubmitting(true);
    try {
      const res = await onRegisterStudents([newStudent]);
      if (res && res.error) {
        setErrorMessage(`Aviso: Alumno registrado localmente, pero Supabase reportó: ${res.error}`);
      } else {
        setSuccessMessage(`¡Registro exitoso! Alumno ${adultForm.fullName} guardado en Base de Datos Supabase. Redirigiendo a tu Dashboard...`);
      }
      setAdultForm({
        fullName: '',
        username: '',
        email: '',
        birthDate: '',
        whatsapp: '',
        campus: sedes[0] || 'Tlalnepantla',
        allergies: '',
        chronicCondition: '',
        emergencyPhone: '',
        category: 'Sub 23',
        branch: 'Femenil',
        password: '',
        confirmPassword: '',
      });
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(`Error al procesar registro: ${err.message || 'Intenta nuevamente.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitTutor = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!tutorForm.tutorName.trim() || !tutorForm.whatsapp.trim()) {
      setErrorMessage('Por favor ingresa tu nombre de tutor y número de WhatsApp.');
      return;
    }

    const rules = evaluatePasswordStrength(tutorForm.password, tutorForm.confirmPassword);
    if (!rules.startsWithUpper) {
      setErrorMessage('La contraseña debe iniciar obligatoriamente con una letra Mayúscula (A-Z).');
      return;
    }
    if (!rules.minLength) {
      setErrorMessage('La contraseña debe contener al menos 8 caracteres de longitud.');
      return;
    }
    if (!rules.hasNumber) {
      setErrorMessage('La contraseña debe contener al menos un número (0-9).');
      return;
    }
    if (!rules.hasSpecial) {
      setErrorMessage('La contraseña debe contener al menos un caracter especial (!@#$%&*-_...).');
      return;
    }
    if (!rules.passwordsMatch) {
      setErrorMessage('Las contraseñas no coinciden. Por favor confirma tu contraseña correctamente.');
      return;
    }

    const validChildren = children.filter((c) => c.fullName.trim().length > 0);
    if (validChildren.length === 0) {
      setErrorMessage('Por favor ingresa los datos de al menos un alumno / hijo.');
      return;
    }

    const cleanPhone = tutorForm.whatsapp.trim();
    const finalPassword = tutorForm.password.trim();
    const finalUsername = tutorForm.username.trim().toLowerCase() || cleanPhone;
    const finalEmail = tutorForm.email.trim();

    const studentsToRegister: Omit<Student, 'id' | 'joinedDate'>[] = validChildren.map((ch, idx) => ({
      fullName: ch.fullName.trim(),
      username: idx === 0 ? finalUsername : `${finalUsername}_${idx + 1}`,
      email: finalEmail,
      birthDate: ch.birthDate,
      category: ch.category,
      branch: ch.branch,
      jerseyNumber: Math.floor(1 + Math.random() * 99),
      campus: tutorForm.campus,
      whatsapp: cleanPhone,
      allergies: ch.allergies.trim() || 'Ninguna reportada',
      chronicCondition: ch.chronicCondition.trim() || 'Ninguna reportada',
      emergencyPhone: tutorForm.emergencyPhone.trim() || cleanPhone,
      monthlyFee: 750,
      dueDay: 5,
      tutorName: tutorForm.tutorName.trim(),
      tutorPhone: cleanPhone,
      tutorEmail: finalEmail,
      currentBalance: 0,
      status: 'al_corriente',
      registrationType: 'minor',
      password: finalPassword,
    }));

    setIsSubmitting(true);
    try {
      const res = await onRegisterStudents(studentsToRegister);
      if (res && res.error) {
        setErrorMessage(`Aviso: Inscripción local lista, pero Supabase reportó: ${res.error}`);
      } else {
        setSuccessMessage(
          `¡Registro familiar exitoso! ${studentsToRegister.length} alumno(s) inscritos y guardados en Supabase bajo la tutela de ${tutorForm.tutorName}. Redirigiendo a tu Dashboard...`
        );
      }
      setTutorForm({
        tutorName: '',
        username: '',
        email: '',
        whatsapp: '',
        campus: sedes[0] || 'Tlalnepantla',
        emergencyPhone: '',
        password: '',
        confirmPassword: '',
      });
      setChildren([
        {
          fullName: '',
          birthDate: '',
          category: 'Juvenil',
          branch: 'Femenil',
          allergies: '',
          chronicCondition: '',
        },
      ]);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(`Error al registrar tutor: ${err.message || 'Intenta nuevamente.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto mb-8 transition-all duration-300">
      {/* Banner / Header del formulario visible */}
      <div className="bg-white rounded-2xl border-2 border-[#363435]/15 shadow-sm overflow-hidden">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="p-4 sm:p-5 flex items-center justify-between cursor-pointer bg-gradient-to-r from-neutral-50 to-white hover:bg-neutral-100/70 transition select-none"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#363435] text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-extrabold tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                  Inscripciones Abiertas
                </span>
                <span className="text-[11px] text-neutral-400 hidden sm:inline">Ciclo 2026</span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-neutral-900 tracking-tight mt-0.5 truncate">
                Formulario de Acceso y Registro de Alumnos
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-[#363435] hidden sm:inline">
              {isOpen ? 'Ocultar formulario' : 'Abrir formulario'}
            </span>
            <div className="p-1.5 rounded-lg bg-neutral-100 text-neutral-700">
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </div>

        {/* Notificación de éxito */}
        {successMessage && (
          <div className="mx-4 sm:mx-6 my-3 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}

        {/* Notificación de error */}
        {errorMessage && (
          <div className="mx-4 sm:mx-6 my-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {/* Contenido desplegado del formulario */}
        {isOpen && (
          <div className="p-4 sm:p-6 border-t border-neutral-100 space-y-6">
            {/* Selector de Tipo de Registro: Mayor de Edad vs Padre/Tutor (Menor) */}
            <div className="flex flex-col sm:flex-row gap-2.5 p-1.5 bg-neutral-100 rounded-xl">
              <button
                type="button"
                onClick={() => setMode('adult')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                  mode === 'adult'
                    ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/80'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <UserCheck className="w-4 h-4 text-[#363435]" />
                <span>Alumno Mayor de Edad (18+ años)</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('minor')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                  mode === 'minor'
                    ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/80'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <Users className="w-4 h-4 text-[#363435]" />
                <span>Padre / Tutor (Menor de Edad - 1 a 3+ hijos)</span>
              </button>
            </div>

            {/* FORMULARIO MAYOR DE EDAD */}
            {mode === 'adult' && (
              <form onSubmit={handleSubmitAdult} className="space-y-4 text-xs">
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-neutral-600 text-[11px] flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#363435] shrink-0" />
                  <span>
                    Registro individual para atletas mayores de edad. Los datos quedarán registrados de forma autónoma.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Nombre completo */}
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-neutral-800 mb-1">
                      Nombre Completo del Alumno *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Valeria Sánchez Mendoza"
                      value={adultForm.fullName}
                      onChange={(e) => setAdultForm({ ...adultForm, fullName: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900 text-xs"
                    />
                  </div>

                  {/* Nombre de Usuario */}
                  <div>
                    <label className="block font-semibold text-neutral-800 mb-1">
                      Nombre de Usuario (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. valeria.sanchez o vale26"
                      value={adultForm.username}
                      onChange={(e) => setAdultForm({ ...adultForm, username: e.target.value.toLowerCase().trim() })}
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900 text-xs"
                    />
                    <span className="text-[10px] text-neutral-400 mt-0.5 block">
                      Para iniciar sesión. Si lo omites, podrás entrar con tu WhatsApp.
                    </span>
                  </div>

                  {/* Correo Electrónico */}
                  <div>
                    <label className="block font-semibold text-neutral-800 mb-1">
                      Correo Electrónico (Opcional)
                    </label>
                    <input
                      type="email"
                      placeholder="valeria@gmail.com"
                      value={adultForm.email}
                      onChange={(e) => setAdultForm({ ...adultForm, email: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900 text-xs"
                    />
                    <span className="text-[10px] text-neutral-400 mt-0.5 block">
                      También servirá como identificador de inicio de sesión.
                    </span>
                  </div>

                  {/* WhatsApp */}
                  <div>
                    <label className="block font-semibold text-neutral-800 mb-1">
                      WhatsApp (Número de contacto) *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+52 55..."
                      value={adultForm.whatsapp}
                      onChange={(e) => setAdultForm({ ...adultForm, whatsapp: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900 text-xs"
                    />
                  </div>

                  {/* Teléfono de emergencia */}
                  <div>
                    <label className="block font-semibold text-neutral-800 mb-1">
                      Teléfono de Contacto (Emergencias) *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Teléfono familiar o de auxilio"
                      value={adultForm.emergencyPhone}
                      onChange={(e) => setAdultForm({ ...adultForm, emergencyPhone: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900 text-xs"
                    />
                  </div>

                  {/* Sede / Campus */}
                  <div>
                    <label className="block font-semibold text-neutral-800 mb-1">
                      Sede de Entrenamiento *
                    </label>
                    <select
                      value={adultForm.campus}
                      onChange={(e) => setAdultForm({ ...adultForm, campus: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900 text-xs font-semibold"
                    >
                      {sedes.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Fecha de nacimiento */}
                  <div>
                    <label className="block font-semibold text-neutral-800 mb-1">
                      Fecha de Nacimiento *
                    </label>
                    <input
                      type="date"
                      required
                      value={adultForm.birthDate}
                      onChange={(e) => setAdultForm({ ...adultForm, birthDate: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900 font-mono text-xs"
                    />
                  </div>

                  {/* Categoría */}
                  <div>
                    <label className="block font-semibold text-neutral-800 mb-1">
                      Categoría *
                    </label>
                    <select
                      value={adultForm.category}
                      onChange={(e) =>
                        setAdultForm({ ...adultForm, category: e.target.value as StudentCategory })
                      }
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900 text-xs font-semibold"
                    >
                      <option value="Sub 23">Sub 23</option>
                      <option value="Juvenil">Juvenil</option>
                      <option value="Infantil">Infantil</option>
                      <option value="Mini">Mini</option>
                    </select>
                  </div>

                  {/* Rama */}
                  <div>
                    <label className="block font-semibold text-neutral-800 mb-1">
                      Rama *
                    </label>
                    <select
                      value={adultForm.branch}
                      onChange={(e) =>
                        setAdultForm({
                          ...adultForm,
                          branch: e.target.value as 'Femenil' | 'Varonil',
                        })
                      }
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900 text-xs font-semibold"
                    >
                      <option value="Femenil">Femenil</option>
                      <option value="Varonil">Varonil</option>
                    </select>
                  </div>

                  {/* Alergias */}
                  <div>
                    <label className="block font-semibold text-neutral-800 mb-1">
                      Alergias (Alimentos, medicamentos, etc.)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Penicilina, polen (o 'Ninguna')"
                      value={adultForm.allergies}
                      onChange={(e) => setAdultForm({ ...adultForm, allergies: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900 text-xs"
                    />
                  </div>

                  {/* Enfermedad o padecimiento crónico */}
                  <div>
                    <label className="block font-semibold text-neutral-800 mb-1">
                      Enfermedad o Padecimiento Crónico
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Asma, diabetes (o 'Ninguna')"
                      value={adultForm.chronicCondition}
                      onChange={(e) =>
                        setAdultForm({ ...adultForm, chronicCondition: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900 text-xs"
                    />
                  </div>

                  {/* Contraseña para ingresar al sistema con generador seguro y advertencias */}
                  <div className="sm:col-span-2 p-4 bg-neutral-100/80 rounded-2xl border border-neutral-200 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-neutral-900 font-bold text-xs">
                        <Lock className="w-4 h-4 text-amber-600" />
                        <span>Contraseña de Acceso al Sistema *</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleGenerateAdultPassword}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/35 border border-amber-500/40 text-amber-950 font-bold text-xs transition cursor-pointer shadow-2xs active:scale-95"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                        <span>⚡ Generar Contraseña Segura</span>
                      </button>
                    </div>

                    {copiedAdultPass && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-semibold">
                          ¡Contraseña generada y copiada al portapapeles! Guárdala en un lugar seguro.
                        </span>
                      </div>
                    )}

                    <div className="p-2.5 bg-amber-50/70 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Crea o genera tu contraseña segura:</strong> Debe iniciar con una letra Mayúscula (A-Z), tener al menos 8 caracteres, incluir números (0-9) y un caracter especial (!@#$%...).
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                          Crea tu Contraseña *
                        </label>
                        <div className="relative">
                          <input
                            type={showAdultPass ? 'text' : 'password'}
                            required
                            placeholder="Ej. Gecko2026#"
                            value={adultForm.password}
                            onChange={(e) => setAdultForm({ ...adultForm, password: e.target.value })}
                            className="w-full px-3 py-2 pr-9 bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setShowAdultPass(!showAdultPass)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                          >
                            {showAdultPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                          Confirmar Contraseña *
                        </label>
                        <input
                          type={showAdultPass ? 'text' : 'password'}
                          required
                          placeholder="Repite tu contraseña"
                          value={adultForm.confirmPassword}
                          onChange={(e) => setAdultForm({ ...adultForm, confirmPassword: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900 text-xs"
                        />
                      </div>
                    </div>

                    {/* Checklist en tiempo real */}
                    <PasswordRulesChecklist
                      password={adultForm.password}
                      confirmPassword={adultForm.confirmPassword}
                    />

                    <p className="text-[11px] text-neutral-500">
                      Con estos datos ingresarás al Dashboard para consultar tu ficha, pagos, asistencias y calendario deportivo.
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-[#000000] hover:bg-[#363435] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer shadow-xs disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
                        <span>Guardando en Base de Datos Supabase...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-amber-400" />
                        <span>Completar Inscripción e Ir a mi Dashboard</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* FORMULARIO PADRE / TUTOR (MENOR DE EDAD CON OPCIÓN DE AGREGAR MÁS HIJOS) */}
            {mode === 'minor' && (
              <form onSubmit={handleSubmitTutor} className="space-y-5 text-xs">
                {/* Datos del Tutor */}
                <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
                  <h4 className="font-extrabold text-neutral-900 text-xs uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#363435]" />
                    <span>1. Datos del Padre / Tutor Responsable</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-neutral-800 mb-1">
                        Nombre Completo del Padre o Tutor *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Ing. Carlos Alberto Morales"
                        value={tutorForm.tutorName}
                        onChange={(e) => setTutorForm({ ...tutorForm, tutorName: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900 text-xs"
                      />
                    </div>

                    {/* Nombre de usuario del tutor */}
                    <div>
                      <label className="block font-semibold text-neutral-800 mb-1">
                        Nombre de Usuario del Tutor (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. tutor.carlos o morales2026"
                        value={tutorForm.username}
                        onChange={(e) => setTutorForm({ ...tutorForm, username: e.target.value.toLowerCase().trim() })}
                        className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900 text-xs"
                      />
                      <span className="text-[10px] text-neutral-400 mt-0.5 block">
                        Para ingresar. Si lo omites, podrás entrar con tu WhatsApp.
                      </span>
                    </div>

                    {/* Correo Electrónico del tutor */}
                    <div>
                      <label className="block font-semibold text-neutral-800 mb-1">
                        Correo Electrónico del Tutor (Opcional)
                      </label>
                      <input
                        type="email"
                        placeholder="carlos.morales@correo.com"
                        value={tutorForm.email}
                        onChange={(e) => setTutorForm({ ...tutorForm, email: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900 text-xs"
                      />
                      <span className="text-[10px] text-neutral-400 mt-0.5 block">
                        También sirve como identificador para iniciar sesión.
                      </span>
                    </div>

                    <div>
                      <label className="block font-semibold text-neutral-800 mb-1">
                        WhatsApp del Tutor *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="+52 55..."
                        value={tutorForm.whatsapp}
                        onChange={(e) => setTutorForm({ ...tutorForm, whatsapp: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-neutral-800 mb-1">
                        Teléfono de Contacto (Emergencias)
                      </label>
                      <input
                        type="tel"
                        placeholder="Segundo teléfono o contacto adicional"
                        value={tutorForm.emergencyPhone}
                        onChange={(e) =>
                          setTutorForm({ ...tutorForm, emergencyPhone: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900 text-xs"
                      />
                    </div>

                    {/* Sede del Tutor / Familia */}
                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-neutral-800 mb-1">
                        Sede de Entrenamiento Familiar *
                      </label>
                      <select
                        value={tutorForm.campus}
                        onChange={(e) => setTutorForm({ ...tutorForm, campus: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900 text-xs font-semibold"
                      >
                        {sedes.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Contraseña para ingresar al sistema con generador y checklist */}
                    <div className="sm:col-span-2 p-4 bg-white rounded-2xl border border-neutral-200/90 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-neutral-900 font-bold text-xs">
                          <Lock className="w-4 h-4 text-amber-600" />
                          <span>Contraseña de Acceso para el Tutor *</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleGenerateTutorPassword}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/35 border border-amber-500/40 text-amber-950 font-bold text-xs transition cursor-pointer shadow-2xs active:scale-95"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                          <span>⚡ Generar Contraseña Segura</span>
                        </button>
                      </div>

                      {copiedTutorPass && (
                        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="font-semibold">
                            ¡Contraseña generada y copiada al portapapeles! Guárdala en un lugar seguro.
                          </span>
                        </div>
                      )}

                      <div className="p-2.5 bg-amber-50/70 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>Crea o genera tu contraseña segura:</strong> Debe iniciar con una letra Mayúscula (A-Z), tener al menos 8 caracteres, incluir números (0-9) y un caracter especial (!@#$%...).
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                            Crea tu Contraseña *
                          </label>
                          <div className="relative">
                            <input
                              type={showTutorPass ? 'text' : 'password'}
                              required
                              placeholder="Ej. Tutor2026*"
                              value={tutorForm.password}
                              onChange={(e) => setTutorForm({ ...tutorForm, password: e.target.value })}
                              className="w-full px-3 py-2 pr-9 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900 text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => setShowTutorPass(!showTutorPass)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                            >
                              {showTutorPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                            Confirmar Contraseña *
                          </label>
                          <input
                            type={showTutorPass ? 'text' : 'password'}
                            required
                            placeholder="Repite tu contraseña"
                            value={tutorForm.confirmPassword}
                            onChange={(e) => setTutorForm({ ...tutorForm, confirmPassword: e.target.value })}
                            className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900 text-xs"
                          />
                        </div>
                      </div>

                      {/* Checklist en tiempo real */}
                      <PasswordRulesChecklist
                        password={tutorForm.password}
                        confirmPassword={tutorForm.confirmPassword}
                      />

                      <p className="text-[11px] text-neutral-500">
                        Con esta contraseña podrás iniciar sesión como Padre / Tutor y consultar las cuentas y avances de tus hijos.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sección de Hijos / Alumnos */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-neutral-900 text-xs uppercase tracking-wider">
                      2. Registro de Alumnos / Hijos ({children.length})
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddChild}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-bold hover:bg-[#363435] transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-400" />
                      <span>Agregar otro hijo / alumno</span>
                    </button>
                  </div>

                  {children.map((child, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-neutral-200 bg-white shadow-2xs space-y-3 relative"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                        <span className="font-bold text-neutral-900 text-xs flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-[#363435] text-white flex items-center justify-center text-[10px]">
                            {idx + 1}
                          </span>
                          <span>Hijo / Alumno #{idx + 1}</span>
                        </span>

                        {children.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveChild(idx)}
                            className="text-rose-600 hover:text-rose-800 text-[11px] font-semibold flex items-center gap-1 p-1 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Eliminar</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block font-semibold text-neutral-800 mb-1">
                            Nombre Completo del Alumno *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Nombre y apellidos del menor"
                            value={child.fullName}
                            onChange={(e) => handleChildChange(idx, 'fullName', e.target.value)}
                            className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900 text-xs"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-neutral-800 mb-1">
                            Fecha de Nacimiento *
                          </label>
                          <input
                            type="date"
                            required
                            value={child.birthDate}
                            onChange={(e) => handleChildChange(idx, 'birthDate', e.target.value)}
                            className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900 font-mono text-xs"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-neutral-800 mb-1">
                            Categoría *
                          </label>
                          <select
                            value={child.category}
                            onChange={(e) =>
                              handleChildChange(idx, 'category', e.target.value as StudentCategory)
                            }
                            className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900 text-xs font-semibold"
                          >
                            <option value="Mini">Mini</option>
                            <option value="Infantil">Infantil</option>
                            <option value="Juvenil">Juvenil</option>
                            <option value="Sub 23">Sub 23</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-semibold text-neutral-800 mb-1">
                            Rama *
                          </label>
                          <select
                            value={child.branch}
                            onChange={(e) =>
                              handleChildChange(
                                idx,
                                'branch',
                                e.target.value as 'Femenil' | 'Varonil'
                              )
                            }
                            className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900 text-xs font-semibold"
                          >
                            <option value="Femenil">Femenil</option>
                            <option value="Varonil">Varonil</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-semibold text-neutral-800 mb-1">
                            Alergias
                          </label>
                          <input
                            type="text"
                            placeholder="Ej. Alergia a nueces o picadura (o 'Ninguna')"
                            value={child.allergies}
                            onChange={(e) => handleChildChange(idx, 'allergies', e.target.value)}
                            className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900 text-xs"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block font-semibold text-neutral-800 mb-1">
                            Enfermedad o Padecimiento Crónico
                          </label>
                          <input
                            type="text"
                            placeholder="Ej. Asma, problemas cardíacos (o 'Ninguna')"
                            value={child.chronicCondition}
                            onChange={(e) =>
                              handleChildChange(idx, 'chronicCondition', e.target.value)
                            }
                            className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-[#000000] hover:bg-[#363435] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer shadow-xs disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
                        <span>Guardando en Base de Datos Supabase...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-amber-400" />
                        <span>Inscribir Tutor con {children.length} Alumno(s)</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
