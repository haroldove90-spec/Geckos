import React from 'react';
import { SystemNotification } from '../types';
import {
  Bell,
  X,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Info,
  ArrowUpRight,
  Check,
  Minimize2,
  ShieldCheck,
} from 'lucide-react';
import { CLUB_LOGO_URL } from '../utils/browserNotifications';

interface Props {
  isOpen: boolean;
  isCoachView: boolean;
  unreadNotifications: SystemNotification[];
  pendingPaymentsCount: number;
  onCloseToFloating: () => void;
  onMarkOneAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onNavigateToValidation: () => void;
  onNavigateToNotifications: () => void;
  onNavigateToHistory?: () => void;
}

const MAX_PREVIEW_ITEMS = 5;

export const NotificationPopupModal: React.FC<Props> = ({
  isOpen,
  isCoachView,
  unreadNotifications,
  pendingPaymentsCount,
  onCloseToFloating,
  onMarkOneAsRead,
  onMarkAllAsRead,
  onNavigateToValidation,
  onNavigateToNotifications,
  onNavigateToHistory,
}) => {
  if (!isOpen) return null;

  const totalCount = unreadNotifications.length;
  const paymentAlertsCount = unreadNotifications.filter(
    (n) => n.type === 'new_payment_submitted'
  ).length;
  const otherAlertsCount = Math.max(0, totalCount - paymentAlertsCount);
  const previewList = unreadNotifications.slice(0, MAX_PREVIEW_ITEMS);
  const remainingCount = Math.max(0, totalCount - previewList.length);

  const headline =
    totalCount === 0 && isCoachView && pendingPaymentsCount > 0
      ? pendingPaymentsCount === 1
        ? 'Tienes 1 pago pendiente por autorizar'
        : `Tienes ${pendingPaymentsCount} pagos pendientes por autorizar`
      : totalCount === 1
      ? 'Tienes 1 notificación nueva'
      : `Tienes ${totalCount} notificaciones nuevas`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Centro emergente de notificaciones"
    >
      <div className="w-full max-w-lg rounded-3xl bg-white border border-neutral-200 shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-scaleUp">
        {/* Encabezado Institucional con Logo y Contador */}
        <div className="bg-[#363435] text-white px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="w-11 h-11 rounded-2xl bg-amber-400 text-neutral-900 flex items-center justify-center shadow-sm">
                <Bell className="w-5 h-5" />
              </div>
              <span className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] px-1.5 rounded-full bg-rose-600 text-white text-[11px] font-extrabold flex items-center justify-center shadow-xs border-2 border-[#363435]">
                {Math.max(totalCount, isCoachView ? pendingPaymentsCount : 0)}
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <img
                  src={CLUB_LOGO_URL}
                  alt="Geckos Voleibol"
                  className="h-4 w-auto object-contain brightness-0 invert opacity-85"
                />
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                  Alerta en Vivo
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-extrabold text-white leading-tight mt-0.5 truncate">
                {headline}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onCloseToFloating}
            title="Minimizar a ventana flotante"
            className="p-1.5 rounded-xl text-neutral-300 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumen rápido cuando hay múltiples notificaciones */}
        {(totalCount > 1 || (isCoachView && pendingPaymentsCount > 0)) && (
          <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center justify-between gap-2 flex-wrap text-[11px]">
            <div className="flex items-center gap-2 flex-wrap">
              {isCoachView && pendingPaymentsCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400/90 text-neutral-900 font-extrabold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {pendingPaymentsCount}{' '}
                  {pendingPaymentsCount === 1 ? 'pago por autorizar' : 'pagos por autorizar'}
                </span>
              )}
              {otherAlertsCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 font-bold">
                  {otherAlertsCount} {otherAlertsCount === 1 ? 'otro aviso' : 'otros avisos'}
                </span>
              )}
            </div>
            <span className="text-amber-900/75 font-semibold">
              Mostrando {previewList.length} de {Math.max(totalCount, previewList.length)}
            </span>
          </div>
        )}

        {/* Lista deslizable de notificaciones agrupadas */}
        <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 p-3 sm:p-4 space-y-2">
          {previewList.length === 0 ? (
            <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 text-center space-y-2">
              <CreditCard className="w-8 h-8 text-amber-600 mx-auto" />
              <p className="text-xs font-extrabold text-neutral-900">
                {pendingPaymentsCount === 1
                  ? 'Hay 1 comprobante de pago esperando autorización.'
                  : `Hay ${pendingPaymentsCount} comprobantes de pago esperando autorización.`}
              </p>
              <p className="text-[11px] text-neutral-600">
                Pulsa en &ldquo;Revisar y Autorizar&rdquo; para ver los comprobantes y aprobarlos.
              </p>
            </div>
          ) : (
            previewList.map((notif) => {
              const isNewPayment = notif.type === 'new_payment_submitted';
              const isApproved = notif.type === 'payment_approved';
              const isRejected = notif.type === 'payment_rejected';
              const isReminder = notif.type === 'reminder';

              return (
                <div
                  key={notif.id}
                  className={`p-3 rounded-2xl border transition flex items-start gap-3 ${
                    isNewPayment
                      ? 'bg-amber-50/50 border-amber-300'
                      : isApproved
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : isRejected
                      ? 'bg-rose-50/40 border-rose-200'
                      : 'bg-neutral-50/70 border-neutral-200'
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                      isNewPayment
                        ? 'bg-amber-100 text-amber-800'
                        : isApproved
                        ? 'bg-emerald-100 text-emerald-700'
                        : isRejected
                        ? 'bg-rose-100 text-rose-700'
                        : isReminder
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    {isNewPayment ? (
                      <CreditCard className="w-4 h-4" />
                    ) : isApproved ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : isRejected ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : isReminder ? (
                      <Clock className="w-4 h-4" />
                    ) : (
                      <Info className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-extrabold text-neutral-900 leading-snug">
                        {notif.title}
                      </p>
                      <span className="text-[10px] font-mono text-neutral-400 shrink-0">
                        {notif.date}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-600 mt-1 leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onMarkOneAsRead(notif.id);
                          onCloseToFloating();
                          if (isCoachView && isNewPayment) {
                            onNavigateToValidation();
                          } else if (!isCoachView && isApproved && onNavigateToHistory) {
                            onNavigateToHistory();
                          } else {
                            onNavigateToNotifications();
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#363435] hover:bg-black text-amber-400 text-[11px] font-bold transition cursor-pointer"
                      >
                        <span>
                          {isCoachView && isNewPayment ? 'Revisar y Autorizar' : 'Ver detalle'}
                        </span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onMarkOneAsRead(notif.id)}
                        className="text-[10px] font-semibold text-neutral-500 hover:text-neutral-900 cursor-pointer"
                      >
                        Marcar leída
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {remainingCount > 0 && (
            <button
              type="button"
              onClick={() => {
                onCloseToFloating();
                onNavigateToNotifications();
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>
                + {remainingCount}{' '}
                {remainingCount === 1
                  ? 'notificación más — Ver todas'
                  : 'notificaciones más — Ver todas'}
              </span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Botonera inferior */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-200 space-y-2.5">
          <div className="flex flex-col sm:flex-row gap-2">
            {isCoachView && pendingPaymentsCount > 0 ? (
              <button
                type="button"
                onClick={() => {
                  onCloseToFloating();
                  onNavigateToValidation();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-900 text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Validar Pagos ({pendingPaymentsCount})</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => {
                onCloseToFloating();
                onNavigateToNotifications();
              }}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#363435] hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span>Ver todas ({Math.max(totalCount, isCoachView ? pendingPaymentsCount : 0)})</span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 text-[11px]">
            {totalCount > 0 ? (
              <button
                type="button"
                onClick={() => {
                  onMarkAllAsRead();
                  onCloseToFloating();
                }}
                className="inline-flex items-center gap-1 text-neutral-600 hover:text-emerald-700 font-semibold transition cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Marcar todas como leídas</span>
              </button>
            ) : (
              <span />
            )}

            <button
              type="button"
              onClick={onCloseToFloating}
              className="inline-flex items-center gap-1 text-neutral-600 hover:text-neutral-900 font-bold transition cursor-pointer"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Minimizar a ventana flotante</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
