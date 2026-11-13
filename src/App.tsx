import React, { useState, useEffect, useMemo } from 'react';
import { UserRole, Student, PaymentRecord, BillingCycle, SystemNotification, SupabaseConfig, Comunicado } from './types';
import {
  getStoredStudents,
  saveStudents,
  getStoredPayments,
  savePayments,
  getStoredCycles,
  saveCycles,
  getStoredNotifications,
  saveNotifications,
  getStoredComunicados,
  saveStoredComunicados,
  getSupabaseConfig,
  saveSupabaseConfig,
  isSampleDataCleared,
  wipeAllSampleData,
  restoreSampleData,
  getStoredSedes,
  saveSedes,
  DEFAULT_SEDES,
  getDeletedStudentIds,
  markStudentAsDeleted,
} from './utils/storage';
import { supabaseService, getSupabaseClient } from './utils/supabaseClient';
import { buildOverdueNotifications, getStudentEffectiveBilling } from './utils/billingUtils';

import { HomeAuth } from './components/HomeAuth';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { BottomBar } from './components/BottomBar';
import { HeadCoachDashboard } from './components/HeadCoach/Dashboard';
import { CoachesManagement } from './components/HeadCoach/CoachesManagement';
import { AnnouncementsModule } from './components/HeadCoach/AnnouncementsModule';
import { RegisteredStudentsModule } from './components/HeadCoach/RegisteredStudentsModule';
import { PlayersManagement } from './components/HeadCoach/PlayersManagement';
import { PaymentsValidation } from './components/HeadCoach/PaymentsValidation';
import { BillingAndReminders } from './components/HeadCoach/BillingAndReminders';
import { AccountStatus } from './components/PlayerParent/AccountStatus';
import { RegisterPayment } from './components/PlayerParent/RegisterPayment';
import { PaymentHistory } from './components/PlayerParent/PaymentHistory';
import { NotificationsBox } from './components/PlayerParent/NotificationsBox';
import { OfficialSocials } from './components/OfficialSocials';
import { DigitalReceiptModal } from './components/DigitalReceiptModal';
import { DataManagementModal } from './components/DataManagementModal';
import { DocumentationPDFModal } from './components/DocumentationPDFModal';
import { UserProfileModule } from './components/UserProfileModule';
import { SystemUser } from './types';
import {
  getCurrentSessionUser,
  setCurrentSessionUser,
  getStoredUsers,
  saveStoredUsers,
  syncUsersFromSupabase,
  getAssignableCoaches,
} from './utils/auth';

// Función de seguridad para resolución y aislamiento estricto de alumno según rol
const resolveStudentForUser = (user: SystemUser | null, studentList: Student[]): Student | null => {
  if (!user) return null;
  // Solo administradores pueden previsualizar un alumno si no tienen uno propio
  if (user.role === 'head_coach') {
    return studentList[0] || null;
  }
  if (user.role === 'coach_assistant') {
    // Si es entrenador asistente, previsualizar su primer alumno asignado
    const myStudent = studentList.find(
      (s) =>
        s.assignedCoachId === user.id ||
        (s.assignedCoachName && s.assignedCoachName.toLowerCase() === user.name.toLowerCase())
    );
    return myStudent || null;
  }

  // Para alumno (player) o padre de familia (parent): AISLAMIENTO ESTRICTO
  if (user.assignedStudentId) {
    const byId = studentList.find((s) => s.id === user.assignedStudentId);
    if (byId) return byId;
  }

  const userCleanUsername = (user.username || '').toLowerCase().trim();
  const byUsername = studentList.find(
    (s) => s.username && s.username.toLowerCase().trim() === userCleanUsername
  );
  if (byUsername) return byUsername;

  const uPhoneDigits = (user.phone || '').replace(/\D/g, '');
  const uNameNorm = (user.name || '').toLowerCase().trim();

  if (user.role === 'player') {
    const byPlayer = studentList.find((s) => {
      const sWhatsappDigits = (s.whatsapp || '').replace(/\D/g, '');
      const sNameNorm = (s.fullName || '').toLowerCase().trim();
      return (
        (uPhoneDigits.length >= 10 && sWhatsappDigits.slice(-10) === uPhoneDigits.slice(-10)) ||
        (uNameNorm.length >= 4 && sNameNorm === uNameNorm)
      );
    });
    if (byPlayer) return byPlayer;
  } else if (user.role === 'parent') {
    const byParent = studentList.find((s) => {
      const sTutorDigits = (s.tutorPhone || '').replace(/\D/g, '');
      const sTutorNameNorm = (s.tutorName || '').toLowerCase().trim();
      return (
        (uPhoneDigits.length >= 10 && sTutorDigits.slice(-10) === uPhoneDigits.slice(-10)) ||
        (uNameNorm.length >= 4 && sTutorNameNorm === uNameNorm)
      );
    });
    if (byParent) return byParent;
  }

  // Jamás devolver datos de otro alumno para alumnos o padres
  return null;
};

