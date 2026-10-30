import React from 'react';
import { SystemNotification, Student } from '../../types';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Info,
  Check,
  CreditCard,
} from 'lucide-react';

interface Props {
  notifications: SystemNotification[];
  currentStudent?: Student | null;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onNavigateToPay: () => void;
}

export const NotificationsBox: React.FC<Props> = ({
  notifications,
  currentStudent,
  onMarkAsRead,
  onMarkAllAsRead,
  onNavigateToPay,
}) => {
  // Filter relevant notifications (all + student specific)
  const studentNotifs = notifications.filter(
    (n) =>
      n.targetRole === 'all' ||
      n.targetRole === 'parents' ||
      n.targetRole === 'players' ||
      (currentStudent && n.studentId === currentStudent.id)
  );

  const unreadCount = studentNotifs.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight">
            Bandeja de Avisos y Recordatorios
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Alertas sobre fechas límite de cobro, conciliación de pagos y comunicados de la academia.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={onMarkAllAsRead}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#363435] bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 shadow-2xs transition self-start sm:self-auto"
          >
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>Marcar todo como leído</span>
          </button>
        )}
      </div>

      {/* Notifications List */}
      {studentNotifs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center text-xs text-neutral-400">
          <Bell className="w-10 h-10 mx-auto text-neutral-300 mb-2" />
          <p className="font-semibold text-neutral-700">No hay avisos pendientes</p>
          <p className="mt-1">Aquí recibirás recordatorios de cuotas y confirmaciones del Head Coach.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {studentNotifs.map((notif) => {
            const isReminder = notif.type === 'reminder';
            const isApproved = notif.type === 'payment_approved';
            const isRejected = notif.type === 'payment_rejected';

            return (
              <div
                key={notif.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all shadow-2xs ${
                  !notif.read
                    ? 'bg-white border-amber-300 ring-1 ring-amber-100'
                    : 'bg-white/70 border-neutral-200'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      isApproved
                        ? 'bg-emerald-50 text-emerald-700'
                        : isRejected
                        ? 'bg-rose-50 text-rose-700'
                        : isReminder
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    {isApproved ? (
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
                      <h4 className="font-bold text-neutral-900 text-xs sm:text-sm">
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-neutral-400 shrink-0 font-mono">
                        {notif.date}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-600 leading-relaxed">
                      {notif.message}
                    </p>

                    <div className="pt-2 flex items-center justify-between">
                      {isReminder && (
                        <button
                          onClick={onNavigateToPay}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#363435] hover:text-black underline"
                        >
                          <CreditCard className="w-3.5 h-3.5 text-amber-500" />
                          <span>Pagar Cuota</span>
                        </button>
                      )}

                      {!notif.read && (
                        <button
                          onClick={() => onMarkAsRead(notif.id)}
                          className="ml-auto text-[11px] font-semibold text-neutral-400 hover:text-neutral-700 transition"
                        >
                          Marcar como leída
                        </button>
                      )}
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
