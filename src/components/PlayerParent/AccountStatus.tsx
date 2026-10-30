import React from 'react';
import { Student, PaymentRecord } from '../../types';
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Shield,
  FileText,
  Calendar,
  ArrowRight,
} from 'lucide-react';

interface Props {
  currentStudent: Student;
  students: Student[];
  onSelectStudent: (student: Student) => void;
  payments: PaymentRecord[];
  onNavigateToPay: () => void;
  onNavigateToHistory: () => void;
  onViewDigitalReceipt: (payment: PaymentRecord) => void;
}

export const AccountStatus: React.FC<Props> = ({
  currentStudent,
  students,
  onSelectStudent,
  payments,
  onNavigateToPay,
  onNavigateToHistory,
  onViewDigitalReceipt,
}) => {
  const studentPayments = payments.filter((p) => p.studentId === currentStudent.id);
  const pendingPayment = studentPayments.find((p) => p.status === 'pendiente');
  const latestApprovedPayment = studentPayments.find((p) => p.status === 'aprobado');

  const isUpToDate = currentStudent.status === 'al_corriente';
  const hasDebt = currentStudent.status === 'adeudo';
  const isUnderReview = currentStudent.status === 'en_revision' || !!pendingPayment;

  return (
    <div className="space-y-6">
      {/* Top Banner / Student Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-200 min-w-0">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-extrabold text-neutral-900 tracking-tight truncate">
            Perfil del Alumno & Estado de Cuenta
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Consulta de saldo, cuotas y acreditación deportiva.
          </p>
        </div>

        {/* Switch student dropdown (convenient for tutors and preview) */}
        {students.length > 1 && (
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 max-w-full">
            <span className="text-[11px] sm:text-xs text-neutral-500 font-medium shrink-0">Alumno:</span>
            <select
              value={currentStudent.id}
              onChange={(e) => {
                const found = students.find((s) => s.id === e.target.value);
                if (found) onSelectStudent(found);
              }}
              className="px-2.5 py-1.5 bg-white border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:border-[#363435] max-w-[200px] truncate"
            >
              {students.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.fullName} ({st.category})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Student Card & Balance Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Card del Alumno */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-neutral-200 shadow-2xs p-5 sm:p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#363435] text-amber-400 font-extrabold font-mono text-lg flex items-center justify-center shrink-0 shadow-xs">
                #{currentStudent.jerseyNumber}
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-neutral-900">
                  {currentStudent.fullName}
                </h2>
                <div className="flex items-center gap-2 text-xs text-neutral-500 mt-0.5">
                  <span className="font-semibold text-neutral-700">Categoría {currentStudent.category}</span>
                  <span>·</span>
                  <span>Rama {currentStudent.branch}</span>
                  <span>·</span>
                  <span>Geckos Voleibol</span>
                </div>
              </div>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide shrink-0 ${
                isUpToDate
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : hasDebt
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {isUpToDate
                ? 'Al Corriente'
                : hasDebt
                ? 'Adeudo Pendiente'
                : 'En Revisión'}
            </span>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-neutral-100 text-xs">
            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/60">
              <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Tutor Responsable</span>
              <span className="font-bold text-neutral-900 mt-0.5 block truncate">{currentStudent.tutorName}</span>
              <span className="text-[11px] text-neutral-500 block truncate">{currentStudent.tutorPhone}</span>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/60">
              <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Cuota Mensual</span>
              <span className="font-mono font-bold text-neutral-900 text-base mt-0.5 block">
                ${currentStudent.monthlyFee} MXN
              </span>
              <span className="text-[11px] text-neutral-500 block">Día corte: {currentStudent.dueDay} de cada mes</span>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/60 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Fecha de Registro</span>
              <span className="font-semibold text-neutral-900 mt-0.5 block">{currentStudent.joinedDate}</span>
              <span className="text-[11px] text-emerald-600 font-semibold block">Matrícula Activa</span>
            </div>
          </div>

          {/* Status Message */}
          <div
            className={`p-4 rounded-xl text-xs flex items-start gap-3 ${
              isUpToDate
                ? 'bg-emerald-50/70 border border-emerald-200 text-emerald-900'
                : hasDebt
                ? 'bg-rose-50/70 border border-rose-200 text-rose-900'
                : 'bg-amber-50/70 border border-amber-200 text-amber-900'
            }`}
          >
            {isUpToDate ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : hasDebt ? (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            ) : (
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}

            <div>
              <p className="font-bold">
                {isUpToDate
                  ? '¡Cuenta al corriente sin adeudos!'
                  : hasDebt
                  ? `Tienes una cuota pendiente de $${currentStudent.currentBalance} MXN.`
                  : 'Comprobante en proceso de validación por el Head Coach.'}
              </p>
              <p className="mt-0.5 text-neutral-600">
                {isUpToDate
                  ? 'Bienvenido a Geckos Voleibol. Tu registro está activo y sin cargos pendientes por el momento.'
                  : hasDebt
                  ? 'Por favor sube tu comprobante de pago bancario para actualizar tu estatus a corriente.'
                  : 'Tu pago fue reportado y está en espera de revisión. Recibirás tu acuse digital en breve.'}
              </p>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Balance & CTA */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xs p-5 sm:p-6 flex flex-col justify-between space-y-4">
          <div>
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
              Saldo Pendiente a Pagar
            </span>
            <div className="text-3xl sm:text-4xl font-extrabold text-neutral-900 font-mono tabular-nums mt-1">
              ${currentStudent.currentBalance}{' '}
              <span className="text-xs font-sans text-neutral-500 font-normal">MXN</span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              {currentStudent.currentBalance === 0 ? 'Sin adeudo pendiente · Cuenta en ceros' : 'Ciclo Mensual · Geckos Voleibol'}
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-neutral-100">
            {hasDebt ? (
              <button
                onClick={onNavigateToPay}
                className="w-full py-3 rounded-xl bg-[#000000] hover:bg-[#363435] text-white font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-xs"
              >
                <CreditCard className="w-4 h-4 text-amber-400" />
                <span>Registrar Pago Ahora</span>
              </button>
            ) : isUnderReview ? (
              <button
                onClick={onNavigateToHistory}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-900 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
              >
                <Clock className="w-4 h-4" />
                <span>Ver Comprobante en Revisión</span>
              </button>
            ) : (
              <button
                onClick={onNavigateToPay}
                className="w-full py-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <CreditCard className="w-4 h-4 text-[#363435]" />
                <span>Adelantar Mensualidad</span>
              </button>
            )}

            {/* Botón directo para Pago Extra */}
            <button
              onClick={onNavigateToPay}
              className="w-full py-2.5 rounded-xl border border-purple-200 bg-purple-50/70 hover:bg-purple-100/70 text-purple-900 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <span>Reportar Pago Extra (Torneo / Kit)</span>
            </button>

            {latestApprovedPayment && (
              <button
                onClick={() => onViewDigitalReceipt(latestApprovedPayment)}
                className="w-full py-2.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ver Último Acuse Digital</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Recientes Movimientos del Alumno */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xs p-5">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-neutral-500" />
            <h3 className="text-sm font-bold text-neutral-900">
              Historial de Pagos de {currentStudent.fullName}
            </h3>
          </div>
          <button
            onClick={onNavigateToHistory}
            className="text-xs font-semibold text-[#363435] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Ver historial completo</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="mt-3 divide-y divide-neutral-100">
          {studentPayments.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-400">
              No hay pagos registrados para este alumno aún.
            </div>
          ) : (
            studentPayments.slice(0, 4).map((pay) => {
              const isExtra = pay.paymentType === 'extra';
              return (
                <div key={pay.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-neutral-900 truncate">{pay.concept}</span>
                      {isExtra && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-purple-100 text-purple-900 border border-purple-200">
                          Extra
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-500 truncate">
                      {pay.method} · {pay.paymentDate}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="font-mono font-bold text-neutral-900">${pay.amount} MXN</span>
                      <span
                        className={`block text-[10px] font-semibold ${
                          pay.status === 'aprobado'
                            ? 'text-emerald-600'
                            : pay.status === 'pendiente'
                            ? 'text-amber-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {pay.status === 'aprobado'
                          ? 'Validado'
                          : pay.status === 'pendiente'
                          ? 'En revisión'
                          : 'Rechazado'}
                      </span>
                    </div>

                    {pay.status === 'aprobado' && (
                      <button
                        onClick={() => onViewDigitalReceipt(pay)}
                        title="Ver acuse digital"
                        className="p-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition cursor-pointer"
                      >
                        <FileText className="w-4 h-4 text-emerald-600" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
