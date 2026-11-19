import { PaymentRecord, SystemNotification } from '../types';

export type BrowserNotifPermission = NotificationPermission | 'unsupported';

export const CLUB_LOGO_URL =
  'https://avchpdtkogejgnomkxua.supabase.co/storage/v1/object/public/iconos/geckoslogo.png';

const CLUB_ICON_URL =
  'https://avchpdtkogejgnomkxua.supabase.co/storage/v1/object/public/iconos/geckosicono.png';

const IMAGE_EXTENSION_RE = /\.(png|jpe?g|webp|gif|svg|bmp|ico)(\?.*)?$/i;

let sharedAudioCtx: AudioContext | null = null;
let audioUnlockInstalled = false;

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
 * Valida que una URL corresponda a un archivo de audio (y no a una imagen como .png/.jpg).
 */
export const isValidAudioUrl = (url?: string | null): boolean => {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith('data:audio/')) {
    return false;
  }
  if (IMAGE_EXTENSION_RE.test(trimmed)) {
    return false;
  }
  return true;
};

const getOrCreateAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioCtx();
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
};

/**
 * Desbloquea el audio del navegador tras el primer toque/clic del usuario para que las alertas
 * entrantes puedan sonar sin ser bloqueadas por políticas de autoplay.
 */
export const installAudioUnlockListener = (): (() => void) => {
  if (typeof window === 'undefined' || audioUnlockInstalled) return () => {};
  audioUnlockInstalled = true;

  const unlock = () => {
    const ctx = getOrCreateAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  };

  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock, { passive: true });

  return () => {
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
    audioUnlockInstalled = false;
  };
};

/**
 * Reproduce el tono integrado de alerta con Web Audio API (sin archivos externos).
 */
export const playBuiltInChime = (): void => {
  const ctx = getOrCreateAudioContext();
  if (!ctx) return;

  try {
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;

    const playTone = (freq: number, startOffset: number, duration: number, peakGain: number) => {
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

    // Acorde de notificación claro (tres notas ascendentes suaves)
    playTone(880, 0, 0.13, 0.14);
    playTone(1174.66, 0.11, 0.16, 0.15);
    playTone(1396.91, 0.24, 0.26, 0.13);
  } catch {
    // Silencioso si el navegador bloquea audio antes de interacción
  }
};

/**
 * Reproduce el sonido personalizado configurado (MP3/WAV/OGG) si es válido;
 * si no hay URL de audio válida o falla la reproducción, usa automáticamente el tono integrado.
 */
export const playNotificationSound = (customSoundUrl?: string): void => {
  if (typeof window === 'undefined') return;

  if (isValidAudioUrl(customSoundUrl)) {
    try {
      const audio = new Audio(customSoundUrl!.trim());
      audio.volume = 0.85;
      audio.onerror = () => {
        playBuiltInChime();
      };
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          playBuiltInChime();
        });
      }
      return;
    } catch {
      // Caer al tono integrado
    }
  }

  playBuiltInChime();
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
