import React, { useState } from 'react';
import { PaymentRecord, Student, PaymentType, ExtraPaymentCategory } from '../../types';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  FileText,
  Search,
  Filter,
  Check,
  X,
  AlertCircle,
  ExternalLink,
  Trophy,
  Shirt,
  ClipboardList,
  Bus,
  Tag,
  CreditCard,
  Sparkles,
} from 'lucide-react';

interface Props {
  payments: PaymentRecord[];
  students: Student[];
  onApprovePayment: (paymentId: string) => void;
  onRejectPayment: (paymentId: string, reason: string) => void;
  onViewDigitalReceipt: (payment: PaymentRecord) => void;
}

const getExtraCategoryMeta = (cat?: ExtraPaymentCategory) => {
  switch (cat) {
    case 'torneo':
      return { label: 'Torneo / Copa', icon: Trophy, bg: 'bg-amber-100 text-amber-900 border-amber-200' };
    case 'inscripcion':
      return { label: 'Inscripción Anual', icon: ClipboardList, bg: 'bg-blue-100 text-blue-900 border-blue-200' };
    case 'uniforme':
      return { label: 'Uniforme / Equipo', icon: Shirt, bg: 'bg-purple-100 text-purple-900 border-purple-200' };
    case 'arbitraje':
      return { label: 'Arbitraje', icon: Clock, bg: 'bg-emerald-100 text-emerald-900 border-emerald-200' };
    case 'transporte':
      return { label: 'Transporte / Viáticos', icon: Bus, bg: 'bg-orange-100 text-orange-900 border-orange-200' };
    default:
      return { label: 'Gasto Extra', icon: Tag, bg: 'bg-neutral-100 text-neutral-900 border-neutral-200' };
  }
};

