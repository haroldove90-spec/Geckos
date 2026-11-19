import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  UserRole,
  Student,
  PaymentRecord,
  BillingCycle,
  SystemNotification,
  SupabaseConfig,
  Comunicado,
  ClubSettings,
  SedeDetailInfo,
} from './types';
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
  getStoredClubSettings,
  saveClubSettings,
} from './utils/storage';
import { supabaseService, getSupabaseClient } from './utils/supabaseClient';
import { Bell, X, ArrowUpRight, ShieldAlert } from 'lucide-react';
import { buildOverdueNotifications, getStudentEffectiveBilling } from './utils/billingUtils';
import {
  BrowserNotifPermission,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  playNotificationSound,
  sendBrowserNotification,
  buildMissingPendingPaymentNotifications,
  installAudioUnlockListener,
} from './utils/browserNotifications';

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
import { NotificationsBox, filterNotificationsForUser } from './components/PlayerParent/NotificationsBox';
import { OfficialSocials } from './components/OfficialSocials';
import { DigitalReceiptModal } from './components/DigitalReceiptModal';
import { DataManagementModal } from './components/DataManagementModal';
import { DocumentationPDFModal } from './components/DocumentationPDFModal';
import { NotificationPopupModal } from './components/NotificationPopupModal';
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
  const [clubSettings, setClubSettings] = useState<ClubSettings>(() => getStoredClubSettings());
  const [browserNotifPermission, setBrowserNotifPermission] = useState<BrowserNotifPermission>(() =>
    getBrowserNotificationPermission()
  );
  const [liveToast, setLiveToast] = useState<{
    title: string;
    message: string;
    count?: number;
    actionLabel?: string;
    onAction?: () => void;
    secondaryLabel?: string;
    onSecondaryAction?: () => void;
  } | null>(null);
  const [isNotifPopupOpen, setIsNotifPopupOpen] = useState<boolean>(false);
  const seenPendingPaymentIdsRef = useRef<Set<string> | null>(null);
  const seenUserNotifIdsRef = useRef<Set<string> | null>(null);
  const lastPopupSignatureRef = useRef<string>('');
  const studentsRef = useRef<Student[]>([]);
  const currentStudentRef = useRef<Student | null>(null);
  const clubSettingsRef = useRef<ClubSettings>(clubSettings);

  useEffect(() => {
    studentsRef.current = students;
  }, [students]);

  useEffect(() => {
    currentStudentRef.current = currentStudent;
  }, [currentStudent]);

  useEffect(() => {
    clubSettingsRef.current = clubSettings;
  }, [clubSettings]);

  // Desbloquear reproducción de sonido en el primer toque/clic del usuario
  useEffect(() => {
    return installAudioUnlockListener();
  }, []);

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
          clubSettingsRes,
        ] = await Promise.all([
          supabaseService.fetchStudents(),
          supabaseService.fetchPayments(),
          supabaseService.fetchSedes(),
          syncUsersFromSupabase(),
          supabaseService.fetchComunicados(),
          supabaseService.fetchBillingCycles(),
          supabaseService.fetchNotifications(),
          supabaseService.fetchClubSettings(),
        ]);

        if (clubSettingsRes.settings) {
          const mergedSettings: ClubSettings = {
            ...getStoredClubSettings(),
            ...clubSettingsRes.settings,
            socials:
              clubSettingsRes.settings.socials.length > 0
                ? clubSettingsRes.settings.socials
                : getStoredClubSettings().socials,
            sedeDetails:
              clubSettingsRes.settings.sedeDetails.length > 0
                ? clubSettingsRes.settings.sedeDetails
                : getStoredClubSettings().sedeDetails,
          };
          setClubSettings(mergedSettings);
          saveClubSettings(mergedSettings);
        }

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
        seenPendingPaymentIdsRef.current = new Set(
          effectivePayments.filter((p) => p.status === 'pendiente').map((p) => p.id)
        );

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

        // Respaldo automático: asegurar que todo pago `pendiente` tenga su notificación para Admin
        const missingPendingNotifs = buildMissingPendingPaymentNotifications(
          effectivePayments,
          effectiveNotifs
        );
        if (missingPendingNotifs.length > 0) {
          effectiveNotifs = [...missingPendingNotifs, ...effectiveNotifs];
          setNotifications(effectiveNotifs);
          saveNotifications(effectiveNotifs);
          missingPendingNotifs.forEach((n) => {
            supabaseService.upsertNotification(n).catch(console.warn);
          });
        }

        // Detección automática de fecha límite vencida al sincronizar
        const autoOverdueNotifs = buildOverdueNotifications(
          effectiveStudents,
          effectiveCycles,
          effectivePayments,
          effectiveNotifs
        );
        if (autoOverdueNotifs.length > 0) {
          effectiveNotifs = [...autoOverdueNotifs, ...effectiveNotifs];
          setNotifications(effectiveNotifs);
          saveNotifications(effectiveNotifs);
          autoOverdueNotifs.forEach((n) => {
            supabaseService.upsertNotification(n).catch(console.warn);
          });
        }

        seenUserNotifIdsRef.current = new Set(effectiveNotifs.map((n) => n.id));
      } catch (err) {
        console.info('Supabase background sync notice:', err);
      }
    };

    syncFromSupabase();
  }, []);

  // Activar permiso de notificaciones nativas con sonido en el dispositivo
  const handleEnableBrowserNotifications = async () => {
    const perm = await requestBrowserNotificationPermission();
    setBrowserNotifPermission(perm);
    if (perm === 'granted') {
      playNotificationSound(clubSettingsRef.current.notificationSoundUrl);
      sendBrowserNotification(
        'Alertas Activadas · Geckos Voleibol',
        'Recibirás avisos inmediatos con popup y sonido cuando haya movimientos de pagos.'
      );
      setLiveToast({
        title: 'Alertas activadas en este dispositivo',
        message: 'Recibirás aviso inmediato, popup y sonido cuando lleguen nuevos pagos o validaciones.',
      });
    }
  };

  // Guardar URL de sonido personalizado de notificaciones (Solo Admin)
  const handleSaveNotificationSoundUrl = async (url: string) => {
    const nextSettings: ClubSettings = {
      ...clubSettings,
      notificationSoundUrl: url.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };
    return await handleSaveClubSettings(nextSettings);
  };

  // Sincronización en tiempo real (Supabase Realtime + inmediata al iniciar/volver + respaldo cada 20s)
  // Permite que Administrador, Entrenadores y Papás reciban alertas en vivo sin recargar la página
  useEffect(() => {
    if (!currentUser || !activeRole) return;
    let isDisposed = false;

    const refreshLiveData = async () => {
      try {
        const [paymentsRes, notifsRes, sedesRes, clubSettingsRes, studentsRes] = await Promise.all([
          supabaseService.fetchPayments(),
          supabaseService.fetchNotifications(),
          supabaseService.fetchSedes(),
          supabaseService.fetchClubSettings(),
          supabaseService.fetchStudents(),
        ]);

        if (isDisposed) return;

        let latestStudents = studentsRef.current;
        if (studentsRes.students) {
          const deletedSet = getDeletedStudentIds();
          const validRemote = studentsRes.students.filter((r) => !deletedSet.has(r.id));
          const localMap = new Map(studentsRef.current.map((s) => [s.id, s]));
          const mergedStudents: Student[] = validRemote.map((remote) => {
            const local = localMap.get(remote.id);
            return {
              ...remote,
              password: remote.password || local?.password || '',
              username: remote.username || local?.username || '',
              email: remote.email || local?.email || remote.tutorEmail || '',
            };
          });
          latestStudents = mergedStudents;
          setStudents(mergedStudents);
          saveStudents(mergedStudents);
          const resolved = resolveStudentForUser(currentUser, mergedStudents);
          if (resolved) {
            setCurrentStudent(resolved);
          }
        }

        let freshPaymentsList: PaymentRecord[] | null = null;
        if (paymentsRes.payments) {
          const freshPayments = paymentsRes.payments;
          freshPaymentsList = freshPayments;
          setPayments(freshPayments);
          savePayments(freshPayments);

          const freshPending = freshPayments.filter((p) => p.status === 'pendiente');
          if (seenPendingPaymentIdsRef.current) {
            const newlyArrived = freshPending.filter(
              (p) => !seenPendingPaymentIdsRef.current!.has(p.id)
            );
            if (
              newlyArrived.length > 0 &&
              (activeRole === 'head_coach' || activeRole === 'coach_assistant')
            ) {
              const relevantNew = newlyArrived.filter((p) => {
                if (activeRole === 'head_coach') return true;
                if (p.coachId && p.coachId === currentUser.id) return true;
                const st = latestStudents.find((s) => s.id === p.studentId);
                if (st?.assignedCoachId && st.assignedCoachId === currentUser.id) return true;
                if (
                  st?.assignedCoachName &&
                  currentUser.name &&
                  st.assignedCoachName.toLowerCase() === currentUser.name.toLowerCase()
                ) {
                  return true;
                }
                return false;
              });
              if (relevantNew.length > 0) {
                const latest = relevantNew[0];
                const totalPendingNow = freshPending.filter((p) => {
                  if (activeRole === 'head_coach') return true;
                  if (p.coachId && p.coachId === currentUser.id) return true;
                  const st = latestStudents.find((s) => s.id === p.studentId);
                  if (st?.assignedCoachId && st.assignedCoachId === currentUser.id) return true;
                  return false;
                }).length;
                const badgeNum = Math.max(relevantNew.length, totalPendingNow);
                const toastTitle =
                  badgeNum === 1
                    ? '1 notificación nueva · Pago por autorizar'
                    : `${badgeNum} notificaciones nuevas · Pagos por autorizar`;
                const toastMsg =
                  relevantNew.length === 1
                    ? `${latest.studentName} reportó $${latest.amount} MXN (${latest.concept}).`
                    : `${latest.studentName} y ${relevantNew.length - 1} más reportaron comprobantes de pago.`;

                setLiveToast({
                  title: toastTitle,
                  message: toastMsg,
                  count: badgeNum,
                  actionLabel: `Ver (${badgeNum})`,
                  onAction: () => {
                    setIsNotifPopupOpen(true);
                  },
                  secondaryLabel: 'Validar',
                  onSecondaryAction: () => {
                    setCurrentTab('validation');
                    setLiveToast(null);
                  },
                });
                setIsNotifPopupOpen(true);
                playNotificationSound(clubSettingsRef.current.notificationSoundUrl);
                sendBrowserNotification(toastTitle, toastMsg, {
                  tag: `pay-batch-${latest.id}`,
                  onClick: () => {
                    setIsNotifPopupOpen(true);
                  },
                });
              }
            }
          }
          seenPendingPaymentIdsRef.current = new Set(freshPending.map((p) => p.id));
        }

        if (notifsRes.notifications) {
          let mergedNotifs: SystemNotification[] = [];
          setNotifications((prevLocal) => {
            const remoteMap = new Map(
              notifsRes.notifications!.map((n: SystemNotification) => [n.id, n])
            );
            // Preservar lectura local si aún no se refleja en nube
            prevLocal.forEach((ln) => {
              const remoteItem = remoteMap.get(ln.id);
              if (remoteItem && ln.read && !remoteItem.read) {
                remoteMap.set(ln.id, { ...remoteItem, read: true });
              }
            });
            let merged = Array.from(remoteMap.values());

            // Respaldo: garantizar notificación para todo pago pendiente activo
            if (freshPaymentsList) {
              const missingPending = buildMissingPendingPaymentNotifications(
                freshPaymentsList,
                merged
              );
              if (missingPending.length > 0) {
                merged = [...missingPending, ...merged];
                missingPending.forEach((n) => {
                  supabaseService.upsertNotification(n).catch(console.warn);
                });
              }
            }

            mergedNotifs = merged;
            saveNotifications(merged);
            return merged;
          });

          // Notificar en vivo a Papás / Alumnos cuando llega aprobación, rechazo o recordatorio nuevo
          if (
            seenUserNotifIdsRef.current &&
            (activeRole === 'parent' || activeRole === 'player')
          ) {
            const activeStudent = currentStudentRef.current;
            const visibleForParent = filterNotificationsForUser(
              notifsRes.notifications,
              activeRole,
              currentUser,
              activeStudent
            );
            const newlyArrivedForParent = visibleForParent.filter(
              (n) => !n.read && !seenUserNotifIdsRef.current!.has(n.id)
            );
            if (newlyArrivedForParent.length > 0) {
              const latestN = newlyArrivedForParent[0];
              const unreadTotalForParent = visibleForParent.filter((n) => !n.read).length;
              const badgeNum = Math.max(newlyArrivedForParent.length, unreadTotalForParent);
              setLiveToast({
                title:
                  badgeNum === 1 ? latestN.title : `${badgeNum} notificaciones nuevas`,
                message: latestN.message,
                count: badgeNum,
                actionLabel: `Ver (${badgeNum})`,
                onAction: () => {
                  setIsNotifPopupOpen(true);
                },
                secondaryLabel:
                  latestN.type === 'payment_approved' ? 'Historial' : 'Avisos',
                onSecondaryAction: () => {
                  setCurrentTab(
                    latestN.type === 'payment_approved' ? 'history' : 'notifications'
                  );
                  setLiveToast(null);
                },
              });
              setIsNotifPopupOpen(true);
              playNotificationSound(clubSettingsRef.current.notificationSoundUrl);
              sendBrowserNotification(
                badgeNum === 1 ? latestN.title : `${badgeNum} notificaciones nuevas`,
                latestN.message,
                {
                  tag: `notif-${latestN.id}`,
                  onClick: () => setIsNotifPopupOpen(true),
                }
              );
            }
          }

          if (mergedNotifs.length > 0) {
            seenUserNotifIdsRef.current = new Set(mergedNotifs.map((n) => n.id));
          } else {
            seenUserNotifIdsRef.current = new Set(
              notifsRes.notifications.map((n: SystemNotification) => n.id)
            );
          }
        }

        if (sedesRes.sedes && sedesRes.sedes.length > 0) {
          setSedes(sedesRes.sedes);
          saveSedes(sedesRes.sedes);
        }

        if (clubSettingsRes.settings) {
          setClubSettings((prev) => {
            const next: ClubSettings = {
              ...prev,
              ...clubSettingsRes.settings!,
              socials:
                clubSettingsRes.settings!.socials.length > 0
                  ? clubSettingsRes.settings!.socials
                  : prev.socials,
              sedeDetails:
                clubSettingsRes.settings!.sedeDetails.length > 0
                  ? clubSettingsRes.settings!.sedeDetails
                  : prev.sedeDetails,
            };
            saveClubSettings(next);
            return next;
          });
        }
      } catch {
        // Silencioso en sondeo de fondo
      }
    };

    // Ejecutar sincronización inmediata al iniciar sesión o cambiar de rol
    refreshLiveData();

    const unsubscribeRealtime = supabaseService.subscribeToLiveUpdates(() => {
      refreshLiveData();
    });

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        refreshLiveData();
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    const intervalId = window.setInterval(refreshLiveData, 20000);

    return () => {
      isDisposed = true;
      unsubscribeRealtime();
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.clearInterval(intervalId);
    };
  }, [currentUser?.id, activeRole]);

  // Guardar configuración institucional (Redes Sociales, Sedes, Canchas y Horarios)
  const handleSaveClubSettings = async (
    nextSettings: ClubSettings
  ): Promise<{ success: boolean; error?: string }> => {
    const withTimestamp: ClubSettings = {
      ...nextSettings,
      updatedAt: new Date().toISOString(),
    };
    setClubSettings(withTimestamp);
    saveClubSettings(withTimestamp);
    return await supabaseService.upsertClubSettings(withTimestamp);
  };

  // Sede & Registration Handlers
  const handleAddSede = (newSede: string) => {
    const clean = newSede.trim();
    if (!clean) return;
    if (!sedes.some((s) => s.toLowerCase() === clean.toLowerCase())) {
      const updated = [...sedes, clean];
      setSedes(updated);
      saveSedes(updated);
      supabaseService.addSede(clean).catch(console.warn);

      // Asegurar que la nueva sede aparezca también en clubSettings.sedeDetails
      if (!clubSettings.sedeDetails.some((d) => d.name.toLowerCase() === clean.toLowerCase())) {
        const nextDetail: SedeDetailInfo = {
          name: clean,
          address: `Instalaciones deportivas Sede ${clean}.`,
          schedule: 'Lunes a Jueves: 16:30 a 20:00 hrs. Sábados: Jornada de Liga.',
          paymentHours: 'Lunes y Miércoles de 17:00 a 19:00 hrs directamente en mesa técnica.',
        };
        const nextSettings: ClubSettings = {
          ...clubSettings,
          sedeDetails: [...clubSettings.sedeDetails, nextDetail],
          updatedAt: new Date().toISOString(),
        };
        setClubSettings(nextSettings);
        saveClubSettings(nextSettings);
        supabaseService.upsertClubSettings(nextSettings).catch(console.warn);
      }
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

    // 2. Actualizar detalles de sede en clubSettings
    const updatedDetails = clubSettings.sedeDetails.map((d) =>
      d.name === oldName ? { ...d, name: cleanNew } : d
    );
    const nextSettings: ClubSettings = {
      ...clubSettings,
      sedeDetails: updatedDetails,
      updatedAt: new Date().toISOString(),
    };
    setClubSettings(nextSettings);
    saveClubSettings(nextSettings);
    supabaseService.upsertClubSettings(nextSettings).catch(console.warn);

    // 3. Actualizar en cascada alumnos locales que pertenecían a la sede anterior
    const updatedStudents = students.map((st) =>
      st.campus === oldName ? { ...st, campus: cleanNew } : st
    );
    updateStudents(updatedStudents);

    if (currentStudent?.campus === oldName) {
      setCurrentStudent({ ...currentStudent, campus: cleanNew });
    }

    // 4. Actualizar usuarios locales (coaches y alumnos)
    const storedUsers = getStoredUsers();
    const updatedUsers = storedUsers.map((u) =>
      u.campus === oldName ? { ...u, campus: cleanNew } : u
    );
    saveStoredUsers(updatedUsers);
    setCoaches(updatedUsers.filter((u) => u.role === 'coach_assistant'));

    // 5. Persistir en Supabase (tabla sedes + cascada en students y system_users)
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

  // Stage 3: Student/Parent Registers Payment (Async with guaranteed Supabase persistence)
  const handleSubmitPayment = async (
    paymentData: Omit<PaymentRecord, 'id' | 'reportedDate' | 'status'>
  ): Promise<{ success: boolean; error?: string }> => {
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

    const nowTs = Date.now();
    const nowDateStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const newPayment: PaymentRecord = {
      ...paymentData,
      coachId: finalCoachId,
      coachName: finalCoachName,
      isPartial: computedPartial,
      expectedAmount: computedExpected,
      remainingBalance: computedRemaining,
      id: `pay-${nowTs}`,
      reportedDate: nowDateStr,
      status: 'pendiente',
    };

    const updatedPayments = [newPayment, ...payments];
    updatePayments(updatedPayments);

    // If it's a regular monthly fee, update student status to 'en_revision'
    let studentToSync: Student | undefined;
    if (!isExtra) {
      const updatedStudents = students.map((s) =>
        s.id === paymentData.studentId ? { ...s, status: 'en_revision' as Student['status'] } : s
      );
      updateStudents(updatedStudents);
      studentToSync = updatedStudents.find((s) => s.id === paymentData.studentId);
      if (currentStudent?.id === paymentData.studentId) {
        setCurrentStudent({ ...currentStudent, status: 'en_revision' });
      }
    }

    // Notify Head Coach Admin, Assigned Assistant Coach (if not an admin), and Confirm to Parent/Student
    const notifTitle = isExtra
      ? 'Nuevo Pago Extra Reportado (Comprobante Subido)'
      : computedPartial
      ? 'Nuevo Abono / Pago Parcial Reportado'
      : 'Nuevo Comprobante de Pago Reportado';
    const notifMessage = isExtra
      ? `${paymentData.studentName} ha subido comprobante por $${paymentData.amount} MXN (${paymentData.method}) para ${paymentData.concept}.`
      : computedPartial
      ? `${paymentData.studentName} reportó un abono parcial de $${paymentData.amount} MXN (${paymentData.method}); restará $${computedRemaining} MXN por cubrir.`
      : `${paymentData.studentName} ha subido un comprobante por $${paymentData.amount} MXN (${paymentData.method}) para ${paymentData.concept}.`;

    const adminNotif: SystemNotification = {
      id: `notif-${nowTs}-admin`,
      targetRole: 'admin',
      studentId: paymentData.studentId,
      title: notifTitle,
      message: `${notifMessage} (Receptor asignado: ${finalCoachName || 'General'}).`,
      date: nowDateStr,
      type: 'new_payment_submitted',
      read: false,
    };

    const parentConfirmNotif: SystemNotification = {
      id: `notif-${nowTs}-parent`,
      targetRole: 'parents',
      studentId: paymentData.studentId,
      title: 'Comprobante Recibido · En Revisión',
      message: `Recibimos tu comprobante por $${paymentData.amount} MXN (${paymentData.concept}). Ha sido enviado al Administrador para su validación; te avisaremos aquí en cuanto sea aprobado.`,
      date: nowDateStr,
      type: 'reminder',
      read: false,
    };

    const newNotifs: SystemNotification[] = [adminNotif, parentConfirmNotif];

    // Solo generar notificación separada de entrenador si el asignado es Entrenador Asistente (evita duplicados al Admin)
    const isAssignedAssistant =
      Boolean(finalCoachId) &&
      coaches.some((c) => c.id === finalCoachId && c.role === 'coach_assistant');

    if (isAssignedAssistant && finalCoachId) {
      const coachNotif: SystemNotification = {
        id: `notif-${nowTs}-coach`,
        targetRole: 'coach',
        coachId: finalCoachId,
        studentId: paymentData.studentId,
        title: notifTitle,
        message: `${notifMessage} (Pago asignado a ti para validación).`,
        date: nowDateStr,
        type: 'new_payment_submitted',
        read: false,
      };
      newNotifs.push(coachNotif);
    }

    updateNotifications([...newNotifs, ...notifications]);
    if (seenUserNotifIdsRef.current) {
      newNotifs.forEach((n) => seenUserNotifIdsRef.current!.add(n.id));
    }

    // Esperar a que pago, alumno y TODAS las notificaciones se guarden en Supabase antes de confirmar éxito
    const errors: string[] = [];
    const [payRes, ...notifResults] = await Promise.all([
      supabaseService.upsertPayment(newPayment),
      ...newNotifs.map((n) => supabaseService.upsertNotification(n)),
      ...(studentToSync ? [supabaseService.upsertStudent(studentToSync)] : []),
    ]);

    if (!payRes.success && payRes.error) {
      errors.push(`Pago: ${payRes.error}`);
    }
    notifResults.forEach((res) => {
      if (res && !res.success && res.error) {
        errors.push(`Aviso: ${res.error}`);
      }
    });

    if (errors.length > 0) {
      return { success: false, error: errors[0] };
    }
    return { success: true };
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

    // Add confirmation notification to the student/parent & mark matching pending admin alerts as read
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
    const markedReadNotifs: SystemNotification[] = [];
    const refreshedNotifs = notifications.map((n) => {
      if (
        !n.read &&
        n.type === 'new_payment_submitted' &&
        (n.id === `notif-pending-${paymentId}` || n.studentId === targetPay.studentId)
      ) {
        const updatedN = { ...n, read: true };
        markedReadNotifs.push(updatedN);
        return updatedN;
      }
      return n;
    });
    updateNotifications([approvedNotif, ...refreshedNotifs]);
    supabaseService.upsertNotification(approvedNotif).catch(console.warn);
    markedReadNotifs.forEach((n) => {
      supabaseService.upsertNotification(n).catch(console.warn);
    });
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

    // Notify user of rejection reason so they can re-upload & mark matching admin alert as read
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
    const markedReadNotifs: SystemNotification[] = [];
    const refreshedNotifs = notifications.map((n) => {
      if (
        !n.read &&
        n.type === 'new_payment_submitted' &&
        (n.id === `notif-pending-${paymentId}` || n.studentId === targetPay.studentId)
      ) {
        const updatedN = { ...n, read: true };
        markedReadNotifs.push(updatedN);
        return updatedN;
      }
      return n;
    });
    updateNotifications([rejectNotif, ...refreshedNotifs]);
    supabaseService.upsertNotification(rejectNotif).catch(console.warn);
    markedReadNotifs.forEach((n) => {
      supabaseService.upsertNotification(n).catch(console.warn);
    });
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

  // Notificaciones: Marcar como leídas (local + Supabase), borrado individual y vaciado
  const handleMarkNotifAsRead = (id: string) => {
    const target = notifications.find((n) => n.id === id);
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    updateNotifications(updated);
    if (target && !target.read) {
      supabaseService.upsertNotification({ ...target, read: true }).catch(console.warn);
    }
  };

  const handleMarkAllNotifsAsRead = () => {
    const visibleIds = new Set(
      filterNotificationsForUser(notifications, activeRole, currentUser, currentStudent).map(
        (n) => n.id
      )
    );
    const toSync: SystemNotification[] = [];
    const updated = notifications.map((n) => {
      if (visibleIds.has(n.id) && !n.read) {
        const readNotif = { ...n, read: true };
        toSync.push(readNotif);
        return readNotif;
      }
      return n;
    });
    updateNotifications(updated);
    toSync.forEach((n) => {
      supabaseService.upsertNotification(n).catch(console.warn);
    });
  };

  const handleDeleteNotification = async (notifId: string) => {
    const updated = notifications.filter((n) => n.id !== notifId);
    updateNotifications(updated);
    await supabaseService.deleteNotification(notifId);
  };

  const handleClearNotifications = async () => {
    if (isAdmin && activeRole === 'head_coach') {
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

    const updatedDetails = clubSettings.sedeDetails.filter(
      (d) => d.name.toLowerCase() !== sedeName.toLowerCase()
    );
    const nextSettings: ClubSettings = {
      ...clubSettings,
      sedeDetails: updatedDetails,
      updatedAt: new Date().toISOString(),
    };
    setClubSettings(nextSettings);
    saveClubSettings(nextSettings);
    supabaseService.upsertClubSettings(nextSettings).catch(console.warn);

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

  const scopedNotifications = useMemo(
    () => filterNotificationsForUser(notifications, activeRole, currentUser, currentStudent),
    [notifications, activeRole, currentUser, currentStudent]
  );

  const unreadScopedNotifications = useMemo(
    () => scopedNotifications.filter((n) => !n.read),
    [scopedNotifications]
  );

  const unreadNotifsCount = unreadScopedNotifications.length;

  // Abrir automáticamente el Popup de Notificaciones (con sonido) cuando el Admin/Coach entra
  // y tiene notificaciones sin leer o pagos pendientes por autorizar (agrupados: ej. "5 notificaciones")
  useEffect(() => {
    if (!currentUser || !activeRole) {
      lastPopupSignatureRef.current = '';
      setIsNotifPopupOpen(false);
      return;
    }

    const activeUnreadCount = unreadScopedNotifications.length;
    const effectiveAlertTotal = isCoach
      ? Math.max(activeUnreadCount, pendingValidationsCount)
      : activeUnreadCount;

    if (effectiveAlertTotal === 0) {
      return;
    }

    // Construir firma única del lote actual de alertas para abrir el popup una sola vez por lote
    const unreadKey = unreadScopedNotifications
      .map((n) => n.id)
      .slice(0, 15)
      .join(',');
    const batchSignature = `${activeRole}|${currentUser.id}|p:${pendingValidationsCount}|u:${unreadKey}`;

    if (batchSignature !== lastPopupSignatureRef.current) {
      lastPopupSignatureRef.current = batchSignature;
      // Para Admin/Coach: abrir popup automáticamente al detectar pendientes/no leídas
      if (isCoach) {
        setIsNotifPopupOpen(true);
        playNotificationSound(clubSettingsRef.current.notificationSoundUrl);
      }
    }
  }, [
    currentUser?.id,
    activeRole,
    isCoach,
    pendingValidationsCount,
    unreadScopedNotifications,
  ]);

  // Al minimizar el popup, mantener una ventana flotante compacta con el conteo exacto ("5 notificaciones · Ver")
  const handleMinimizePopupToFloating = () => {
    setIsNotifPopupOpen(false);
    const totalActive = isCoach
      ? Math.max(unreadNotifsCount, pendingValidationsCount)
      : unreadNotifsCount;
    if (totalActive > 0) {
      const latestItem = unreadScopedNotifications[0];
      setLiveToast({
        title:
          totalActive === 1
            ? '1 notificación pendiente'
            : `${totalActive} notificaciones pendientes`,
        message: latestItem
          ? latestItem.message
          : isCoach
          ? `Tienes ${pendingValidationsCount} comprobante(s) esperando validación.`
          : 'Tienes avisos nuevos sin leer.',
        count: totalActive,
        actionLabel: `Ver (${totalActive})`,
        onAction: () => {
          setIsNotifPopupOpen(true);
        },
        secondaryLabel: isCoach && pendingValidationsCount > 0 ? 'Validar' : 'Bandeja',
        onSecondaryAction: () => {
          setCurrentTab(isCoach && pendingValidationsCount > 0 ? 'validation' : 'notifications');
          setLiveToast(null);
        },
      });
    }
  };

  // Botón de prueba rápida del Popup y Sonido desde la bandeja de Notificaciones
  const handleTestPopupAndSound = () => {
    playNotificationSound(clubSettingsRef.current.notificationSoundUrl);
    setIsNotifPopupOpen(true);
    const totalForToast = Math.max(
      1,
      isCoach ? Math.max(unreadNotifsCount, pendingValidationsCount) : unreadNotifsCount
    );
    setLiveToast({
      title:
        totalForToast === 1
          ? '1 notificación activa'
          : `${totalForToast} notificaciones activas`,
      message: 'Ventana flotante y popup de alertas funcionando correctamente.',
      count: totalForToast,
      actionLabel: `Ver (${totalForToast})`,
      onAction: () => setIsNotifPopupOpen(true),
    });
  };

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
        unreadNotifsCount={unreadNotifsCount}
        recentNotifications={scopedNotifications}
        browserNotifPermission={browserNotifPermission}
        onEnableBrowserNotifications={handleEnableBrowserNotifications}
        onSwitchRoleView={handleSwitchRoleView}
        onNavigateToProfile={() => setCurrentTab('profile')}
        onNavigateToNotifications={() => setCurrentTab('notifications')}
        onNavigateToValidation={() => setCurrentTab('validation')}
        onMarkNotifAsRead={handleMarkNotifAsRead}
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
          {/* Banner Persistente de Pagos Pendientes por Autorizar (Visible para Admin / Coach al entrar) */}
          {isCoach && pendingValidationsCount > 0 && currentTab !== 'validation' && (
            <div className="mb-4 p-3.5 sm:p-4 rounded-2xl bg-amber-50 border-2 border-amber-400 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-amber-400 text-neutral-900 shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-extrabold text-neutral-900 leading-tight">
                    {pendingValidationsCount === 1
                      ? 'Tienes 1 comprobante de pago pendiente por autorizar'
                      : `Tienes ${pendingValidationsCount} comprobantes de pago pendientes por autorizar`}
                  </p>
                  <p className="text-[11px] sm:text-xs text-amber-900/80 mt-0.5">
                    Un papá o alumno reportó un comprobante y está esperando tu validación oficial.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCurrentTab('validation')}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#363435] hover:bg-black text-amber-400 text-xs font-extrabold shadow-xs transition cursor-pointer shrink-0"
              >
                <span>Revisar y Autorizar</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          )}

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

              {currentTab === 'notifications' && (
                <NotificationsBox
                  notifications={notifications}
                  currentStudent={currentStudent}
                  currentUser={currentUser}
                  activeRole={activeRole}
                  pendingValidationsCount={pendingValidationsCount}
                  browserNotifPermission={browserNotifPermission}
                  notificationSoundUrl={clubSettings.notificationSoundUrl || ''}
                  onEnableBrowserNotifications={handleEnableBrowserNotifications}
                  onSaveNotificationSoundUrl={handleSaveNotificationSoundUrl}
                  onTestPopupAndSound={handleTestPopupAndSound}
                  onTestSoundOnly={(overrideUrl) =>
                    playNotificationSound(
                      overrideUrl !== undefined
                        ? overrideUrl
                        : clubSettingsRef.current.notificationSoundUrl
                    )
                  }
                  onMarkAsRead={handleMarkNotifAsRead}
                  onMarkAllAsRead={handleMarkAllNotifsAsRead}
                  onDeleteNotification={handleDeleteNotification}
                  onClearAllNotifications={handleClearNotifications}
                  onNavigateToValidation={() => setCurrentTab('validation')}
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

              {currentTab === 'social' && (
                <OfficialSocials
                  isAdmin={isAdmin}
                  sedes={sedes}
                  clubSettings={clubSettings}
                  onSaveClubSettings={handleSaveClubSettings}
                  onAddSede={handleAddSede}
                  onRenameSede={handleRenameSede}
                  onDeleteSede={handleDeleteSede}
                />
              )}
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
                  adminWhatsappPhone={
                    clubSettings.socials.find((s) => s.id === 'whatsapp')?.handle || ''
                  }
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
                  currentUser={currentUser}
                  activeRole={activeRole}
                  browserNotifPermission={browserNotifPermission}
                  onEnableBrowserNotifications={handleEnableBrowserNotifications}
                  onTestPopupAndSound={handleTestPopupAndSound}
                  onMarkAsRead={handleMarkNotifAsRead}
                  onMarkAllAsRead={handleMarkAllNotifsAsRead}
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

              {currentTab === 'social' && (
                <OfficialSocials
                  isAdmin={false}
                  sedes={sedes}
                  clubSettings={clubSettings}
                  onSaveClubSettings={handleSaveClubSettings}
                />
              )}
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

      {/* 8. Popup Modal de Notificaciones (soporta 1 o múltiples notificaciones agrupadas) */}
      <NotificationPopupModal
        isOpen={isNotifPopupOpen}
        isCoachView={isCoach}
        unreadNotifications={unreadScopedNotifications}
        pendingPaymentsCount={pendingValidationsCount}
        onCloseToFloating={handleMinimizePopupToFloating}
        onMarkOneAsRead={handleMarkNotifAsRead}
        onMarkAllAsRead={handleMarkAllNotifsAsRead}
        onNavigateToValidation={() => {
          setIsNotifPopupOpen(false);
          setLiveToast(null);
          setCurrentTab('validation');
        }}
        onNavigateToNotifications={() => {
          setIsNotifPopupOpen(false);
          setLiveToast(null);
          setCurrentTab('notifications');
        }}
        onNavigateToHistory={() => {
          setIsNotifPopupOpen(false);
          setLiveToast(null);
          setCurrentTab('history');
        }}
      />

      {/* 9. Ventana Flotante Persistente de Notificaciones (muestra conteo agrupado ej. "5 notificaciones · Ver") */}
      {liveToast && !isNotifPopupOpen && (
        <div className="fixed bottom-20 lg:bottom-6 right-3 left-3 sm:left-auto sm:w-96 z-50 bg-[#363435] text-white rounded-2xl shadow-2xl border-2 border-amber-400/60 p-3.5 sm:p-4 flex items-start gap-3 animate-in fade-in">
          <div className="relative p-2 rounded-xl bg-amber-400 text-neutral-900 shrink-0 mt-0.5">
            <Bell className="w-4 h-4" />
            {liveToast.count && liveToast.count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-extrabold flex items-center justify-center border border-[#363435]">
                {liveToast.count > 99 ? '99+' : liveToast.count}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-extrabold text-amber-300 leading-tight">{liveToast.title}</p>
            <p className="text-[11px] text-neutral-200 mt-1 leading-snug line-clamp-2">
              {liveToast.message}
            </p>
            <div className="mt-2.5 flex items-center gap-2 flex-wrap">
              {liveToast.actionLabel && liveToast.onAction && (
                <button
                  type="button"
                  onClick={liveToast.onAction}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-900 text-[11px] font-extrabold transition cursor-pointer"
                >
                  <span>{liveToast.actionLabel}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
              {liveToast.secondaryLabel && liveToast.onSecondaryAction && (
                <button
                  type="button"
                  onClick={liveToast.onSecondaryAction}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold transition cursor-pointer"
                >
                  <span>{liveToast.secondaryLabel}</span>
                </button>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLiveToast(null)}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0"
            aria-label="Cerrar ventana flotante"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
