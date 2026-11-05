import React, { useState } from 'react';
import { PaymentRecord, Student, BillingCycle, SystemUser, PaymentMethod, PaymentStatus, PaymentType, ExtraPaymentCategory } from '../../types';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  Edit3,
  Calendar,
  CreditCard,
  User,
  FileText,
  DollarSign,
  Tag,
  Trophy,
  Save,
  Eye,
  UserCheck,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  payment: PaymentRecord;
  students: Student[];
  cycles?: BillingCycle[];
  coaches?: SystemUser[];
  onSavePayment: (updatedPayment: PaymentRecord, originalPayment: PaymentRecord) => void;
}

const MONTH_OPTIONS = [
  'Mensualidad Octubre 2026',
  'Mensualidad Noviembre 2026',
  'Mensualidad Diciembre 2026',
  'Mensualidad Enero 2027',
  'Mensualidad Febrero 2027',
  'Mensualidad Marzo 2027',
  'Mensualidad Abril 2027',
  'Mensualidad Mayo 2027',
  'Mensualidad Junio 2027',
  'Mensualidad Julio 2027',
  'Mensualidad Agosto 2027',
  'Mensualidad Septiembre 2026',
];

export const EditPaymentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  payment,
  students,
  cycles = [],
  coaches = [],
  onSavePayment,
}) => {
  if (!isOpen) return null;

  // Form states initialized with current payment data
  const [studentId, setStudentId] = useState(payment.studentId);
  const [paymentType, setPaymentType] = useState<PaymentType>(payment.paymentType || 'mensualidad');
  const [extraCategory, setExtraCategory] = useState<ExtraPaymentCategory | undefined>(payment.extraCategory);
  const [concept, setConcept] = useState(payment.concept || 'Mensualidad Noviembre 2026');
  const [customConcept, setCustomConcept] = useState(
    MONTH_OPTIONS.includes(payment.concept) ? '' : payment.concept
  );
  const [isCustomConcept, setIsCustomConcept] = useState(!MONTH_OPTIONS.includes(payment.concept));
  const [amount, setAmount] = useState<number>(payment.amount);
  const [paymentDate, setPaymentDate] = useState<string>(payment.paymentDate || new Date().toISOString().split('T')[0]);
  const [method, setMethod] = useState<PaymentMethod>(payment.method || 'Transferencia SPEI');
  const [referenceNumber, setReferenceNumber] = useState<string>(payment.referenceNumber || '');
  const [status, setStatus] = useState<PaymentStatus>(payment.status || 'aprobado');
  const [coachId, setCoachId] = useState<string>(payment.coachId || '');
  const [correctionNote, setCorrectionNote] = useState<string>('');
  const [showVoucherPreview, setShowVoucherPreview] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  // Available options merged with any cycles created by admin
  const allConceptSuggestions = Array.from(
    new Set([
      ...MONTH_OPTIONS,
      ...cycles.map((c) => c.title),
    ])
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedStudent = students.find((s) => s.id === studentId);
    const selectedCoach = coaches.find((c) => c.id === coachId);
    const finalConcept = isCustomConcept ? (customConcept.trim() || concept) : concept;

    const existingNotes = payment.notes || '';
    const timestamp = new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
    const auditStamp = correctionNote.trim()
      ? `[Corrección Admin ${timestamp}]: ${correctionNote.trim()}`
      : `[Corregido por Admin ${timestamp}]`;

    const mergedNotes = existingNotes ? `${existingNotes} | ${auditStamp}` : auditStamp;

    const updatedPayment: PaymentRecord = {
      ...payment,
      studentId,
      studentName: selectedStudent ? selectedStudent.fullName : payment.studentName,
      coachId: coachId || undefined,
      coachName: selectedCoach ? selectedCoach.name : payment.coachName,
      paymentType,
      extraCategory: paymentType === 'extra' ? extraCategory : undefined,
      concept: finalConcept,
      amount: Number(amount) || payment.amount,
      paymentDate,
      method,
      referenceNumber: referenceNumber.trim() || payment.referenceNumber,
      status,
      notes: mergedNotes,
      reviewedDate: status === 'aprobado' ? (payment.reviewedDate || new Date().toISOString().replace('T', ' ').substring(0, 16)) : payment.reviewedDate,
    };

    onSavePayment(updatedPayment, payment);
    setSuccessMsg(true);
    setTimeout(() => {
      setSuccessMsg(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl border border-neutral-200 text-[#363435] overflow-hidden my-auto animate-in slide-in-from-bottom-2">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 pb-3 border-b border-neutral-100 shrink-0 bg-neutral-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-neutral-900 tracking-tight">
                Corregir / Reasignar Pago
              </h2>
              <p className="text-xs text-neutral-500">
                Ajusta el mes/ciclo, fecha, monto o alumno correspondiente
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>¡Pago corregido y actualizado con éxito!</span>
            </div>
          )}

          {/* Banner de Info Original */}
          <div className="p-3 bg-neutral-100/70 rounded-2xl border border-neutral-200 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div>
              <span className="text-neutral-500 block">Alumno Actual:</span>
              <span className="font-bold text-neutral-900 text-xs">{payment.studentName}</span>
            </div>
            <div>
              <span className="text-neutral-500 block">Folio / Ref:</span>
              <span className="font-mono font-bold text-neutral-800">{payment.receiptFolio || payment.referenceNumber}</span>
            </div>
            <div>
              <span className="text-neutral-500 block">Concepto Original:</span>
              <span className="font-semibold text-neutral-800">{payment.concept}</span>
            </div>
            {payment.receiptUrl && (
              <button
                type="button"
                onClick={() => setShowVoucherPreview(!showVoucherPreview)}
                className="px-2.5 py-1 bg-white hover:bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-700 font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-blue-600" />
                <span>{showVoucherPreview ? 'Ocultar Recibo' : 'Ver Recibo'}</span>
              </button>
            )}
          </div>

          {/* Previsualización del comprobante si se despliega */}
          {showVoucherPreview && payment.receiptUrl && (
            <div className="p-3 bg-neutral-900 rounded-2xl border border-neutral-700 text-center space-y-2 animate-in fade-in">
              <span className="text-[10px] text-neutral-400 block">Comprobante de depósito o transferencia original:</span>
              <img
                src={payment.receiptUrl}
                alt="Comprobante"
                className="max-h-60 mx-auto rounded-xl object-contain shadow-md"
              />
            </div>
          )}

          {/* 1. Alumno al que pertenece el pago */}
          <div>
            <label className="block font-bold text-neutral-800 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>Alumno Asignado al Pago:</span>
            </label>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-neutral-900"
            >
              {students.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.fullName} ({st.category} · Rama {st.branch} · {st.campus || 'Sede'})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-neutral-400 mt-1">
              Útil si un padre pagó por un hermano pero seleccionó al alumno equivocado.
            </p>
          </div>

          {/* 2. Tipo de Pago: Mensualidad vs Pago Extra */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setPaymentType('mensualidad');
                setIsCustomConcept(false);
                setConcept('Mensualidad Noviembre 2026');
              }}
              className={`py-2 px-3 rounded-xl border text-center font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                paymentType === 'mensualidad'
                  ? 'border-blue-500 bg-blue-50 text-blue-900 shadow-2xs'
                  : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Mensualidad Ordinaria</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPaymentType('extra');
                if (!extraCategory) setExtraCategory('torneo');
              }}
              className={`py-2 px-3 rounded-xl border text-center font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                paymentType === 'extra'
                  ? 'border-purple-500 bg-purple-50 text-purple-900 shadow-2xs'
                  : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Pago Extra (Torneo / Uniforme)</span>
            </button>
          </div>

          {/* 3. Selección del Mes o Ciclo (LA FUNCIÓN CLAVE PEDIDA POR EL CLIENTE) */}
          <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-2">
            <label className="block font-bold text-amber-950 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-700" />
                <span>Mes o Ciclo Correspondiente (Corrección de Mes):</span>
              </span>
              <button
                type="button"
                onClick={() => setIsCustomConcept(!isCustomConcept)}
                className="text-[10px] text-amber-800 font-bold hover:underline cursor-pointer"
              >
                {isCustomConcept ? 'Elegir de la lista predefinida' : 'Escribir concepto manual'}
              </button>
            </label>

            {!isCustomConcept ? (
              <select
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-neutral-900 font-bold text-xs cursor-pointer shadow-2xs"
              >
                <optgroup label="Meses de Mensualidad Oficial">
                  {allConceptSuggestions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </optgroup>
              </select>
            ) : (
              <input
                type="text"
                placeholder="Ej. Mensualidad Noviembre 2026, Torneo Copa Cuautitlán..."
                value={customConcept}
                onChange={(e) => setCustomConcept(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-neutral-900 font-bold text-xs"
              />
            )}

            <p className="text-[10px] text-amber-800">
              💡 Cambia aquí si el pago fue depositado para <strong>Noviembre</strong> pero por error se había capturado como <strong>Octubre</strong>.
            </p>
          </div>

          {/* 4. Categoría si es Pago Extra */}
          {paymentType === 'extra' && (
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Categoría del Pago Extra:
              </label>
              <select
                value={extraCategory || 'torneo'}
                onChange={(e) => setExtraCategory(e.target.value as ExtraPaymentCategory)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-neutral-900 font-semibold"
              >
                <option value="torneo">Torneo / Copa Deportiva</option>
                <option value="inscripcion">Inscripción / Reinscripción</option>
                <option value="uniforme">Uniforme / Kit de Juego</option>
                <option value="arbitraje">Arbitraje</option>
                <option value="transporte">Transporte / Traslados</option>
                <option value="otro">Otro Concepto Extra</option>
              </select>
            </div>
          )}

          {/* 5. Monto y Fecha Real del Pago */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>Monto Pagado ($ MXN) *</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-neutral-900 text-sm"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                <span>Fecha Real de Pago *</span>
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-neutral-900"
              />
            </div>
          </div>

          {/* 6. Método de Pago y Referencia */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-neutral-500" />
                <span>Método de Pago</span>
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-neutral-900 font-semibold"
              >
                <option value="Transferencia SPEI">Transferencia SPEI</option>
                <option value="Depósito OXXO">Depósito OXXO / Tienda</option>
                <option value="Efectivo en Cancha">Efectivo en Cancha</option>
                <option value="Tarjeta Débito/Crédito">Tarjeta Débito/Crédito</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Número de Referencia / Rastreo
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Ej. SPEI-984719, 04819..."
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-neutral-900"
              />
            </div>
          </div>

          {/* 7. Estado del Pago y Entrenador Receptor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Estado de Conciliación
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PaymentStatus)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-neutral-900"
              >
                <option value="aprobado">✅ Aprobado / Validado</option>
                <option value="pendiente">⏳ Pendiente de Revisión</option>
                <option value="rechazado">❌ Rechazado</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Coach Asignado / Receptor</span>
              </label>
              <select
                value={coachId}
                onChange={(e) => setCoachId(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-neutral-900 font-semibold"
              >
                <option value="">-- General / Sin Coach Específico --</option>
                {coaches
                  .filter((c) => c.isActive !== false)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.role === 'head_coach' ? `👑 ${c.name} (Admin)` : `🏐 ${c.name}`}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* 8. Motivo o Nota de Corrección (Auditoría interna) */}
          <div>
            <label className="block font-semibold text-neutral-700 mb-1">
              Nota o Motivo de la Corrección (opcional):
            </label>
            <textarea
              rows={2}
              value={correctionNote}
              onChange={(e) => setCorrectionNote(e.target.value)}
              placeholder="Ej. Se reasigna el pago al ciclo de Noviembre 2026 por solicitud del tutor. Comprobante verificado."
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-neutral-900 text-xs"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-neutral-200 bg-neutral-50 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-neutral-300 hover:bg-neutral-100 font-semibold text-neutral-700 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 rounded-xl bg-[#363435] hover:bg-black text-amber-400 font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer active:scale-95"
          >
            <Save className="w-4 h-4 text-amber-400" />
            <span>Guardar Corrección</span>
          </button>
        </div>
      </div>
    </div>
  );
};
