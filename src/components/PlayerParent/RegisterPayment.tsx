import React, { useState } from 'react';
import { Student, PaymentRecord, PaymentMethod, PaymentType, ExtraPaymentCategory } from '../../types';
import {
  Upload,
  Calendar,
  DollarSign,
  CreditCard,
  Hash,
  CheckCircle2,
  FileCheck,
  Trophy,
  Shirt,
  ClipboardList,
  Sparkles,
  Info,
  Tag,
  Bus,
  Clock,
} from 'lucide-react';

interface Props {
  currentStudent: Student;
  onSubmitPayment: (newPayment: Omit<PaymentRecord, 'id' | 'reportedDate' | 'status'>) => void;
  onNavigateToHistory: () => void;
}

const EXTRA_CATEGORIES: {
  id: ExtraPaymentCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  defaultConcept: string;
  suggestedAmounts?: number[];
  suggestions: string[];
}[] = [
  {
    id: 'torneo',
    label: 'Torneo o Copa',
    icon: Trophy,
    description: 'Inscripción a copas, ligas o torneos deportivos.',
    defaultConcept: 'Torneo: Copa Cuautitlán 2026',
    suggestedAmounts: [450, 600, 800, 1200],
    suggestions: [
      'Copa Cuautitlán 2026',
      'Torneo Regional Tlalnepantla',
      'Copa Estatal de Voleibol',
      'Liga Municipal Juvenil',
    ],
  },
  {
    id: 'inscripcion',
    label: 'Inscripción Anual',
    icon: ClipboardList,
    description: 'Cuota de matrícula o registro anual de temporada.',
    defaultConcept: 'Inscripción Anual Ciclo 2026-2027',
    suggestedAmounts: [500, 750, 1000],
    suggestions: [
      'Inscripción Anual Ciclo 2026-2027',
      'Reinscripción Semestral',
      'Seguro Deportivo y Registro',
    ],
  },
  {
    id: 'uniforme',
    label: 'Uniforme / Equipo',
    icon: Shirt,
    description: 'Jersey oficial, short, rodilleras o kit de entrenamiento.',
    defaultConcept: 'Uniforme Oficial Geckos Voleibol',
    suggestedAmounts: [650, 850, 1100],
    suggestions: [
      'Kit Completo Juego Oficial (Playera + Short)',
      'Playera de Entrenamiento Oficial',
      'Sudadera / Chamarra Oficial Geckos',
      'Rodilleras y Calcetas de Club',
    ],
  },
  {
    id: 'arbitraje',
    label: 'Arbitraje / Cancha',
    icon: Clock,
    description: 'Cuota de juez, arbitraje de partido o renta de duela.',
    defaultConcept: 'Cuota de Arbitraje - Jornada 5',
    suggestedAmounts: [150, 250, 400],
    suggestions: [
      'Cuota de Arbitraje - Jornada Regular',
      'Arbitraje Semifinal / Final',
      'Renta Extra de Cancha Duela',
    ],
  },
  {
    id: 'transporte',
    label: 'Transporte / Viáticos',
    icon: Bus,
    description: 'Viajes a torneos foráneos o traslado de equipo.',
    defaultConcept: 'Transporte Torneo Foráneo',
    suggestedAmounts: [300, 500, 900],
    suggestions: [
      'Transporte Copa Foránea',
      'Viáticos y Acompañamiento',
      'Autobús Oficial del Equipo',
    ],
  },
  {
    id: 'otro',
    label: 'Otro Concepto Extra',
    icon: Tag,
    description: 'Cualquier otro gasto extraordinario acordado con el coach.',
    defaultConcept: 'Pago Extraordinario Club Geckos',
    suggestions: [
      'Clínica / Taller Especial de Voleibol',
      'Convivio de Fin de Temporada',
      'Material Deportivo Especial',
    ],
  },
];

