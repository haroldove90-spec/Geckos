import React, { useState, useEffect } from 'react';
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
} from './utils/storage';
import { supabaseService, getSupabaseClient } from './utils/supabaseClient';

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
} from './utils/auth';

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

    if (loadedStudents.length > 0) {
      setCurrentStudent(loadedStudents[0]);
    }

    // Background sync with Supabase database
    const syncFromSupabase = async () => {
      try {
        const [studentsRes, paymentsRes, sedesRes, syncedUsers, comunicadosRes] = await Promise.all([
          supabaseService.fetchStudents(),
          supabaseService.fetchPayments(),
          supabaseService.fetchSedes(),
          syncUsersFromSupabase(),
          supabaseService.fetchComunicados(),
        ]);

        if (syncedUsers && syncedUsers.length > 0) {
          setCoaches(syncedUsers.filter((u) => u.role === 'coach_assistant'));
        }

        if (comunicadosRes.comunicados && comunicadosRes.comunicados.length > 0) {
          setComunicados(comunicadosRes.comunicados);
          saveStoredComunicados(comunicadosRes.comunicados);
        }

        if (studentsRes.students) {
          const remoteMap = new Map(studentsRes.students.map((s) => [s.id, s]));
          const localMap = new Map(loadedStudents.map((s) => [s.id, s]));

          // Mapear alumnos remotos
          const mergedStudents: Student[] = studentsRes.students.map((remote) => {
            const local = localMap.get(remote.id);
            return {
              ...remote,
              password: remote.password || local?.password || '',
              username: remote.username || local?.username || '',
              email: remote.email || local?.email || remote.tutorEmail || '',
            };
          });

          // PRESERVAR Y AUTO-SINCRONIZAR AQUELLOS ALUMNOS LOCALES QUE NO ESTÉN EN SUPABASE AÚN
          loadedStudents.forEach((local) => {
            if (!remoteMap.has(local.id)) {
              mergedStudents.unshift(local);
              // Auto-subir a Supabase en background para que quede guardado remotamente
              supabaseService.upsertStudent(local).catch((e) =>
                console.warn('Auto-sync alumno local a Supabase:', e)
              );
            }
          });

          setStudents(mergedStudents);
          saveStudents(mergedStudents);
          if (!currentStudent && mergedStudents.length > 0) {
            setCurrentStudent(mergedStudents[0]);
          }
        }
        if (paymentsRes.payments && paymentsRes.payments.length > 0) {
          setPayments(paymentsRes.payments);
          savePayments(paymentsRes.payments);
        }
        if (sedesRes.sedes && sedesRes.sedes.length > 0) {
          const merged = Array.from(new Set([...DEFAULT_SEDES, ...sedesRes.sedes]));
          setSedes(merged);
          saveSedes(merged);
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
    } else if (user.assignedStudentId) {
      const found = students.find((s) => s.id === user.assignedStudentId);
      if (found) {
        setCurrentStudent(found);
      } else if (students.length > 0) {
        setCurrentStudent(students[0]);
      }
    } else if (targetRole === 'player' || targetRole === 'parent') {
      const normUName = (user.name || '').toLowerCase().trim();
      const uPhoneDigits = (user.phone || user.username || '').replace(/\D/g, '');
      const found = students.find((s) => {
        const sPhone = (s.whatsapp || s.tutorPhone || '').replace(/\D/g, '');
        return (
          (uPhoneDigits.length >= 7 && sPhone.slice(-10) === uPhoneDigits.slice(-10)) ||
          (s.fullName && s.fullName.toLowerCase().trim() === normUName) ||
          (s.tutorName && s.tutorName.toLowerCase().trim() === normUName)
        );
      });
      if (found) {
        setCurrentStudent(found);
      } else if (students.length > 0) {
        setCurrentStudent(students[0]);
      }
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

  const handleDeleteStudent = (id: string) => {
    const updated = students.filter((s) => s.id !== id);
    updateStudents(updated);
    if (currentStudent?.id === id) {
      setCurrentStudent(updated.length > 0 ? updated[0] : null);
    }
    supabaseService.deleteStudent(id).catch(console.warn);
  };

  const handleBulkDeleteStudents = (ids: string[]) => {
    const idSet = new Set(ids);
    const updated = students.filter((s) => !idSet.has(s.id));
    updateStudents(updated);
    if (currentStudent && idSet.has(currentStudent.id)) {
      setCurrentStudent(updated.length > 0 ? updated[0] : null);
    }
    supabaseService.bulkDeleteStudents(ids).catch(console.warn);
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

    // Update students balances with the new cycle fee
    const updatedStudents = students.map((st) => ({
      ...st,
      currentBalance: st.currentBalance + (st.monthlyFee || newCycle.defaultFee),
      status: 'adeudo' as Student['status'],
    }));
    updateStudents(updatedStudents);

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
  };

  const handleSendStudentReminderWhatsApp = (student: Student) => {
    const phoneClean = student.tutorPhone.replace(/\D/g, '');
    const textMsg = encodeURIComponent(
      `Hola estimado(a) ${student.tutorName}, le saludamos de Geckos Voleibol. Le recordamos que ${student.fullName} presenta un saldo pendiente de $${student.currentBalance} MXN correspondiente a su mensualidad. Puede reportar su comprobante de pago en el portal del club. ¡Muchas gracias!`
    );
    window.open(`https://wa.me/${phoneClean}?text=${textMsg}`, '_blank');
  };

  // Stage 3: Student/Parent Registers Payment
  const handleSubmitPayment = (
    paymentData: Omit<PaymentRecord, 'id' | 'reportedDate' | 'status'>
  ) => {
    const isExtra = paymentData.paymentType === 'extra';
    const newPayment: PaymentRecord = {
      ...paymentData,
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

    // Notify Coach
    const notifTitle = isExtra
      ? 'Nuevo Pago Extra Reportado (Comprobante Subido)'
      : 'Nuevo Comprobante de Pago Reportado';
    const notifMessage = isExtra
      ? `${paymentData.studentName} ha subido comprobante por $${paymentData.amount} MXN (${paymentData.method}) para ${paymentData.concept}.`
      : `${paymentData.studentName} ha subido un comprobante por $${paymentData.amount} MXN (${paymentData.method}).`;

    const adminNotif: SystemNotification = {
      id: `notif-${Date.now()}`,
      targetRole: 'admin',
      studentId: paymentData.studentId,
      title: notifTitle,
      message: notifMessage,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      type: 'new_payment_submitted',
      read: false,
    };
    updateNotifications([adminNotif, ...notifications]);
  };

  // Stage 4: Head Coach Validation & Reconciliation
  const handleApprovePayment = (paymentId: string) => {
    const targetPay = payments.find((p) => p.id === paymentId);
    if (!targetPay) return;

    const isExtra = targetPay.paymentType === 'extra';
    const folioPrefix = isExtra ? 'GCK-EXT' : 'GCK';
    const folioNum = `${folioPrefix}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const approvedPay: PaymentRecord = {
      ...targetPay,
      status: 'aprobado' as const,
      reviewedDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      reviewedBy: 'Head Coach Principal',
      receiptFolio: folioNum,
    };

    const updatedPayments = payments.map((p) => (p.id === paymentId ? approvedPay : p));
    updatePayments(updatedPayments);
    supabaseService.upsertPayment(approvedPay).catch(console.warn);

    // Only deduct from monthly currentBalance if this is a regular monthly payment
    if (!isExtra) {
      let updatedSt: Student | undefined;
      const updatedStudents = students.map((s) => {
        if (s.id === targetPay.studentId) {
          const newBal = Math.max(0, s.currentBalance - targetPay.amount);
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
        const newBal = Math.max(0, currentStudent.currentBalance - targetPay.amount);
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
      title: isExtra ? 'Pago Extra Validado y Aprobado' : 'Pago Aprobado y Validado con Éxito',
      message: `Tu comprobante por $${targetPay.amount} MXN para "${targetPay.concept}" ha sido validado. Folio digital: ${folioNum}. Ya puedes ver tu acuse oficial.`,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      type: 'payment_approved',
      read: false,
    };
    updateNotifications([approvedNotif, ...notifications]);
  };

  const handleRejectPayment = (paymentId: string, reason: string) => {
    const targetPay = payments.find((p) => p.id === paymentId);
    if (!targetPay) return;

    const isExtra = targetPay.paymentType === 'extra';

    const rejectedPay: PaymentRecord = {
      ...targetPay,
      status: 'rechazado' as const,
      reviewedDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      reviewedBy: 'Head Coach Principal',
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
  };

  // Sample Data Permanent Wiper & Supabase
  const handleWipeAllSampleData = () => {
    wipeAllSampleData();
    setStudents([]);
    setCurrentStudent(null);
    setPayments([]);
    setCycles([]);
    setNotifications([]);
    setIsCleared(true);
    supabaseService.wipeAllTables().catch(console.warn);
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

  const pendingValidationsCount = payments.filter((p) => p.status === 'pendiente').length;
  const unreadNotifsCount = notifications.filter((n) => !n.read).length;

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
          coaches={coaches}
          onLoginSuccess={handleLoginSuccess}
          onOpenDataReset={() => setIsDataModalOpen(true)}
          onOpenDocPDF={() => setIsDocModalOpen(true)}
          sedes={sedes}
          onAddSede={handleAddSede}
          onRegisterStudents={handleRegisterStudentsFromForm}
        />
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
        <DocumentationPDFModal
          isOpen={isDocModalOpen}
          onClose={() => setIsDocModalOpen(false)}
        />
      </main>
    );
  }

  const isCoach = activeRole === 'head_coach' || activeRole === 'coach_assistant';

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
                />
              )}

              {currentTab === 'announcements' && (
                <AnnouncementsModule
                  comunicados={comunicados}
                  onComunicadosUpdated={handleComunicadosUpdated}
                  students={students}
                  coaches={coaches}
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
                  students={students}
                  sedes={sedes}
                  coaches={coaches}
                  onUpdateStudent={handleUpdateStudent}
                  onDeleteStudent={handleDeleteStudent}
                  onBulkDeleteStudents={handleBulkDeleteStudents}
                  onToggleStudentActive={handleToggleStudentActive}
                  onBulkToggleStudentsActive={handleBulkToggleStudentsActive}
                  onAddSede={handleAddSede}
                  onNavigateToRegistration={() => setActiveRole(null)}
                />
              )}

              {currentTab === 'players' && (
                <PlayersManagement
                  students={students}
                  payments={payments}
                  onAddStudent={handleAddStudent}
                  onUpdateStudent={handleUpdateStudent}
                  onDeleteStudent={handleDeleteStudent}
                />
              )}

              {currentTab === 'validation' && (
                <PaymentsValidation
                  payments={payments}
                  students={students}
                  onApprovePayment={handleApprovePayment}
                  onRejectPayment={handleRejectPayment}
                  onViewDigitalReceipt={handleViewDigitalReceipt}
                />
              )}

              {currentTab === 'billing' && (
                <BillingAndReminders
                  cycles={cycles}
                  students={students}
                  onGenerateCycle={handleGenerateCycle}
                  onSendBroadcastReminder={handleSendBroadcastReminder}
                  onSendStudentReminderWhatsApp={handleSendStudentReminderWhatsApp}
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
              {(currentTab === 'account' || currentTab === 'dashboard') && currentStudent && (
                <AccountStatus
                  currentStudent={currentStudent}
                  students={
                    // Si es padre de familia, mostrar sus hijos; si es jugador adulto, solo a sí mismo
                    (() => {
                      const family = students.filter((s) => {
                        if (s.id === currentStudent.id) return true;
                        const normTutor = (currentStudent.tutorName || '').toLowerCase().trim();
                        const sNormTutor = (s.tutorName || '').toLowerCase().trim();
                        const tutorPhoneDigits = (currentStudent.tutorPhone || currentStudent.whatsapp || '').replace(/\D/g, '');
                        const sTutorDigits = (s.tutorPhone || s.whatsapp || '').replace(/\D/g, '');
                        return (
                          (Boolean(normTutor) && Boolean(sNormTutor) && normTutor === sNormTutor) ||
                          (tutorPhoneDigits.length >= 7 && sTutorDigits.length >= 7 && sTutorDigits.slice(-10) === tutorPhoneDigits.slice(-10))
                        );
                      });
                      return family.length > 0 ? family : [currentStudent];
                    })()
                  }
                  onSelectStudent={setCurrentStudent}
                  payments={payments}
                  onNavigateToPay={() => setCurrentTab('register_payment')}
                  onNavigateToHistory={() => setCurrentTab('history')}
                  onViewDigitalReceipt={handleViewDigitalReceipt}
                />
              )}

              {(currentTab === 'account' || currentTab === 'dashboard') && !currentStudent && (
                <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center text-xs text-neutral-400">
                  <p className="font-semibold text-neutral-700">Cargando datos del alumno...</p>
                  <p className="mt-1">Si la información tarda en aparecer, pulsa en tu perfil o refresca la página.</p>
                </div>
              )}

              {currentTab === 'register_payment' && currentStudent && (
                <RegisterPayment
                  currentStudent={currentStudent}
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
                  onNavigateToPay={() => setCurrentTab('register_payment')}
                />
              )}

              {currentTab === 'announcements' && (
                <AnnouncementsModule
                  comunicados={comunicados}
                  onComunicadosUpdated={handleComunicadosUpdated}
                  students={students}
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
