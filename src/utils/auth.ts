import { SystemUser, Student } from '../types';
import { getSupabaseClient } from './supabaseClient';

const STORAGE_KEYS = {
  USERS: 'geckos_system_users',
  CURRENT_USER: 'geckos_current_session_user',
};

// Credenciales oficiales de Administrador solicitadas por el usuario
export const DEFAULT_ADMIN_USERS: SystemUser[] = [
  {
    id: 'admin-harold',
    name: 'Harold Anguiano Morales',
    username: 'haroldo90',
    password: 'Chevropar#1970',
    email: 'haroldo90@geckosvoleibol.com',
    phone: '',
    role: 'head_coach',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'admin-luis',
    name: 'Luis Gerardo Ángeles Falcón',
    username: 'clubgeckosvoleibol',
    password: 'GeckosAdmin#2026!',
    email: 'clubgeckosvoleibol@gmail.com',
    phone: '',
    role: 'head_coach',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
];

/**
 * Obtener todos los usuarios del sistema almacenados localmente
 */
export const getStoredUsers = (): SystemUser[] => {
  const saved = localStorage.getItem(STORAGE_KEYS.USERS);
  if (saved) {
    try {
      const parsed: SystemUser[] = JSON.parse(saved);
      // Garantizar que los administradores oficiales siempre estén presentes y actualizados
      const userMap = new Map<string, SystemUser>();
      parsed.forEach((u) => userMap.set(u.username.toLowerCase(), u));

      // Sobrescribir/asegurar administradores oficiales
      DEFAULT_ADMIN_USERS.forEach((admin) => {
        const existing = userMap.get(admin.username.toLowerCase());
        userMap.set(admin.username.toLowerCase(), {
          ...admin,
          ...(existing || {}),
          password: existing?.password || admin.password,
          name: existing?.name || admin.name,
          email: existing?.email || admin.email,
          phone: existing?.phone || admin.phone,
          avatarUrl: existing?.avatarUrl,
          role: 'head_coach',
          isActive: true,
        });
      });

      const merged = Array.from(userMap.values());
      return merged;
    } catch {
      // fallback
    }
  }
  return DEFAULT_ADMIN_USERS;
};

export const saveStoredUsers = (users: SystemUser[]): void => {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
};

/**
 * Obtener usuario con sesión activa en este navegador
 */
export const getCurrentSessionUser = (): SystemUser | null => {
  const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }
  return null;
};

export const setCurrentSessionUser = (user: SystemUser | null): void => {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }
};

