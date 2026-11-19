import { PaymentRecord, SystemNotification } from '../types';

export type BrowserNotifPermission = NotificationPermission | 'unsupported';

const CLUB_ICON_URL =
  'https://avchpdtkogejgnomkxua.supabase.co/storage/v1/object/public/iconos/geckosicono.png';

export const isBrowserNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

export const getBrowserNotificationPermission = (): BrowserNotifPermission => {
  if (!isBrowserNotificationSupported()) return 'unsupported';
  return window.Notification.permission;
};

export const requestBrowserNotificationPermission = async (): Promise<BrowserNotifPermission> => {
  if (!isBrowserNotificationSupported()) return 'unsupported';
  try {
    const result = await window.Notification.requestPermission();
    return result;
  } catch {
    return window.Notification.permission;
  }
};

/**
 * Reproduce un tono sutil de alerta usando Web Audio API (sin archivos externos).
 */
export const playNotificationSound = (): void => {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const playBeep = (freq: number, startOffset: number, duration: number, peakGain: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + startOffset);
      gain.gain.setValueAtTime(0.001, now + startOffset);
      gain.gain.exponentialRampToValueAtTime(peakGain, now + startOffset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + duration + 0.02);
    };

    playBeep(880, 0, 0.14, 0.12);
    playBeep(1174.66, 0.12, 0.22, 0.14);

    window.setTimeout(() => {
      ctx.close().catch(() => {});
    }, 600);
  } catch {
    // Silencioso si el navegador bloquea audio antes de interacción del usuario
  }
};

/**
 * Lanza una notificación nativa del navegador/dispositivo cuando el usuario otorgó permiso.
 */
export const sendBrowserNotification = (
  title: string,
  body: string,
  options?: { tag?: string; onClick?: () => void }
): boolean => {
  if (!isBrowserNotificationSupported()) return false;
  if (window.Notification.permission !== 'granted') return false;

  try {
    const notif = new window.Notification(title, {
      body,
      icon: CLUB_ICON_URL,
      badge: CLUB_ICON_URL,
      tag: options?.tag,
    });
    if (options?.onClick) {
      notif.onclick = () => {
        window.focus();
        options.onClick?.();
        notif.close();
      };
    }
    return true;
  } catch {
    return false;
  }
};

/**
 * Garantiza que todo pago en estatus `pendiente` tenga una notificación visible para el Administrador,
 * incluso si la escritura previa en `system_notifications` se perdió por desconexión móvil.
 */
export const buildMissingPendingPaymentNotifications = (
  payments: PaymentRecord[],
  existingNotifications: SystemNotification[]
): SystemNotification[] => {
  const pendingPayments = payments.filter((p) => p.status === 'pendiente');
  if (pendingPayments.length === 0) return [];

  const existingIds = new Set(existingNotifications.map((n) => n.id));
  const missing: SystemNotification[] = [];

  for (const pay of pendingPayments) {
    const deterministicId = `notif-pending-${pay.id}`;
    if (existingIds.has(deterministicId)) continue;

    // Verificar si ya existe una notificación admin reciente para este mismo alumno/pago
    const alreadyCovered = existingNotifications.some(
      (n) =>
        n.type === 'new_payment_submitted' &&
        n.targetRole === 'admin' &&
        n.studentId === pay.studentId &&
        (n.message.includes(`$${pay.amount}`) || n.date === pay.reportedDate)
    );
    if (alreadyCovered) continue;

    const isExtra = pay.paymentType === 'extra';
    const isPartial = Boolean(pay.isPartial);
    const title = isExtra
      ? 'Pago Extra Pendiente por Autorizar'
      : isPartial
      ? 'Abono Parcial Pendiente por Autorizar'
      : 'Comprobante de Pago Pendiente por Autorizar';

    const message = `${pay.studentName} reportó $${pay.amount} MXN (${pay.method}) para ${pay.concept}. (Receptor asignado: ${pay.coachName || 'General'}).`;

    missing.push({
      id: deterministicId,
      targetRole: 'admin',
      studentId: pay.studentId,
      title,
      message,
      date: pay.reportedDate || new Date().toISOString().replace('T', ' ').substring(0, 16),
      type: 'new_payment_submitted',
      read: false,
    });
  }

  return missing;
};
