import React, { useState, useEffect, useMemo } from 'react';
import {
  ExternalLink,
  MapPin,
  MessageCircle,
  Instagram,
  Facebook,
  Video,
  Edit2,
  Save,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  CreditCard,
  Eye,
  EyeOff,
} from 'lucide-react';
import { ClubSettings, SedeDetailInfo, SocialLinkItem } from '../types';
import { DEFAULT_CLUB_SETTINGS } from '../utils/storage';

interface Props {
  isAdmin?: boolean;
  sedes?: string[];
  clubSettings: ClubSettings;
  onSaveClubSettings: (
    settings: ClubSettings
  ) => Promise<{ success: boolean; error?: string } | void> | void;
  onAddSede?: (name: string) => void;
  onRenameSede?: (oldName: string, newName: string) => Promise<void> | void;
  onDeleteSede?: (name: string) => Promise<void> | void;
}

const SOCIAL_META: Record<
  SocialLinkItem['id'],
  {
    color: string;
    icon: React.ComponentType<{ className?: string }>;
    urlPlaceholder: string;
    handlePlaceholder: string;
  }
> = {
  instagram: {
    color: 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white',
    icon: Instagram,
    urlPlaceholder: 'https://www.instagram.com/tu_cuenta',
    handlePlaceholder: '@geckosvoleibol',
  },
  facebook: {
    color: 'bg-blue-600 text-white',
    icon: Facebook,
    urlPlaceholder: 'https://www.facebook.com/tu_pagina',
    handlePlaceholder: 'Geckos Voleibol Club',
  },
  tiktok: {
    color: 'bg-neutral-900 text-white',
    icon: Video,
    urlPlaceholder: 'https://www.tiktok.com/@tu_cuenta',
    handlePlaceholder: '@geckosvoleibol',
  },
  whatsapp: {
    color: 'bg-emerald-600 text-white',
    icon: MessageCircle,
    urlPlaceholder: 'https://wa.me/525512345678',
    handlePlaceholder: '+52 55 1234 5678',
  },
};