// Helper para normalizar cadenas de texto (sin acentos ni mayúsculas)
const normalizeAuthText = (text?: string): string =>
  (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

// Helper para extraer sólo dígitos de números de teléfono
const normalizePhoneDigits = (val?: string): string => (val || '').replace(/\D/g, '');

/**
 * Autenticación integral en el sistema Gecko´s:
 * Admite:
 * 1. Administradores Oficiales (Harold y Luis)
 * 2. Entrenadores Asistentes creados por el Administrador
 * 3. Alumnos y Padres/Tutores registrados:
 *    - Identificador: Número de WhatsApp / Teléfono, Nombre del Alumno, Nombre del Tutor, Correo o ID
 *    - Contraseña: La contraseña personalizada elegida en el formulario de registro,
 *      o alternativamente su número telefónico registrado, o geckos2026 / 123456 / número de dorsal.
 */
export const authenticateUser = (
  identifierRaw: string,
  passwordRaw: string,
  students: Student[] = []
): { success: boolean; user?: SystemUser; student?: Student; error?: string } => {
  const identifier = identifierRaw.trim().toLowerCase();
  const password = passwordRaw.trim();

  if (!identifier || !password) {
    return { success: false, error: 'Por favor ingresa tu usuario, WhatsApp o correo y tu contraseña.' };
  }

  const users = getStoredUsers();
  const normIdentifier = normalizeAuthText(identifierRaw);
  const cleanPhone = normalizePhoneDigits(identifierRaw);

  // 1. Buscar en usuarios registrados (Admins, Entrenadores y Cuentas de Sistema)
  const systemUser = users.find((u) => {
    const usernameMatch = u.username.toLowerCase() === identifier;
    const emailMatch = Boolean(u.email && u.email.toLowerCase() === identifier);
    const uPhoneDigits = normalizePhoneDigits(u.phone || u.username);
    const phoneMatch = Boolean(
      cleanPhone.length >= 7 &&
      uPhoneDigits.length >= 7 &&
      (uPhoneDigits.slice(-10) === cleanPhone.slice(-10) ||
       uPhoneDigits.includes(cleanPhone) ||
       cleanPhone.includes(uPhoneDigits))
    );
    const nameMatch = normalizeAuthText(u.name) === normIdentifier;
    return usernameMatch || emailMatch || phoneMatch || nameMatch;
  });

  if (systemUser) {
    if (!systemUser.isActive) {
      return { success: false, error: 'Esta cuenta ha sido desactivada por el administrador.' };
    }
    if (systemUser.password && systemUser.password !== password) {
      return { success: false, error: 'Contraseña incorrecta. Verifica tus datos de acceso.' };
    }

    // Si es un usuario de tipo alumno o tutor, buscar su registro de estudiante correspondiente
    let matchedSt = students.find((s) => s.id === systemUser.assignedStudentId);
    if (!matchedSt && (systemUser.role === 'player' || systemUser.role === 'parent')) {
      matchedSt = students.find((s) => {
        const uPhoneDigits = normalizePhoneDigits(systemUser.phone || systemUser.username);
        const sPhone = normalizePhoneDigits(s.whatsapp || s.tutorPhone || '');
        return (
          (uPhoneDigits.length >= 7 && sPhone.slice(-10) === uPhoneDigits.slice(-10)) ||
          normalizeAuthText(s.fullName) === normalizeAuthText(systemUser.name) ||
          (s.tutorName && normalizeAuthText(s.tutorName) === normalizeAuthText(systemUser.name))
        );
      });
    }

    return { success: true, user: systemUser, student: matchedSt };
  }

  // 2. Buscar en la lista de alumnos registrados (Tanto mayores de edad como alumnos con tutor)
  const matchedStudent = students.find((s) => {
    // Coincidencia telefónica (WhatsApp del alumno o teléfono del tutor)
    const sWhatsappDigits = normalizePhoneDigits(s.whatsapp);
    const sTutorDigits = normalizePhoneDigits(s.tutorPhone);
    const phoneMatch = Boolean(
      cleanPhone.length >= 7 && (
        (sWhatsappDigits.length >= 7 && (
          sWhatsappDigits.slice(-10) === cleanPhone.slice(-10) ||
          sWhatsappDigits.includes(cleanPhone) ||
          cleanPhone.includes(sWhatsappDigits)
        )) ||
        (sTutorDigits.length >= 7 && (
          sTutorDigits.slice(-10) === cleanPhone.slice(-10) ||
          sTutorDigits.includes(cleanPhone) ||
          cleanPhone.includes(sTutorDigits)
        ))
      )
    );

    // Coincidencia por correo (alumno o tutor)
    const emailMatch = Boolean(
      (s.tutorEmail && s.tutorEmail.trim().toLowerCase() === identifier) ||
      (s.email && s.email.trim().toLowerCase() === identifier)
    );

    // Coincidencia por nombre de usuario registrado
    const usernameMatch = Boolean(
      s.username && s.username.trim().toLowerCase() === identifier
    );

    // Coincidencia por nombre completo del alumno (con tolerancia a acentos)
    const sNameNorm = normalizeAuthText(s.fullName);
    const nameMatch =
      Boolean(sNameNorm) &&
      (sNameNorm === normIdentifier ||
        (normIdentifier.length >= 4 && (sNameNorm.includes(normIdentifier) || normIdentifier.includes(sNameNorm))));

    // Coincidencia por nombre del tutor (para padres de familia)
    const tutorNameNorm = s.tutorName ? normalizeAuthText(s.tutorName) : '';
    const tutorNameMatch =
      Boolean(tutorNameNorm) &&
      (tutorNameNorm === normIdentifier ||
        (normIdentifier.length >= 4 && (tutorNameNorm.includes(normIdentifier) || normIdentifier.includes(tutorNameNorm))));

    // Coincidencia por ID único de estudiante
    const idMatch = s.id.toLowerCase() === identifier;

    return phoneMatch || emailMatch || usernameMatch || nameMatch || tutorNameMatch || idMatch;
  });

  if (matchedStudent) {
    if (matchedStudent.isActive === false) {
      return { success: false, error: 'El registro del alumno se encuentra inactivo. Contacta a administración.' };
    }

    // Validación de contraseñas permitidas para el alumno / tutor:
    // a) Contraseña elegida por el usuario en el registro (CRÍTICO: ahora plenamente respetada)
    const hasCustomPass = Boolean(matchedStudent.password && matchedStudent.password.trim() === password);

    // b) Contraseña con dígitos del teléfono registrado
    const passDigits = normalizePhoneDigits(password);
    const sWhatsappDigits = normalizePhoneDigits(matchedStudent.whatsapp);
    const sTutorDigits = normalizePhoneDigits(matchedStudent.tutorPhone);
    const hasPhonePass = Boolean(
      passDigits.length >= 7 && (
        (sWhatsappDigits.length >= 7 && (sWhatsappDigits.slice(-10) === passDigits.slice(-10) || sWhatsappDigits === passDigits)) ||
        (sTutorDigits.length >= 7 && (sTutorDigits.slice(-10) === passDigits.slice(-10) || sTutorDigits === passDigits))
      )
    );

    // c) Contraseñas comodín del club
    const hasDefaultPass = password === 'geckos2026' || password === '123456';

    // d) Número de dorsal
    const hasJerseyPass = Boolean(matchedStudent.jerseyNumber && String(matchedStudent.jerseyNumber) === password);

    // e) Coincidencia directa de texto con el WhatsApp
    const hasExactPhoneStr = Boolean(
      (matchedStudent.whatsapp && password === matchedStudent.whatsapp.trim()) ||
      (matchedStudent.tutorPhone && password === matchedStudent.tutorPhone.trim())
    );

    const isStudentPassValid = hasCustomPass || hasPhonePass || hasDefaultPass || hasJerseyPass || hasExactPhoneStr;

    if (isStudentPassValid) {
      const isMinor = matchedStudent.registrationType === 'minor';
      const cleanPhoneMatchWithTutor = Boolean(
        cleanPhone.length >= 7 && sTutorDigits.length >= 7 && sTutorDigits.slice(-10) === cleanPhone.slice(-10)
      );
      const isTutorMatched = Boolean(
        matchedStudent.tutorName &&
        (normalizeAuthText(matchedStudent.tutorName) === normIdentifier || cleanPhoneMatchWithTutor)
      );
      const isParentRole = isMinor || isTutorMatched;

      const studentUser: SystemUser = {
        id: `user-${matchedStudent.id}`,
        name: isParentRole ? (matchedStudent.tutorName || matchedStudent.fullName) : matchedStudent.fullName,
        username:
          matchedStudent.username ||
          matchedStudent.whatsapp ||
          matchedStudent.tutorPhone ||
          matchedStudent.id,
        email: matchedStudent.email || matchedStudent.tutorEmail || '',
        phone: matchedStudent.whatsapp || matchedStudent.tutorPhone || '',
        password: matchedStudent.password || '',
        role: isParentRole ? 'parent' : 'player',
        assignedStudentId: matchedStudent.id,
        campus: matchedStudent.campus,
        isActive: true,
        avatarUrl: matchedStudent.photoUrl || '',
      };

      // Asegurar que quede registrado en los usuarios locales
      const currentUsers = getStoredUsers();
      if (!currentUsers.some((u) => u.username.toLowerCase() === studentUser.username.toLowerCase())) {
        saveStoredUsers([...currentUsers, studentUser]);
      }

      return { success: true, user: studentUser, student: matchedStudent };
    } else {
      return {
        success: false,
        error: 'Contraseña incorrecta. Ingresa la contraseña creada al registrarte o tu número de WhatsApp de contacto.',
      };
    }
  }

  return {
    success: false,
    error: 'Usuario, número o nombre no encontrado. Verifica las credenciales o regístrate en la pestaña de Registro.',
  };
};

/**
 * Registrar un nuevo entrenador (creado por el Admin)
 */
export const registerCoach = async (coachData: {
  name: string;
  username: string;
  password?: string;
  phone?: string;
  email?: string;
  campus?: string;
}): Promise<{ success: boolean; user?: SystemUser; error?: string }> => {
  const users = getStoredUsers();
  const cleanUsername = coachData.username.trim().toLowerCase();

  if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
    return { success: false, error: 'Ese nombre de usuario ya está en uso. Por favor elige otro.' };
  }

  const newCoach: SystemUser = {
    id: `coach-${Date.now()}`,
    name: coachData.name.trim(),
    username: cleanUsername,
    password: coachData.password?.trim() || 'GeckosCoach2026!',
    phone: coachData.phone?.trim() || '',
    email: coachData.email?.trim() || '',
    campus: coachData.campus || 'Tlalnepantla',
    role: 'coach_assistant',
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  const updatedUsers = [...users, newCoach];
  saveStoredUsers(updatedUsers);

  // Sincronizar con Supabase
  try {
    const client = getSupabaseClient();
    await client.from('system_users').upsert({
      id: newCoach.id,
      name: newCoach.name,
      username: newCoach.username,
      password: newCoach.password,
      phone: newCoach.phone,
      email: newCoach.email,
      role: newCoach.role,
      is_active: newCoach.isActive,
    });
  } catch (err) {
    console.warn('Error al guardar entrenador en Supabase:', err);
  }

  return { success: true, user: newCoach };
};

/**
 * Actualizar datos de un entrenador
 */
export const updateCoach = async (coach: SystemUser): Promise<{ success: boolean; error?: string }> => {
  const users = getStoredUsers();
  const updatedUsers = users.map((u) => (u.id === coach.id ? coach : u));
  saveStoredUsers(updatedUsers);

  try {
    const client = getSupabaseClient();
    await client.from('system_users').upsert({
      id: coach.id,
      name: coach.name,
      username: coach.username,
      password: coach.password,
      phone: coach.phone,
      email: coach.email,
      role: coach.role,
      is_active: coach.isActive,
    });
  } catch (err) {
    console.warn('Error al actualizar entrenador en Supabase:', err);
  }

  return { success: true };
};

/**
 * Eliminar entrenador
 */
export const deleteCoach = async (coachId: string): Promise<{ success: boolean; error?: string }> => {
  const users = getStoredUsers();
  const target = users.find((u) => u.id === coachId);
  if (target?.role === 'head_coach') {
    return { success: false, error: 'No es posible eliminar las cuentas principales de Administrador.' };
  }

  const updatedUsers = users.filter((u) => u.id !== coachId);
  saveStoredUsers(updatedUsers);

  try {
    const client = getSupabaseClient();
    await client.from('system_users').delete().eq('id', coachId);
  } catch (err) {
    console.warn('Error al eliminar entrenador en Supabase:', err);
  }

  return { success: true };
};

/**
 * Activar o desactivar entrenador
 */
export const toggleCoachActive = async (coachId: string, isActive: boolean): Promise<{ success: boolean }> => {
  const users = getStoredUsers();
  const updatedUsers = users.map((u) => (u.id === coachId ? { ...u, isActive } : u));
  saveStoredUsers(updatedUsers);

  try {
    const client = getSupabaseClient();
    await client.from('system_users').update({ is_active: isActive }).eq('id', coachId);
  } catch (err) {
    console.warn('Error al actualizar estado en Supabase:', err);
  }

  return { success: true };
};

/**
 * Sincronizar usuarios desde Supabase en segundo plano
 */
export const syncUsersFromSupabase = async (): Promise<SystemUser[]> => {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client.from('system_users').select('*');
    if (!error && data && data.length > 0) {
      const mapped: SystemUser[] = data.map((d: any) => ({
        id: d.id,
        name: d.name,
        username: d.username,
        password: d.password,
        email: d.email || '',
        phone: d.phone || '',
        role: d.role as any,
        campus: d.campus || 'Tlalnepantla',
        assignedStudentId: d.assigned_student_id,
        isActive: d.is_active !== false,
        avatarUrl: d.avatar_url || d.avatarUrl || '',
        createdAt: d.created_at,
      }));

      // Fusionar asegurando que los usuarios locales existentes nunca se pierdan
      const userMap = new Map<string, SystemUser>();
      const localUsers = getStoredUsers();
      localUsers.forEach((u) => userMap.set(u.username.toLowerCase(), u));

      mapped.forEach((u) => {
        const existing = userMap.get(u.username.toLowerCase());
        userMap.set(u.username.toLowerCase(), {
          ...(existing || {}),
          ...u,
          password: u.password || existing?.password || '',
        });
      });
      DEFAULT_ADMIN_USERS.forEach((a) => {
        const exist = userMap.get(a.username.toLowerCase());
        userMap.set(a.username.toLowerCase(), {
          ...a,
          ...(exist || {}),
          password: exist?.password || a.password,
          name: exist?.name || a.name,
          email: exist?.email || a.email,
          phone: exist?.phone || a.phone,
          avatarUrl: exist?.avatarUrl || a.avatarUrl,
          role: 'head_coach',
          isActive: true,
        });
      });

      const merged = Array.from(userMap.values());
      saveStoredUsers(merged);
      return merged;
    }
  } catch (err) {
    console.info('Aviso Supabase usuarios sync:', err);
  }
  return getStoredUsers();
};

