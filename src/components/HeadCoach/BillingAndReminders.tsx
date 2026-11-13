import React, { useState } from 'react';
import { BillingCycle, PaymentRecord, Student, SystemNotification, SystemUser } from '../../types';
import {
  BellRing,
  Send,
  Calendar,
  DollarSign,
  Plus,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Sparkles,
  UserCheck,
  Edit2,
  Trash2,
} from 'lucide-react';
import { getStudentEffectiveBilling, getStudentOverdueInfo } from '../../utils/billingUtils';

interface Props {
  currentUser?: SystemUser | null;
  coaches?: SystemUser[];
  cycles: BillingCycle[];
  students: Student[];
  payments?: PaymentRecord[];
  onGenerateCycle: (newCycle: BillingCycle) => void;
  onSendBroadcastReminder: (title: string, message: string) => void;
  onSendStudentReminderWhatsApp: (student: Student) => void;
  onDeleteCycle?: (cycleId: string) => void;
  onUpdateCycle?: (cycle: BillingCycle) => void;
  onCheckOverdueNow?: () => number;
}

export const BillingAndReminders: React.FC<Props> = ({
  currentUser,
  coaches = [],
  cycles,
  students,
  payments = [],
  onGenerateCycle,
  onSendBroadcastReminder,
  onSendStudentReminderWhatsApp,
  onDeleteCycle,
  onUpdateCycle,
  onCheckOverdueNow,
}) => {
  const isCoachAssistant = currentUser?.role === 'coach_assistant';
  const [overdueCheckMsg, setOverdueCheckMsg] = useState<string | null>(null);

  const scopedStudents = isCoachAssistant
    ? students.filter((s) => {
        if (s.assignedCoachId && s.assignedCoachId === currentUser?.id) return true;
        if (s.assignedCoachName && currentUser?.name && s.assignedCoachName.toLowerCase() === currentUser.name.toLowerCase()) return true;
        return false;
      })
    : students;

  const [broadcastMessage, setBroadcastMessage] = useState(
    'Estimados padres de familia y jugadores de Geckos Voleibol: Les recordamos que la fecha límite para el pago de la mensualidad del mes es el día 5. Favor de subir su comprobante en su portal web para su oportuna validación.'
  );
  const [broadcastTitle, setBroadcastTitle] = useState('Recordatorio Oficial de Mensualidad');
  const [showCycleModal, setShowCycleModal] = useState(false);
  const [sentSuccessToast, setSentSuccessToast] = useState(false);

  // New Cycle Form
  const [cycleTitle, setCycleTitle] = useState('Mensualidad Noviembre 2026');
  const [cycleDueDate, setCycleDueDate] = useState('2026-11-05');
  const [cycleFee, setCycleFee] = useState(800);
  const [cycleError, setCycleError] = useState<string | null>(null);

  // Edit Cycle Form
  const [editingCycle, setEditingCycle] = useState<BillingCycle | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editFee, setEditFee] = useState(800);

  // Delete Cycle State
  const [cycleToDelete, setCycleToDelete] = useState<BillingCycle | null>(null);

  const overdueStudents = scopedStudents
    .map((s) => {
      const billing = getStudentEffectiveBilling(s, payments, cycles);
      return {
        student: {
          ...s,
          currentBalance: billing.effectiveBalance,
          status: billing.effectiveStatus,
        },
        billing,
      };
    })
    .filter((item) => item.billing.effectiveStatus === 'adeudo')
    .map((item) => item.student);

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;
    onSendBroadcastReminder(broadcastTitle, broadcastMessage);
    setSentSuccessToast(true);
    setTimeout(() => setSentSuccessToast(false), 3500);
  };

  const handleCreateCycle = (e: React.FormEvent) => {
    e.preventDefault();
    setCycleError(null);

    const targetPeriod = cycleDueDate.substring(0, 7);
    const isDuplicate = cycles.some(
      (c) =>
        c.period === targetPeriod ||
        c.title.trim().toLowerCase() === cycleTitle.trim().toLowerCase()
    );

    if (isDuplicate) {
      setCycleError(
        `Ya existe un ciclo generado para el periodo "${targetPeriod}" o con el título "${cycleTitle}". Puedes editar o eliminar el ciclo existente en lugar de duplicarlo.`
      );
      return;
    }

    const newCycle: BillingCycle = {
      id: `cycle-${Date.now()}`,
      title: cycleTitle.trim(),
      period: targetPeriod,
      dueDate: cycleDueDate,
      defaultFee: cycleFee,
      totalExpected: students.length * cycleFee,
      totalCollected: 0,
      totalPending: students.length * cycleFee,
      createdAt: new Date().toISOString().split('T')[0],
    };
    onGenerateCycle(newCycle);
    setShowCycleModal(false);
  };

  const handleOpenEditCycle = (cycle: BillingCycle) => {
    setEditingCycle(cycle);
    setEditTitle(cycle.title);
    setEditDueDate(cycle.dueDate);
    setEditFee(cycle.defaultFee);
  };

  const handleSaveEditCycle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCycle || !onUpdateCycle) return;

    const updated: BillingCycle = {
      ...editingCycle,
      title: editTitle.trim(),
      dueDate: editDueDate,
      period: editDueDate.substring(0, 7),
      defaultFee: editFee,
      totalExpected: students.length * editFee,
    };

    onUpdateCycle(updated);
    setEditingCycle(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight">
            Módulo de Cobranza y Recordatorios
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Configuración de periodos, fechas de corte y envío de notificaciones automáticas.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {onCheckOverdueNow && !isCoachAssistant && (
            <button
              type="button"
              onClick={() => {
                const sent = onCheckOverdueNow();
                setOverdueCheckMsg(
                  sent > 0
                    ? `Se enviaron ${sent} notificación(es) automática(s) a alumnos con fecha límite vencida.`
                    : 'Todos los alumnos con fecha límite vencida ya fueron notificados previamente o están al día.'
                );
                setTimeout(() => setOverdueCheckMsg(null), 4500);
              }}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-900 text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <AlertTriangle className="w-4 h-4 text-neutral-900" />
              <span>Verificar Vencimientos</span>
            </button>
          )}

          <button
            onClick={() => setShowCycleModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#363435] hover:bg-[#000000] text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Generar Nuevo Ciclo de Cobro</span>
          </button>
        </div>
      </div>

      {overdueCheckMsg && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-center gap-2 font-medium animate-in fade-in">
          <BellRing className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{overdueCheckMsg}</span>
        </div>
      )}

      {sentSuccessToast && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Alerta enviada exitosamente a todas las cuentas de jugadores y tutores.</span>
          </div>
        </div>
      )}

      {/* Grid: Ciclos & Automatización de Avisos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Col 1: Notificación y Recordatorio Masivo (Etapa 2) */}
        <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
            <BellRing className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-bold text-neutral-900">
              Envío de Alertas y Recordatorios Masivos
            </h3>
          </div>

          <form onSubmit={handleBroadcast} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Título del Recordatorio
              </label>
              <input
                type="text"
                required
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Mensaje Institucional (Notificación en Sistema)
              </label>
              <textarea
                rows={4}
                required
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900"
              />
            </div>

            {/* Quick Presets */}
            <div className="space-y-1">
              <span className="text-[10px] text-neutral-400 font-semibold uppercase">Plantillas rápidas:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Aviso de Inicio de Mes y Cobro',
                  'Último Día de Vencimiento de Mensualidad',
                  'Aviso de Suspensión por Falta de Pago',
                ].map((tpl) => (
                  <button
                    type="button"
                    key={tpl}
                    onClick={() => {
                      setBroadcastTitle(tpl);
                      if (tpl.includes('Inicio')) {
                        setBroadcastMessage('Geckos Voleibol informa: Se ha generado la cuota mensual para este nuevo ciclo. Favor de efectuar su pago y subir su comprobante antes del día 5.');
                      } else if (tpl.includes('Último')) {
                        setBroadcastMessage('Atención atletas y papás: Hoy es el último día para reportar su comprobante de pago de mensualidad sin recargos en Geckos Voleibol.');
                      } else {
                        setBroadcastMessage('Estimados tutores: Solicitamos regularizar de inmediato los adeudos pendientes para no afectar la participación del atleta en los entrenamientos.');
                      }
                    }}
                    className="px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[10px] transition"
                  >
                    {tpl}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#000000] hover:bg-[#363435] text-white font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-xs"
            >
              <Send className="w-3.5 h-3.5 text-amber-400" />
              <span>Enviar Alerta a Todo el Padrón</span>
            </button>
          </form>
        </div>

        {/* Col 2: Alertas Individuales WhatsApp a Morosos */}
        <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-neutral-900">
                Recordatorios Directos por WhatsApp
              </h3>
            </div>
            <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full">
              {overdueStudents.length} con adeudo
            </span>
          </div>

          <div className="text-xs text-neutral-500">
            Envía recordatorios personalizados con un solo clic directamente al número de WhatsApp del papá o tutor registrado.
          </div>

          <div className="divide-y divide-neutral-100 max-h-[300px] overflow-y-auto pr-1">
            {overdueStudents.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-400">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
                <p className="font-semibold text-neutral-700">¡Sin adeudos pendientes!</p>
                <p>Todos los papás y atletas están al día con sus mensualidades.</p>
              </div>
            ) : (
              overdueStudents.map((st) => {
                const overdueInfo = getStudentOverdueInfo(st, cycles, payments);
                return (
                  <div key={st.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-neutral-900 truncate">{st.fullName}</span>
                        {overdueInfo.isOverdue && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                            Vencido hace {overdueInfo.daysOverdue}d ({overdueInfo.dueDateStr})
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-500 truncate">
                        {st.tutorName} · {st.tutorPhone}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono font-bold text-rose-600">${st.currentBalance} MXN</span>
                      <button
                        onClick={() => onSendStudentReminderWhatsApp(st)}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] flex items-center gap-1.5 transition active:scale-95 shadow-2xs"
                      >
                        <Send className="w-3 h-3" />
                        <span>WhatsApp</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Ciclos de Cobro Registrados */}
      <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#363435]" />
            <h3 className="text-sm font-bold text-neutral-900">
              Historial de Ciclos y Órdenes de Cobro
            </h3>
          </div>
          <span className="text-xs text-neutral-400">
            {cycles.length} ciclos registrados
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cycles.map((cycle) => (
            <div
              key={cycle.id}
              className="p-4 rounded-xl border border-neutral-200/90 bg-neutral-50/50 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-neutral-900 text-xs sm:text-sm">
                  {cycle.title}
                </span>
                <span className="px-2 py-0.5 rounded bg-neutral-200 text-neutral-800 font-mono text-[10px] font-bold">
                  {cycle.period}
                </span>
              </div>

              <div className="space-y-1 text-xs text-neutral-600">
                <div className="flex justify-between">
                  <span>Fecha de corte / límite:</span>
                  <span className="font-semibold text-neutral-900">{cycle.dueDate}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cuota base sugerida:</span>
                  <span className="font-mono font-bold text-neutral-900">${cycle.defaultFee} MXN</span>
                </div>
                <div className="flex justify-between">
                  <span>Monto estimado:</span>
                  <span className="font-mono font-bold text-neutral-900">${cycle.totalExpected} MXN</span>
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-200/70 flex items-center justify-between text-[11px] text-neutral-500">
                <span>Generado: {cycle.createdAt}</span>
                <div className="flex items-center gap-1.5">
                  {onUpdateCycle && !isCoachAssistant && (
                    <button
                      onClick={() => handleOpenEditCycle(cycle)}
                      title="Editar datos de este ciclo"
                      className="p-1 rounded-lg text-neutral-500 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {onDeleteCycle && !isCoachAssistant && (
                    <button
                      onClick={() => setCycleToDelete(cycle)}
                      title="Eliminar este ciclo de cobro"
                      className="p-1 rounded-lg text-neutral-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <span className="font-semibold text-emerald-700 ml-1">Activo</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Nuevo Ciclo de Cobro */}
      {showCycleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200 text-[#363435]">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-base font-bold text-neutral-900">
                Generar Nuevo Ciclo de Cobro
              </h3>
              <button
                onClick={() => setShowCycleModal(false)}
                className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCycle} className="mt-4 space-y-4 text-xs">
              {cycleError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{cycleError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Nombre del Ciclo / Periodo *
                </label>
                <input
                  type="text"
                  required
                  value={cycleTitle}
                  onChange={(e) => setCycleTitle(e.target.value)}
                  placeholder="Ej. Mensualidad Noviembre 2026"
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Fecha Límite de Pago *
                  </label>
                  <input
                    type="date"
                    required
                    value={cycleDueDate}
                    onChange={(e) => setCycleDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Cuota Base ($) *
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    required
                    value={cycleFee || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      setCycleFee(parseFloat(val) || 0);
                    }}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900 font-mono no-spinner"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-neutral-50 text-[11px] text-neutral-600">
                Al confirmar, se programará la orden de cobro para los {students.length} alumnos registrados en Geckos Voleibol.
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCycleModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-700 font-semibold hover:bg-neutral-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#000000] text-white font-bold hover:bg-[#363435] transition cursor-pointer"
                >
                  Generar Ciclo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Ciclo de Cobro */}
      {editingCycle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200 text-[#363435]">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-base font-bold text-neutral-900">
                Editar Ciclo de Cobro
              </h3>
              <button
                onClick={() => setEditingCycle(null)}
                className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditCycle} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Nombre del Ciclo *
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Fecha Límite *
                  </label>
                  <input
                    type="date"
                    required
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Cuota Base ($) *
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={editFee || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      setEditFee(parseFloat(val) || 0);
                    }}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCycle(null)}
                  className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 font-semibold hover:bg-neutral-50 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-neutral-900 hover:bg-black text-white font-bold transition cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmación para Eliminar Ciclo de Cobro */}
      {cycleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-neutral-200 text-[#363435] space-y-4">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>¿Eliminar este ciclo de cobro?</span>
            </div>
            <p className="text-xs text-neutral-600">
              ¿Estás seguro de que deseas eliminar la orden de cobro para <strong>{cycleToDelete.title}</strong> ({cycleToDelete.period})?
            </p>
            <div className="flex gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setCycleToDelete(null)}
                className="flex-1 py-2 rounded-xl border border-neutral-200 text-neutral-700 text-xs font-semibold hover:bg-neutral-50 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteCycle && cycleToDelete) {
                    onDeleteCycle(cycleToDelete.id);
                  }
                  setCycleToDelete(null);
                }}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