const normalizeSocialUrl = (id: SocialLinkItem['id'], rawUrl: string, handle: string): string => {
  const trimmed = (rawUrl || '').trim();
  if (id === 'whatsapp') {
    if (trimmed && /^https?:\/\//i.test(trimmed)) return trimmed;
    const digits = (trimmed || handle || '').replace(/\D/g, '');
    if (digits.length >= 10) {
      return `https://wa.me/${digits}?text=Hola%20Geckos%20Voleibol%2C%20solicito%20informaci%C3%B3n.`;
    }
    return trimmed ? `https://${trimmed}` : 'https://wa.me/';
  }

  if (!trimmed) return '#';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

interface EditableSedeRow extends SedeDetailInfo {
  originalName: string; // empty string if newly added in editor
  isNew?: boolean;
}

export const OfficialSocials: React.FC<Props> = ({
  isAdmin = false,
  sedes = [],
  clubSettings,
  onSaveClubSettings,
  onAddSede,
  onRenameSede,
  onDeleteSede,
}) => {
  const activeSocials = useMemo(() => {
    return clubSettings?.socials && clubSettings.socials.length > 0
      ? clubSettings.socials
      : DEFAULT_CLUB_SETTINGS.socials;
  }, [clubSettings]);

  // Combinar sedes registradas con sus detalles guardados para que todas se muestren siempre
  const mergedSedeDetails = useMemo<SedeDetailInfo[]>(() => {
    const detailsMap = new Map<string, SedeDetailInfo>();
    (clubSettings?.sedeDetails || []).forEach((d) => {
      detailsMap.set(d.name.toLowerCase(), d);
    });

    const orderedNames: string[] = [];
    const seenLower = new Set<string>();

    sedes.forEach((s) => {
      const clean = s.trim();
      if (clean && !seenLower.has(clean.toLowerCase())) {
        seenLower.add(clean.toLowerCase());
        orderedNames.push(clean);
      }
    });

    // Si aún no hay sedes en prop, usar las de sedeDetails
    if (orderedNames.length === 0) {
      (clubSettings?.sedeDetails || DEFAULT_CLUB_SETTINGS.sedeDetails).forEach((d) => {
        if (!seenLower.has(d.name.toLowerCase())) {
          seenLower.add(d.name.toLowerCase());
          orderedNames.push(d.name);
        }
      });
    }

    return orderedNames.map((name) => {
      const found = detailsMap.get(name.toLowerCase());
      if (found) {
        return { ...found, name };
      }
      return {
        name,
        address: `Instalaciones deportivas Sede ${name}.`,
        schedule: 'Lunes a Jueves: 16:30 a 20:00 hrs. Sábados: Jornada de Liga.',
        paymentHours: 'Lunes y Miércoles de 17:00 a 19:00 hrs en mesa técnica.',
      };
    });
  }, [sedes, clubSettings]);

  // Editor state: Socials
  const [isEditingSocials, setIsEditingSocials] = useState(false);
  const [draftSocials, setDraftSocials] = useState<SocialLinkItem[]>(activeSocials);
  const [savingSocials, setSavingSocials] = useState(false);

  // Editor state: Sedes & Schedules
  const [isEditingSedes, setIsEditingSedes] = useState(false);
  const [draftVenueTitle, setDraftVenueTitle] = useState(
    clubSettings?.venueTitle || DEFAULT_CLUB_SETTINGS.venueTitle
  );
  const [draftSedes, setDraftSedes] = useState<EditableSedeRow[]>([]);
  const [newSedeName, setNewSedeName] = useState('');
  const [newSedeAddress, setNewSedeAddress] = useState('');
  const [newSedeSchedule, setNewSedeSchedule] = useState('');
  const [newSedePaymentHours, setNewSedePaymentHours] = useState('');
  const [confirmDeleteSedeName, setConfirmDeleteSedeName] = useState<string | null>(null);
  const [savingSedes, setSavingSedes] = useState(false);

  // Feedback banner
  const [feedback, setFeedback] = useState<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null);

  const showFeedback = (text: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setFeedback({ type, text });
    setTimeout(() => {
      setFeedback((curr) => (curr?.text === text ? null : curr));
    }, 5500);
  };

  useEffect(() => {
    if (!isEditingSocials) {
      setDraftSocials(activeSocials);
    }
  }, [activeSocials, isEditingSocials]);

  const openSocialsEditor = () => {
    setDraftSocials(activeSocials.map((s) => ({ ...s })));
    setIsEditingSocials(true);
    setFeedback(null);
  };

  const openSedesEditor = () => {
    setDraftVenueTitle(clubSettings?.venueTitle || DEFAULT_CLUB_SETTINGS.venueTitle);
    setDraftSedes(
      mergedSedeDetails.map((d) => ({
        ...d,
        originalName: d.name,
      }))
    );
    setNewSedeName('');
    setNewSedeAddress('');
    setNewSedeSchedule('');
    setNewSedePaymentHours('');
    setConfirmDeleteSedeName(null);
    setIsEditingSedes(true);
    setFeedback(null);
  };

  const handleDraftSocialChange = (
    id: SocialLinkItem['id'],
    field: keyof SocialLinkItem,
    value: string | boolean
  ) => {
    setDraftSocials((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        // Para WhatsApp, si el admin cambia el teléfono y el enlace actual era wa.me o vacío, actualizar enlace automáticamente
        if (id === 'whatsapp' && field === 'handle' && typeof value === 'string') {
          const digits = value.replace(/\D/g, '');
          if (digits.length >= 10 && (!item.url || item.url.includes('wa.me/'))) {
            updated.url = `https://wa.me/${digits}?text=Hola%20Geckos%20Voleibol%2C%20solicito%20informaci%C3%B3n.`;
          }
        }
        return updated;
      })
    );
  };

  const handleSaveSocials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSocials(true);
    try {
      const sanitizedSocials: SocialLinkItem[] = draftSocials.map((s) => ({
        ...s,
        name: s.name.trim() || s.id,
        handle: s.handle.trim(),
        url: normalizeSocialUrl(s.id, s.url, s.handle),
        desc: s.desc.trim(),
      }));

      const nextSettings: ClubSettings = {
        ...clubSettings,
        socials: sanitizedSocials,
        venueTitle: clubSettings.venueTitle || DEFAULT_CLUB_SETTINGS.venueTitle,
        sedeDetails: mergedSedeDetails,
        updatedAt: new Date().toISOString(),
      };

      const res = await onSaveClubSettings(nextSettings);
      setIsEditingSocials(false);

      if (res && !res.success && res.error) {
        showFeedback(
          `Enlaces guardados en este dispositivo. Aviso de sincronización en nube: ${res.error}. Ejecuta el SQL actualizado en Supabase para sincronizarlos en todos los equipos.`,
          'warning'
        );
      } else {
        showFeedback('Enlaces oficiales y redes sociales actualizados correctamente.', 'success');
      }
    } finally {
      setSavingSocials(false);
    }
  };

  const handleAddDraftSede = () => {
    const cleanName = newSedeName.trim();
    if (!cleanName) {
      showFeedback('Escribe el nombre de la nueva sede antes de agregarla.', 'error');
      return;
    }
    if (draftSedes.some((d) => d.name.trim().toLowerCase() === cleanName.toLowerCase())) {
      showFeedback(`La sede "${cleanName}" ya está en la lista.`, 'error');
      return;
    }

    setDraftSedes((prev) => [
      ...prev,
      {
        originalName: '',
        isNew: true,
        name: cleanName,
        address: newSedeAddress.trim() || `Instalaciones deportivas Sede ${cleanName}.`,
        schedule:
          newSedeSchedule.trim() ||
          'Lunes a Jueves: 16:30 a 20:00 hrs. Sábados: Jornada de Liga.',
        paymentHours:
          newSedePaymentHours.trim() ||
          'Lunes y Miércoles de 17:00 a 19:00 hrs directamente en mesa técnica.',
      },
    ]);
    setNewSedeName('');
    setNewSedeAddress('');
    setNewSedeSchedule('');
    setNewSedePaymentHours('');
  };

  const handleSaveSedes = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar nombres no vacíos y sin duplicados
    const cleanedRows = draftSedes.map((row) => ({
      ...row,
      name: row.name.trim(),
      address: row.address.trim(),
      schedule: row.schedule.trim(),
      paymentHours: row.paymentHours.trim(),
    }));

    if (cleanedRows.some((r) => !r.name)) {
      showFeedback('Todas las sedes deben tener un nombre válido.', 'error');
      return;
    }

    const seenNames = new Set<string>();
    for (const row of cleanedRows) {
      const lower = row.name.toLowerCase();
      if (seenNames.has(lower)) {
        showFeedback(`Nombre de sede duplicado: "${row.name}". Usa nombres distintos.`, 'error');
        return;
      }
      seenNames.add(lower);
    }

    setSavingSedes(true);
    try {
      // 1. Procesar altas de sedes nuevas
      for (const row of cleanedRows) {
        if (row.isNew && onAddSede) {
          onAddSede(row.name);
        }
      }

      // 2. Procesar renombrados (cascada automática a alumnos y entrenadores)
      for (const row of cleanedRows) {
        if (!row.isNew && row.originalName && row.originalName !== row.name && onRenameSede) {
          await onRenameSede(row.originalName, row.name);
        }
      }

      // 3. Guardar información de canchas, horarios y cotejo de pagos en ClubSettings
      const finalDetails: SedeDetailInfo[] = cleanedRows.map((r) => ({
        name: r.name,
        address: r.address || `Instalaciones deportivas Sede ${r.name}.`,
        schedule: r.schedule || 'Horario por definir.',
        paymentHours: r.paymentHours || 'Consultar en mesa técnica.',
      }));

      const nextSettings: ClubSettings = {
        ...clubSettings,
        socials: activeSocials,
        venueTitle: draftVenueTitle.trim() || DEFAULT_CLUB_SETTINGS.venueTitle,
        sedeDetails: finalDetails,
        updatedAt: new Date().toISOString(),
      };

      const res = await onSaveClubSettings(nextSettings);
      setIsEditingSedes(false);
      setConfirmDeleteSedeName(null);

      if (res && !res.success && res.error) {
        showFeedback(
          `Sedes guardadas localmente. Aviso Supabase: ${res.error}. Ejecuta el SQL de club_settings para reflejar los detalles en otros dispositivos.`,
          'warning'
        );
      } else {
        showFeedback(
          'Sedes de entrenamiento, canchas y horarios actualizados correctamente.',
          'success'
        );
      }
    } finally {
      setSavingSedes(false);
    }
  };

  const handleConfirmDeleteSede = async (row: EditableSedeRow) => {
    setDraftSedes((prev) => prev.filter((item) => item.name !== row.name));
    setConfirmDeleteSedeName(null);
    if (!row.isNew && row.originalName && onDeleteSede) {
      await onDeleteSede(row.originalName);
    }
  };

  const visibleSocials = activeSocials.filter((s) => s.enabled);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="pb-2 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight">
            Enlaces Institucionales & Redes Oficiales
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Conéctate a las plataformas oficiales, sedes y canales de comunicación de Geckos Voleibol.
          </p>
        </div>

        {isAdmin && !isEditingSocials && (
          <button
            type="button"
            onClick={openSocialsEditor}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#363435] hover:bg-black text-white text-xs font-bold shadow-xs transition cursor-pointer shrink-0"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Editar Redes y Enlaces</span>
          </button>
        )}
      </div>

      {/* Inline Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-start gap-2.5 animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : feedback.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle
              className={`w-4 h-4 shrink-0 mt-0.5 ${
                feedback.type === 'warning' ? 'text-amber-600' : 'text-rose-600'
              }`}
            />
          )}
          <span className="flex-1 leading-relaxed">{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-0.5 rounded hover:bg-black/5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Editor de Redes Sociales (Solo Admin) */}
      {isAdmin && isEditingSocials ? (
        <form
          onSubmit={handleSaveSocials}
          className="p-5 sm:p-6 rounded-2xl bg-white border-2 border-neutral-900/15 shadow-sm space-y-5"
        >
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-neutral-900">
                Vincular y Actualizar Redes Sociales Oficiales
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Pega los links directos a tus cuentas oficiales o actualiza tu número de WhatsApp.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsEditingSocials(false)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {draftSocials.map((soc) => {
              const meta = SOCIAL_META[soc.id] || SOCIAL_META.instagram;
              const Icon = meta.icon;
              return (
                <div
                  key={soc.id}
                  className={`p-4 rounded-xl border space-y-3 transition ${
                    soc.enabled
                      ? 'bg-neutral-50/70 border-neutral-200'
                      : 'bg-neutral-100/70 border-dashed border-neutral-300 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${meta.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-800">
                        {soc.id}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDraftSocialChange(soc.id, 'enabled', !soc.enabled)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                        soc.enabled
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-white border-neutral-300 text-neutral-500'
                      }`}
                    >
                      {soc.enabled ? (
                        <>
                          <Eye className="w-3 h-3" />
                          <span>Visible</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3" />
                          <span>Oculto</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                        Título de la Tarjeta
                      </label>
                      <input
                        type="text"
                        value={soc.name}
                        onChange={(e) => handleDraftSocialChange(soc.id, 'name', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-neutral-300 text-neutral-900 font-semibold focus:outline-none focus:border-neutral-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                        {soc.id === 'whatsapp' ? 'Número de Teléfono (con lada)' : 'Usuario / Nombre de Página'}
                      </label>
                      <input
                        type="text"
                        value={soc.handle}
                        onChange={(e) => handleDraftSocialChange(soc.id, 'handle', e.target.value)}
                        placeholder={meta.handlePlaceholder}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-neutral-300 text-neutral-900 font-mono text-xs focus:outline-none focus:border-neutral-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                        Enlace Directo (URL)
                      </label>
                      <input
                        type="text"
                        value={soc.url}
                        onChange={(e) => handleDraftSocialChange(soc.id, 'url', e.target.value)}
                        placeholder={meta.urlPlaceholder}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-neutral-300 text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
                      />
                      {soc.id === 'whatsapp' && (
                        <p className="text-[10px] text-emerald-700 mt-1">
                          Al modificar el teléfono, el link wa.me se genera automáticamente.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                        Descripción breve
                      </label>
                      <textarea
                        rows={2}
                        value={soc.desc}
                        onChange={(e) => handleDraftSocialChange(soc.id, 'desc', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-neutral-300 text-neutral-900 text-xs focus:outline-none focus:border-neutral-900 resize-none"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setIsEditingSocials(false)}
              className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingSocials}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#363435] hover:bg-black disabled:opacity-50 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingSocials ? 'Guardando...' : 'Guardar Enlaces'}</span>
            </button>
          </div>
        </form>
      ) : (
        /* Social Cards Grid */
        <div className="space-y-2">
          {visibleSocials.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white border border-neutral-200 text-center text-xs text-neutral-500">
              No hay canales sociales activos en este momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {visibleSocials.map((soc) => {
                const meta = SOCIAL_META[soc.id] || SOCIAL_META.instagram;
                const Icon = meta.icon;
                const safeHref = normalizeSocialUrl(soc.id, soc.url, soc.handle);
                return (
                  <a
                    key={soc.id}
                    href={safeHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-2xs hover:shadow-md hover:border-neutral-400 transition-all group flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className={`p-3 rounded-xl ${meta.color} shadow-xs`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <ExternalLink className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 transition" />
                      </div>

                      <div>
                        <h3 className="font-bold text-neutral-900 text-sm group-hover:text-black">
                          {soc.name}
                        </h3>
                        <span className="font-mono text-xs text-neutral-500 block mt-0.5 break-all">
                          {soc.handle}
                        </span>
                        <p className="text-xs text-neutral-600 mt-2 leading-relaxed">{soc.desc}</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-neutral-100 text-xs font-semibold text-[#363435] flex items-center justify-between">
                      <span>Abrir canal oficial</span>
                      <span>→</span>
                    </div>
                  </a>
                );
              })}
            </div>
          )}

          {isAdmin && activeSocials.length > visibleSocials.length && (
            <p className="text-[11px] text-neutral-500 px-1">
              Tienes {activeSocials.length - visibleSocials.length} canal(es) oculto(s). Usa &ldquo;Editar Redes y Enlaces&rdquo; para volver a mostrarlos.
            </p>
          )}
        </div>
      )}

      {/* Info Card de Sedes de Entrenamiento, Canchas & Horarios */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-neutral-200 shadow-2xs space-y-5 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
          <h3 className="text-sm sm:text-base font-extrabold text-neutral-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{clubSettings?.venueTitle || DEFAULT_CLUB_SETTINGS.venueTitle}</span>
          </h3>

          {isAdmin && !isEditingSedes && (
            <button
              type="button"
              onClick={openSedesEditor}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-900 text-xs font-extrabold shadow-xs transition cursor-pointer shrink-0"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Editar Sedes y Horarios</span>
            </button>
          )}
        </div>

        {isAdmin && isEditingSedes ? (
          <form onSubmit={handleSaveSedes} className="space-y-5">
            {/* Título general de la sección */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                Título de la Sección de Sedes
              </label>
              <input
                type="text"
                value={draftVenueTitle}
                onChange={(e) => setDraftVenueTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-300 text-neutral-900 font-semibold text-xs focus:outline-none focus:border-neutral-900"
              />
            </div>

            {/* Sedes existentes editables */}
            <div className="space-y-3">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-500">
                Sedes Configuradas ({draftSedes.length})
              </p>
              {draftSedes.map((row, idx) => (
                <div
                  key={`${row.originalName || 'new'}-${idx}`}
                  className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) =>
                          setDraftSedes((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, name: e.target.value } : item
                            )
                          )
                        }
                        placeholder="Nombre de la Sede"
                        className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-neutral-300 text-neutral-900 font-bold text-xs focus:outline-none focus:border-neutral-900"
                      />
                    </div>

                    {confirmDeleteSedeName === row.name ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleConfirmDeleteSede(row)}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold cursor-pointer"
                        >
                          Confirmar
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteSedeName(null)}
                          className="px-2 py-1.5 rounded-lg bg-neutral-200 text-neutral-700 text-[11px] font-semibold cursor-pointer"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteSedeName(row.name)}
                        title={`Eliminar sede ${row.name}`}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {!row.isNew && row.originalName !== row.name && (
                    <p className="text-[11px] text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded-lg">
                      Al guardar, la sede &ldquo;{row.originalName}&rdquo; se renombrará a &ldquo;{row.name}&rdquo; y se actualizarán automáticamente sus alumnos y entrenadores.
                    </p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                        Cancha / Dirección
                      </label>
                      <textarea
                        rows={2}
                        value={row.address}
                        onChange={(e) =>
                          setDraftSedes((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, address: e.target.value } : item
                            )
                          )
                        }
                        className="w-full px-2.5 py-2 rounded-lg bg-white border border-neutral-300 text-neutral-800 text-xs focus:outline-none focus:border-neutral-900 resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                        Horarios de Sesión
                      </label>
                      <textarea
                        rows={2}
                        value={row.schedule}
                        onChange={(e) =>
                          setDraftSedes((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, schedule: e.target.value } : item
                            )
                          )
                        }
                        className="w-full px-2.5 py-2 rounded-lg bg-white border border-neutral-300 text-neutral-800 text-xs focus:outline-none focus:border-neutral-900 resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                        Cotejo de Pagos
                      </label>
                      <textarea
                        rows={2}
                        value={row.paymentHours}
                        onChange={(e) =>
                          setDraftSedes((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, paymentHours: e.target.value } : item
                            )
                          )
                        }
                        className="w-full px-2.5 py-2 rounded-lg bg-white border border-neutral-300 text-neutral-800 text-xs focus:outline-none focus:border-neutral-900 resize-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Agregar nueva sede rápida */}
            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 space-y-3">
              <p className="text-xs font-extrabold text-neutral-900 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-amber-600" />
                <span>Agregar Nueva Sede de Entrenamiento</span>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  value={newSedeName}
                  onChange={(e) => setNewSedeName(e.target.value)}
                  placeholder="Nombre de la nueva sede (ej. Naucalpan)"
                  className="px-3 py-2 rounded-lg bg-white border border-amber-300 text-neutral-900 text-xs font-semibold focus:outline-none focus:border-amber-600"
                />
                <input
                  type="text"
                  value={newSedeAddress}
                  onChange={(e) => setNewSedeAddress(e.target.value)}
                  placeholder="Cancha / Dirección (opcional)"
                  className="px-3 py-2 rounded-lg bg-white border border-neutral-300 text-neutral-900 text-xs focus:outline-none focus:border-amber-600"
                />
                <input
                  type="text"
                  value={newSedeSchedule}
                  onChange={(e) => setNewSedeSchedule(e.target.value)}
                  placeholder="Horarios de sesión (opcional)"
                  className="px-3 py-2 rounded-lg bg-white border border-neutral-300 text-neutral-900 text-xs focus:outline-none focus:border-amber-600"
                />
                <input
                  type="text"
                  value={newSedePaymentHours}
                  onChange={(e) => setNewSedePaymentHours(e.target.value)}
                  placeholder="Horario de cotejo de pagos (opcional)"
                  className="px-3 py-2 rounded-lg bg-white border border-neutral-300 text-neutral-900 text-xs focus:outline-none focus:border-amber-600"
                />
              </div>
              <button
                type="button"
                onClick={handleAddDraftSede}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir Sede a la Lista</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setIsEditingSedes(false)}
                className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingSedes}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#363435] hover:bg-black disabled:opacity-50 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingSedes ? 'Guardando...' : 'Guardar Cambios de Sedes'}</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {mergedSedeDetails.map((sede) => (
              <div
                key={sede.name}
                className="rounded-xl border border-neutral-200/80 bg-neutral-50/50 p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#363435] text-white font-bold text-xs">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span>Sede {sede.name}</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-neutral-600">
                  <div className="p-3.5 rounded-xl bg-white border border-neutral-200/70">
                    <span className="font-bold text-neutral-900 flex items-center gap-1.5 mb-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      <span>Cancha / Ubicación</span>
                    </span>
                    <p className="leading-relaxed">{sede.address}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white border border-neutral-200/70">
                    <span className="font-bold text-neutral-900 flex items-center gap-1.5 mb-1">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Horarios de Sesión</span>
                    </span>
                    <p className="leading-relaxed">{sede.schedule}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white border border-neutral-200/70">
                    <span className="font-bold text-neutral-900 flex items-center gap-1.5 mb-1">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Cotejo de Pagos</span>
                    </span>
                    <p className="leading-relaxed">{sede.paymentHours}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