export const PaymentsValidation: React.FC<Props> = ({
  payments,
  students,
  onApprovePayment,
  onRejectPayment,
  onViewDigitalReceipt,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'pendiente' | 'aprobado' | 'rechazado'>('pendiente');
  const [typeFilter, setTypeFilter] = useState<'all' | 'mensualidad' | 'extra'>('all');
  const [extraCategoryFilter, setExtraCategoryFilter] = useState<'all' | ExtraPaymentCategory>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal for Viewing Receipt Image
  const [previewPayment, setPreviewPayment] = useState<PaymentRecord | null>(null);

  // Modal for Rejection Reason
  const [rejectingPayment, setRejectingPayment] = useState<PaymentRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const pendingPayments = payments.filter((p) => p.status === 'pendiente');
  const pendingCount = pendingPayments.length;
  const pendingExtraCount = pendingPayments.filter((p) => p.paymentType === 'extra').length;
  const pendingMonthlyCount = pendingPayments.filter((p) => p.paymentType !== 'extra').length;

  const filteredPayments = payments.filter((p) => {
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const isExtra = p.paymentType === 'extra';
    const matchesType =
      typeFilter === 'all' ||
      (typeFilter === 'extra' && isExtra) ||
      (typeFilter === 'mensualidad' && !isExtra);

    const matchesCategory =
      extraCategoryFilter === 'all' ||
      (isExtra && p.extraCategory === extraCategoryFilter);

    const matchesSearch =
      p.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.concept.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.eventName && p.eventName.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesStatus && matchesType && matchesCategory && matchesSearch;
  });

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingPayment || !rejectionReason.trim()) return;
    onRejectPayment(rejectingPayment.id, rejectionReason);
    setRejectingPayment(null);
    setRejectionReason('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-200 min-w-0">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-extrabold text-neutral-900 tracking-tight truncate">
            Control y Validación de Pagos
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Cotejo bancario y emisión de acuses digitales para mensualidades y pagos extras.
          </p>
        </div>

        {/* Counter Badges */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto shrink-0">
          {pendingExtraCount > 0 && (
            <span className="px-2.5 py-1.5 rounded-xl bg-purple-50 text-purple-900 border border-purple-200 text-xs font-bold flex items-center gap-1.5 shrink-0">
              <Trophy className="w-3.5 h-3.5 text-purple-700 shrink-0" />
              <span>{pendingExtraCount} extras por validar</span>
            </span>
          )}

          <span className="px-2.5 py-1.5 sm:px-3 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1.5 shrink-0">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{pendingCount} total por revisar</span>
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs space-y-3">
        {/* Row 1: Search & Status Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por alumno, referencia, torneo o concepto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-[#363435] text-neutral-900"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex p-1 bg-neutral-100 rounded-xl">
            <button
              onClick={() => setStatusFilter('pendiente')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                statusFilter === 'pendiente'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Pendientes ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter('aprobado')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                statusFilter === 'aprobado'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Aprobados
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                statusFilter === 'all'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Todos
            </button>
          </div>
        </div>

        {/* Row 2: Type Filter Pills (Todos / Mensualidades / Pagos Extras) */}
        <div className="pt-2 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-neutral-400 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              Tipo de Pago:
            </span>

            <button
              onClick={() => {
                setTypeFilter('all');
                setExtraCategoryFilter('all');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                typeFilter === 'all'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Todos los Pagos
            </button>

            <button
              onClick={() => {
                setTypeFilter('mensualidad');
                setExtraCategoryFilter('all');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                typeFilter === 'mensualidad'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Mensualidades</span>
            </button>

            <button
              onClick={() => setTypeFilter('extra')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                typeFilter === 'extra'
                  ? 'bg-purple-900 text-white'
                  : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Pagos Extras (Torneos, Kits, etc.)</span>
              {pendingExtraCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-400 text-black">
                  {pendingExtraCount}
                </span>
              )}
            </button>
          </div>

          {/* Sub-filter if Pagos Extras is active */}
          {typeFilter === 'extra' && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-neutral-400 font-medium">Categoría:</span>
              <select
                value={extraCategoryFilter}
                onChange={(e) => setExtraCategoryFilter(e.target.value as any)}
                className="px-2.5 py-1 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-800 focus:outline-none"
              >
                <option value="all">Todas las categorías extras</option>
                <option value="torneo">Torneos y Copas</option>
                <option value="inscripcion">Inscripciones Anuales</option>
                <option value="uniforme">Uniformes y Equipo</option>
                <option value="arbitraje">Arbitraje y Cancha</option>
                <option value="transporte">Transporte y Viáticos</option>
                <option value="otro">Otros gastos extras</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Payments List / Cards */}
      {filteredPayments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center text-xs text-neutral-400">
          <CheckCircle2 className="w-10 h-10 mx-auto text-neutral-300 mb-2" />
          <p className="font-semibold text-neutral-700">No hay pagos que mostrar en este filtro</p>
          <p className="mt-1">
            {statusFilter === 'pendiente'
              ? 'Todos los comprobantes reportados de este tipo están al día y revisados.'
              : 'Prueba cambiando los criterios de búsqueda o filtros.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPayments.map((payment) => {
            const student = students.find((s) => s.id === payment.studentId);
            const isPending = payment.status === 'pendiente';
            const isApproved = payment.status === 'aprobado';
            const isRejected = payment.status === 'rechazado';
            const isExtra = payment.paymentType === 'extra';
            const extraMeta = isExtra ? getExtraCategoryMeta(payment.extraCategory) : null;
            const ExtraIcon = extraMeta?.icon || Tag;

            return (
              <div
                key={payment.id}
                className={`bg-white rounded-2xl border p-4 sm:p-5 transition-all shadow-2xs ${
                  isPending
                    ? isExtra
                      ? 'border-purple-200 bg-purple-50/20'
                      : 'border-amber-200 bg-amber-50/20'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Info */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm sm:text-base font-bold text-neutral-900">
                        {payment.studentName}
                      </span>
                      {student && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 font-semibold text-neutral-700">
                          {student.category} #{student.jerseyNumber} · {student.campus || 'Sede'}
                        </span>
                      )}

                      {/* Badge: Pago Extra vs Mensualidad */}
                      {isExtra ? (
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 border ${
                            extraMeta?.bg || 'bg-purple-100 text-purple-900'
                          }`}
                        >
                          <ExtraIcon className="w-3 h-3" />
                          <span>PAGO EXTRA · {extraMeta?.label.toUpperCase()}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-neutral-100 text-neutral-700 border border-neutral-200">
                          MENSUALIDAD
                        </span>
                      )}

                      {/* Status badge */}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          isApproved
                            ? 'bg-emerald-100 text-emerald-800'
                            : isPending
                            ? 'bg-amber-100 text-amber-800 animate-pulse'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {isApproved ? 'Aprobado' : isPending ? 'Pendiente' : 'Rechazado'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-neutral-600 pt-1">
                      <div>
                        <span className="text-[10px] text-neutral-400 block font-medium">Concepto Acreditado</span>
                        <span className="font-semibold text-neutral-900 block truncate" title={payment.concept}>
                          {payment.concept}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-400 block font-medium">Método & Referencia</span>
                        <span className="font-semibold text-neutral-800 block truncate" title={payment.referenceNumber}>
                          {payment.method} · <span className="font-mono">{payment.referenceNumber}</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-400 block font-medium">Fecha de Pago</span>
                        <span className="text-neutral-700">{payment.paymentDate}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-400 block font-medium">Reportado en</span>
                        <span className="text-neutral-500">{payment.reportedDate}</span>
                      </div>
                    </div>

                    {payment.notes && (
                      <div className="mt-1 text-[11px] text-neutral-600 bg-neutral-50 px-2.5 py-1 rounded-lg border border-neutral-200/60 inline-block">
                        <span className="font-semibold text-neutral-700">Nota del alumno: </span>
                        {payment.notes}
                      </div>
                    )}

                    {isRejected && payment.rejectionReason && (
                      <div className="mt-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                        <div>
                          <span className="font-bold">Motivo del Rechazo: </span>
                          <span>{payment.rejectionReason}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Amount & Actions */}
                  <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between border-t lg:border-t-0 pt-3 lg:pt-0 border-neutral-100 gap-3 shrink-0">
                    <div className="text-left lg:text-right">
                      <div className="text-lg sm:text-xl font-mono font-extrabold text-neutral-900 tabular-nums">
                        ${payment.amount} <span className="text-xs font-sans text-neutral-500 font-normal">MXN</span>
                      </div>
                      {payment.receiptFolio && (
                        <div className="text-[10px] font-mono font-semibold text-neutral-500">
                          Folio: {payment.receiptFolio}
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      {/* View Voucher / Image Preview */}
                      <button
                        onClick={() => setPreviewPayment(payment)}
                        title="Ver comprobante subido"
                        className="px-2.5 py-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-neutral-500" />
                        <span>Comprobante</span>
                      </button>

                      {/* If Approved: View Digital Receipt */}
                      {isApproved && (
                        <button
                          onClick={() => onViewDigitalReceipt(payment)}
                          title="Ver acuse digital oficial"
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Acuse Digital</span>
                        </button>
                      )}

                      {/* If Pending: Approve & Reject buttons */}
                      {isPending && (
                        <>
                          <button
                            onClick={() => onApprovePayment(payment.id)}
                            title={isExtra ? 'Aprobar pago extra y emitir acuse digital' : 'Aprobar mensualidad y generar acuse digital'}
                            className={`px-3 py-1.5 rounded-xl text-white text-xs font-bold flex items-center gap-1 transition shadow-xs cursor-pointer active:scale-95 ${
                              isExtra ? 'bg-purple-700 hover:bg-purple-800' : 'bg-emerald-600 hover:bg-emerald-700'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{isExtra ? 'Aprobar Extra' : 'Aprobar'}</span>
                          </button>

                          <button
                            onClick={() => {
                              setRejectingPayment(payment);
                              setRejectionReason(
                                isExtra
                                  ? 'El comprobante es ilegible o el monto no corresponde a la cuota del evento/torneo.'
                                  : 'El comprobante es ilegible o el monto no coincide con la cuota de mensualidad.'
                              );
                            }}
                            title="Rechazar pago y solicitar corrección"
                            className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Rechazar</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Ver Comprobante Subido */}
      {previewPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-neutral-200 text-[#363435]">
            <div className="flex justify-between items-start pb-3 border-b border-neutral-100">
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                  Cotejo de Comprobante Bancario
                </span>
                <h3 className="font-extrabold text-neutral-900 text-base">
                  {previewPayment.studentName}
                </h3>
                <span className="text-xs text-neutral-500">
                  {previewPayment.concept} · ${previewPayment.amount} MXN
                </span>
              </div>
              <button
                onClick={() => setPreviewPayment(null)}
                className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Datos Clave */}
            <div className="my-3 p-3 rounded-xl bg-neutral-50 border border-neutral-200 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-neutral-400 block">Método de Pago</span>
                <span className="font-semibold text-neutral-800">{previewPayment.method}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 block">Referencia / Rastreo</span>
                <span className="font-mono font-bold text-neutral-900">{previewPayment.referenceNumber}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 block">Fecha de Pago</span>
                <span className="text-neutral-700">{previewPayment.paymentDate}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 block">Estatus Actual</span>
                <span className="font-bold capitalize text-neutral-800">{previewPayment.status}</span>
              </div>
            </div>

            {/* Imagen del comprobante */}
            <div className="rounded-xl overflow-hidden bg-neutral-900 max-h-[380px] flex items-center justify-center border border-neutral-200">
              <img
                src={previewPayment.receiptUrl}
                alt="Comprobante bancario"
                className="max-h-[360px] w-full object-contain"
              />
            </div>

            {/* Acciones en Modal */}
            <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
              <button
                onClick={() => setPreviewPayment(null)}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cerrar
              </button>

              {previewPayment.status === 'pendiente' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      onApprovePayment(previewPayment.id);
                      setPreviewPayment(null);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Aprobar Comprobante</span>
                  </button>
                  <button
                    onClick={() => {
                      const target = previewPayment;
                      setPreviewPayment(null);
                      setRejectingPayment(target);
                      setRejectionReason('El comprobante es ilegible o el monto no coincide.');
                    }}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    <span>Rechazar</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Rechazar Pago con Motivo */}
      {rejectingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-neutral-200 text-[#363435]">
            <div className="flex justify-between items-center pb-3 border-b border-neutral-100">
              <h3 className="font-extrabold text-neutral-900 text-sm flex items-center gap-2 text-rose-600">
                <AlertCircle className="w-4 h-4" />
                <span>Rechazar Comprobante de Pago</span>
              </h3>
              <button
                onClick={() => setRejectingPayment(null)}
                className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-4 mt-3">
              <p className="text-xs text-neutral-600">
                El alumno <strong>{rejectingPayment.studentName}</strong> recibirá una notificación
                explicando por qué no se validó el pago de <strong>${rejectingPayment.amount} MXN</strong> para{' '}
                <strong>{rejectingPayment.concept}</strong> para que pueda volver a subirlo corregido.
              </p>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Motivo del Rechazo *
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:outline-none focus:border-[#363435]"
                  placeholder="Explica qué error tiene la ficha o comprobante..."
                />
              </div>

              {/* Botones de motivos frecuentes */}
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] text-neutral-400 w-full block">Motivos rápidos:</span>
                {[
                  'Foto desenfocada o ilegible',
                  'Monto incompleto o no coincide',
                  'Falta número de referencia o autorización',
                  'Comprobante duplicado ya registrado',
                ].map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setRejectionReason(sug)}
                    className="text-[10px] px-2 py-0.5 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition cursor-pointer"
                  >
                    {sug}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setRejectingPayment(null)}
                  className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 font-bold text-xs hover:bg-neutral-50 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer shadow-xs"
                >
                  Confirmar Rechazo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