export const RegisterPayment: React.FC<Props> = ({
  currentStudent,
  onSubmitPayment,
  onNavigateToHistory,
}) => {
  // Payment Type: Mensualidad vs Extra
  const [paymentType, setPaymentType] = useState<PaymentType>('mensualidad');

  // Mensualidad form state
  const initialMonthly = currentStudent.currentBalance > 0 ? currentStudent.currentBalance : currentStudent.monthlyFee;
  const [monthlyConcept, setMonthlyConcept] = useState('Mensualidad Octubre 2026');
  const [monthlyAmount, setMonthlyAmount] = useState<string>(
    initialMonthly > 0 ? String(initialMonthly) : '600'
  );

  // Extra payment form state
  const [extraCategory, setExtraCategory] = useState<ExtraPaymentCategory>('torneo');
  const [eventName, setEventName] = useState('Copa Cuautitlán 2026');
  const [extraAmount, setExtraAmount] = useState<string>('600');
  const [extraNotes, setExtraNotes] = useState('');

  // Common payment details
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [method, setMethod] = useState<PaymentMethod>('Transferencia SPEI');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [receiptUrl, setReceiptUrl] = useState<string>(
    'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=700&q=80'
  );
  const [previewFileName, setPreviewFileName] = useState<string>('comprobante_banco.jpg');
  const [submitted, setSubmitted] = useState(false);
  const [lastSubmittedConcept, setLastSubmittedConcept] = useState('');
  const [lastSubmittedAmount, setLastSubmittedAmount] = useState(0);

  const selectedCategoryMeta = EXTRA_CATEGORIES.find((c) => c.id === extraCategory) || EXTRA_CATEGORIES[0];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreviewFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setReceiptUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectExtraCategory = (cat: ExtraPaymentCategory) => {
    setExtraCategory(cat);
    const meta = EXTRA_CATEGORIES.find((c) => c.id === cat);
    if (meta && meta.suggestions.length > 0) {
      setEventName(meta.suggestions[0]);
      if (meta.suggestedAmounts && meta.suggestedAmounts.length > 0) {
        setExtraAmount(String(meta.suggestedAmounts[0]));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!referenceNumber.trim()) return;

    const parsedMonthlyAmount = parseFloat(monthlyAmount);
    const parsedExtraAmount = parseFloat(extraAmount);

    if (paymentType === 'mensualidad') {
      if (!parsedMonthlyAmount || parsedMonthlyAmount <= 0) return;
      onSubmitPayment({
        studentId: currentStudent.id,
        studentName: currentStudent.fullName,
        paymentType: 'mensualidad',
        concept: monthlyConcept,
        amount: parsedMonthlyAmount,
        paymentDate,
        method,
        referenceNumber,
        receiptUrl,
      });
      setLastSubmittedConcept(monthlyConcept);
      setLastSubmittedAmount(parsedMonthlyAmount);
    } else {
      if (!parsedExtraAmount || parsedExtraAmount <= 0) return;
      const finalConcept = eventName.trim()
        ? `${selectedCategoryMeta.label}: ${eventName.trim()}`
        : selectedCategoryMeta.defaultConcept;

      onSubmitPayment({
        studentId: currentStudent.id,
        studentName: currentStudent.fullName,
        paymentType: 'extra',
        extraCategory,
        eventName: eventName.trim(),
        concept: finalConcept,
        amount: parsedExtraAmount,
        paymentDate,
        method,
        referenceNumber,
        receiptUrl,
        notes: extraNotes.trim() || undefined,
      });
      setLastSubmittedConcept(finalConcept);
      setLastSubmittedAmount(parsedExtraAmount);
    }

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-2xl border border-neutral-200 shadow-2xs p-6 sm:p-8 text-center space-y-4 animate-in fade-in">
        <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <h2 className="text-lg sm:text-xl font-bold text-neutral-900">
          ¡Comprobante Reportado con Éxito!
        </h2>

        <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs text-left space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold flex items-center gap-1.5 text-amber-800">
              <FileCheck className="w-4 h-4" />
              Estatus: «Pendiente de revisión por el Admin»
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-200 text-amber-900">
              {paymentType === 'extra' ? 'Pago Extra' : 'Mensualidad'}
            </span>
          </div>

          <p className="text-neutral-700">
            Tu reporte de pago por <strong>${lastSubmittedAmount} MXN</strong> para{' '}
            <strong>{lastSubmittedConcept}</strong> ha sido enviado a validación para cotejo bancario.
          </p>
          <p className="text-neutral-500 text-[11px]">
            {paymentType === 'extra'
              ? 'Una vez cotejado por el Head Coach, se generará tu acuse digital oficial de evento/pago extra sin alterar tus mensualidades regulares.'
              : 'Una vez validado, tu saldo de mensualidad se actualizará automáticamente y se generará tu acuse digital oficial.'}
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => {
              setSubmitted(false);
              setReferenceNumber('');
              setExtraNotes('');
            }}
            className="flex-1 py-2.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 font-semibold text-xs transition cursor-pointer"
          >
            Registrar Otro Pago
          </button>
          <button
            onClick={onNavigateToHistory}
            className="flex-1 py-2.5 rounded-xl bg-[#000000] text-white hover:bg-[#363435] font-bold text-xs transition cursor-pointer"
          >
            Ver Mi Historial de Pagos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="pb-2 border-b border-neutral-200">
        <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight">
          Registro de Pagos y Comprobantes
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
          Sube tu captura o comprobante bancario para validación oficial por parte del Head Coach.
        </p>
      </div>

      {/* Info card of student */}
      <div className="p-4 rounded-2xl bg-neutral-100 border border-neutral-200/80 flex items-center justify-between text-xs">
        <div>
          <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Alumno Asociado</span>
          <span className="font-bold text-neutral-900 text-sm">{currentStudent.fullName}</span>
          <span className="text-neutral-500 text-[11px] block">
            Categoría {currentStudent.category} · #{currentStudent.jerseyNumber} · Sede: {currentStudent.campus || 'Principal'}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Saldo Mensual Actual</span>
          <span className="font-mono font-bold text-base text-neutral-900 tabular-nums">
            ${currentStudent.currentBalance} MXN
          </span>
        </div>
      </div>

      {/* Selector de Tipo de Pago (Mensualidad vs Extras) */}
      <div className="bg-white p-2 rounded-2xl border border-neutral-200 shadow-2xs">
        <label className="block text-[11px] font-bold text-neutral-500 uppercase px-2 mb-2">
          ¿Qué tipo de pago deseas reportar?
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setPaymentType('mensualidad')}
            className={`p-3 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
              paymentType === 'mensualidad'
                ? 'bg-neutral-900 border-neutral-900 text-white shadow-xs'
                : 'bg-neutral-50 border-neutral-200 hover:border-neutral-300 text-neutral-700'
            }`}
          >
            <div
              className={`p-2 rounded-lg shrink-0 ${
                paymentType === 'mensualidad'
                  ? 'bg-white/10 text-amber-400'
                  : 'bg-white border border-neutral-200 text-neutral-700'
              }`}
            >
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-xs block">Mensualidad Regular</span>
              <span
                className={`text-[11px] block mt-0.5 ${
                  paymentType === 'mensualidad' ? 'text-neutral-300' : 'text-neutral-500'
                }`}
              >
                Cuota mensual regular para entrenamientos
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setPaymentType('extra')}
            className={`p-3 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
              paymentType === 'extra'
                ? 'bg-neutral-900 border-neutral-900 text-white shadow-xs'
                : 'bg-neutral-50 border-neutral-200 hover:border-neutral-300 text-neutral-700'
            }`}
          >
            <div
              className={`p-2 rounded-lg shrink-0 ${
                paymentType === 'extra'
                  ? 'bg-white/10 text-amber-400'
                  : 'bg-white border border-neutral-200 text-neutral-700'
              }`}
            >
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs block">Pago Extra / Evento</span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold uppercase bg-amber-400 text-black">
                  Nuevo
                </span>
              </div>
              <span
                className={`text-[11px] block mt-0.5 ${
                  paymentType === 'extra' ? 'text-neutral-300' : 'text-neutral-500'
                }`}
              >
                Inscripciones, torneos, copas, uniformes y kits
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-neutral-200 shadow-2xs p-5 sm:p-7 space-y-5 text-xs">
        {/* CONDICIONAL: Formulario para MENSUALIDAD */}
        {paymentType === 'mensualidad' && (
          <div className="space-y-4 p-4 rounded-xl bg-neutral-50/70 border border-neutral-200">
            <div className="flex items-center gap-2 text-neutral-800 font-bold text-xs">
              <CreditCard className="w-4 h-4 text-neutral-600" />
              <span>Datos de la Mensualidad</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Concepto / Mensualidad *
                </label>
                <select
                  value={monthlyConcept}
                  onChange={(e) => setMonthlyConcept(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900 font-medium"
                >
                  <option value="Mensualidad Octubre 2026">Mensualidad Octubre 2026</option>
                  <option value="Mensualidad Noviembre 2026">Mensualidad Noviembre 2026</option>
                  <option value="Mensualidad Septiembre 2026 (Adeudo)">Mensualidad Septiembre 2026 (Adeudo)</option>
                  <option value="Mensualidad Diciembre 2026">Mensualidad Diciembre 2026</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Monto Pagado ($ MXN) *
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    required
                    placeholder="0.00"
                    value={monthlyAmount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      const parts = val.split('.');
                      const sanitized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : val;
                      setMonthlyAmount(sanitized);
                    }}
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900 font-mono font-bold text-sm no-spinner"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CONDICIONAL: Formulario para PAGO EXTRA */}
        {paymentType === 'extra' && (
          <div className="space-y-4 p-4 sm:p-5 rounded-xl bg-amber-50/30 border border-amber-200/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-neutral-900 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Detalle del Pago Extra / Evento</span>
              </div>
              <span className="text-[11px] text-amber-800 font-medium">
                Inscripciones, Torneos y Uniformes
              </span>
            </div>

            {/* Categorías de Gastos Extras */}
            <div>
              <label className="block font-semibold text-neutral-700 mb-2">
                Selecciona la Categoría del Gasto Extra *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {EXTRA_CATEGORIES.map((cat) => {
                  const CatIcon = cat.icon;
                  const isSelected = extraCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleSelectExtraCategory(cat.id)}
                      className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                          : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <CatIcon
                        className={`w-4 h-4 shrink-0 ${
                          isSelected ? 'text-amber-400' : 'text-neutral-500'
                        }`}
                      />
                      <span className="font-bold text-xs truncate">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-neutral-500 mt-1.5 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span>{selectedCategoryMeta.description}</span>
              </p>
            </div>

            {/* Nombre del Torneo / Descripción del Concepto */}
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Nombre del Torneo, Evento o Concepto Específico *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Copa Cuautitlán 2026, Kit Uniforme Titular..."
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900 font-medium"
              />

              {/* Sugerencias Rápidas */}
              {selectedCategoryMeta.suggestions.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] font-semibold text-neutral-400">Sugerencias:</span>
                  {selectedCategoryMeta.suggestions.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setEventName(sug)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Monto del Pago Extra */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Monto Pagado ($ MXN) *
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    required
                    placeholder="0.00"
                    value={extraAmount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      const parts = val.split('.');
                      const sanitized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : val;
                      setExtraAmount(sanitized);
                    }}
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900 font-mono font-bold text-sm no-spinner"
                  />
                </div>
              </div>

              {/* Botones de montos sugeridos */}
              {selectedCategoryMeta.suggestedAmounts && (
                <div>
                  <span className="block font-semibold text-neutral-700 mb-1">
                    Montos Frecuentes
                  </span>
                  <div className="flex gap-2">
                    {selectedCategoryMeta.suggestedAmounts.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setExtraAmount(String(amt))}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition cursor-pointer font-mono ${
                          parseFloat(extraAmount) === amt
                            ? 'bg-neutral-900 text-white border-neutral-900'
                            : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                        }`}
                      >
                        ${amt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Notas opcionales */}
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Notas u Observaciones (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ej. Talla M para playera, o número de dorsal solicitado..."
                value={extraNotes}
                onChange={(e) => setExtraNotes(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900"
              />
            </div>
          </div>
        )}

        {/* DATOS UNIVERSALES DE PAGO: Método y Fecha */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-neutral-700 mb-1">
              Método de Pago Empleado *
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900 font-medium"
            >
              <option value="Transferencia SPEI">Transferencia SPEI (Banca Móvil)</option>
              <option value="Depósito OXXO">Depósito en OXXO / Practicaja</option>
              <option value="Efectivo en Cancha">Efectivo en Cancha (Entrenador)</option>
              <option value="Tarjeta Débito/Crédito">Tarjeta de Débito o Crédito</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 mb-1">
              Fecha en que se Realizó el Pago *
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Folio / Referencia */}
        <div>
          <label className="block font-semibold text-neutral-700 mb-1">
            Número de Referencia, Folio o Clave de Rastreo *
          </label>
          <div className="relative">
            <Hash className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              placeholder="Ej. SPEI-84920194, Autorización 093829, o Folio Ticket OXXO"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900 font-mono"
            />
          </div>
          <span className="text-[11px] text-neutral-400 mt-1 block">
            Este número permite al Head Coach identificar el depósito en el extracto de cuenta del club.
          </span>
        </div>

        {/* Carga de Comprobante / Evidencia */}
        <div className="space-y-2">
          <label className="block font-semibold text-neutral-700">
            Subir Comprobante (Captura de Transferencia / Ticket / Foto) *
          </label>

          <div className="border-2 border-dashed border-neutral-300 rounded-2xl p-5 text-center hover:border-neutral-400 transition bg-neutral-50/50">
            <input
              type="file"
              id="receipt-file-input"
              accept="image/*,.pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            <label
              htmlFor="receipt-file-input"
              className="cursor-pointer flex flex-col items-center justify-center space-y-2"
            >
              <div className="p-3 bg-white rounded-full border border-neutral-200 shadow-2xs text-[#363435]">
                <Upload className="w-6 h-6" />
              </div>
              <span className="font-bold text-neutral-800 text-xs">
                Toca aquí para seleccionar una foto o captura de pago
              </span>
              <span className="text-[11px] text-neutral-400">
                Formatos JPG, PNG o PDF (máx. 10MB)
              </span>
            </label>
          </div>

          {/* Comprobante preview */}
          {receiptUrl && (
            <div className="mt-3 p-3 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={receiptUrl}
                  alt="Vista previa"
                  className="w-12 h-12 object-cover rounded-lg border border-neutral-300 shrink-0"
                />
                <div className="min-w-0">
                  <span className="font-semibold text-neutral-800 text-xs block truncate">
                    {previewFileName}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-medium">
                    Evidencia adjunta correctamente
                  </span>
                </div>
              </div>

              <label
                htmlFor="receipt-file-input"
                className="text-[11px] font-semibold text-neutral-700 hover:text-black underline cursor-pointer shrink-0"
              >
                Cambiar archivo
              </label>
            </div>
          )}
        </div>

        {/* Submit button */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-[#000000] hover:bg-[#363435] text-white font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-xs"
          >
            <Upload className="w-4 h-4 text-amber-400" />
            <span>
              {paymentType === 'extra'
                ? 'Enviar Comprobante de Pago Extra a Validación'
                : 'Enviar Comprobante de Mensualidad a Validación'}
            </span>
          </button>
          <p className="text-[11px] text-neutral-400 text-center mt-2">
            La transacción quedará en estatus «Pendiente de revisión» hasta que el Head Coach la concilie.
          </p>
        </div>
      </form>
    </div>
  );
};