/**
 * Actualizar perfil de usuario (nombre, correo, teléfono, foto, contraseña)
 */
export const updateUserProfile = async (
  userId: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    avatarUrl?: string;
    password?: string;
  }
): Promise<{ success: boolean; user?: SystemUser; error?: string }> => {
  const users = getStoredUsers();
  const index = users.findIndex((u) => u.id === userId);

  let targetUser: SystemUser | null = index !== -1 ? users[index] : null;

  if (!targetUser) {
    const current = getCurrentSessionUser();
    if (current && (current.id === userId || current.username === userId)) {
      targetUser = current;
    }
  }

  if (!targetUser) {
    return { success: false, error: 'Usuario no encontrado en el sistema.' };
  }

  const updatedUser: SystemUser = {
    ...targetUser,
    name: data.name !== undefined && data.name.trim() !== '' ? data.name.trim() : targetUser.name,
    email: data.email !== undefined ? data.email.trim() : targetUser.email,
    phone: data.phone !== undefined ? data.phone.trim() : targetUser.phone,
    avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : targetUser.avatarUrl,
    password: data.password !== undefined && data.password.trim() !== '' ? data.password.trim() : targetUser.password,
  };

  const updatedUsers = index !== -1
    ? users.map((u, i) => (i === index ? updatedUser : u))
    : [...users, updatedUser];

  saveStoredUsers(updatedUsers);

  // Si es la sesión activa, sincronizar sesión
  const current = getCurrentSessionUser();
  if (current && (current.id === updatedUser.id || current.username === updatedUser.username)) {
    setCurrentSessionUser(updatedUser);
  }

  // Sincronizar en segundo plano con Supabase si está disponible
  try {
    const client = getSupabaseClient();
    await client.from('system_users').upsert({
      id: updatedUser.id,
      name: updatedUser.name,
      username: updatedUser.username,
      password: updatedUser.password,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role,
      avatar_url: updatedUser.avatarUrl,
      is_active: updatedUser.isActive !== false,
    });
  } catch (err) {
    console.warn('Aviso al actualizar perfil en Supabase:', err);
  }

  return { success: true, user: updatedUser };
};
