import React from 'react';
import { Printer, Download, X, FileText, CheckCircle2, ShieldCheck, Users, CreditCard, Bell, Sparkles } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentationPDFModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200 print:p-0 print:bg-white print:static">
      <div className="w-full max-w-4xl bg-white rounded-2xl p-6 sm:p-10 shadow-2xl border border-neutral-200 text-[#363435] my-auto max-h-[95vh] overflow-y-auto print:max-h-none print:overflow-visible print:shadow-none print:border-none print:p-0">
        
        {/* Barra superior de control (Oculta al imprimir / guardar PDF) */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-neutral-200 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#363435]" />
            <span className="font-bold text-neutral-900 text-sm">
              Ficha Técnica del Sistema · Formato Imprimible / PDF
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-[#000000] hover:bg-[#363435] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Guardar / Imprimir como PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CONTENIDO DEL DOCUMENTO PDF */}
        <div className="space-y-8 text-neutral-800 font-sans print:space-y-6">
          
          {/* Encabezado Institucional con Logo Completo */}
          <div className="flex flex-col sm:flex-row items-center justify-between pb-6 border-b-2 border-neutral-900 gap-4">
            <div>
              <img
                src="https://avchpdtkogejgnomkxua.supabase.co/storage/v1/object/public/iconos/geckoslogo.png"
                alt="Gecko´s Veoleibol"
                className="h-16 sm:h-20 w-auto object-contain"
              />
            </div>
            <div className="text-center sm:text-right">
              <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-400 block">
                Manual de Usuario Oficial & Ficha Técnica
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
                Gecko´s Veoleibol
              </h1>
              <p className="text-xs text-neutral-500 mt-0.5">
                Guía Operativa por Roles, Flujo de Cobranza y Validación de Pagos
              </p>
              <span className="text-[10px] font-mono text-neutral-400 block mt-1">
                Temporada Oficial 2026 · Versión 2.5
              </span>
            </div>
          </div>

          {/* 1. Resumen de Acceso al Sistema */}
          <section className="space-y-3">
            <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-neutral-900 flex items-center gap-2 border-b border-neutral-200 pb-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>1. Acceso al Sistema e Instalación</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs leading-relaxed">
              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200">
                <span className="font-bold text-neutral-900 block mb-1">Acceso Unificado</span>
                <p className="text-neutral-600">
                  Pantalla principal limpia con formulario de acceso directo mediante usuario/correo y contraseña.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200">
                <span className="font-bold text-neutral-900 block mb-1">Registro de Alumnos</span>
                <p className="text-neutral-600">
                  Pestaña para nuevos alumnos (mayores de edad o menores con tutor), habilitando su cuenta automáticamente.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200">
                <span className="font-bold text-neutral-900 block mb-1">Instalación en Dispositivos</span>
                <p className="text-neutral-600">
                  Botón de instalación como app móvil en Android, iPhone/iPad (Safari "Agregar a Inicio") y computadoras.
                </p>
              </div>
            </div>
          </section>

          {/* 2. Roles del Sistema */}
          <section className="space-y-4">
            <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-neutral-900 flex items-center gap-2 border-b border-neutral-200 pb-1.5">
              <Users className="w-4 h-4 text-[#363435]" />
              <span>2. Roles del Sistema y sus Funciones</span>
            </h2>

            {/* Rol 1: Administrador */}
            <div className="p-4 rounded-xl border border-neutral-300 bg-neutral-50/70 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-neutral-900 text-sm">
                  <ShieldCheck className="w-5 h-5 text-emerald-700" />
                  <span>ROL 1: Administrador (Director General / Head Coach)</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                  Control Total
                </span>
              </div>
              <p className="text-xs text-neutral-600">
                Supervisa todos los ingresos económicos, valida pagos y gestiona tanto al personal como a los alumnos.
              </p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-neutral-700">
                <li className="p-2.5 bg-white rounded-lg border border-neutral-200">
                  <strong className="text-neutral-900 block mb-0.5">• Panel de Control (Dashboard):</strong>
                  Métricas de ingresos recibidos, adeudos pendientes, tasa de cobranza y lista de alumnos con recordatorios directos por WhatsApp.
                </li>
                <li className="p-2.5 bg-white rounded-lg border border-neutral-200">
                  <strong className="text-neutral-900 block mb-0.5">• Validación de Pagos:</strong>
                  Revisión de capturas de comprobantes. Al aprobar, emite el <strong>Acuse Digital Oficial con Folio</strong>. Al rechazar, indica el motivo al alumno.
                </li>
                <li className="p-2.5 bg-white rounded-lg border border-neutral-200">
                  <strong className="text-neutral-900 block mb-0.5">• Gestión de Entrenadores:</strong>
                  Crea y administra las cuentas de acceso para entrenadores asistentes y personal del club.
                </li>
                <li className="p-2.5 bg-white rounded-lg border border-neutral-200">
                  <strong className="text-neutral-900 block mb-0.5">• Navegación en Todos los Roles:</strong>
                  Botón superior "Navegar Roles" para explorar el sistema con la vista exacta de Entrenador, Alumno o Tutor.
                </li>
                <li className="p-2.5 bg-white rounded-lg border border-neutral-200 md:col-span-2">
                  <strong className="text-neutral-900 block mb-0.5">• Padrón de Alumnos & Cobranza:</strong>
                  Control de cuotas mensuales, historial deportivo, altas/bajas de deportistas y generación de nuevos ciclos.
                </li>
              </ul>
            </div>

            {/* Rol 2: Entrenador Asistente */}
            <div className="p-4 rounded-xl border border-neutral-300 bg-neutral-50/70 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-neutral-900 text-sm">
                  <Users className="w-5 h-5 text-blue-700" />
                  <span>ROL 2: Entrenador Asistente (Staff Deportivo)</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold uppercase">
                  Gestión Deportiva
                </span>
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-neutral-700">
                <li className="p-2.5 bg-white rounded-lg border border-neutral-200">
                  <strong className="text-neutral-900 block mb-0.5">• Consulta de Padrón y Alumnos:</strong>
                  Revisión de deportistas activos, categorías (Sub 13, Sub 15, Libre, etc.), ramas y contactos.
                </li>
                <li className="p-2.5 bg-white rounded-lg border border-neutral-200">
                  <strong className="text-neutral-900 block mb-0.5">• Verificación de Estado de Cuotas:</strong>
                  Identificación de alumnos al corriente o con pagos pendientes antes de entrenamientos o torneos.
                </li>
                <li className="p-2.5 bg-white rounded-lg border border-neutral-200">
                  <strong className="text-neutral-900 block mb-0.5">• Envío de Recordatorios WhatsApp:</strong>
                  Envío de mensajes rápidos a tutores y jugadores con su saldo y fecha de corte.
                </li>
                <li className="p-2.5 bg-white rounded-lg border border-neutral-200">
                  <strong className="text-neutral-900 block mb-0.5">• Perfil de Entrenador:</strong>
                  Subida de fotografía, actualización de teléfono/correo y cambio de contraseña propia.
                </li>
              </ul>
            </div>

            {/* Rol 3: Alumno / Tutor */}
            <div className="p-4 rounded-xl border border-neutral-300 bg-neutral-50/70 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-neutral-900 text-sm">
                  <Users className="w-5 h-5 text-amber-700" />
                  <span>ROL 3: Alumno / Deportista & Padre de Familia (Tutor)</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold uppercase">
                  Portal del Deportista
                </span>
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-neutral-700">
                <li className="p-2.5 bg-white rounded-lg border border-neutral-200">
                  <strong className="text-neutral-900 block mb-0.5">• Estado de Cuenta en Tiempo Real:</strong>
                  Visualización de cuota mensual, saldo pendiente, fecha límite de pago y estatus deportivo.
                </li>
                <li className="p-2.5 bg-white rounded-lg border border-neutral-200">
                  <strong className="text-neutral-900 block mb-0.5">• Registrar Pago (Comprobante):</strong>
                  Formulario intuitivo para adjuntar la foto del recibo o transferencia (SPEI, OXXO, Efectivo), indicando monto y folio.
                </li>
                <li className="p-2.5 bg-white rounded-lg border border-neutral-200">
                  <strong className="text-neutral-900 block mb-0.5">• Historial & Acuses Digitales:</strong>
                  Descarga del Acuse Digital Oficial emitido por el club como respaldo fiscal y administrativo.
                </li>
                <li className="p-2.5 bg-white rounded-lg border border-neutral-200">
                  <strong className="text-neutral-900 block mb-0.5">• Mi Perfil y Fotografía:</strong>
                  Subida de foto deportiva, número de camiseta, datos de emergencia, condiciones médicas y contraseña personal.
                </li>
              </ul>
            </div>
          </section>

          {/* 3. Flujo Operativo Paso a Paso */}
          <section className="space-y-4 page-break-inside-avoid">
            <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-neutral-900 flex items-center gap-2 border-b border-neutral-200 pb-1.5">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>3. Flujo de Trabajo Operativo (Ciclo Completo)</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-neutral-300 bg-white">
                <div className="flex items-center gap-2 font-bold text-neutral-900 text-xs mb-1">
                  <span className="w-5 h-5 rounded-full bg-[#363435] text-white flex items-center justify-center text-[10px]">1</span>
                  <span>Registro del Alumno y Apertura de Ciclo</span>
                </div>
                <p className="text-neutral-600 pl-7 leading-relaxed">
                  El alumno se registra en el Home o el Administrador lo da de alta. Se asigna su cuota mensual y el sistema activa su estado de cuenta.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-neutral-300 bg-white">
                <div className="flex items-center gap-2 font-bold text-neutral-900 text-xs mb-1">
                  <span className="w-5 h-5 rounded-full bg-[#363435] text-white flex items-center justify-center text-[10px]">2</span>
                  <span>Aviso de Cobro & Recordatorio</span>
                </div>
                <p className="text-neutral-600 pl-7 leading-relaxed">
                  El sistema emite los recordatorios en la bandeja de avisos y permite al Administrador/Entrenador enviar notificaciones personalizadas por WhatsApp en un clic.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-neutral-300 bg-white">
                <div className="flex items-center gap-2 font-bold text-neutral-900 text-xs mb-1">
                  <span className="w-5 h-5 rounded-full bg-[#363435] text-white flex items-center justify-center text-[10px]">3</span>
                  <span>Carga de Comprobante por el Alumno</span>
                </div>
                <p className="text-neutral-600 pl-7 leading-relaxed">
                  El alumno o tutor ingresa a <strong>"Registrar Pago"</strong>, adjunta la foto de su ticket o transferencia y envía el reporte. Su estatus pasa a <em>«En Revisión»</em>.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-neutral-300 bg-white">
                <div className="flex items-center gap-2 font-bold text-neutral-900 text-xs mb-1">
                  <span className="w-5 h-5 rounded-full bg-[#363435] text-white flex items-center justify-center text-[10px]">4</span>
                  <span>Validación y Emisión de Acuse Oficial</span>
                </div>
                <p className="text-neutral-600 pl-7 leading-relaxed">
                  El Administrador coteja el depósito en <strong>"Validar Pagos"</strong> y aprueba con un clic. El saldo del alumno se liquida a $0.00 y se genera su Acuse Digital Oficial con Folio Institucional.
                </p>
              </div>
            </div>
          </section>

          {/* Pie del Documento */}
          <div className="pt-6 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-neutral-500 gap-2">
            <span>Documento Oficial de Operación de Gecko´s Veoleibol.</span>
            <span className="font-mono">© 2026 Gecko´s Veoleibol · Todos los derechos reservados.</span>
          </div>

        </div>

      </div>
    </div>
  );
};
