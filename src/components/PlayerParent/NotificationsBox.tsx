import React, { useState } from 'react';
import { SystemNotification, Student, SystemUser, UserRole } from '../../types';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Info,
  Check,
  CreditCard,
  Trash2,
  ArrowUpRight,
  ShieldCheck,
  BellRing,
  Volume2,
  Music,
  Save,
  Sparkles,
} from 'lucide-react';
import {
  BrowserNotifPermission,
  DEFAULT_NOTIFICATION_SOUND_URL,
  isValidAudioUrl,
} from '../../utils/browserNotifications';

interface Props {
  notifications: SystemNotification[];
  currentStudent?: Student | null;
  currentUser?: SystemUser | null;
  activeRole?: UserRole | null;
  pendingValidationsCount?: number;
  browserNotifPermission?: BrowserNotifPermission;
  notificationSoundUrl?: string;
  onEnableBrowserNotifications?: () => void;
  onSaveNotificationSoundUrl?: (url: string) => Promise<{ success: boolean; error?: string } | void> | void;
  onTestPopupAndSound?: () => void;
  onTestSoundOnly?: (overrideUrl?: string) => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onNavigateToPay?: () => void;
  onNavigateToValidation?: () => void;
  onDeleteNotification?: (id: string) => void;
  onClearAllNotifications?: () => void;
}

export const filterNotificationsForUser = (
  notifications: SystemNotification[],
  activeRole?: UserRole | null,
  currentUser?: SystemUser | null,
  currentStudent?: Student | null
): SystemNotification[] => {
  if (activeRole === 'head_coach') {
    return notifications.filter(
      (n) =>
        n.targetRole === 'admin' ||
        (n.type === 'new_payment_submitted' && n.targetRole !== 'coach') ||
        (n.targetRole === 'all' && !n.studentId)
    );
  }

  if (activeRole === 'coach_assistant') {
    return notifications.filter(
      (n) =>
        (n.targetRole === 'coach' && (!n.coachId || n.coachId === currentUser?.id)) ||
        (n.targetRole === 'all' && !n.studentId)
    );
  }

  // Alumno / Padre: aislamiento estricto
  return notifications.filter((n) => {
    if (n.targetRole === 'coach' || n.targetRole === 'admin' || n.type === 'new_payment_submitted') {
      return false;
    }
    if (n.studentId) {
      return Boolean(currentStudent && n.studentId === currentStudent.id);
    }
    return n.targetRole === 'all' || n.targetRole === 'parents' || n.targetRole === 'players';
  });
};

