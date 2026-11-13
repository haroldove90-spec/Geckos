import React from 'react';
import { Student, PaymentRecord, BillingCycle, SystemUser, UserRole } from '../../types';
import {
  DollarSign,
  AlertTriangle,
  Users,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Send,
  ExternalLink,
  Trophy,
  Shirt,
  ClipboardList,
  Sparkles,
  CreditCard,
  UserCheck,
  Eye,
} from 'lucide-react';
import { getStudentEffectiveBilling } from '../../utils/billingUtils';

interface Props {
  currentUser?: SystemUser | null;
  students: Student[];
  payments: PaymentRecord[];
  cycles: BillingCycle[];
  onNavigateToValidation: () => void;
  onNavigateToBilling: () => void;
  onNavigateToPlayers: () => void;
  onNavigateToRegisteredStudents?: () => void;
  onNavigateToCoaches?: () => void;
  onSwitchRoleView?: (role: UserRole) => void;
  onSendReminderWhatsApp: (student: Student) => void;
}

export const HeadCoachDashboard: React.FC<Props> = ({
  currentUser,
  students,
  payments,
  cycles,
  onNavigateToValidation,
  onNavigateToBilling,
  onNavigateToPlayers,
  onNavigateToRegisteredStudents,
  onNavigateToCoaches,
  onSwitchRoleView,
  onSendReminderWhatsApp,
}) => {
  // Current month metrics
  const isCoachAssistant = currentUser?.role === 'coach_assistant';

  // 1. Filtrado de alumnos asignados para el Entrenador Asistente
  const scopedStudents = isCoachAssistant
    ? students.filter((s) => {
        if (s.assignedCoachId && s.assignedCoachId === currentUser?.id) return true;
        if (s.assignedCoachName && currentUser?.name && s.assignedCoachName.toLowerCase() === currentUser.name.toLowerCase()) return true;
        return false;
      })
    : students;

  // 2. Filtrado de pagos exclusivos para el Entrenador Asistente
  const scopedPayments = isCoachAssistant
    ? payments.filter((p) => {
        if (p.coachId && p.coachId === currentUser?.id) return true;
        if (scopedStudents.some((s) => s.id === p.studentId)) return true;
        return false;
      })
    : payments;

  const activeCycle = cycles[0] || {
    title: 'Ciclo Actual',
    totalExpected: 0,
    totalCollected: 0,
    totalPending: 0,
  };

  const approvedPayments = scopedPayments.filter((p) => p.status === 'aprobado');
  const totalCollected = approvedPayments.reduce((sum, p) => sum + p.amount, 0);

  // Breakdown by Regular Monthly Fees vs Extra Payments
  const monthlyCollected = approvedPayments
    .filter((p) => p.paymentType !== 'extra')
    .reduce((sum, p) => sum + p.amount, 0);

  const extraApprovedPayments = approvedPayments.filter((p) => p.paymentType === 'extra');
  const totalExtraCollected = extraApprovedPayments.reduce((sum, p) => sum + p.amount, 0);

  const torneosCollected = extraApprovedPayments
    .filter((p) => p.extraCategory === 'torneo')
    .reduce((sum, p) => sum + p.amount, 0);

  const inscripcionesCollected = extraApprovedPayments
    .filter((p) => p.extraCategory === 'inscripcion')
    .reduce((sum, p) => sum + p.amount, 0);

  const uniformesCollected = extraApprovedPayments
    .filter((p) => p.extraCategory === 'uniforme')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingPayments = scopedPayments.filter((p) => p.status === 'pendiente');
  const pendingValidationCount = pendingPayments.length;
  const pendingExtraCount = pendingPayments.filter((p) => p.paymentType === 'extra').length;

  const studentBillings = scopedStudents.map((s) => ({
    student: s,
    billing: getStudentEffectiveBilling(s, payments, cycles),
  }));

  const totalOverdue = studentBillings
    .filter((item) => item.billing.effectiveStatus === 'adeudo' && item.billing.effectiveBalance > 0)
    .reduce((sum, item) => sum + item.billing.effectiveBalance, 0);

  const upToDateStudentsCount = studentBillings.filter(
    (item) => item.billing.effectiveStatus === 'al_corriente'
  ).length;
  const overdueStudents = studentBillings
    .filter((item) => item.billing.effectiveStatus === 'adeudo')
    .map((item) => ({
      ...item.student,
      currentBalance: item.billing.effectiveBalance,
      status: item.billing.effectiveStatus,
    }));

  const collectionRate =
    scopedStudents.length > 0
      ? Math.round((upToDateStudentsCount / scopedStudents.length) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Coach Assistant Exclusive Mode Banner */}
      {isCoachAssistant && (
        <div className="p-4 rounded-2xl bg-[#363435] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm border border-neutral-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white flex items-center gap-2">
                <span>Panel de Entrenador Asignado: {currentUser?.name}</span>
                <span className="text-[10px] bg-amber-400 text-neutral-900 font-extrabold px-2 py-0.5 rounded-full">
                  Exclusivo
                </span>
              </p>
              <p className="text-xs text-neutral-300 mt-0.5">
                Gestionando a tus {scopedStudents.length} alumnos asignados y sus comprobantes de pago directos.
              </p>
            </div>
          </div>
          {pendingValidationCount > 0 && (
            <button
              onClick={onNavigateToValidation}
              className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Validar {pendingValidationCount} pagos pendientes</span>
            </button>
          )}
        </div>
      )}

      {/* Top Welcome & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-200 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#363435] text-white">
              {currentUser?.role === 'head_coach' ? 'Administrador' : 'Entrenador Asignado'}
            </span>
            <span className="text-xs text-neutral-400">· Geckos Voleibol</span>
          </div>
          <h1 className="text-lg sm:text-2xl font-extrabold text-neutral-900 tracking-tight truncate mt-1">
            Bienvenido, {currentUser?.name || 'Harold Anguiano Morales'}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            {isCoachAssistant
              ? `Control de tus ${scopedStudents.length} alumnos asignados y recepción exclusiva de sus pagos.`
              : 'Estado de ingresos generales, cuotas mensuales y control deportivo de la academia.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onNavigateToCoaches && (
            <button
              onClick={onNavigateToCoaches}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-white border border-neutral-200 hover:border-[#363435] text-neutral-800 text-xs font-bold rounded-xl shadow-2xs transition active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <UserCheck className="w-3.5 h-3.5 text-[#363435]" />
              <span>Entrenadores</span>
            </button>
          )}

          {onNavigateToRegisteredStudents && (
            <button
              onClick={onNavigateToRegisteredStudents}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-white border border-neutral-200 hover:border-[#363435] text-neutral-800 text-xs font-bold rounded-xl shadow-2xs transition active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Users className="w-3.5 h-3.5 text-[#363435]" />
              <span>Ver {scopedStudents.length} Alumnos</span>
            </button>
          )}

          {pendingValidationCount > 0 && (
            <button
              onClick={onNavigateToValidation}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-amber-500 hover:bg-amber-600 text-neutral-900 text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>{pendingValidationCount} por validar</span>
              {pendingExtraCount > 0 && (
                <span className="bg-neutral-900 text-white text-[9px] px-1.5 py-0.2 rounded-full">
                  {pendingExtraCount} extras
                </span>
              )}
              <ArrowUpRight className="w-3.5 h-3.5 ml-0.5 shrink-0" />
            </button>
          )}
        </div>
      </div>

      {/* MODO ADMINISTRADOR: STRIP DE 4 KPIS FINANCIEROS Y DEPORTIVOS */}
      {!isCoachAssistant ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 min-w-0">
            {/* KPI 1: Ingresos Totales Recibidos */}
            <div className="p-3 sm:p-5 rounded-2xl bg-white border border-neutral-200 shadow-2xs min-w-0 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1 text-neutral-500 text-[11px] sm:text-xs font-semibold mb-1 min-w-0">
                <span className="truncate">Ingresos Totales</span>
                <div className="p-1 sm:p-1.5 rounded-lg bg-emerald-50 text-emerald-700 shrink-0">
                  <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="text-base sm:text-2xl font-extrabold text-neutral-900 font-mono tabular-nums truncate">
                ${totalCollected.toLocaleString('es-MX')} <span className="text-[10px] sm:text-xs font-sans text-neutral-500 font-normal">MXN</span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-neutral-500 mt-1 flex items-center gap-1 truncate">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>Mensualidades + Extras</span>
              </p>
            </div>

            {/* KPI 2: Adeudos Pendientes Mensualidades */}
            <div className="p-3 sm:p-5 rounded-2xl bg-white border border-neutral-200 shadow-2xs min-w-0 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1 text-neutral-500 text-[11px] sm:text-xs font-semibold mb-1 min-w-0">
                <span className="truncate">Por Cobrar (Mensual)</span>
                <div className="p-1 sm:p-1.5 rounded-lg bg-rose-50 text-rose-700 shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="text-base sm:text-2xl font-extrabold text-rose-600 font-mono tabular-nums truncate">
                ${totalOverdue.toLocaleString('es-MX')} <span className="text-[10px] sm:text-xs font-sans text-neutral-500 font-normal">MXN</span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-neutral-500 mt-1 truncate">
                {overdueStudents.length} con adeudo
              </p>
            </div>

            {/* KPI 3: Tasa de Cobranza */}
            <div className="p-3 sm:p-5 rounded-2xl bg-white border border-neutral-200 shadow-2xs min-w-0 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1 text-neutral-500 text-[11px] sm:text-xs font-semibold mb-1 min-w-0">
                <span className="truncate">Cumplimiento</span>
                <div className="p-1 sm:p-1.5 rounded-lg bg-blue-50 text-blue-700 shrink-0">
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="text-base sm:text-2xl font-extrabold text-neutral-900 font-mono tabular-nums truncate">
                {collectionRate}%
              </div>
              <div className="w-full bg-neutral-100 rounded-full h-1.5 mt-2">
                <div
                  className="bg-[#363435] h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${collectionRate}%` }}
                />
              </div>
            </div>

            {/* KPI 4: Comprobantes por Revisar */}
            <div className="p-3 sm:p-5 rounded-2xl bg-white border border-neutral-200 shadow-2xs min-w-0 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1 text-neutral-500 text-[11px] sm:text-xs font-semibold mb-1 min-w-0">
                <span className="truncate">En Revisión</span>
                <div className="p-1 sm:p-1.5 rounded-lg bg-amber-50 text-amber-700 shrink-0">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="text-base sm:text-2xl font-extrabold text-amber-600 font-mono tabular-nums truncate">
                {pendingValidationCount}
              </div>
              <p className="text-[10px] sm:text-[11px] text-neutral-500 mt-1 truncate">
                {pendingExtraCount > 0 ? `${pendingExtraCount} pagos extras` : 'Comprobantes subidos'}
              </p>
            </div>
          </div>

          {/* Recuadro Especial: Desglose de Ingresos por Pagos Extras (Solo Administrador) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-950 via-neutral-900 to-black text-white shadow-md border border-neutral-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  <Trophy className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-extrabold text-white">
                      Ingresos por Pagos Extras & Eventos
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-400 text-black">
                      Activo
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300 mt-0.5">
                    Total acumulado en torneos, inscripciones y uniformes validados.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Total Extras</span>
                  <span className="text-lg sm:text-2xl font-extrabold font-mono text-amber-400">
                    ${totalExtraCollected.toLocaleString('es-MX')} <span className="text-xs font-sans text-neutral-300">MXN</span>
                  </span>
                </div>

                <button
                  onClick={onNavigateToValidation}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <span>Validar Extras</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Chips de Categorías */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 text-xs">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-neutral-300 truncate">Torneos & Copas:</span>
                </div>
                <span className="font-mono font-bold text-white tabular-nums">${torneosCollected.toLocaleString('es-MX')}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <ClipboardList className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="text-neutral-300 truncate">Inscripciones Anuales:</span>
                </div>
                <span className="font-mono font-bold text-white tabular-nums">${inscripcionesCollected.toLocaleString('es-MX')}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Shirt className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="text-neutral-300 truncate">Uniformes & Kits:</span>
                </div>
                <span className="font-mono font-bold text-white tabular-nums">${uniformesCollected.toLocaleString('es-MX')}</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* MODO ENTRENADOR ASISTENTE: STRIP DE GESTIÓN DEPORTIVA Y VALIDACIÓN (SIN ACCESO A FINANZAS NI INGRESOS) */
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 min-w-0">
          {/* KPI 1: Alumnos Asignados */}
          <div className="p-3 sm:p-5 rounded-2xl bg-white border border-neutral-200 shadow-2xs min-w-0 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 text-neutral-500 text-[11px] sm:text-xs font-semibold mb-1 min-w-0">
              <span className="truncate">Mis Atletas Asignados</span>
              <div className="p-1 sm:p-1.5 rounded-lg bg-blue-50 text-blue-700 shrink-0">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-base sm:text-2xl font-extrabold text-neutral-900 font-mono tabular-nums truncate">
              {scopedStudents.length} <span className="text-[10px] sm:text-xs font-sans text-neutral-500 font-normal">alumnos</span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-neutral-500 mt-1 truncate">
              Bajo tu supervisión técnica
            </p>
          </div>

          {/* KPI 2: Comprobantes por Validar */}
          <div className="p-3 sm:p-5 rounded-2xl bg-white border border-neutral-200 shadow-2xs min-w-0 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 text-neutral-500 text-[11px] sm:text-xs font-semibold mb-1 min-w-0">
              <span className="truncate">Por Validar</span>
              <div className="p-1 sm:p-1.5 rounded-lg bg-amber-50 text-amber-700 shrink-0">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-base sm:text-2xl font-extrabold text-amber-600 font-mono tabular-nums truncate">
              {pendingValidationCount}
            </div>
            <p className="text-[10px] sm:text-[11px] text-neutral-500 mt-1 truncate">
              Comprobantes de tus alumnos
            </p>
          </div>

          {/* KPI 3: Comprobantes Validados */}
          <div className="p-3 sm:p-5 rounded-2xl bg-white border border-neutral-200 shadow-2xs min-w-0 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 text-neutral-500 text-[11px] sm:text-xs font-semibold mb-1 min-w-0">
              <span className="truncate">Comprobantes Aprobados</span>
              <div className="p-1 sm:p-1.5 rounded-lg bg-emerald-50 text-emerald-700 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-base sm:text-2xl font-extrabold text-emerald-600 font-mono tabular-nums truncate">
              {approvedPayments.length}
            </div>
            <p className="text-[10px] sm:text-[11px] text-neutral-500 mt-1 truncate">
              Pagos autorizados por ti
            </p>
          </div>

          {/* KPI 4: Atletas al Corriente */}
          <div className="p-3 sm:p-5 rounded-2xl bg-white border border-neutral-200 shadow-2xs min-w-0 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 text-neutral-500 text-[11px] sm:text-xs font-semibold mb-1 min-w-0">
              <span className="truncate">Atletas Regulares</span>
              <div className="p-1 sm:p-1.5 rounded-lg bg-purple-50 text-purple-700 shrink-0">
                <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-base sm:text-2xl font-extrabold text-purple-700 font-mono tabular-nums truncate">
              {upToDateStudentsCount} <span className="text-[10px] sm:text-xs font-sans text-neutral-500 font-normal">de {scopedStudents.length}</span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-neutral-500 mt-1 truncate">
              Con pagos al día
            </p>
          </div>
        </div>
      )}

      {/* Two Column Grid: Lista de Morosos & Últimos Pagos Registrados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Lista de Morosos / Con Adeudo */}
        <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <h3 className="text-sm font-bold text-neutral-900">
                  {isCoachAssistant ? 'Seguimiento de Regularización' : 'Lista de Morosos y Adeudos'}
                </h3>
              </div>
              <button
                onClick={onNavigateToBilling}
                className="text-xs font-semibold text-[#363435] hover:text-black underline flex items-center gap-1 cursor-pointer"
              >
                <span>{isCoachAssistant ? 'Ver Listado' : 'Gestión de Cobranza'}</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            <div className="mt-3 divide-y divide-neutral-100">
              {overdueStudents.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-400">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
                  <p className="font-semibold text-neutral-700">¡Excelente! No hay adeudos pendientes.</p>
                  <p>Todos los alumnos están al corriente con sus mensualidades.</p>
                </div>
              ) : (
                overdueStudents.map((student) => (
                  <div
                    key={student.id}
                    className="py-3 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-neutral-900 truncate">
                          {student.fullName}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 font-medium">
                          {student.category}
                        </span>
                      </div>
                      <p className="text-neutral-500 text-[11px] mt-0.5 truncate">
                        Tutor: {student.tutorName} · Tel: {student.tutorPhone}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {!isCoachAssistant ? (
                        <span className="font-bold text-rose-600 font-mono tabular-nums">
                          ${student.currentBalance} MXN
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          Pendiente de cuota
                        </span>
                      )}
                      <button
                        onClick={() => onSendReminderWhatsApp(student)}
                        title="Enviar recordatorio por WhatsApp"
                        className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-100 flex justify-between items-center text-xs text-neutral-500">
            <span>Total con pendiente: {overdueStudents.length}</span>
            <button
              onClick={onNavigateToBilling}
              className="text-[#363435] font-semibold hover:underline cursor-pointer"
            >
              {isCoachAssistant ? 'Ver todos los atletas →' : 'Enviar recordatorio masivo →'}
            </button>
          </div>
        </div>

        {/* Card 2: Últimos Pagos Registrados */}
        <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-neutral-900">
                  {isCoachAssistant ? 'Comprobantes Recientes de tus Alumnos' : 'Actividad Reciente de Pagos'}
                </h3>
              </div>
              <button
                onClick={onNavigateToValidation}
                className="text-xs font-semibold text-[#363435] hover:text-black underline flex items-center gap-1 cursor-pointer"
              >
                <span>Ver todos</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            <div className="mt-3 divide-y divide-neutral-100">
              {(isCoachAssistant ? scopedPayments : payments).length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-400">
                  <Clock className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
                  <p>No hay registros de pagos aún.</p>
                </div>
              ) : (
                (isCoachAssistant ? scopedPayments : payments).slice(0, 5).map((pay) => {
                  const isExtra = pay.paymentType === 'extra';
                  return (
                    <div
                      key={pay.id}
                      className="py-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-neutral-900 truncate">
                            {pay.studentName}
                          </span>

                          {isExtra && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-purple-100 text-purple-900">
                              Extra · {pay.extraCategory || 'Evento'}
                            </span>
                          )}

                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                              pay.status === 'aprobado'
                                ? 'bg-emerald-50 text-emerald-700'
                                : pay.status === 'pendiente'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {pay.status === 'aprobado'
                              ? 'Aprobado'
                              : pay.status === 'pendiente'
                              ? 'En revisión'
                              : 'Rechazado'}
                          </span>
                        </div>
                        <p className="text-neutral-500 text-[11px] mt-0.5 truncate">
                          {pay.concept} · {pay.method} · {pay.paymentDate}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        {!isCoachAssistant ? (
                          <>
                            <div className="font-bold text-neutral-900 font-mono tabular-nums">
                              ${pay.amount} MXN
                            </div>
                            {pay.receiptFolio && (
                              <span className="text-[10px] text-neutral-400 font-mono">
                                {pay.receiptFolio}
                              </span>
                            )}
                          </>
                        ) : (
                          <button
                            onClick={onNavigateToValidation}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg text-[10px] font-bold border border-amber-200 transition cursor-pointer"
                          >
                            Comprobante
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-100 flex justify-between items-center text-xs text-neutral-500">
            <span>Total registros: {(isCoachAssistant ? scopedPayments : payments).length}</span>
            <button
              onClick={isCoachAssistant ? onNavigateToValidation : onNavigateToPlayers}
              className="text-[#363435] font-semibold hover:underline cursor-pointer"
            >
              {isCoachAssistant ? 'Ir a Validar Comprobantes →' : 'Directorio de alumnos →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
