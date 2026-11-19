import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Comunicado, ComunicadoTargetType, Student, SystemUser } from '../../types';
import {
  Megaphone,
  Plus,
  FileText,
  Upload,
  Eye,
  Download,
  Trash2,
  Users,
  UserCheck,
  User,
  Globe,
  MessageCircle,
  AlertCircle,
  CheckCircle2,
  Calendar,
  X,
  Search,
  Send,
  Pencil,
  CheckSquare,
  Square,
  BellRing,
} from 'lucide-react';
import { supabaseService } from '../../utils/supabaseClient';

interface Props {
  comunicados: Comunicado[];
  onComunicadosUpdated: (updated: Comunicado[]) => void;
  onNotifyComunicado?: (comunicado: Comunicado) => Promise<void> | void;
  students: Student[];
  coaches: SystemUser[];
  currentUser?: SystemUser | null;
  currentStudent?: Student | null;
  isAdmin?: boolean;
}

const parseTargetIds = (targetId?: string): string[] => {
  if (!targetId) return [];
  return targetId
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
};

const dataUriToBlob = (dataUri: string): Blob | null => {
  try {
    const commaIdx = dataUri.indexOf(',');
    if (commaIdx === -1) return null;
    const header = dataUri.slice(0, commaIdx);
    const base64 = dataUri.slice(commaIdx + 1);
    const mimeMatch = header.match(/data:([^;]+)/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
};

export const AnnouncementsModule: React.FC<Props> = ({
  comunicados,
  onComunicadosUpdated,
  onNotifyComunicado,
  students,
  coaches,
  currentUser,
  currentStudent,
  isAdmin = true,
}) => {
  // Modal de creación / edición
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingComunicadoId, setEditingComunicadoId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetType, setTargetType] = useState<ComunicadoTargetType>('all');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedCoachIds, setSelectedCoachIds] = useState<string[]>([]);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [notifyOnPublish, setNotifyOnPublish] = useState(true);
  const [pdfData, setPdfData] = useState<{ url: string; name: string; size: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Selección múltiple de comunicados existentes (solo Admin)
  const [selectedComunicadoIds, setSelectedComunicadoIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isSendingBatch, setIsSendingBatch] = useState(false);

  // Visor de PDF modal (con Blob URL para evitar bloqueo de data: URLs en Chrome/Edge/móvil)
  const [viewingPdf, setViewingPdf] = useState<{ url: string; name: string } | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  // Modal de confirmación para eliminar individual
  const [comunicadoToDelete, setComunicadoToDelete] = useState<Comunicado | null>(null);

  // Filtros de búsqueda en la lista
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAudience, setFilterAudience] = useState<'all' | 'students' | 'coaches'>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convertir Data URI a Blob URL cada vez que se abre el visor de PDF
  useEffect(() => {
    if (!viewingPdf) {
      setPdfBlobUrl(null);
      return;
    }

    if (viewingPdf.url.startsWith('data:')) {
      const blob = dataUriToBlob(viewingPdf.url);
      if (blob) {
        const objectUrl = URL.createObjectURL(blob);
        setPdfBlobUrl(objectUrl);
        return () => {
          URL.revokeObjectURL(objectUrl);
        };
      }
    }

    setPdfBlobUrl(viewingPdf.url);
    return undefined;
  }, [viewingPdf]);

  // Limpiar selección si algún comunicado dejó de existir
  useEffect(() => {
    const validIds = new Set(comunicados.map((c) => c.id));
    setSelectedComunicadoIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [comunicados]);

  const showTempSuccess = (msg: string) => {
    setBannerError(null);
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4500);
  };

  const resetForm = () => {
    setEditingComunicadoId(null);
    setTitle('');
    setContent('');
    setTargetType('all');
    setSelectedStudentIds([]);
    setSelectedCoachIds([]);
    setRecipientSearch('');
    setNotifyOnPublish(true);
    setPdfData(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openCreateModal = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const openEditModal = (com: Comunicado) => {
    resetForm();
    setEditingComunicadoId(com.id);
    setTitle(com.title);
    setContent(com.content);
    setTargetType(com.targetType);
    if (com.targetType === 'student') {
      setSelectedStudentIds(parseTargetIds(com.targetId));
    } else if (com.targetType === 'coach') {
      setSelectedCoachIds(parseTargetIds(com.targetId));
    }
    if (com.pdfUrl) {
      setPdfData({
        url: com.pdfUrl,
        name: com.pdfName || 'Documento_Adjunto.pdf',
        size: com.pdfSize || 'PDF',
      });
    }
    setNotifyOnPublish(false);
    setIsCreateModalOpen(true);
  };

  // Procesar archivo PDF
  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('El archivo seleccionado debe ser en formato PDF (.pdf).');
      e.target.value = '';
      return;
    }

    // Límite seguro de 5 MB para guardar sin errores en Supabase y visor web/móvil
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage(
        'El archivo PDF excede el límite de 5 MB. Comprímelo un poco antes de subirlo para garantizar su envío a todos los dispositivos.'
      );
      e.target.value = '';
      return;
    }

    const sizeFormatted =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
        : `${Math.max(1, Math.round(file.size / 1024))} KB`;

    const reader = new FileReader();
    reader.onload = () => {
      setPdfData({
        url: reader.result as string,
        name: file.name,
        size: sizeFormatted,
      });
      setErrorMessage(null);
    };
    reader.onerror = () => {
      setErrorMessage('No se pudo leer el archivo PDF seleccionado.');
    };
    reader.readAsDataURL(file);
  };

  // Descargar PDF de forma segura usando Blob URL
  const handleDownloadPdf = (url: string, filename: string) => {
    try {
      const safeName = filename || 'comunicado_geckos.pdf';
      if (url.startsWith('data:')) {
        const blob = dataUriToBlob(url);
        if (blob) {
          const objectUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = objectUrl;
          link.download = safeName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
          return;
        }
      }
      const link = document.createElement('a');
      link.href = url;
      link.download = safeName;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      setBannerError('No se pudo descargar el PDF en este dispositivo.');
    }
  };

  // Guardar o actualizar comunicado
  const handleCreateComunicado = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim() || !content.trim()) {
      setErrorMessage('Por favor ingresa el título y el mensaje del comunicado.');
      return;
    }

    let targetId: string | undefined = undefined;
    let targetName: string | undefined = undefined;

    if (targetType === 'student') {
      if (selectedStudentIds.length === 0) {
        setErrorMessage('Por favor selecciona al menos un alumno destinatario.');
        return;
      }
      const selectedObjects = students.filter((s) => selectedStudentIds.includes(s.id));
      targetId = selectedStudentIds.join(',');
      targetName =
        selectedObjects.length > 0
          ? selectedObjects.map((s) => s.fullName).join(', ')
          : `${selectedStudentIds.length} alumno(s)`;
    } else if (targetType === 'coach') {
      if (selectedCoachIds.length === 0) {
        setErrorMessage('Por favor selecciona al menos un entrenador destinatario.');
        return;
      }
      const selectedObjects = coaches.filter((c) => selectedCoachIds.includes(c.id));
      targetId = selectedCoachIds.join(',');
      targetName =
        selectedObjects.length > 0
          ? selectedObjects.map((c) => c.name).join(', ')
          : `${selectedCoachIds.length} entrenador(es)`;
    }

    setIsSubmitting(true);

    try {
      const existing = editingComunicadoId
        ? comunicados.find((c) => c.id === editingComunicadoId)
        : null;

      const payload: Comunicado = {
        id: existing?.id || `com-${Date.now()}`,
        title: title.trim(),
        content: content.trim(),
        date: existing?.date || new Date().toISOString().split('T')[0],
        targetType,
        targetId,
        targetName,
        pdfUrl: pdfData?.url,
        pdfName: pdfData?.name,
        pdfSize: pdfData?.size,
        authorName: currentUser?.name || existing?.authorName || 'Head Coach Administrador',
        createdAt: existing?.createdAt || new Date().toISOString(),
      };

      // 1. Persistir primero en Supabase y verificar respuesta real
      const saveRes = await supabaseService.upsertComunicado(payload);
      if (!saveRes.success) {
        setErrorMessage(
          `No se pudo guardar el comunicado en la nube (${saveRes.error || 'Error de conexión'}). Verifica el tamaño del PDF o tu conexión e inténtalo de nuevo.`
        );
        return;
      }

      // 2. Actualizar estado en memoria y almacenamiento local seguro
      const updatedList = existing
        ? comunicados.map((c) => (c.id === payload.id ? payload : c))
        : [payload, ...comunicados];
      onComunicadosUpdated(updatedList);

      // 3. Notificar automáticamente a los destinatarios seleccionados si está activado
      if (notifyOnPublish && onNotifyComunicado) {
        await onNotifyComunicado(payload);
      }

      resetForm();
      setIsCreateModalOpen(false);
      showTempSuccess(
        existing
          ? notifyOnPublish
            ? '¡Comunicado actualizado y aviso reenviado a los destinatarios!'
            : '¡Comunicado actualizado correctamente!'
          : notifyOnPublish
          ? '¡Comunicado publicado y notificación enviada a los destinatarios!'
          : '¡Comunicado publicado con éxito!'
      );
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Ocurrió un problema inesperado al publicar el comunicado.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reenviar notificación de uno o varios comunicados seleccionados
  const handleSendNotificationForList = async (list: Comunicado[]) => {
    if (!onNotifyComunicado || list.length === 0) return;
    setIsSendingBatch(true);
    setBannerError(null);
    try {
      for (const com of list) {
        await onNotifyComunicado(com);
      }
      setSelectedComunicadoIds([]);
      showTempSuccess(
        list.length === 1
          ? `Aviso enviado a los destinatarios de "${list[0].title}".`
          : `Avisos enviados para ${list.length} comunicados seleccionados.`
      );
    } catch (err: any) {
      setBannerError(err?.message || 'No se pudo enviar la notificación del comunicado.');
    } finally {
      setIsSendingBatch(false);
    }
  };

  // Eliminar comunicado individual
  const handleConfirmDelete = async () => {
    if (!comunicadoToDelete) return;
    const target = comunicadoToDelete;
    setBannerError(null);

    const delRes = await supabaseService.deleteComunicado(target.id);
    if (!delRes.success) {
      setBannerError(
        `No se pudo eliminar el comunicado en Supabase: ${delRes.error || 'Error de red'}`
      );
      setComunicadoToDelete(null);
      return;
    }

    const filtered = comunicados.filter((c) => c.id !== target.id);
    onComunicadosUpdated(filtered);
    setSelectedComunicadoIds((prev) => prev.filter((id) => id !== target.id));
    setComunicadoToDelete(null);
    showTempSuccess('Comunicado eliminado correctamente.');
  };

  // Eliminar lote de comunicados seleccionados
  const handleConfirmBulkDelete = async () => {
    if (selectedComunicadoIds.length === 0) return;
    const idsToDelete = [...selectedComunicadoIds];
    setBannerError(null);

    const delRes = await supabaseService.bulkDeleteComunicados(idsToDelete);
    if (!delRes.success) {
      setBannerError(
        `No se pudieron eliminar los comunicados en Supabase: ${delRes.error || 'Error de red'}`
      );
      setIsBulkDeleteModalOpen(false);
      return;
    }

    const deleteSet = new Set(idsToDelete);
    const remaining = comunicados.filter((c) => !deleteSet.has(c.id));
    onComunicadosUpdated(remaining);
    setSelectedComunicadoIds([]);
    setIsBulkDeleteModalOpen(false);
    showTempSuccess(`${idsToDelete.length} comunicado(s) eliminado(s) correctamente.`);
  };

  // Construir enlace seguro de WhatsApp (usando URL activa y teléfono si es alumno único)
  const buildWhatsAppHref = (com: Comunicado): string => {
    const audienceLabel =
      com.targetType === 'all'
        ? 'Todos los Miembros del Club'
        : com.targetType === 'all_students'
        ? 'Todos los Alumnos y Padres'
        : com.targetType === 'student'
        ? `Alumno(s): ${com.targetName || ''}`
        : com.targetType === 'all_coaches'
        ? 'Todos los Entrenadores'
        : `Entrenador(es): ${com.targetName || ''}`;

    const portalUrl =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'https://greckos.vercel.app';

    const text = `📢 *COMUNICADO OFICIAL - GECKOS VOLEIBOL*\n\n*${com.title}*\n📅 Fecha: ${com.date}\n👥 Dirigido a: ${audienceLabel}\n\n${com.content}\n\n${
      com.pdfName ? `📄 Documento adjunto: ${com.pdfName}\n` : ''
    }🔗 Consulta y descarga oficial en el portal: ${portalUrl}`;

    let phoneParam = '';
    if (com.targetType === 'student') {
      const ids = parseTargetIds(com.targetId);
      if (ids.length === 1) {
        const st = students.find((s) => s.id === ids[0]);
        const rawPhone = st?.tutorPhone || st?.whatsapp || '';
        const digits = rawPhone.replace(/\D/g, '');
        if (digits.length >= 10) {
          phoneParam = digits.length === 10 ? `52${digits}` : digits;
        }
      }
    }

    return `https://wa.me/${phoneParam}?text=${encodeURIComponent(text)}`;
  };

  // Filtrado según rol (soporta 1 o múltiples destinatarios separados por coma)
  const audienceFiltered = useMemo(() => {
    return comunicados.filter((com) => {
      if (isAdmin) {
        if (filterAudience === 'students') {
          return com.targetType === 'all_students' || com.targetType === 'student';
        }
        if (filterAudience === 'coaches') {
          return com.targetType === 'all_coaches' || com.targetType === 'coach';
        }
        return true;
      }

      // Para alumnos/padres
      if (currentStudent) {
        const targetIds = parseTargetIds(com.targetId);
        return (
          com.targetType === 'all' ||
          com.targetType === 'all_students' ||
          (com.targetType === 'student' && targetIds.includes(currentStudent.id))
        );
      }

      // Para entrenadores asistentes
      if (currentUser?.role === 'coach_assistant') {
        const targetIds = parseTargetIds(com.targetId);
        return (
          com.targetType === 'all' ||
          com.targetType === 'all_coaches' ||
          (com.targetType === 'coach' && targetIds.includes(currentUser.id))
        );
      }

      return com.targetType === 'all';
    });
  }, [comunicados, isAdmin, filterAudience, currentStudent, currentUser]);

  const finalFiltered = useMemo(() => {
    if (!searchQuery.trim()) return audienceFiltered;
    const q = searchQuery.toLowerCase();
    return audienceFiltered.filter(
      (com) =>
        com.title.toLowerCase().includes(q) ||
        com.content.toLowerCase().includes(q) ||
        (com.targetName && com.targetName.toLowerCase().includes(q))
    );
  }, [audienceFiltered, searchQuery]);

  const allVisibleSelected =
    isAdmin &&
    finalFiltered.length > 0 &&
    finalFiltered.every((c) => selectedComunicadoIds.includes(c.id));

  const toggleSelectComunicado = (id: string) => {
    setSelectedComunicadoIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      const visibleSet = new Set(finalFiltered.map((c) => c.id));
      setSelectedComunicadoIds((prev) => prev.filter((id) => !visibleSet.has(id)));
    } else {
      const merged = new Set([...selectedComunicadoIds, ...finalFiltered.map((c) => c.id)]);
      setSelectedComunicadoIds(Array.from(merged));
    }
  };

  const filteredModalStudents = useMemo(() => {
    if (!recipientSearch.trim()) return students;
    const q = recipientSearch.toLowerCase();
    return students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        (s.category || '').toLowerCase().includes(q) ||
        (s.campus || '').toLowerCase().includes(q)
    );
  }, [students, recipientSearch]);

  const filteredModalCoaches = useMemo(() => {
    if (!recipientSearch.trim()) return coaches;
    const q = recipientSearch.toLowerCase();
    return coaches.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.username || '').toLowerCase().includes(q) ||
        (c.campus || '').toLowerCase().includes(q)
    );
  }, [coaches, recipientSearch]);

  const toggleStudentRecipient = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleCoachRecipient = (id: string) => {
    setSelectedCoachIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-200">
        <div>
          <h2 className="text-lg sm:text-2xl font-extrabold text-neutral-900 tracking-tight flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-[#363435]" />
            <span>Módulo de Comunicados y Circulares</span>
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            {isAdmin
              ? 'Publica avisos oficiales y circulares en PDF dirigidos a todos, a alumnos seleccionados o a entrenadores específicos.'
              : 'Circulares, avisos oficiales y reglamentos compartidos por la dirección del club.'}
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#363435] hover:bg-[#252324] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Comunicado</span>
          </button>
        )}
      </div>

      {/* Alertas de éxito / error */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {bannerError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{bannerError}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerError(null)}
            className="text-rose-500 hover:text-rose-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por título, contenido o destinatario..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-neutral-200 bg-white focus:outline-none focus:border-[#363435]"
          />
        </div>

        {isAdmin && (
          <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-xl self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setFilterAudience('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                filterAudience === 'all'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Todos ({comunicados.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterAudience('students')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                filterAudience === 'students'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Alumnos
            </button>
            <button
              type="button"
              onClick={() => setFilterAudience('coaches')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                filterAudience === 'coaches'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Entrenadores
            </button>
          </div>
        )}
      </div>

      {/* Barra de Selección Múltiple y Envío en Lote (Solo Admin cuando existen comunicados) */}
      {isAdmin && finalFiltered.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-neutral-50 border border-neutral-200">
          <button
            type="button"
            onClick={toggleSelectAllVisible}
            className="inline-flex items-center gap-2 text-xs font-bold text-neutral-700 hover:text-neutral-950 cursor-pointer"
          >
            {allVisibleSelected ? (
              <CheckSquare className="w-4 h-4 text-[#363435]" />
            ) : (
              <Square className="w-4 h-4 text-neutral-400" />
            )}
            <span>
              {selectedComunicadoIds.length > 0
                ? `${selectedComunicadoIds.length} comunicado(s) seleccionado(s)`
                : 'Seleccionar todos'}
            </span>
          </button>

          {selectedComunicadoIds.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {onNotifyComunicado && (
                <button
                  type="button"
                  disabled={isSendingBatch}
                  onClick={() => {
                    const chosen = comunicados.filter((c) =>
                      selectedComunicadoIds.includes(c.id)
                    );
                    handleSendNotificationForList(chosen);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-900 text-xs font-extrabold transition cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {isSendingBatch
                      ? 'Enviando...'
                      : `Enviar Aviso (${selectedComunicadoIds.length})`}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar ({selectedComunicadoIds.length})</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Lista de Comunicados */}
      {finalFiltered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center text-xs text-neutral-400">
          <Megaphone className="w-10 h-10 mx-auto text-neutral-300 mb-2" />
          <p className="font-semibold text-neutral-700">No hay comunicados disponibles</p>
          <p className="mt-1">
            {isAdmin
              ? 'Haz clic en "Nuevo Comunicado" para redactar y subir un documento PDF.'
              : 'Aquí aparecerán las circulares y avisos oficiales que te comparta el club.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {finalFiltered.map((com) => {
            const isTargetAll = com.targetType === 'all';
            const isTargetStudents = com.targetType === 'all_students';
            const isTargetSingleStudent = com.targetType === 'student';
            const isTargetCoaches = com.targetType === 'all_coaches';
            const isTargetSingleCoach = com.targetType === 'coach';
            const isSelected = selectedComunicadoIds.includes(com.id);

            return (
              <div
                key={com.id}
                className={`bg-white rounded-2xl border p-4 sm:p-6 shadow-2xs hover:shadow-xs transition space-y-4 ${
                  isSelected
                    ? 'border-[#363435] ring-1 ring-[#363435]/20 bg-neutral-50/40'
                    : 'border-neutral-200'
                }`}
              >
                {/* Cabecera del comunicado */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => toggleSelectComunicado(com.id)}
                        title={isSelected ? 'Quitar selección' : 'Seleccionar comunicado'}
                        className="mt-1 text-neutral-400 hover:text-neutral-900 cursor-pointer shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-[#363435]" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    )}

                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Badge de Destinatario */}
                        {isTargetAll && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <Globe className="w-3 h-3 text-blue-600" />
                            <span>Público General (Todos)</span>
                          </span>
                        )}
                        {isTargetStudents && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Users className="w-3 h-3 text-emerald-600" />
                            <span>Todos los Alumnos</span>
                          </span>
                        )}
                        {isTargetSingleStudent && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 max-w-full">
                            <User className="w-3 h-3 text-purple-600 shrink-0" />
                            <span className="truncate">
                              Alumno(s): {com.targetName || 'Seleccionados'}
                            </span>
                          </span>
                        )}
                        {isTargetCoaches && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <UserCheck className="w-3 h-3 text-amber-600" />
                            <span>Todos los Entrenadores</span>
                          </span>
                        )}
                        {isTargetSingleCoach && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 max-w-full">
                            <UserCheck className="w-3 h-3 text-indigo-600 shrink-0" />
                            <span className="truncate">
                              Entrenador(es): {com.targetName || 'Seleccionados'}
                            </span>
                          </span>
                        )}

                        <span className="text-neutral-400 text-xs flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {com.date}
                        </span>
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight">
                        {com.title}
                      </h3>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto flex-wrap shrink-0">
                    {isAdmin && onNotifyComunicado && (
                      <button
                        type="button"
                        disabled={isSendingBatch}
                        onClick={() => handleSendNotificationForList([com])}
                        title="Enviar notificación en el sistema a los destinatarios"
                        className="p-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5 text-amber-700" />
                        <span className="text-[11px] hidden sm:inline">Enviar Aviso</span>
                      </button>
                    )}

                    <a
                      href={buildWhatsAppHref(com)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Compartir comunicado por WhatsApp"
                      className="p-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-[11px] hidden sm:inline">WhatsApp</span>
                    </a>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => openEditModal(com)}
                        title="Editar comunicado"
                        className="p-2 rounded-xl border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setComunicadoToDelete(com)}
                        title="Eliminar comunicado"
                        className="p-2 rounded-xl border border-neutral-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Contenido / Mensaje */}
                <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed whitespace-pre-line bg-neutral-50/60 p-3.5 rounded-xl border border-neutral-100">
                  {com.content}
                </p>

                {/* Adjunto PDF (si existe) */}
                {com.pdfUrl && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 bg-rose-100 text-rose-700 rounded-lg shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-neutral-900 truncate">
                          {com.pdfName || 'Documento_Adjunto.pdf'}
                        </div>
                        {com.pdfSize && (
                          <div className="text-[11px] text-neutral-400">PDF • {com.pdfSize}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setViewingPdf({
                            url: com.pdfUrl!,
                            name: com.pdfName || 'Documento.pdf',
                          })
                        }
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-800 rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-neutral-600" />
                        <span>Ver PDF</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDownloadPdf(com.pdfUrl!, com.pdfName || 'comunicado_geckos.pdf')
                        }
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#363435] hover:bg-[#252324] text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Descargar</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para Crear / Editar Comunicado */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-7 border border-neutral-200 shadow-xl space-y-4 animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-neutral-100 text-[#363435]">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-neutral-900">
                    {editingComunicadoId
                      ? 'Editar Comunicado'
                      : 'Redactar y Publicar Comunicado'}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Comparte información y documentos PDF con tu academia
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateComunicado} className="space-y-4">
              {/* Título */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Título del Comunicado *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Convocatoria a Torneo Estatal Cuautitlán 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#363435]"
                />
              </div>

              {/* Segmentación / Destinatarios */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  ¿A quién va dirigido el comunicado? *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition ${
                      targetType === 'all'
                        ? 'border-[#363435] bg-neutral-50 font-bold text-neutral-900'
                        : 'border-neutral-200 hover:border-neutral-300 text-neutral-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="targetType"
                      checked={targetType === 'all'}
                      onChange={() => {
                        setTargetType('all');
                        setRecipientSearch('');
                      }}
                      className="accent-[#363435]"
                    />
                    <Globe className="w-4 h-4 text-blue-600" />
                    <span>Todos (Alumnos y Entrenadores)</span>
                  </label>

                  <label
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition ${
                      targetType === 'all_students'
                        ? 'border-[#363435] bg-neutral-50 font-bold text-neutral-900'
                        : 'border-neutral-200 hover:border-neutral-300 text-neutral-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="targetType"
                      checked={targetType === 'all_students'}
                      onChange={() => {
                        setTargetType('all_students');
                        setRecipientSearch('');
                      }}
                      className="accent-[#363435]"
                    />
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span>Todos los Alumnos</span>
                  </label>

                  <label
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition ${
                      targetType === 'student'
                        ? 'border-[#363435] bg-neutral-50 font-bold text-neutral-900'
                        : 'border-neutral-200 hover:border-neutral-300 text-neutral-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="targetType"
                      checked={targetType === 'student'}
                      onChange={() => {
                        setTargetType('student');
                        setRecipientSearch('');
                      }}
                      className="accent-[#363435]"
                    />
                    <User className="w-4 h-4 text-purple-600" />
                    <span>Seleccionar Alumno(s)</span>
                  </label>

                  <label
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition ${
                      targetType === 'all_coaches'
                        ? 'border-[#363435] bg-neutral-50 font-bold text-neutral-900'
                        : 'border-neutral-200 hover:border-neutral-300 text-neutral-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="targetType"
                      checked={targetType === 'all_coaches'}
                      onChange={() => {
                        setTargetType('all_coaches');
                        setRecipientSearch('');
                      }}
                      className="accent-[#363435]"
                    />
                    <UserCheck className="w-4 h-4 text-amber-600" />
                    <span>Todos los Entrenadores</span>
                  </label>

                  <label
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition ${
                      targetType === 'coach'
                        ? 'border-[#363435] bg-neutral-50 font-bold text-neutral-900'
                        : 'border-neutral-200 hover:border-neutral-300 text-neutral-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="targetType"
                      checked={targetType === 'coach'}
                      onChange={() => {
                        setTargetType('coach');
                        setRecipientSearch('');
                      }}
                      className="accent-[#363435]"
                    />
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    <span>Seleccionar Entrenador(es)</span>
                  </label>
                </div>
              </div>

              {/* Selector múltiple de Alumnos */}
              {targetType === 'student' && (
                <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <label className="text-xs font-bold text-purple-900">
                      Selecciona uno o varios alumnos ({selectedStudentIds.length} de {students.length}) *
                    </label>
                    <div className="flex items-center gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setSelectedStudentIds(students.map((s) => s.id))}
                        className="font-bold text-purple-700 hover:underline cursor-pointer"
                      >
                        Todos
                      </button>
                      <span className="text-purple-300">|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedStudentIds([])}
                        className="font-semibold text-neutral-500 hover:underline cursor-pointer"
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    placeholder="Filtrar alumno por nombre, categoría o sede..."
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white rounded-lg border border-purple-200 text-xs focus:outline-none focus:border-purple-600"
                  />

                  <div className="max-h-40 overflow-y-auto bg-white rounded-lg border border-purple-200 divide-y divide-neutral-100">
                    {filteredModalStudents.length === 0 ? (
                      <div className="p-3 text-center text-xs text-neutral-400">
                        No hay alumnos que coincidan.
                      </div>
                    ) : (
                      filteredModalStudents.map((st) => {
                        const checked = selectedStudentIds.includes(st.id);
                        return (
                          <label
                            key={st.id}
                            className={`flex items-center gap-2.5 px-3 py-2 text-xs cursor-pointer transition ${
                              checked ? 'bg-purple-50/70 font-semibold text-purple-950' : 'hover:bg-neutral-50 text-neutral-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleStudentRecipient(st.id)}
                              className="accent-purple-700 rounded"
                            />
                            <span className="truncate flex-1">{st.fullName}</span>
                            <span className="text-[10px] text-neutral-400 shrink-0">
                              {st.category} · {st.campus || 'Sede'}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Selector múltiple de Entrenadores */}
              {targetType === 'coach' && (
                <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <label className="text-xs font-bold text-indigo-900">
                      Selecciona uno o varios entrenadores ({selectedCoachIds.length} de {coaches.length}) *
                    </label>
                    <div className="flex items-center gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setSelectedCoachIds(coaches.map((c) => c.id))}
                        className="font-bold text-indigo-700 hover:underline cursor-pointer"
                      >
                        Todos
                      </button>
                      <span className="text-indigo-300">|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedCoachIds([])}
                        className="font-semibold text-neutral-500 hover:underline cursor-pointer"
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>

                  {coaches.length > 4 && (
                    <input
                      type="text"
                      placeholder="Filtrar entrenador por nombre o sede..."
                      value={recipientSearch}
                      onChange={(e) => setRecipientSearch(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white rounded-lg border border-indigo-200 text-xs focus:outline-none focus:border-indigo-600"
                    />
                  )}

                  <div className="max-h-40 overflow-y-auto bg-white rounded-lg border border-indigo-200 divide-y divide-neutral-100">
                    {filteredModalCoaches.length === 0 ? (
                      <div className="p-3 text-center text-xs text-neutral-400">
                        No hay entrenadores disponibles.
                      </div>
                    ) : (
                      filteredModalCoaches.map((c) => {
                        const checked = selectedCoachIds.includes(c.id);
                        return (
                          <label
                            key={c.id}
                            className={`flex items-center gap-2.5 px-3 py-2 text-xs cursor-pointer transition ${
                              checked ? 'bg-indigo-50/70 font-semibold text-indigo-950' : 'hover:bg-neutral-50 text-neutral-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCoachRecipient(c.id)}
                              className="accent-indigo-700 rounded"
                            />
                            <span className="truncate flex-1">{c.name}</span>
                            <span className="text-[10px] text-neutral-400 shrink-0">
                              @{c.username} · {c.campus || 'Staff'}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Mensaje / Descripción */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Mensaje o Contenido del Comunicado *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Escribe el texto detallado del comunicado, indicaciones o convocatoria..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#363435]"
                />
              </div>

              {/* Adjuntar Archivo PDF */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Adjuntar Documento PDF (Opcional)
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,application/pdf"
                  onChange={handlePdfFileChange}
                  className="hidden"
                />

                {!pdfData ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-neutral-300 hover:border-neutral-400 rounded-2xl p-4 text-center cursor-pointer transition bg-neutral-50 hover:bg-neutral-100 flex flex-col items-center justify-center gap-1.5"
                  >
                    <Upload className="w-6 h-6 text-neutral-400" />
                    <span className="text-xs font-semibold text-neutral-700">
                      Haz clic para seleccionar un archivo PDF
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      Formatos compatibles: .pdf (máx. 5 MB)
                    </span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 bg-rose-100 text-rose-700 rounded-lg shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-neutral-900 truncate">
                          {pdfData.name}
                        </div>
                        <div className="text-[11px] text-neutral-400">
                          {pdfData.size} • Listo para adjuntar
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setViewingPdf({ url: pdfData.url, name: pdfData.name })
                        }
                        className="p-1.5 text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 rounded-lg text-xs font-semibold cursor-pointer"
                        title="Previsualizar"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPdfData(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="p-1.5 text-rose-600 hover:text-rose-800 bg-white border border-neutral-200 rounded-lg text-xs font-semibold cursor-pointer"
                        title="Quitar PDF"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Notificar al publicar */}
              {onNotifyComunicado && (
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyOnPublish}
                    onChange={(e) => setNotifyOnPublish(e.target.checked)}
                    className="accent-[#363435]"
                  />
                  <BellRing className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="font-semibold">
                    Enviar alerta y sonido a los destinatarios seleccionados al guardar
                  </span>
                </label>
              )}

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-600 hover:bg-neutral-50 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#363435] hover:bg-[#252324] text-white text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <Megaphone className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? 'Guardando...'
                      : editingComunicadoId
                      ? 'Guardar Cambios'
                      : 'Publicar Comunicado'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Visor de PDF (Blob URL compatible con todos los navegadores) */}
      {viewingPdf && (
        <div className="fixed inset-0 z-50 bg-neutral-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-3xl max-w-4xl w-full h-[85vh] flex flex-col border border-neutral-200 shadow-2xl overflow-hidden animate-scaleUp">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 bg-neutral-50 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-5 h-5 text-rose-600 shrink-0" />
                <span className="font-bold text-sm text-neutral-900 truncate">
                  {viewingPdf.name}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(viewingPdf.url, viewingPdf.name)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#363435] text-white rounded-xl text-xs font-bold hover:bg-[#252324] transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingPdf(null)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-700 text-lg font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 w-full bg-neutral-100 p-2 flex flex-col">
              {pdfBlobUrl ? (
                <iframe
                  src={pdfBlobUrl}
                  title={viewingPdf.name}
                  className="w-full flex-1 rounded-xl border border-neutral-300 bg-white"
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-xs text-neutral-500">
                  <FileText className="w-8 h-8 text-neutral-400" />
                  <p>Preparando vista previa del PDF...</p>
                </div>
              )}
              <p className="text-[11px] text-neutral-500 text-center pt-1.5">
                Si en tu dispositivo móvil no se muestra la vista previa integrada, usa el botón{' '}
                <strong>Descargar</strong> arriba.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para eliminar individual */}
      {comunicadoToDelete && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-neutral-200 shadow-xl space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-xl bg-rose-50">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-neutral-900">
                  ¿Eliminar este comunicado?
                </h3>
                <p className="text-xs text-neutral-500">Esta acción no se puede deshacer.</p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 bg-neutral-50 p-3 rounded-xl border border-neutral-100">
              Se eliminará: <strong className="text-neutral-900">{comunicadoToDelete.title}</strong>
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setComunicadoToDelete(null)}
                className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Eliminar Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para eliminar seleccionados */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-neutral-200 shadow-xl space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-xl bg-rose-50">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-neutral-900">
                  ¿Eliminar {selectedComunicadoIds.length} comunicado(s)?
                </h3>
                <p className="text-xs text-neutral-500">
                  Se borrarán permanentemente de Supabase y del portal.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Eliminar Seleccionados
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