export const NotificationsBox: React.FC<Props> = ({
  notifications,
  currentStudent,
  currentUser,
  activeRole,
  pendingValidationsCount = 0,
  browserNotifPermission = 'unsupported',
  notificationSoundUrl = '',
  onEnableBrowserNotifications,
  onSaveNotificationSoundUrl,
  onTestPopupAndSound,
  onTestSoundOnly,
  onMarkAsRead,
  onMarkAllAsRead,
  onNavigateToPay,
  onNavigateToValidation,
  onDeleteNotification,
  onClearAllNotifications,
}) => {
  const isCoachView = activeRole === 'head_coach' || activeRole === 'coach_assistant';
  const isAdminUser =
    activeRole === 'head_coach' ||
    currentUser?.role === 'head_coach' ||
    currentUser?.username?.toLowerCase() === 'haroldo90' ||
    currentUser?.username?.toLowerCase() === 'clubgeckosvoleibol';
  const [filterMode, setFilterMode] = useState<'all' | 'payments' | 'unread'>('all');
  const [showSoundConfig, setShowSoundConfig] = useState(false);
  const [soundDraftUrl, setSoundDraftUrl] = useState(notificationSoundUrl || '');
  const [soundFeedback, setSoundFeedback] = useState<{ type: 'ok' | 'warn'; text: string } | null>(
    null
  );
  const [savingSound, setSavingSound] = useState(false);

  const scopedNotifs = filterNotificationsForUser(
    notifications,
    activeRole,
    currentUser,
    currentStudent
  );

  const visibleNotifs = scopedNotifs.filter((n) => {
    if (filterMode === 'unread') return !n.read;
    if (filterMode === 'payments') return n.type === 'new_payment_submitted';
    return true;
  });

  const unreadCount = scopedNotifs.filter((n) => !n.read).length;
  const paymentAlertCount = scopedNotifs.filter((n) => n.type === 'new_payment_submitted').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight">
            {isCoachView
              ? 'Centro de Notificaciones y Pagos por Autorizar'
              : 'Bandeja de Avisos y Recordatorios'}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            {isCoachView
              ? 'Alertas en tiempo real de comprobantes reportados por alumnos, abonos parciales y movimientos del club.'
              : 'Alertas sobre fechas límite de cobro, conciliación de pagos y comunicados de la academia.'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {isCoachView && onNavigateToValidation && pendingValidationsCount > 0 && (
            <button
              onClick={onNavigateToValidation}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-neutral-900 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-xs transition cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Ir a Validar ({pendingValidationsCount})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}

          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#363435] bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 shadow-2xs transition cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Marcar todo como leído</span>
            </button>
          )}

          {scopedNotifs.length > 0 && onClearAllNotifications && (
            <button
              onClick={onClearAllNotifications}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 shadow-2xs transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Vaciar bandeja</span>
            </button>
          )}
        </div>
      </div>

      {/* Activación de Notificaciones Nativas, Popup y Sonido en este Dispositivo */}
      <div
        className={`p-3.5 sm:p-4 rounded-2xl border space-y-3 text-xs ${
          browserNotifPermission === 'granted'
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
            : browserNotifPermission === 'denied'
            ? 'bg-neutral-50 border-neutral-200 text-neutral-700'
            : 'bg-amber-50 border-amber-300 text-amber-950'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            {browserNotifPermission === 'granted' ? (
              <Volume2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <BellRing className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold">
                {browserNotifPermission === 'granted'
                  ? 'Alertas en vivo con popup y sonido activadas'
                  : browserNotifPermission === 'denied'
                  ? 'Notificaciones del navegador bloqueadas (Popup y sonido en app activos)'
                  : 'Activa alertas inmediatas con popup y sonido en este dispositivo'}
              </p>
              <p className="text-[11px] opacity-85 mt-0.5">
                {isCoachView
                  ? 'Cuando lleguen 1 o varias notificaciones (ej. 5 pagos al mismo tiempo), se abrirá el popup agrupado, la ventana flotante y sonará la alerta.'
                  : 'Recibirás ventana emergente y sonido cuando tu entrenador apruebe o responda tu comprobante.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {onEnableBrowserNotifications && browserNotifPermission === 'default' && (
              <button
                type="button"
                onClick={onEnableBrowserNotifications}
                className="px-3.5 py-2 rounded-xl bg-[#363435] hover:bg-black text-amber-400 font-extrabold text-xs transition cursor-pointer"
              >
                Activar Alertas
              </button>
            )}

            {onTestPopupAndSound && (
              <button
                type="button"
                onClick={onTestPopupAndSound}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-900 font-bold text-xs transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Probar Popup y Sonido</span>
              </button>
            )}

            {isAdminUser && onSaveNotificationSoundUrl && (
              <button
                type="button"
                onClick={() => {
                  setSoundDraftUrl(notificationSoundUrl || DEFAULT_NOTIFICATION_SOUND_URL);
                  setSoundFeedback(null);
                  setShowSoundConfig((v) => !v);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-800 font-bold text-xs transition cursor-pointer"
              >
                <Music className="w-3.5 h-3.5 text-neutral-700" />
                <span>Sonido MP3</span>
              </button>
            )}
          </div>
        </div>

        {/* Panel Admin: Configurar URL de sonido personalizado (MP3/WAV/OGG) */}
        {isAdminUser && showSoundConfig && onSaveNotificationSoundUrl && (
          <div className="pt-3 border-t border-black/10 space-y-2.5">
            <label className="block text-[11px] font-extrabold text-neutral-800">
              URL del archivo de sonido de notificación (.mp3, .wav u .ogg desde Supabase Storage)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={soundDraftUrl}
                onChange={(e) => {
                  setSoundDraftUrl(e.target.value);
                  setSoundFeedback(null);
                }}
                placeholder={DEFAULT_NOTIFICATION_SOUND_URL}
                className="flex-1 px-3 py-2 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-xs font-mono focus:outline-none focus:border-neutral-900"
              />
              <div className="flex items-center gap-1.5 shrink-0">
                {onTestSoundOnly && (
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = soundDraftUrl.trim();
                      if (trimmed && !isValidAudioUrl(trimmed)) {
                        setSoundFeedback({
                          type: 'warn',
                          text: 'Esa URL parece ser una imagen (.png/.jpg) y no un audio (.mp3/.wav/.ogg). Se reproducirá el tono integrado hasta que pegues un enlace de audio.',
                        });
                        onTestSoundOnly(undefined);
                        return;
                      }
                      onTestSoundOnly(trimmed || undefined);
                    }}
                    className="px-3 py-2 rounded-xl bg-neutral-200 hover:bg-neutral-300 text-neutral-900 font-bold text-xs cursor-pointer"
                  >
                    Probar
                  </button>
                )}
                <button
                  type="button"
                  disabled={savingSound}
                  onClick={async () => {
                    const trimmed = soundDraftUrl.trim();
                    if (trimmed && !isValidAudioUrl(trimmed)) {
                      setSoundFeedback({
                        type: 'warn',
                        text: 'La URL ingresada apunta a una imagen (.png/.jpg) y no a un archivo de audio. Sube tu archivo .mp3 o .wav en Supabase Storage y pega ese enlace.',
                      });
                      return;
                    }
                    setSavingSound(true);
                    try {
                      await onSaveNotificationSoundUrl(trimmed);
                      setSoundFeedback({
                        type: 'ok',
                        text: trimmed
                          ? 'Sonido personalizado guardado correctamente.'
                          : 'Se restauró el tono de notificación integrado.',
                      });
                    } finally {
                      setSavingSound(false);
                    }
                  }}
                  className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-[#363435] hover:bg-black disabled:opacity-50 text-white font-bold text-xs cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingSound ? 'Guardando...' : 'Guardar'}</span>
                </button>
              </div>
            </div>
            {soundFeedback && (
              <p
                className={`text-[11px] font-semibold px-3 py-2 rounded-xl border ${
                  soundFeedback.type === 'ok'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {soundFeedback.text}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Filter pills for Admin / Coach */}
      {isCoachView && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterMode === 'all'
                ? 'bg-[#363435] text-white'
                : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            Todas ({scopedNotifs.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('payments')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterMode === 'payments'
                ? 'bg-amber-500 text-neutral-900'
                : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            Pagos por Autorizar ({paymentAlertCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('unread')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterMode === 'unread'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            Sin Leer ({unreadCount})
          </button>
        </div>
      )}

      {/* Notifications List */}
      {visibleNotifs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center text-xs text-neutral-400">
          <Bell className="w-10 h-10 mx-auto text-neutral-300 mb-2" />
          <p className="font-semibold text-neutral-700">No hay notificaciones en esta vista</p>
          <p className="mt-1">
            {isCoachView
              ? 'Cuando un alumno o padre suba un comprobante de pago, aparecerá aquí automáticamente en tiempo real.'
              : 'Aquí recibirás recordatorios de cuotas y confirmaciones del Head Coach.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleNotifs.map((notif) => {
            const isReminder = notif.type === 'reminder';
            const isApproved = notif.type === 'payment_approved';
            const isRejected = notif.type === 'payment_rejected';
            const isNewPayment = notif.type === 'new_payment_submitted';

            return (
              <div
                key={notif.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all shadow-2xs ${
                  !notif.read
                    ? isNewPayment
                      ? 'bg-amber-50/40 border-amber-400 ring-1 ring-amber-200'
                      : 'bg-white border-amber-300 ring-1 ring-amber-100'
                    : 'bg-white/70 border-neutral-200'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      isNewPayment
                        ? 'bg-amber-100 text-amber-800'
                        : isApproved
                        ? 'bg-emerald-50 text-emerald-700'
                        : isRejected
                        ? 'bg-rose-50 text-rose-700'
                        : isReminder
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    {isNewPayment ? (
                      <CreditCard className="w-5 h-5" />
                    ) : isApproved ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : isRejected ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : isReminder ? (
                      <Clock className="w-5 h-5" />
                    ) : (
                      <Info className="w-5 h-5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-neutral-900 text-xs sm:text-sm">
                          {notif.title}
                        </h4>
                        {!notif.read && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase">
                            Nueva
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-neutral-400 shrink-0 font-mono">
                        {notif.date}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-600 leading-relaxed">
                      {notif.message}
                    </p>

                    <div className="pt-2 flex items-center justify-between gap-2 flex-wrap">
                      {isNewPayment && isCoachView && onNavigateToValidation && (
                        <button
                          onClick={() => {
                            if (!notif.read) onMarkAsRead(notif.id);
                            onNavigateToValidation();
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#363435] hover:bg-black text-amber-400 text-xs font-bold transition cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Revisar y Autorizar Pago</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {!isCoachView && isReminder && onNavigateToPay && (
                        <button
                          onClick={onNavigateToPay}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#363435] hover:text-black underline cursor-pointer"
                        >
                          <CreditCard className="w-3.5 h-3.5 text-amber-500" />
                          <span>Pagar Cuota</span>
                        </button>
                      )}

                      <div className="flex items-center gap-2 ml-auto">
                        {!notif.read && (
                          <button
                            onClick={() => onMarkAsRead(notif.id)}
                            className="text-[11px] font-semibold text-neutral-500 hover:text-neutral-800 transition cursor-pointer"
                          >
                            Marcar como leída
                          </button>
                        )}

                        {onDeleteNotification && (
                          <button
                            onClick={() => onDeleteNotification(notif.id)}
                            title="Eliminar esta notificación"
                            className="p-1 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