export default function App() {
  // Authenticated user session
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(() => getCurrentSessionUser());

  // Active Role view
  const [activeRole, setActiveRole] = useState<UserRole | null>(() => {
    const session = getCurrentSessionUser();
    if (!session) return null;
    return session.role === 'player' ? 'player' : session.role;
  });

  // Stored coaches for admin management
  const [coaches, setCoaches] = useState<SystemUser[]>(() =>
    getStoredUsers().filter((u) => u.role === 'coach_assistant')
  );

  // Entrenadores asignables (incluye Harold y Luis como Directores/Head Coaches + Asistentes)
  const assignableCoaches = useMemo(() => {
    return getAssignableCoaches();
  }, [coaches]);

  const isAdmin =
    currentUser?.role === 'head_coach' ||
    currentUser?.username?.toLowerCase() === 'haroldo90' ||
    currentUser?.username?.toLowerCase() === 'clubgeckosvoleibol';

  const isCoach = activeRole === 'head_coach' || activeRole === 'coach_assistant';

  // Active module tab
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Sidebar collapse state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Core Data States
  const [students, setStudents] = useState<Student[]>([]);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [cycles, setCycles] = useState<BillingCycle[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [comunicados, setComunicados] = useState<Comunicado[]>(() => getStoredComunicados());
  const [supabaseConfig, setSupabaseState] = useState<SupabaseConfig>(getSupabaseConfig());
  const [isCleared, setIsCleared] = useState<boolean>(true);
  const [sedes, setSedes] = useState<string[]>(DEFAULT_SEDES);

  // Modals
  const [viewingReceipt, setViewingReceipt] = useState<PaymentRecord | null>(null);
  const [isDataModalOpen, setIsDataModalOpen] = useState<boolean>(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState<boolean>(false);

  // Initialize data on mount & attempt Supabase sync
  useEffect(() => {
    const loadedStudents = getStoredStudents();
    const loadedPayments = getStoredPayments();
    const loadedCycles = getStoredCycles();
    const loadedNotifs = getStoredNotifications();
    const loadedComunicados = getStoredComunicados();
    const loadedSupabase = getSupabaseConfig();
    const loadedSedes = getStoredSedes();
    const cleared = isSampleDataCleared();

    setStudents(loadedStudents);
    setPayments(loadedPayments);
    setCycles(loadedCycles);
    setNotifications(loadedNotifs);
    setComunicados(loadedComunicados);
    setSupabaseState(loadedSupabase);
    setSedes(loadedSedes);
    setIsCleared(cleared);

    const initialUser = getCurrentSessionUser();
    const resolvedInitial = resolveStudentForUser(initialUser, loadedStudents);
    setCurrentStudent(resolvedInitial);

    // Background sync with Supabase database
    const syncFromSupabase = async () => {
      try {
        const [
          studentsRes,
          paymentsRes,
          sedesRes,
          syncedUsers,
          comunicadosRes,
          cyclesRes,
          notifsRes,
        ] = await Promise.all([
          supabaseService.fetchStudents(),
          supabaseService.fetchPayments(),
          supabaseService.fetchSedes(),
          syncUsersFromSupabase(),
          supabaseService.fetchComunicados(),
          supabaseService.fetchBillingCycles(),
          supabaseService.fetchNotifications(),
        ]);

        if (syncedUsers && syncedUsers.length > 0) {
          setCoaches(syncedUsers.filter((u) => u.role === 'coach_assistant'));
        }

        if (comunicadosRes.comunicados && comunicadosRes.comunicados.length > 0) {
          setComunicados(comunicadosRes.comunicados);
          saveStoredComunicados(comunicadosRes.comunicados);
        }

        let effectiveStudents = loadedStudents;
        if (studentsRes.students) {
          const deletedSet = getDeletedStudentIds();
          const validRemote = studentsRes.students.filter(
            (remote) => !deletedSet.has(remote.id)
          );
          const localMap = new Map(loadedStudents.map((s) => [s.id, s]));

          // Mapear alumnos remotos con credenciales locales si existen
          const mergedStudents: Student[] = validRemote.map((remote) => {
            const local = localMap.get(remote.id);
            return {
              ...remote,
              password: remote.password || local?.password || '',
              username: remote.username || local?.username || '',
              email: remote.email || local?.email || remote.tutorEmail || '',
            };
          });

          effectiveStudents = mergedStudents;
          // Supabase es la fuente autoritativa remota: se filtra cualquier registro eliminado
          setStudents(mergedStudents);
          saveStudents(mergedStudents);
          
          const sessionUser = getCurrentSessionUser();
          const resolvedRemote = resolveStudentForUser(sessionUser, mergedStudents);
          setCurrentStudent(resolvedRemote);
        }

        let effectivePayments = loadedPayments;
        if (paymentsRes.payments) {
          effectivePayments = paymentsRes.payments;
          setPayments(paymentsRes.payments);
          savePayments(paymentsRes.payments);
        }

        let effectiveCycles = loadedCycles;
        if (cyclesRes.cycles && cyclesRes.cycles.length > 0) {
          effectiveCycles = cyclesRes.cycles;
          setCycles(cyclesRes.cycles);
          saveCycles(cyclesRes.cycles);
        }

        let effectiveNotifs = loadedNotifs;
        if (notifsRes.notifications) {
          // Combinar notificaciones remotas con locales preservando estado de lectura
          const remoteMap = new Map(notifsRes.notifications.map((n: SystemNotification) => [n.id, n]));
          loadedNotifs.forEach((ln) => {
            if (!remoteMap.has(ln.id)) {
              remoteMap.set(ln.id, ln);
            }
          });
          effectiveNotifs = Array.from(remoteMap.values());
          setNotifications(effectiveNotifs);
          saveNotifications(effectiveNotifs);
        }

        if (sedesRes.sedes && sedesRes.sedes.length > 0) {
          // Respetar exactamente las sedes configuradas en Supabase (permite renombrar/eliminar sedes por defecto)
          setSedes(sedesRes.sedes);
          saveSedes(sedesRes.sedes);
        }

        // Detección automática de fecha límite vencida al sincronizar
        const autoOverdueNotifs = buildOverdueNotifications(
          effectiveStudents,
          effectiveCycles,
          effectivePayments,
          effectiveNotifs
        );
        if (autoOverdueNotifs.length > 0) {
          const updatedNotifs = [...autoOverdueNotifs, ...effectiveNotifs];
          setNotifications(updatedNotifs);
          saveNotifications(updatedNotifs);
          autoOverdueNotifs.forEach((n) => {
            supabaseService.upsertNotification(n).catch(console.warn);
          });
        }
      } catch (err) {
        console.info('Supabase background sync notice:', err);
      }
    };

    syncFromSupabase();
  }, []);

  // Sede & Registration Handlers
  const handleAddSede = (newSede: string) => {
    if (!sedes.includes(newSede)) {
      const updated = [...sedes, newSede];
      setSedes(updated);
      saveSedes(updated);
      supabaseService.addSede(newSede).catch(console.warn);
    }
  };

  const handleRenameSede = async (oldName: string, newName: string) => {
    const cleanNew = newName.trim();
    if (!cleanNew || oldName === cleanNew) return;

    // 1. Actualizar lista de sedes conservando orden sin duplicados
    const updatedSedes = Array.from(
      new Set(sedes.map((s) => (s === oldName ? cleanNew : s)))
    );
    setSedes(updatedSedes);
    saveSedes(updatedSedes);

    // 2. Actualizar en cascada alumnos locales que pertenecían a la sede anterior
    const updatedStudents = students.map((st) =>
      st.campus === oldName ? { ...st, campus: cleanNew } : st
    );
    updateStudents(updatedStudents);

    if (currentStudent?.campus === oldName) {
      setCurrentStudent({ ...currentStudent, campus: cleanNew });
    }

    // 3. Actualizar usuarios locales (coaches y alumnos)
    const storedUsers = getStoredUsers();
    const updatedUsers = storedUsers.map((u) =>
      u.campus === oldName ? { ...u, campus: cleanNew } : u
    );
    saveStoredUsers(updatedUsers);
    setCoaches(updatedUsers.filter((u) => u.role === 'coach_assistant'));

    // 4. Persistir en Supabase (tabla sedes + cascada en students y system_users)
    await supabaseService.renameSede(oldName, cleanNew);
  };

  const handleRegisterStudentsFromForm = async (
    newStudentsList: Omit<Student, 'id' | 'joinedDate'>[]
  ): Promise<{ success: boolean; error?: string }> => {
    const registered: Student[] = newStudentsList.map((s, idx) => ({
      ...s,
      id: `std-${Date.now()}-${idx}`,
      joinedDate: new Date().toISOString().split('T')[0],
      isActive: true,
    }));
    const updated = [...registered, ...students];
    updateStudents(updated);
    if (registered.length > 0) {
      setCurrentStudent(registered[0]);
    }

    // Persistir cada alumno en Supabase de forma asíncrona garantizada
    let saveError: string | null = null;
    for (const st of registered) {
      const res = await supabaseService.upsertStudent(st);
      if (!res.success && res.error) {
        saveError = res.error;
        console.error('Error al guardar alumno en Supabase:', res.error);
      }
    }

    // Crear cuenta de usuario (SystemUser) y persistir en Supabase
    if (registered.length > 0) {
      const primary = registered[0];
      const isMinor = primary.registrationType === 'minor';
      const targetRole: UserRole = isMinor ? 'parent' : 'player';
      const displayName = isMinor ? (primary.tutorName || primary.fullName) : primary.fullName;
      const primaryUsername =
        primary.username?.trim().toLowerCase() ||
        primary.whatsapp ||
        primary.tutorPhone ||
        primary.id;
      const primaryEmail = primary.email || primary.tutorEmail || '';
      const primaryPassword = primary.password || 'geckos2026';

      const newUser: SystemUser = {
        id: `user-${primary.id}`,
        name: displayName,
        username: primaryUsername,
        password: primaryPassword,
        email: primaryEmail,
        phone: primary.whatsapp || primary.tutorPhone || '',
        role: targetRole,
        assignedStudentId: primary.id,
        campus: primary.campus,
        isActive: true,
        avatarUrl: primary.photoUrl || '',
        createdAt: new Date().toISOString(),
      };

      // Guardar usuario en storage local
      const currentUsers = getStoredUsers();
      saveStoredUsers([
        ...currentUsers.filter((u) => u.username.toLowerCase() !== newUser.username.toLowerCase()),
        newUser,
      ]);

      // Guardar usuario en Supabase system_users de forma segura evitando colisiones de username
      try {
        const client = getSupabaseClient();
        const { data: existingUser } = await client
          .from('system_users')
          .select('id')
          .eq('username', newUser.username)
          .maybeSingle();

        const userPayload = {
          id: existingUser ? existingUser.id : newUser.id,
          name: newUser.name,
          username: newUser.username,
          password: newUser.password,
          phone: newUser.phone,
          email: newUser.email,
          role: newUser.role,
          is_active: true,
          avatar_url: newUser.avatarUrl || null,
          assigned_student_id: newUser.assignedStudentId || null,
          campus: newUser.campus || 'Tlalnepantla',
        };

        const { error: userErr } = await client
          .from('system_users')
          .upsert(userPayload, { onConflict: 'id' });

        if (userErr) {
          console.warn('Error al guardar nuevo usuario en Supabase:', userErr.message);
        }
      } catch (err) {
        console.warn('Error al guardar nuevo usuario en Supabase:', err);
      }

      // Auto-iniciar sesión y navegar directo a su portal sin bloqueos
      handleLoginSuccess(newUser, primary);
    }

    if (saveError) {
      return { success: false, error: saveError };
    }
    return { success: true };
  };

  // Save changes to localStorage whenever data changes
  const updateStudents = (updated: Student[]) => {
    setStudents(updated);
    saveStudents(updated);
  };

  const updatePayments = (updated: PaymentRecord[]) => {
    setPayments(updated);
    savePayments(updated);
  };

  const updateCycles = (updated: BillingCycle[]) => {
    setCycles(updated);
    saveCycles(updated);
  };

  const updateNotifications = (updated: SystemNotification[]) => {
    setNotifications(updated);
    saveNotifications(updated);
  };

  // User Login Handler
  const handleLoginSuccess = (user: SystemUser, student?: Student) => {
    setCurrentUser(user);
    setCurrentSessionUser(user);

    const targetRole: UserRole = user.role;
    setActiveRole(targetRole);

    if (student) {
      setCurrentStudent(student);
    } else {
      const resolved = resolveStudentForUser(user, students);
      setCurrentStudent(resolved);
    }

    if (targetRole === 'head_coach' || targetRole === 'coach_assistant') {
      setCurrentTab('dashboard');
    } else {
      setCurrentTab('account');
    }
  };

  // Switch role view for admin exploration
  const handleSwitchRoleView = (role: UserRole) => {
    const isUserAdmin =
      currentUser?.role === 'head_coach' ||
      currentUser?.username?.toLowerCase() === 'haroldo90' ||
      currentUser?.username?.toLowerCase() === 'clubgeckosvoleibol';

    if (isUserAdmin) {
      setActiveRole(role);
      if (role === 'head_coach' || role === 'coach_assistant') {
        setCurrentTab('dashboard');
      } else {
        setCurrentTab('account');
        if (!currentStudent && students.length > 0) {
          setCurrentStudent(students[0]);
        }
      }
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentSessionUser(null);
    setActiveRole(null);
  };

  const handleCoachesUpdated = () => {
    const updated = getStoredUsers().filter((u) => u.role === 'coach_assistant');
    setCoaches(updated);
  };

  const handleComunicadosUpdated = (updated: Comunicado[]) => {
    setComunicados(updated);
    saveStoredComunicados(updated);
  };

  // Stage 1: Player Registration & Management
  const handleAddStudent = (newStudentData: Omit<Student, 'id' | 'joinedDate'>) => {
    const newStudent: Student = {
      ...newStudentData,
      id: `std-${Date.now()}`,
      joinedDate: new Date().toISOString().split('T')[0],
      isActive: true,
    };
    const updated = [newStudent, ...students];
    updateStudents(updated);
    if (!currentStudent) {
      setCurrentStudent(newStudent);
    }
    supabaseService.upsertStudent(newStudent).catch(console.warn);
  };

  const handleUpdateStudent = (updatedStudent: Student) => {
    const updated = students.map((s) => (s.id === updatedStudent.id ? updatedStudent : s));
    updateStudents(updated);
    if (currentStudent?.id === updatedStudent.id) {
      setCurrentStudent(updatedStudent);
    }
    supabaseService.upsertStudent(updatedStudent).catch(console.warn);
  };

  const handleDeleteStudent = async (id: string) => {
    markStudentAsDeleted(id);
    const updated = students.filter((s) => s.id !== id);
    updateStudents(updated);
    if (currentStudent?.id === id) {
      setCurrentStudent(updated.length > 0 ? updated[0] : null);
    }
    const updatedPayments = payments.filter((p) => p.studentId !== id);
    updatePayments(updatedPayments);

    await supabaseService.deleteStudent(id);
  };

  const handleBulkDeleteStudents = async (ids: string[]) => {
    markStudentAsDeleted(ids);
    const idSet = new Set(ids);
    const updated = students.filter((s) => !idSet.has(s.id));
    updateStudents(updated);
    if (currentStudent && idSet.has(currentStudent.id)) {
      setCurrentStudent(updated.length > 0 ? updated[0] : null);
    }
    const updatedPayments = payments.filter((p) => !idSet.has(p.studentId));
    updatePayments(updatedPayments);

    await supabaseService.bulkDeleteStudents(ids);
  };

  const handleToggleStudentActive = (id: string, active: boolean) => {
    const updated = students.map((s) => (s.id === id ? { ...s, isActive: active } : s));
    updateStudents(updated);
    if (currentStudent?.id === id) {
      setCurrentStudent({ ...currentStudent, isActive: active });
    }
    supabaseService.toggleStudentActive(id, active).catch(console.warn);
  };

  const handleBulkToggleStudentsActive = (ids: string[], active: boolean) => {
    const idSet = new Set(ids);
    const updated = students.map((s) => (idSet.has(s.id) ? { ...s, isActive: active } : s));
    updateStudents(updated);
    if (currentStudent && idSet.has(currentStudent.id)) {
      setCurrentStudent({ ...currentStudent, isActive: active });
    }
    supabaseService.bulkToggleStudentsActive(ids, active).catch(console.warn);
  };

  // Stage 2: Cycles & Automated Reminders
  const handleGenerateCycle = (newCycle: BillingCycle) => {
    const updated = [newCycle, ...cycles];
    updateCycles(updated);
    supabaseService.upsertBillingCycle(newCycle).catch(console.warn);

    // Update students balances with the new cycle fee
    const updatedStudents = students.map((st) => ({
      ...st,
      currentBalance: st.currentBalance + (st.monthlyFee || newCycle.defaultFee),
      status: 'adeudo' as Student['status'],
    }));
    updateStudents(updatedStudents);
    updatedStudents.forEach((st) => {
      supabaseService.upsertStudent(st).catch(console.warn);
    });

    // Add notification
    const alert: SystemNotification = {
      id: `notif-${Date.now()}`,
      targetRole: 'all',
      title: `Nuevo Ciclo: ${newCycle.title}`,
      message: `Se ha generado la cuota para ${newCycle.title}. Fecha límite de pago: ${newCycle.dueDate}.`,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      type: 'reminder',
      read: false,
    };
    updateNotifications([alert, ...notifications]);
    supabaseService.upsertNotification(alert).catch(console.warn);
  };

  const handleCheckOverdueNow = (): number => {
    const autoOverdueNotifs = buildOverdueNotifications(
      students,
      cycles,
      payments,
      notifications
    );
    if (autoOverdueNotifs.length > 0) {
      updateNotifications([...autoOverdueNotifs, ...notifications]);
      autoOverdueNotifs.forEach((n) => {
        supabaseService.upsertNotification(n).catch(console.warn);
      });
    }
    return autoOverdueNotifs.length;
  };

  const handleSendBroadcastReminder = (title: string, message: string) => {
    const newNotif: SystemNotification = {
      id: `notif-${Date.now()}`,
      targetRole: 'all',
      title,
      message,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      type: 'reminder',
      read: false,
    };
    updateNotifications([newNotif, ...notifications]);
    supabaseService.upsertNotification(newNotif).catch(console.warn);
  };

  const handleSendStudentReminderWhatsApp = (student: Student) => {
    const phoneClean = student.tutorPhone.replace(/\D/g, '');
    const realBalance = getStudentEffectiveBilling(student, payments, cycles).effectiveBalance;
    const textMsg = encodeURIComponent(
      `Hola estimado(a) ${student.tutorName}, le saludamos de Geckos Voleibol. Le recordamos que ${student.fullName} presenta un saldo pendiente de $${realBalance} MXN correspondiente a su mensualidad. Puede reportar su comprobante de pago en el portal del club. ¡Muchas gracias!`
    );
    window.open(`https://wa.me/${phoneClean}?text=${textMsg}`, '_blank');
  };

  // Stage 3: Student/Parent Registers Payment
  const handleSubmitPayment = (
    paymentData: Omit<PaymentRecord, 'id' | 'reportedDate' | 'status'>
  ) => {
    const isExtra = paymentData.paymentType === 'extra';
    const studentObj = students.find((s) => s.id === paymentData.studentId) || currentStudent;
    const finalCoachId = paymentData.coachId || studentObj?.assignedCoachId;
    const finalCoachName = paymentData.coachName || studentObj?.assignedCoachName;

    const studentEffectiveBal = studentObj
      ? getStudentEffectiveBilling(studentObj, payments, cycles).effectiveBalance
      : 0;
    const targetMonthlyTotal = !isExtra
      ? studentEffectiveBal > 0
        ? studentEffectiveBal
        : studentObj?.monthlyFee || 0
      : paymentData.amount;
    const computedPartial =
      !isExtra &&
      (Boolean(paymentData.isPartial) ||
        (targetMonthlyTotal > 0 && paymentData.amount < targetMonthlyTotal));
    const computedExpected =
      paymentData.expectedAmount || (targetMonthlyTotal > 0 ? targetMonthlyTotal : paymentData.amount);
    const computedRemaining = computedPartial
      ? Math.max(0, computedExpected - paymentData.amount)
      : 0;

    const newPayment: PaymentRecord = {
      ...paymentData,
      coachId: finalCoachId,
      coachName: finalCoachName,
      isPartial: computedPartial,
      expectedAmount: computedExpected,
      remainingBalance: computedRemaining,
      id: `pay-${Date.now()}`,
      reportedDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'pendiente',
    };

    const updatedPayments = [newPayment, ...payments];
    updatePayments(updatedPayments);
    supabaseService.upsertPayment(newPayment).catch(console.warn);

    // If it's a regular monthly fee, update student status to 'en_revision'
    // If it's an extra payment, preserve student status so their regular membership isn't altered
    if (!isExtra) {
      const updatedStudents = students.map((s) =>
        s.id === paymentData.studentId ? { ...s, status: 'en_revision' as Student['status'] } : s
      );
      updateStudents(updatedStudents);
      const targetStudent = updatedStudents.find((s) => s.id === paymentData.studentId);
      if (targetStudent) {
        supabaseService.upsertStudent(targetStudent).catch(console.warn);
      }
      if (currentStudent?.id === paymentData.studentId) {
        setCurrentStudent({ ...currentStudent, status: 'en_revision' });
      }
    }

    // Notify Head Coach Admin and Assigned Coach
    const notifTitle = isExtra
      ? 'Nuevo Pago Extra Reportado (Comprobante Subido)'
      : computedPartial
      ? 'Nuevo Abono / Pago Parcial Reportado'
      : 'Nuevo Comprobante de Pago Reportado';
    const notifMessage = isExtra
      ? `${paymentData.studentName} ha subido comprobante por $${paymentData.amount} MXN (${paymentData.method}) para ${paymentData.concept}.`
      : computedPartial
      ? `${paymentData.studentName} reportó un abono parcial de $${paymentData.amount} MXN (${paymentData.method}); restará $${computedRemaining} MXN por cubrir.`
      : `${paymentData.studentName} ha subido un comprobante por $${paymentData.amount} MXN (${paymentData.method}).`;

    const adminNotif: SystemNotification = {
      id: `notif-${Date.now()}-admin`,
      targetRole: 'admin',
      studentId: paymentData.studentId,
      title: notifTitle,
      message: `${notifMessage} (Receptor asignado: ${finalCoachName || 'General'}).`,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      type: 'new_payment_submitted',
      read: false,
    };

    const newNotifs: SystemNotification[] = [adminNotif];

    // Si tiene entrenador asignado, generar notificación exclusiva dirigida a ese entrenador
    if (finalCoachId) {
      const coachNotif: SystemNotification = {
        id: `notif-${Date.now()}-coach`,
        targetRole: 'coach',
        coachId: finalCoachId,
        studentId: paymentData.studentId,
        title: notifTitle,
        message: `${notifMessage} (Pago asignado a ti para validación).`,
        date: new Date().toISOString().replace('T', ' ').substring(0, 16),
        type: 'new_payment_submitted',
        read: false,
      };
      newNotifs.push(coachNotif);
    }

    updateNotifications([...newNotifs, ...notifications]);
    newNotifs.forEach((n) => {
      supabaseService.upsertNotification(n).catch(console.warn);
    });
  };

  // Stage 4: Head Coach / Assigned Coach Validation & Reconciliation
  const handleApprovePayment = (paymentId: string) => {
    const targetPay = payments.find((p) => p.id === paymentId);
    if (!targetPay) return;

    const isExtra = targetPay.paymentType === 'extra';
    const folioPrefix = isExtra ? 'GCK-EXT' : 'GCK';
    const folioNum = `${folioPrefix}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const reviewerName = currentUser?.name || targetPay.coachName || 'Entrenador Asignado';

    let finalRemainingAfterApproval = 0;
    const studentForPay = students.find((s) => s.id === targetPay.studentId);
    if (!isExtra && studentForPay) {
      const effectiveBal = getStudentEffectiveBilling(studentForPay, payments, cycles).effectiveBalance;
      const baseExpected =
        effectiveBal > 0
          ? effectiveBal
          : targetPay.expectedAmount || studentForPay.monthlyFee || 0;
      finalRemainingAfterApproval = Math.max(0, baseExpected - targetPay.amount);
    }

    const isPartialApproved = !isExtra && finalRemainingAfterApproval > 0;

    const approvedPay: PaymentRecord = {
      ...targetPay,
      status: 'aprobado' as const,
      reviewedDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      reviewedBy: reviewerName,
      receiptFolio: folioNum,
      isPartial: targetPay.isPartial || isPartialApproved,
      remainingBalance: finalRemainingAfterApproval,
    };

    const updatedPayments = payments.map((p) => (p.id === paymentId ? approvedPay : p));
    updatePayments(updatedPayments);
    supabaseService.upsertPayment(approvedPay).catch(console.warn);

    // Only deduct from monthly currentBalance if this is a regular monthly payment
    if (!isExtra) {
      let updatedSt: Student | undefined;
      const updatedStudents = students.map((s) => {
        if (s.id === targetPay.studentId) {
          const effectiveBal = getStudentEffectiveBilling(s, payments, cycles).effectiveBalance;
          const baseBal =
            effectiveBal > 0
              ? effectiveBal
              : targetPay.isPartial
              ? targetPay.expectedAmount || s.monthlyFee || 0
              : 0;
          const newBal = Math.max(0, baseBal - targetPay.amount);
          updatedSt = {
            ...s,
            currentBalance: newBal,
            status: (newBal === 0 ? 'al_corriente' : 'adeudo') as Student['status'],
          };
          return updatedSt;
        }
        return s;
      });
      updateStudents(updatedStudents);
      if (updatedSt) {
        supabaseService.upsertStudent(updatedSt).catch(console.warn);
      }

      if (currentStudent?.id === targetPay.studentId) {
        const effectiveBal = getStudentEffectiveBilling(currentStudent, payments, cycles).effectiveBalance;
        const baseBal =
          effectiveBal > 0
            ? effectiveBal
            : targetPay.isPartial
            ? targetPay.expectedAmount || currentStudent.monthlyFee || 0
            : 0;
        const newBal = Math.max(0, baseBal - targetPay.amount);
        setCurrentStudent({
          ...currentStudent,
          currentBalance: newBal,
          status: newBal === 0 ? 'al_corriente' : 'adeudo',
        });
      }
    }

    // Add confirmation notification to the student/parent
    const approvedNotif: SystemNotification = {
      id: `notif-${Date.now()}`,
      targetRole: 'parents',
      studentId: targetPay.studentId,
      title: isExtra
        ? 'Pago Extra Validado y Aprobado'
        : isPartialApproved
        ? 'Abono Parcial Aprobado (Saldo Pendiente)'
        : 'Pago Aprobado y Validado con Éxito',
      message: isPartialApproved
        ? `Se aprobó tu abono parcial por $${targetPay.amount} MXN para "${targetPay.concept}" por ${reviewerName}. Folio digital: ${folioNum}. Tu saldo restante pendiente por pagar es de $${finalRemainingAfterApproval} MXN.`
        : `Tu comprobante por $${targetPay.amount} MXN para "${targetPay.concept}" ha sido cotejado y aprobado por tu entrenador ${reviewerName}. Folio digital: ${folioNum}. Ya puedes ver tu acuse oficial.`,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      type: 'payment_approved',
      read: false,
    };
    updateNotifications([approvedNotif, ...notifications]);
    supabaseService.upsertNotification(approvedNotif).catch(console.warn);
  };

  const handleRejectPayment = (paymentId: string, reason: string) => {
    const targetPay = payments.find((p) => p.id === paymentId);
    if (!targetPay) return;

    const isExtra = targetPay.paymentType === 'extra';
    const reviewerName = currentUser?.name || targetPay.coachName || 'Entrenador Asignado';

    const rejectedPay: PaymentRecord = {
      ...targetPay,
      status: 'rechazado' as const,
      reviewedDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      reviewedBy: reviewerName,
      rejectionReason: reason,
    };

    const updatedPayments = payments.map((p) => (p.id === paymentId ? rejectedPay : p));
    updatePayments(updatedPayments);
    supabaseService.upsertPayment(rejectedPay).catch(console.warn);

    // If regular monthly fee, restore status to 'adeudo'
    if (!isExtra) {
      let updatedSt: Student | undefined;
      const updatedStudents = students.map((s) => {
        if (s.id === targetPay.studentId) {
          updatedSt = {
            ...s,
            status: 'adeudo' as Student['status'],
          };
          return updatedSt;
        }
        return s;
      });
      updateStudents(updatedStudents);
      if (updatedSt) {
        supabaseService.upsertStudent(updatedSt).catch(console.warn);
      }

      if (currentStudent?.id === targetPay.studentId) {
        setCurrentStudent({ ...currentStudent, status: 'adeudo' });
      }
    }

    // Notify user of rejection reason so they can re-upload
    const rejectNotif: SystemNotification = {
      id: `notif-${Date.now()}`,
      targetRole: 'parents',
      studentId: targetPay.studentId,
      title: isExtra ? 'Comprobante de Pago Extra No Validado' : 'Comprobante de Pago No Validado',
      message: `Para "${targetPay.concept}": ${reason}. Por favor ingresa a tu portal y vuelve a reportar tu comprobante corregido.`,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      type: 'payment_rejected',
      read: false,
    };
    updateNotifications([rejectNotif, ...notifications]);
    supabaseService.upsertNotification(rejectNotif).catch(console.warn);
  };

  // Corrección y Edición de Pagos (Admin / Head Coach)
  const handleUpdatePayment = (
    updatedPayment: PaymentRecord,
    originalPayment: PaymentRecord
  ) => {
    // 1. Asegurar sincronía de nombre de alumno si cambió el estudiante
    const targetStudent = students.find((s) => s.id === updatedPayment.studentId);
    const resolvedPayment: PaymentRecord = {
      ...updatedPayment,
      studentName: targetStudent ? targetStudent.fullName : updatedPayment.studentName,
    };

    // 2. Actualizar listado de pagos en estado local y Supabase
    const updatedPayments = payments.map((p) =>
      p.id === resolvedPayment.id ? resolvedPayment : p
    );
    updatePayments(updatedPayments);
    supabaseService.upsertPayment(resolvedPayment).catch(console.warn);

    // 3. Recalcular balances de alumnos si cambiaron montos, estados o estudiante asignado
    const origApproved = originalPayment.status === 'aprobado';
    const newApproved = resolvedPayment.status === 'aprobado';
    const origMonthly = originalPayment.paymentType !== 'extra';
    const newMonthly = resolvedPayment.paymentType !== 'extra';

    const studentsToSync: Student[] = [];

    const updatedStudentsList = students.map((s) => {
      let balance = s.currentBalance;
      let changed = false;

      // Alumno original que tenía el pago aprobado
      if (s.id === originalPayment.studentId && origApproved && origMonthly) {
        if (
          resolvedPayment.studentId !== originalPayment.studentId ||
          !newApproved ||
          !newMonthly
        ) {
          // Se desasignó el pago o ya no es aprobado: restaurar saldo
          balance = balance + originalPayment.amount;
          changed = true;
        } else {
          // Mismo alumno y sigue aprobado: calcular diferencia de montos
          const diff = resolvedPayment.amount - originalPayment.amount;
          if (diff !== 0) {
            balance = Math.max(0, balance - diff);
            changed = true;
          }
        }
      }

      // Alumno nuevo receptor del pago aprobado
      if (s.id === resolvedPayment.studentId && newApproved && newMonthly) {
        if (
          resolvedPayment.studentId !== originalPayment.studentId ||
          !origApproved ||
          !origMonthly
        ) {
          // Se acreditó a este nuevo alumno: descontar monto
          balance = Math.max(0, balance - resolvedPayment.amount);
          changed = true;
        }
      }

      if (changed) {
        const newStatus: Student['status'] = balance === 0 ? 'al_corriente' : 'adeudo';
        const updatedS: Student = {
          ...s,
          currentBalance: balance,
          status: newStatus,
        };
        studentsToSync.push(updatedS);
        return updatedS;
      }

      return s;
    });

    if (studentsToSync.length > 0) {
      updateStudents(updatedStudentsList);
      studentsToSync.forEach((st) => {
        supabaseService.upsertStudent(st).catch(console.warn);
        if (currentStudent?.id === st.id) {
          setCurrentStudent(st);
        }
      });
    }

    // 4. Registrar notificación de auditoría en el sistema (Solo para el Admin y el alumno involucrado)
    const auditNotif: SystemNotification = {
      id: `notif-${Date.now()}-correction`,
      targetRole: 'admin',
      studentId: resolvedPayment.studentId,
      title: 'Corrección de Pago Registrada',
      message: `El pago (${resolvedPayment.receiptFolio || resolvedPayment.referenceNumber}) de ${resolvedPayment.studentName} ha sido corregido: ${resolvedPayment.concept} por $${resolvedPayment.amount} MXN (${resolvedPayment.paymentDate}).`,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      type: 'reminder',
      read: false,
    };
    updateNotifications([auditNotif, ...notifications]);
  };

  // Eliminación de Pagos (Admin / Cancelación por el Alumno si está pendiente)
  const handleDeletePayment = async (paymentId: string) => {
    const targetPay = payments.find((p) => p.id === paymentId);
    if (!targetPay) return;

    // 1. Quitar de la lista de pagos en memoria y localStorage
    const updatedPayments = payments.filter((p) => p.id !== paymentId);
    updatePayments(updatedPayments);

    // 2. Eliminar permanentemente de Supabase
    await supabaseService.deletePayment(paymentId);

    // 3. Si el pago eliminado estaba aprobado y era mensualidad regular, restaurar saldo al alumno
    if (targetPay.status === 'aprobado' && targetPay.paymentType !== 'extra') {
      const updatedStudents = students.map((s) => {
        if (s.id === targetPay.studentId) {
          const newBal = s.currentBalance + targetPay.amount;
          return {
            ...s,
            currentBalance: newBal,
            status: 'adeudo' as Student['status'],
          };
        }
        return s;
      });
      updateStudents(updatedStudents);

      const targetSt = updatedStudents.find((s) => s.id === targetPay.studentId);
      if (targetSt) {
        supabaseService.upsertStudent(targetSt).catch(console.warn);
      }

      if (currentStudent?.id === targetPay.studentId) {
        setCurrentStudent({
          ...currentStudent,
          currentBalance: currentStudent.currentBalance + targetPay.amount,
          status: 'adeudo',
        });
      }
    }
  };

  // Eliminación masiva de pagos duplicados (Admin)
  const handleBulkDeletePayments = async (paymentIds: string[]) => {
    if (paymentIds.length === 0) return;
    const idSet = new Set(paymentIds);
    const toDelete = payments.filter((p) => idSet.has(p.id));

    // 1. Quitar de lista en memoria y localStorage
    const remainingPayments = payments.filter((p) => !idSet.has(p.id));
    updatePayments(remainingPayments);

    // 2. Eliminar de Supabase en lote
    await supabaseService.bulkDeletePayments(paymentIds);

    // 3. Recalcular saldos si alguno de los eliminados estaba aprobado y era mensualidad
    const restoreMap = new Map<string, number>();
    toDelete.forEach((p) => {
      if (p.status === 'aprobado' && p.paymentType !== 'extra') {
        restoreMap.set(p.studentId, (restoreMap.get(p.studentId) || 0) + p.amount);
      }
    });

    if (restoreMap.size > 0) {
      const updatedStudents = students.map((s) => {
        const extraDebt = restoreMap.get(s.id);
        if (!extraDebt) return s;
        const newBal = s.currentBalance + extraDebt;
        return {
          ...s,
          currentBalance: newBal,
          status: 'adeudo' as Student['status'],
        };
      });
      updateStudents(updatedStudents);
      updatedStudents.forEach((s) => {
        if (restoreMap.has(s.id)) {
          supabaseService.upsertStudent(s).catch(console.warn);
        }
      });
      if (currentStudent && restoreMap.has(currentStudent.id)) {
        setCurrentStudent({
          ...currentStudent,
          currentBalance: currentStudent.currentBalance + (restoreMap.get(currentStudent.id) || 0),
          status: 'adeudo',
        });
      }
    }
  };

  // Ciclos de Cobro: Borrado y Edición
  const handleDeleteCycle = async (cycleId: string) => {
    const updatedCycles = cycles.filter((c) => c.id !== cycleId);
    updateCycles(updatedCycles);
    await supabaseService.deleteBillingCycle(cycleId);
  };

  const handleUpdateCycle = async (updatedCycle: BillingCycle) => {
    const updated = cycles.map((c) => (c.id === updatedCycle.id ? updatedCycle : c));
    updateCycles(updated);
    await supabaseService.upsertBillingCycle(updatedCycle);
  };

  // Notificaciones: Borrado individual y vaciado
  const handleDeleteNotification = async (notifId: string) => {
    const updated = notifications.filter((n) => n.id !== notifId);
    updateNotifications(updated);
    await supabaseService.deleteNotification(notifId);
  };

  const handleClearNotifications = async () => {
    if (isAdmin) {
      updateNotifications([]);
      await supabaseService.clearAllNotifications();
    } else if (currentStudent) {
      // Si es alumno/padre, solo limpiar sus notificaciones personales
      const remaining = notifications.filter(
        (n) => n.studentId && n.studentId !== currentStudent.id
      );
      updateNotifications(remaining);
    }
  };

  // Sedes: Borrado
  const handleDeleteSede = async (sedeName: string) => {
    const updated = sedes.filter((s) => s !== sedeName);
    setSedes(updated);
    saveSedes(updated);
    await supabaseService.deleteSede(sedeName);
  };

  // Sample Data Permanent Wiper & Supabase (Simultaneous complete wipe)
  const handleWipeAllSampleData = async (): Promise<{ success: boolean; message: string }> => {
    // 1. Limpiar almacenamiento y estados locales
    wipeAllSampleData();
    setStudents([]);
    setCurrentStudent(null);
    setPayments([]);
    setCycles([]);
    setNotifications([]);
    setIsCleared(true);

    // 2. Limpiar Supabase de forma asíncrona garantizada
    const res = await supabaseService.wipeAllTables();
    return res;
  };

  const handleRestoreSampleData = () => {
    restoreSampleData();
    const st = getStoredStudents();
    setStudents(st);
    if (st.length > 0) setCurrentStudent(st[0]);
    setPayments(getStoredPayments());
    setCycles(getStoredCycles());
    setNotifications(getStoredNotifications());
    setIsCleared(false);
  };

  const handleSaveSupabaseConfig = (cfg: SupabaseConfig) => {
    setSupabaseState(cfg);
    saveSupabaseConfig(cfg);
  };

  const isCoachAssistant = currentUser?.role === 'coach_assistant';

  const pendingValidationsCount = payments.filter((p) => {
    if (p.status !== 'pendiente') return false;
    if (!isCoachAssistant) return true;
    if (p.coachId && p.coachId === currentUser?.id) return true;
    const st = students.find((s) => s.id === p.studentId);
    if (st?.assignedCoachId && st.assignedCoachId === currentUser?.id) return true;
    if (st?.assignedCoachName && currentUser?.name && st.assignedCoachName.toLowerCase() === currentUser.name.toLowerCase()) return true;
    return false;
  }).length;

  const unreadNotifsCount = notifications.filter((n) => {
    if (n.read) return false;
    if (isCoachAssistant) {
      return (
        n.targetRole === 'all' ||
        (n.targetRole === 'coach' && (!n.coachId || n.coachId === currentUser?.id))
      );
    }
    if (activeRole === 'player' || activeRole === 'parent') {
      if (!currentStudent) return false;
      if (n.studentId) {
        return n.studentId === currentStudent.id;
      }
      return n.targetRole === 'all' || n.targetRole === 'parents' || n.targetRole === 'players';
    }
    return true;
  }).length;

  // View Receipt Modal Trigger
  const handleViewDigitalReceipt = (payment: PaymentRecord) => {
    setViewingReceipt(payment);
  };

  // If no active role is chosen: show the clean Home with ONLY logo + login & registration form
  if (!activeRole) {
    return (
      <main>
        <HomeAuth
          students={students}
          coaches={assignableCoaches}
          onLoginSuccess={handleLoginSuccess}
          onOpenDocPDF={() => setIsDocModalOpen(true)}
          sedes={sedes}
          onAddSede={handleAddSede}
          onRegisterStudents={handleRegisterStudentsFromForm}
        />
        {isAdmin && (
          <DataManagementModal
            isOpen={isDataModalOpen}
            onClose={() => setIsDataModalOpen(false)}
            onWipeAllSampleData={handleWipeAllSampleData}
            onRestoreSampleData={handleRestoreSampleData}
            isCleared={isCleared}
            supabaseConfig={supabaseConfig}
            onSaveSupabaseConfig={handleSaveSupabaseConfig}
            counts={{
              students: students.length,
              payments: payments.length,
              cycles: cycles.length,
              notifications: notifications.length,
            }}
          />
        )}
        <DocumentationPDFModal
          isOpen={isDocModalOpen}
          onClose={() => setIsDocModalOpen(false)}
        />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#363435] flex flex-col font-sans w-full max-w-full overflow-x-hidden">
      {/* Banner de Navegación de Rol para el Administrador */}
      {(currentUser?.role === 'head_coach' ||
        currentUser?.username?.toLowerCase() === 'haroldo90' ||
        currentUser?.username?.toLowerCase() === 'clubgeckosvoleibol') &&
        activeRole !== 'head_coach' && (
        <div className="bg-[#363435] text-white px-3 sm:px-6 py-2 text-xs flex items-center justify-between border-b border-neutral-700 shadow-md sticky top-0 z-50">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
            <span className="truncate">
              Modo Exploración: Estás navegando como{' '}
              <strong className="text-amber-300">
                {activeRole === 'coach_assistant'
                  ? 'Entrenador Asistente'
                  : activeRole === 'parent'
                  ? 'Padre de Familia'
                  : 'Alumno / Jugador'}
              </strong>{' '}
              ({currentUser.name})
            </span>
          </div>
          <button
            onClick={() => handleSwitchRoleView('head_coach')}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-neutral-900 rounded-lg font-bold text-xs transition cursor-pointer shrink-0 ml-2 shadow-xs"
          >
            Volver a Administrador
          </button>
        </div>
      )}

      {/* 1. Cabecera Institucional Unificada */}
      <Header
        currentUser={currentUser}
        activeRole={activeRole}
        currentStudent={currentStudent}
        onLogout={handleLogout}
        onOpenDataReset={() => setIsDataModalOpen(true)}
        onOpenDocPDF={() => setIsDocModalOpen(true)}
        pendingCount={pendingValidationsCount}
        onSwitchRoleView={handleSwitchRoleView}
        onNavigateToProfile={() => setCurrentTab('profile')}
      />

      {/* Main Workspace: Sidebar on Desktop + Content Area */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto min-w-0 overflow-x-hidden">
        {/* 2. Menú Lateral Desplegable en Escritorio */}
        <Sidebar
          currentUser={currentUser}
          activeRole={activeRole}
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          pendingCount={pendingValidationsCount}
          unreadNotifsCount={unreadNotifsCount}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onOpenDataReset={() => setIsDataModalOpen(true)}
          onOpenDocPDF={() => setIsDocModalOpen(true)}
          onSwitchRoleView={handleSwitchRoleView}
        />

        {/* 3. Área de Trabajo Principal */}
        <main className="flex-1 p-3 sm:p-5 lg:p-8 pb-22 lg:pb-8 w-full max-w-full min-w-0 overflow-x-hidden">
          {/* Coach Routes */}
          {isCoach && (
            <>
              {currentTab === 'dashboard' && (
                <HeadCoachDashboard
                  currentUser={currentUser}
                  students={students}
                  payments={payments}
                  cycles={cycles}
                  onNavigateToValidation={() => setCurrentTab('validation')}
                  onNavigateToBilling={() => setCurrentTab('billing')}
                  onNavigateToPlayers={() => setCurrentTab('players')}
                  onNavigateToRegisteredStudents={() => setCurrentTab('registered_students')}
                  onNavigateToCoaches={() => setCurrentTab('coaches')}
                  onSwitchRoleView={handleSwitchRoleView}
                  onSendReminderWhatsApp={handleSendStudentReminderWhatsApp}
                />
              )}

              {currentTab === 'coaches' && (
                <CoachesManagement
                  coaches={coaches}
                  onCoachesUpdated={handleCoachesUpdated}
                  sedes={sedes}
                  students={students}
                  onUpdateStudent={handleUpdateStudent}
                  activeRole={activeRole}
                  currentUser={currentUser}
                />
              )}

              {currentTab === 'announcements' && (
                <AnnouncementsModule
                  comunicados={comunicados}
                  onComunicadosUpdated={handleComunicadosUpdated}
                  students={students}
                  coaches={assignableCoaches}
                  currentUser={currentUser}
                  isAdmin={
                    activeRole === 'head_coach' ||
                    currentUser?.role === 'head_coach' ||
                    currentUser?.username?.toLowerCase() === 'haroldo90' ||
                    currentUser?.username?.toLowerCase() === 'clubgeckosvoleibol'
                  }
                />
              )}

              {currentTab === 'registered_students' && (
                <RegisteredStudentsModule
                  currentUser={currentUser}
                  activeRole={activeRole}
                  students={students}
                  sedes={sedes}
                  coaches={assignableCoaches}
                  payments={payments}
                  cycles={cycles}
                  onUpdateStudent={handleUpdateStudent}
                  onDeleteStudent={handleDeleteStudent}
                  onBulkDeleteStudents={handleBulkDeleteStudents}
                  onToggleStudentActive={handleToggleStudentActive}
                  onBulkToggleStudentsActive={handleBulkToggleStudentsActive}
                  onAddSede={handleAddSede}
                  onRenameSede={handleRenameSede}
                  onDeleteSede={handleDeleteSede}
                  onNavigateToRegistration={() => setActiveRole(null)}
                />
              )}

              {currentTab === 'players' && (
                <PlayersManagement
                  currentUser={currentUser}
                  activeRole={activeRole}
                  coaches={assignableCoaches}
                  students={students}
                  payments={payments}
                  cycles={cycles}
                  onAddStudent={handleAddStudent}
                  onUpdateStudent={handleUpdateStudent}
                  onDeleteStudent={handleDeleteStudent}
                  onUpdatePaymentRecord={handleUpdatePayment}
                  onDeletePaymentRecord={handleDeletePayment}
                  onBulkDeletePayments={handleBulkDeletePayments}
                />
              )}

              {currentTab === 'validation' && (
                <PaymentsValidation
                  currentUser={currentUser}
                  coaches={assignableCoaches}
                  payments={payments}
                  students={students}
                  cycles={cycles}
                  onApprovePayment={handleApprovePayment}
                  onRejectPayment={handleRejectPayment}
                  onViewDigitalReceipt={handleViewDigitalReceipt}
                  onUpdatePayment={handleUpdatePayment}
                  onDeletePayment={handleDeletePayment}
                  onBulkDeletePayments={handleBulkDeletePayments}
                />
              )}

              {currentTab === 'billing' && (
                <BillingAndReminders
                  currentUser={currentUser}
                  coaches={assignableCoaches}
                  cycles={cycles}
                  students={students}
                  payments={payments}
                  onGenerateCycle={handleGenerateCycle}
                  onSendBroadcastReminder={handleSendBroadcastReminder}
                  onSendStudentReminderWhatsApp={handleSendStudentReminderWhatsApp}
                  onDeleteCycle={handleDeleteCycle}
                  onUpdateCycle={handleUpdateCycle}
                  onCheckOverdueNow={handleCheckOverdueNow}
                />
              )}

              {currentTab === 'profile' && (
                <UserProfileModule
                  currentUser={currentUser}
                  currentStudent={currentStudent}
                  onUpdateUser={(updated) => {
                    setCurrentUser(updated);
                    setCurrentSessionUser(updated);
                  }}
                  onUpdateStudent={handleUpdateStudent}
                />
              )}

              {currentTab === 'social' && <OfficialSocials />}
            </>
          )}

          {/* Player / Parent Routes */}
          {!isCoach && (
            <>
              {/* Fallback de seguridad: Si un alumno/padre tiene seleccionada una pestaña administrativa, mostrar su Estado de Cuenta */}
              {(currentTab === 'account' ||
                currentTab === 'dashboard' ||
                ['registered_students', 'players', 'coaches', 'validation', 'billing'].includes(currentTab)) &&
                currentStudent && (
                  <AccountStatus
                    currentStudent={currentStudent}
                    students={
                      // Si es alumno / jugador individual: AISLAMIENTO 100%, solo se ve a sí mismo
                      activeRole === 'player'
                        ? [currentStudent]
                        : (() => {
                            // Si es padre de familia: únicamente hermanos legítimos con tutor y teléfono idénticos
                            const normTutor = (currentStudent.tutorName || '').toLowerCase().trim();
                            const tutorPhoneDigits = (currentStudent.tutorPhone || '').replace(/\D/g, '');
                            if (!normTutor || normTutor.length < 3 || tutorPhoneDigits.length < 7) {
                              return [currentStudent];
                            }
                            const family = students.filter((s) => {
                              if (s.id === currentStudent.id) return true;
                              const sNormTutor = (s.tutorName || '').toLowerCase().trim();
                              const sTutorDigits = (s.tutorPhone || '').replace(/\D/g, '');
                              return (
                                normTutor === sNormTutor &&
                                sTutorDigits.length >= 7 &&
                                sTutorDigits.slice(-10) === tutorPhoneDigits.slice(-10)
                              );
                            });
                            return family.length > 0 ? family : [currentStudent];
                          })()
                    }
                    onSelectStudent={setCurrentStudent}
                    payments={payments}
                    cycles={cycles}
                    onNavigateToPay={() => setCurrentTab('register_payment')}
                    onNavigateToHistory={() => setCurrentTab('history')}
                    onViewDigitalReceipt={handleViewDigitalReceipt}
                  />
                )}

              {(currentTab === 'account' ||
                currentTab === 'dashboard' ||
                ['registered_students', 'players', 'coaches', 'validation', 'billing'].includes(currentTab)) &&
                !currentStudent && (
                  <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center text-xs text-neutral-400">
                    <p className="font-semibold text-neutral-700">Cargando datos del alumno...</p>
                    <p className="mt-1">Si la información tarda en aparecer, pulsa en tu perfil o refresca la página.</p>
                  </div>
                )}

              {currentTab === 'register_payment' && currentStudent && (
                <RegisterPayment
                  currentStudent={currentStudent}
                  payments={payments}
                  onSubmitPayment={handleSubmitPayment}
                  onNavigateToHistory={() => setCurrentTab('history')}
                />
              )}

              {currentTab === 'register_payment' && !currentStudent && (
                <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center text-xs text-neutral-400">
                  <p className="font-semibold text-neutral-700">No hay jugador activo para registrar pago</p>
                </div>
              )}

              {currentTab === 'history' && currentStudent && (
                <PaymentHistory
                  currentStudent={currentStudent}
                  payments={payments}
                  onViewDigitalReceipt={handleViewDigitalReceipt}
                  onNavigateToPay={() => setCurrentTab('register_payment')}
                  onCancelPayment={handleDeletePayment}
                />
              )}

              {currentTab === 'history' && !currentStudent && (
                <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center text-xs text-neutral-400">
                  <p className="font-semibold text-neutral-700">No hay registros de historial</p>
                </div>
              )}

              {currentTab === 'notifications' && (
                <NotificationsBox
                  notifications={notifications}
                  currentStudent={currentStudent}
                  onMarkAsRead={(id) => {
                    const updated = notifications.map((n) =>
                      n.id === id ? { ...n, read: true } : n
                    );
                    updateNotifications(updated);
                  }}
                  onMarkAllAsRead={() => {
                    const updated = notifications.map((n) => ({ ...n, read: true }));
                    updateNotifications(updated);
                  }}
                  onDeleteNotification={handleDeleteNotification}
                  onClearAllNotifications={handleClearNotifications}
                  onNavigateToPay={() => setCurrentTab('register_payment')}
                />
              )}

              {currentTab === 'announcements' && (
                <AnnouncementsModule
                  comunicados={comunicados}
                  onComunicadosUpdated={handleComunicadosUpdated}
                  students={currentStudent ? [currentStudent] : []}
                  coaches={coaches}
                  currentUser={currentUser}
                  currentStudent={currentStudent}
                  isAdmin={false}
                />
              )}

              {currentTab === 'profile' && (
                <UserProfileModule
                  currentUser={currentUser}
                  currentStudent={currentStudent}
                  onUpdateUser={(updated) => {
                    setCurrentUser(updated);
                    setCurrentSessionUser(updated);
                  }}
                  onUpdateStudent={handleUpdateStudent}
                />
              )}

              {currentTab === 'social' && <OfficialSocials />}
            </>
          )}
        </main>
      </div>

      {/* 4. Navegación Móvil y Tablet (Bottom Bar) */}
      <BottomBar
        activeRole={activeRole}
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        currentUser={currentUser}
        pendingCount={pendingValidationsCount}
        unreadNotifsCount={unreadNotifsCount}
      />

      {/* 5. Modal: Acuse Digital Oficial */}
      {viewingReceipt && (
        <DigitalReceiptModal
          payment={viewingReceipt}
          student={students.find((s) => s.id === viewingReceipt.studentId) || currentStudent}
          onClose={() => setViewingReceipt(null)}
        />
      )}

      {/* 6. Modal: Gestión de Datos & Supabase */}
      <DataManagementModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
        onWipeAllSampleData={handleWipeAllSampleData}
        onRestoreSampleData={handleRestoreSampleData}
        isCleared={isCleared}
        supabaseConfig={supabaseConfig}
        onSaveSupabaseConfig={handleSaveSupabaseConfig}
        counts={{
          students: students.length,
          payments: payments.length,
          cycles: cycles.length,
          notifications: notifications.length,
        }}
      />

      {/* 7. Modal: Ficha Técnica & Manual en PDF */}
      <DocumentationPDFModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
      />
    </div>
  );
}
