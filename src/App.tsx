import React, { useState, useRef, useEffect, ChangeEvent } from 'react';
import { Printer, RefreshCw, Eye, EyeOff, Download, FileText, Share2, Check, Save, CloudUpload, CheckCircle2, MoreHorizontal, BookmarkCheck, RotateCcw, Trash2, History, Users, Copy, BookmarkPlus, Smartphone, Building2, ChevronDown, ChevronUp, LogIn, LogOut } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { PermitData, PermitHistoryRecord, PermitStatus, initialPermitData } from './types';
import { getStoredHeaderConfig, fetchServerHeaderConfig, saveStoredHeaderConfig, resetServerHeaderConfig, DEFAULT_INVEASAS_LOGO, DEFAULT_DOC_CONFIG } from './defaultLogo';
import { savePermitDataToStorage, loadAutoSavedPermitData, clearAutoSavedPermitData, getLastAutoSaveTimestamp, AUTOSAVE_INTERVAL_MS, formatAutoSaveTime, hasSignificantDraftData } from './utils/autoSave';
import { lockApp } from './utils/security';
import { auth } from './firebase';
import { AccessLockScreen } from './components/AccessLockScreen';
import { SecurityModal } from './components/SecurityModal';
import { Header } from './components/Header';
import { GeneralInfo } from './components/GeneralInfo';
import { WorkersSection } from './components/WorkersSection';
import { HealthSection } from './components/HealthSection';
import { PPESection, validatePPETools } from './components/PPESection';
import { AccessSystemsSection } from './components/AccessSystemsSection';
import { SignaturesSection } from './components/SignaturesSection';
import { validateSignaturesForPdf } from './utils/signatureValidation';
import { AlertTriangle, X } from 'lucide-react';
import { useCloudSync } from './components/CloudSyncContext';
import { PermitHistoryModal } from './components/PermitHistoryModal';
import { PersonnelDirectoryModal } from './components/PersonnelDirectoryModal';
import { AuthModal } from './components/AuthModal';
import { buildDuplicatedPermitData, getNextPermitNumber } from './services/firestoreStorage';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function isCanvasBlank(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d');
  if (!ctx) return true;
  try {
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let nonWhiteCount = 0;
    // Check every 16th pixel (64 bytes in RGBA buffer) for fast detection
    for (let i = 0; i < data.length; i += 64) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a > 30 && (r < 245 || g < 245 || b < 245)) {
        nonWhiteCount++;
        if (nonWhiteCount > 20) return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

function replaceCloneFormControlsWithStaticText(clone: HTMLElement): void {
  const controls = Array.from(
    clone.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select')
  );

  controls.forEach((el) => {
    if (el instanceof HTMLInputElement) {
      const t = (el.type || 'text').toLowerCase();
      if (['checkbox', 'radio', 'file', 'hidden', 'button', 'submit', 'reset'].includes(t)) {
        return;
      }
    }

    const computed = window.getComputedStyle(el);
    if (computed.display === 'none' || el.getClientRects().length === 0) {
      return;
    }

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      return;
    }

    const isTextarea = el instanceof HTMLTextAreaElement;
    let valueText = '';
    if (el instanceof HTMLSelectElement) {
      const selectedOpt = el.options[el.selectedIndex];
      valueText = el.value ? (selectedOpt ? selectedOpt.text : el.value) : '';
    } else {
      valueText = el.value || '';
    }

    const cls = typeof el.className === 'string' ? el.className : '';
    const hasFluidWidth = /\bw-full\b/.test(cls) || /\bflex-1\b/.test(cls);
    const hasFixedWidth = !hasFluidWidth && /\bw-(?:\d+|\[[^\]]+\])\b/.test(cls);

    const div = document.createElement('div');
    div.className = cls;
    div.style.boxSizing = 'border-box';

    if (hasFixedWidth) {
      div.style.width = `${rect.width}px`;
      div.style.flexShrink = '0';
    } else {
      div.style.width = '100%';
      div.style.minWidth = '0';
      div.style.maxWidth = '100%';
      if (/\bflex-1\b/.test(cls) || computed.flexGrow !== '0') {
        div.style.flex = '1 1 0%';
      }
    }

    if (isTextarea) {
      div.style.minHeight = `${rect.height}px`;
    } else {
      div.style.height = `${rect.height}px`;
    }

    div.style.fontFamily = computed.fontFamily;
    div.style.fontSize = computed.fontSize;
    div.style.fontWeight = computed.fontWeight;
    div.style.color = computed.color;
    div.style.letterSpacing = computed.letterSpacing;
    div.style.textTransform = computed.textTransform;
    div.style.textAlign = computed.textAlign;
    div.style.paddingTop = computed.paddingTop;
    div.style.paddingRight = computed.paddingRight;
    div.style.paddingBottom = computed.paddingBottom;
    div.style.paddingLeft = computed.paddingLeft;

    const align = computed.textAlign;
    let justifyContent = 'flex-start';
    if (align === 'center') {
      justifyContent = 'center';
    } else if (align === 'right' || align === 'end') {
      justifyContent = 'flex-end';
    }

    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.justifyContent = justifyContent;
    div.style.lineHeight = '1.15';
    div.style.border = 'none';
    div.style.background = 'transparent';
    div.style.overflow = 'visible';
    div.style.whiteSpace = isTextarea ? 'pre-wrap' : 'normal';
    div.style.overflowWrap = 'break-word';

    div.textContent = valueText;
    el.replaceWith(div);
  });
}

function clampOverflowingPageElements(pageElements: HTMLElement[], maxWidthPx: number): void {
  pageElements.forEach((pageEl) => {
    pageEl.style.boxSizing = 'border-box';
    if (pageEl.scrollWidth <= maxWidthPx) return;

    const pageRect = pageEl.getBoundingClientRect();
    const candidates = Array.from(
      pageEl.querySelectorAll<HTMLElement>('table, .overflow-x-auto, .pdf-page > *, div')
    );

    candidates.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width > pageEl.clientWidth - 36 || rect.right > pageRect.right - 18 || el.scrollWidth > el.clientWidth) {
        el.style.maxWidth = '100%';
        el.style.minWidth = '0';
        el.style.boxSizing = 'border-box';
        if (el.tagName === 'TABLE') {
          el.style.width = '100%';
          el.style.tableLayout = 'fixed';
        }
      }
    });
  });
}

async function capturePageCanvas(pageEl: HTMLElement, targetWidth: number): Promise<HTMLCanvasElement> {
  const baseOptions = {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: '#ffffff',
    width: targetWidth,
    windowWidth: targetWidth,
    x: 0,
    y: 0,
    scrollX: 0,
    scrollY: 0,
  };

  try {
    const foreignCanvas = await html2canvas(pageEl, {
      ...baseOptions,
      foreignObjectRendering: true,
    });
    if (!isCanvasBlank(foreignCanvas)) {
      return foreignCanvas;
    }
  } catch {
    // Respaldo automático con el renderizador estándar si foreignObjectRendering falla
  }

  return html2canvas(pageEl, baseOptions);
}

function ContinuityHeader({ data, pageNum, totalPages }: { data: PermitData; pageNum: number; totalPages: number }) {
  return (
    <div className="mb-2 avoid-break">
      <table className="header-official-table w-full border-collapse border-2 border-black bg-white text-[10.5px]">
        <colgroup>
          <col style={{ width: '18%' }} />
          <col style={{ width: '52%' }} />
          <col style={{ width: '30%' }} />
        </colgroup>
        <tbody>
          <tr>
            {/* Columna 1: Logo Corporativo */}
            <td className="border border-black p-1.5 text-center align-middle bg-white">
              <div className="flex items-center justify-center min-h-[84px]">
                {data.companyLogo ? (
                  <img
                    src={data.companyLogo}
                    alt="Logo Empresa"
                    className="max-h-16 max-w-full object-contain mx-auto block"
                  />
                ) : (
                  <div className="inline-block font-black text-brand-700 text-[11px] tracking-wider border border-brand-700 px-2.5 py-1 bg-brand-50 rounded-xs">
                    DCM
                  </div>
                )}
              </div>
            </td>

            {/* Columna 2: Identificación Institucional y Continuidad */}
            <td className="border border-black px-3 py-1.5 text-center align-middle bg-white">
              <div className="uppercase text-[10px] text-slate-800 font-bold tracking-tight leading-snug">
                SISTEMA DE GESTIÓN DE LA SEGURIDAD Y SALUD EN EL TRABAJO
              </div>
              <div className="font-black text-[12px] uppercase tracking-wide text-black leading-snug mt-0.5">
                {data.contractingCompany || data.companyName || 'DCM Servicios & Consultoría'}
                {data.companyNit?.trim() ? (
                  <span className="text-[9.5px] font-bold text-slate-800 ml-2">
                    NIT: {data.companyNit.trim()}
                  </span>
                ) : null}
              </div>
              <div className="text-[10px] text-black font-extrabold uppercase tracking-wide leading-snug mt-1">
                PERMISO DE TRABAJO EN ALTURAS — CONTINUACIÓN Y CONTROL (RES. 4272/2021)
              </div>
            </td>

            {/* Columna 3: Matriz de Metadatos sin rowSpan */}
            <td className="border border-black p-0 align-middle bg-white h-full">
              <div className="flex flex-col divide-y divide-black text-[10px] h-full">
                <div className="flex items-stretch min-h-[21px] flex-1">
                  <div className="w-[42%] px-1.5 py-0.5 font-bold text-[9.5px] text-slate-900 bg-brand-50/70 border-r border-black flex items-center justify-center leading-snug">
                    Permiso N°
                  </div>
                  <div className="w-[58%] px-1.5 py-0.5 font-black text-[10.5px] text-black flex items-center justify-center leading-snug">
                    {data.permitNumber || '001'}
                  </div>
                </div>
                <div className="flex items-stretch min-h-[21px] flex-1">
                  <div className="w-[42%] px-1.5 py-0.5 font-bold text-[9.5px] text-slate-900 bg-brand-50/70 border-r border-black flex items-center justify-center leading-snug">
                    Código
                  </div>
                  <div className="w-[58%] px-1.5 py-0.5 font-bold text-[10px] text-black flex items-center justify-center leading-snug">
                    {data.documentCode || 'F-SST-045'}
                  </div>
                </div>
                <div className="flex items-stretch min-h-[21px] flex-1">
                  <div className="w-[42%] px-1.5 py-0.5 font-bold text-[9.5px] text-slate-900 bg-brand-50/70 border-r border-black flex items-center justify-center leading-snug">
                    Versión
                  </div>
                  <div className="w-[58%] px-1.5 py-0.5 font-bold text-[10px] text-black flex items-center justify-center leading-snug">
                    {data.documentVersion || '01'}
                  </div>
                </div>
                <div className="flex items-stretch min-h-[21px] flex-1">
                  <div className="w-[42%] px-1.5 py-0.5 font-bold text-[9.5px] text-slate-900 bg-brand-50/70 border-r border-black flex items-center justify-center leading-snug">
                    Vigencia
                  </div>
                  <div className="w-[58%] px-1.5 py-0.5 font-bold text-[10px] text-black flex items-center justify-center leading-snug">
                    {data.documentValidity || 'JUNIO 2021'}
                  </div>
                </div>
                <div className="flex items-stretch min-h-[21px] flex-1 bg-brand-100/80">
                  <div className="w-[42%] px-1.5 py-0.5 font-bold text-[9.5px] text-slate-900 border-r border-black flex items-center justify-center leading-snug">
                    Página
                  </div>
                  <div className="w-[58%] px-1.5 py-0.5 font-black text-[10px] text-black flex items-center justify-center leading-snug">
                    Pág. {pageNum} de {totalPages}
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function DocumentFooter({ pageNum, totalPages, isUnified = false }: { pageNum: number; totalPages: number; isUnified?: boolean }) {
  return (
    <footer className="mt-auto pt-1.5 pb-0.5 border-t-2 border-black text-[9px] text-black flex justify-between items-center bg-white avoid-break">
      <div className="flex items-center gap-2 leading-normal">
        <div className="font-black text-white bg-brand-700 px-2 py-1 rounded-xs text-[7.5px] uppercase tracking-wider flex items-center justify-center leading-normal shrink-0">
          Auditable SG-SST
        </div>
        <span className="font-medium text-[8.5px] text-slate-900 leading-normal">
          Permiso de Trabajo en Alturas conforme a la <strong className="font-bold text-black">Resolución 4272 de 2021</strong> del Ministerio del Trabajo de Colombia.
        </span>
      </div>
      <span className="font-bold text-black text-[9px] shrink-0 ml-3 leading-normal">
        {isUnified ? 'Documento Oficial Completo' : `Pág. ${pageNum} de ${totalPages}`}
      </span>
    </footer>
  );
}

export default function App() {
  const [isLocallyLocked, setIsLocallyLocked] = useState<boolean>(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [data, setData] = useState<PermitData>(() => {
    const storedConfig = getStoredHeaderConfig();
    const autoSaved = loadAutoSavedPermitData();
    if (autoSaved && autoSaved.data) {
      return {
        ...initialPermitData,
        ...autoSaved.data,
        companyLogo: autoSaved.data.companyLogo !== undefined ? autoSaved.data.companyLogo : (storedConfig.logo !== undefined ? storedConfig.logo : DEFAULT_INVEASAS_LOGO),
        documentCode: autoSaved.data.documentCode || storedConfig.code || DEFAULT_DOC_CONFIG.code,
        documentVersion: autoSaved.data.documentVersion || storedConfig.version || DEFAULT_DOC_CONFIG.version,
        documentValidity: autoSaved.data.documentValidity || storedConfig.validity || DEFAULT_DOC_CONFIG.validity,
        companyName: autoSaved.data.companyName || storedConfig.companyName || initialPermitData.companyName,
        companyNit: autoSaved.data.companyNit !== undefined ? autoSaved.data.companyNit : (storedConfig.companyNit || ''),
        contractingCompany: autoSaved.data.contractingCompany || autoSaved.data.companyName || storedConfig.companyName || initialPermitData.contractingCompany,
      };
    }
    return {
      ...initialPermitData,
      companyLogo: storedConfig.logo !== undefined ? storedConfig.logo : DEFAULT_INVEASAS_LOGO,
      documentCode: storedConfig.code || DEFAULT_DOC_CONFIG.code,
      documentVersion: storedConfig.version || DEFAULT_DOC_CONFIG.version,
      documentValidity: storedConfig.validity || DEFAULT_DOC_CONFIG.validity,
      companyName: storedConfig.companyName || initialPermitData.companyName,
      companyNit: storedConfig.companyNit || '',
      contractingCompany: storedConfig.companyName || initialPermitData.contractingCompany,
    };
  });
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<Date | null>(() => getLastAutoSaveTimestamp());
  const [isAutoSaving, setIsAutoSaving] = useState<boolean>(false);
  const [restoredDraftNotice, setRestoredDraftNotice] = useState<{ visible: boolean; time: string | null }>(() => {
    const autoSaved = loadAutoSavedPermitData();
    if (autoSaved && autoSaved.data && hasSignificantDraftData(autoSaved.data)) {
      return {
        visible: true,
        time: autoSaved.timestamp ? autoSaved.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
      };
    }
    return { visible: false, time: null };
  });

  // Ticker ligero cada 5 segundos para mantener actualizado el texto de tiempo relativo (ej. 'hace 15s')
  const [, setTimeTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeTick(t => t + 1);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const {
    user,
    authReady,
    permits,
    personnel,
    activePermitId,
    activePermitStatus,
    setActivePermitMeta,
    savePermit,
    openHistory,
    openDirectory,
    openAuthModal,
    signOutGoogle,
  } = useCloudSync();
  const [isSavingToHistory, setIsSavingToHistory] = useState(false);

  const [isPreview, setIsPreview] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [copiedLinkFeedback, setCopiedLinkFeedback] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [isHeaderConfigExpanded, setIsHeaderConfigExpanded] = useState(false);
  const headerMenuRef = useRef<HTMLDivElement>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const [logoFeedback, setLogoFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<'success' | 'warning'>('success');
  const [signatureAlert, setSignatureAlert] = useState<{ isOpen: boolean; messages: string[] }>({
    isOpen: false,
    messages: []
  });
  // Formato oficial predeterminado de 2 páginas Carta para presentación formal y auditoría SG-SST
  const [layoutMode] = useState<'2-pages' | '3-pages' | 'unified'>('2-pages');
  const formRef = useRef<HTMLDivElement>(null);
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setInstallPromptEvent(null);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!installPromptEvent) return;
    try {
      await installPromptEvent.prompt();
      await installPromptEvent.userChoice;
    } catch {
      // Ignorar cancelación del navegador
    } finally {
      setInstallPromptEvent(null);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(event.target as Node)) {
        setIsHeaderMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsHeaderMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  // Referencia mutable a la información más reciente para el timer de 30s sin reconstruir intervalos
  const latestDataRef = useRef<PermitData>(data);
  useEffect(() => {
    latestDataRef.current = data;
  }, [data]);

  // Autoguardado periódico en localStorage cada 30 segundos
  useEffect(() => {
    const intervalId = setInterval(() => {
      setIsAutoSaving(true);
      const success = savePermitDataToStorage(latestDataRef.current);
      if (success) {
        setLastAutoSaveTime(new Date());
      }
      setTimeout(() => setIsAutoSaving(false), 800);
    }, AUTOSAVE_INTERVAL_MS);

    // Guardado preventivo al recargar o cerrar pestaña
    const handleBeforeUnload = () => {
      savePermitDataToStorage(latestDataRef.current);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        savePermitDataToStorage(latestDataRef.current);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleManualSave = () => {
    const toolCheck = validatePPETools(data.ppe?.tools);
    if (!toolCheck.isValid) {
      showLogoFeedback(toolCheck.message, 'warning');
      const toolsEl = document.getElementById('ppe-tools-section');
      if (toolsEl) {
        toolsEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    setIsAutoSaving(true);
    const success = savePermitDataToStorage(data);
    if (success) {
      setLastAutoSaveTime(new Date());
    }
    setTimeout(() => setIsAutoSaving(false), 800);
  };

  // Sincronizar al cargar con el logo y configuración fijada en el servidor sin sobreescribir datos del usuario
  useEffect(() => {
    fetchServerHeaderConfig().then(serverConfig => {
      if (serverConfig) {
        setData(prev => ({
          ...prev,
          companyLogo: serverConfig.logo !== undefined ? serverConfig.logo : prev.companyLogo,
          documentCode: prev.documentCode || serverConfig.code,
          documentVersion: prev.documentVersion || serverConfig.version,
          documentValidity: prev.documentValidity || serverConfig.validity,
          companyName: prev.companyName || serverConfig.companyName || initialPermitData.companyName,
          companyNit: prev.companyNit || serverConfig.companyNit || '',
          contractingCompany: prev.contractingCompany || serverConfig.companyName || initialPermitData.contractingCompany,
        }));
      }
    });
  }, []);

  const updateData = (newData: Partial<PermitData>) => {
    setData(prev => ({ ...prev, ...newData }));
  };

  const showLogoFeedback = (msg: string, tone: 'success' | 'warning' = 'success') => {
    setFeedbackTone(tone);
    setLogoFeedback(msg);
    setTimeout(() => setLogoFeedback(null), tone === 'warning' ? 5000 : 3500);
  };

  const handleSaveToHistory = async (forceNew = false) => {
    const toolCheck = validatePPETools(data.ppe?.tools);
    if (!toolCheck.isValid) {
      showLogoFeedback(toolCheck.message, 'warning');
      const toolsEl = document.getElementById('ppe-tools-section');
      if (toolsEl) {
        toolsEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    if (!user) {
      openHistory();
      return;
    }
    setIsSavingToHistory(true);
    try {
      const saved = await savePermit(data, forceNew);
      if (saved) {
        showLogoFeedback(
          activePermitId && !forceNew && activePermitStatus !== 'cerrado'
            ? `Permiso N° ${data.permitNumber || '001'} actualizado en el historial.`
            : `Permiso N° ${data.permitNumber || '001'} guardado en el historial.`
        );
      }
    } catch (err) {
      showLogoFeedback(err instanceof Error ? err.message : 'No se pudo guardar en el historial.', 'warning');
    } finally {
      setIsSavingToHistory(false);
    }
  };

  const handleLoadFromHistory = (record: PermitHistoryRecord) => {
    const storedConfig = getStoredHeaderConfig();
    const fallbackLogo = storedConfig.logo !== undefined ? storedConfig.logo : DEFAULT_INVEASAS_LOGO;
    const loaded: PermitData = {
      ...initialPermitData,
      ...record.permitData,
      companyLogo: record.permitData.companyLogo || fallbackLogo,
      companyNit: record.permitData.companyNit !== undefined ? record.permitData.companyNit : (storedConfig.companyNit || ''),
    };
    setData(loaded);
    savePermitDataToStorage(loaded);
    setActivePermitMeta(record.id, record.status);
    setRestoredDraftNotice({ visible: false, time: null });
    showLogoFeedback(`Permiso N° ${loaded.permitNumber || '001'} cargado desde el historial.`);
  };

  const handleApplyDuplicatedPermit = (duplicated: PermitData, newId: string, status: PermitStatus) => {
    const storedConfig = getStoredHeaderConfig();
    const fallbackLogo = storedConfig.logo !== undefined ? storedConfig.logo : DEFAULT_INVEASAS_LOGO;
    const ready: PermitData = {
      ...initialPermitData,
      ...duplicated,
      companyLogo: duplicated.companyLogo || fallbackLogo,
      companyNit: duplicated.companyNit !== undefined ? duplicated.companyNit : (storedConfig.companyNit || ''),
    };
    setData(ready);
    savePermitDataToStorage(ready);
    setActivePermitMeta(newId, status);
    setRestoredDraftNotice({ visible: false, time: null });
  };

  const handleDuplicateCurrentPermit = async () => {
    const nextNum = getNextPermitNumber(permits, data.permitNumber);
    const duplicated = buildDuplicatedPermitData(data, nextNum);
    if (user) {
      setIsSavingToHistory(true);
      try {
        const saved = await savePermit(duplicated, true);
        if (saved) {
          handleApplyDuplicatedPermit(duplicated, saved.id, saved.status);
          showLogoFeedback(`Permiso duplicado como N° ${nextNum} y guardado en el historial.`);
          return;
        }
      } finally {
        setIsSavingToHistory(false);
      }
    }
    setData(duplicated);
    savePermitDataToStorage(duplicated);
    setActivePermitMeta(null, null);
    setRestoredDraftNotice({ visible: false, time: null });
    showLogoFeedback(`Permiso duplicado como N° ${nextNum} en el editor.`);
  };

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const logoDataUrl = reader.result as string;
        updateData({ companyLogo: logoDataUrl });
        saveStoredHeaderConfig({ logo: logoDataUrl });
        showLogoFeedback('¡Logo cambiado y fijado con éxito! Se mostrará a quien abra el enlace compartido.');
      };
      reader.readAsDataURL(file);
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleSaveLogoAsTemplate = async () => {
    await saveStoredHeaderConfig({
      logo: data.companyLogo !== undefined ? data.companyLogo : DEFAULT_INVEASAS_LOGO,
      code: data.documentCode || DEFAULT_DOC_CONFIG.code,
      version: data.documentVersion || DEFAULT_DOC_CONFIG.version,
      validity: data.documentValidity || DEFAULT_DOC_CONFIG.validity,
      companyName: data.contractingCompany || data.companyName || 'DCM Servicios & Consultoría',
      companyNit: data.companyNit || '',
    });
    showLogoFeedback('¡Encabezado, empresa, NIT, códigos y logo guardados como plantilla predeterminada!');
  };

  const handleRestoreDefaultLogo = () => {
    updateData({ companyLogo: DEFAULT_INVEASAS_LOGO });
    saveStoredHeaderConfig({ logo: DEFAULT_INVEASAS_LOGO });
    showLogoFeedback('Logo oficial restaurado y fijado para enlaces compartidos.');
  };

  const handleRemoveLogo = () => {
    updateData({ companyLogo: '' });
    saveStoredHeaderConfig({ logo: '' });
    showLogoFeedback('Logo removido de la plantilla.');
  };

  const handleRestoreFactoryDefaults = async () => {
    if (window.confirm(`¿Desea restaurar el encabezado a los valores predeterminados de la plantilla (Logo oficial DCM, Código ${DEFAULT_DOC_CONFIG.code}, Versión ${DEFAULT_DOC_CONFIG.version}, Vigencia ${DEFAULT_DOC_CONFIG.validity})?`)) {
      updateData({
        companyLogo: DEFAULT_INVEASAS_LOGO,
        documentCode: DEFAULT_DOC_CONFIG.code,
        documentVersion: DEFAULT_DOC_CONFIG.version,
        documentValidity: DEFAULT_DOC_CONFIG.validity,
        companyName: DEFAULT_DOC_CONFIG.companyName || 'DCM Servicios & Consultoría',
        companyNit: '',
        contractingCompany: DEFAULT_DOC_CONFIG.companyName || 'DCM Servicios & Consultoría',
      });
      await resetServerHeaderConfig();
      showLogoFeedback('Encabezado restaurado a la plantilla predeterminada.');
    }
  };

  const handleShare = async () => {
    // Asegurar que el logo actual y metadatos queden guardados en el servidor antes de compartir
    saveStoredHeaderConfig({
      logo: data.companyLogo !== undefined ? data.companyLogo : DEFAULT_INVEASAS_LOGO,
      code: data.documentCode || DEFAULT_DOC_CONFIG.code,
      version: data.documentVersion || DEFAULT_DOC_CONFIG.version,
      validity: data.documentValidity || DEFAULT_DOC_CONFIG.validity,
      companyName: data.contractingCompany || data.companyName,
      companyNit: data.companyNit || '',
    });

    const currentUrl = window.location.href.split('#')[0];
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Permiso de Trabajo en Alturas (SST)',
          text: `Formato oficial de Permiso de Trabajo en Alturas (Res. 4272/2021) - ${data.companyName || 'DCM Servicios & Consultoría'}`,
          url: currentUrl,
        });
        return;
      } catch {
        // Fallback al portapapeles
      }
    }

    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopiedLinkFeedback(true);
      setTimeout(() => setCopiedLinkFeedback(false), 3000);
    } catch {
      const input = document.createElement('input');
      input.value = currentUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopiedLinkFeedback(true);
      setTimeout(() => setCopiedLinkFeedback(false), 3000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    // Validación legal SG-SST (Res. 4272/2021): Responsable SST y Trabajador deben tener firma (canvas no vacío)
    const sigValidation = validateSignaturesForPdf(data);
    if (!sigValidation.isValid) {
      setSignatureAlert({
        isOpen: true,
        messages: sigValidation.missingMessages
      });
      const sigElement = document.getElementById('signatures-section');
      if (sigElement) {
        sigElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (!formRef.current) return;
    
    setIsGeneratingPdf(true);

    const targetWidth = 1000;
    
    // Contenedor aislado directo en document.body para heredar el 100% de fuentes y estilos Tailwind sin desconfiguraciones en móviles
    const sandbox = document.createElement('div');
    sandbox.id = 'pdf-render-sandbox';
    sandbox.className = 'pdf-render-desktop preview-mode';
    sandbox.style.position = 'fixed';
    sandbox.style.top = '0';
    sandbox.style.left = '0';
    sandbox.style.width = `${targetWidth}px`;
    sandbox.style.minWidth = `${targetWidth}px`;
    sandbox.style.maxWidth = `${targetWidth}px`;
    sandbox.style.backgroundColor = '#ffffff';
    sandbox.style.zIndex = '99998';
    sandbox.style.pointerEvents = 'none';
    sandbox.style.overflow = 'visible';
    sandbox.style.boxSizing = 'border-box';
    sandbox.style.margin = '0';
    sandbox.style.padding = '0';
    (sandbox.style as any).webkitTextSizeAdjust = '100%';
    (sandbox.style as any).textSizeAdjust = '100%';

    // Clonar elemento de formulario manteniendo el árbol DOM
    const clone = formRef.current.cloneNode(true) as HTMLElement;
    clone.style.width = `${targetWidth}px`;
    clone.style.minWidth = `${targetWidth}px`;
    clone.style.maxWidth = `${targetWidth}px`;
    clone.style.margin = '0';
    clone.style.padding = '0';
    clone.style.boxShadow = 'none';
    clone.style.backgroundColor = '#ffffff';
    (clone.style as any).webkitTextSizeAdjust = '100%';
    (clone.style as any).textSizeAdjust = '100%';
    clone.classList.add('preview-mode', 'pdf-render-desktop');

    // Forzar estilo de tablas en el clon para evitar desbordes
    const tables = clone.querySelectorAll('table');
    tables.forEach(table => {
      table.style.tableLayout = 'fixed';
      table.style.width = '100%';
    });

    // Sincronizar valores actuales de inputs, textareas y selects
    const origInputs = formRef.current.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select');
    const cloneInputs = clone.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select');
    origInputs.forEach((orig, idx) => {
      const cloned = cloneInputs[idx];
      if (!cloned) return;
      if (orig instanceof HTMLInputElement) {
        if (orig.type === 'file') return;
        if (orig.type === 'checkbox' || orig.type === 'radio') {
          (cloned as HTMLInputElement).checked = orig.checked;
          if (orig.checked) cloned.setAttribute('checked', 'checked');
        } else {
          cloned.value = orig.value;
          cloned.setAttribute('value', orig.value);
        }
      } else if (orig instanceof HTMLTextAreaElement) {
        cloned.value = orig.value;
        cloned.textContent = orig.value;
      } else if (orig instanceof HTMLSelectElement) {
        cloned.value = orig.value;
      }
    });

    // Marcar botones de pantalla (sin tocar botones de fecha/hora ni casillas/firmas) y ocultar todo elemento print:hidden / data-pdf-hide
    const cloneButtons = clone.querySelectorAll<HTMLButtonElement>('button');
    cloneButtons.forEach((btn) => {
      const isDateOrTimeSelector =
        Boolean(btn.closest('td > button')) ||
        Boolean(btn.querySelector('.tabular-nums')) ||
        /Fecha|Hora|Válido|Suspensión|Reanudación|Cancelación/i.test(btn.getAttribute('aria-label') || '');
      if (!isDateOrTimeSelector) {
        btn.setAttribute('data-pdf-hide', 'true');
        btn.style.setProperty('display', 'none', 'important');
      }
    });

    const printHiddenElements = clone.querySelectorAll('.print\\:hidden, [data-pdf-hide], [data-html2canvas-ignore], .keep-in-preview');
    printHiddenElements.forEach((el) => {
      (el as HTMLElement).style.setProperty('display', 'none', 'important');
    });

    // Si el usuario estaba en modo continuo en pantalla, organizamos el clon en las 2 páginas oficiales
    if (layoutMode === 'unified') {
      const unifiedEl = clone.querySelector<HTMLElement>('#pdf-page-unified');
      if (unifiedEl) {
        const page1 = document.createElement('section');
        page1.className = 'pdf-page';
        page1.id = 'pdf-page-1';

        const page2 = document.createElement('section');
        page2.className = 'pdf-page';
        page2.id = 'pdf-page-2';

        const children = Array.from(unifiedEl.children);
        // Página 1: Encabezado, Info General, Trabajadores, Salud
        for (let c = 0; c <= 3 && c < children.length; c++) {
          page1.appendChild(children[c]);
        }
        if (children.length > 0) {
          const footer1 = children[children.length - 1].cloneNode(true) as HTMLElement;
          const span1 = footer1.querySelector('span:last-child');
          if (span1) span1.textContent = 'Pág. 1 de 2';
          page1.appendChild(footer1);
        }

        // Página 2: Continuidad, EPP, Sistemas Acceso y Firmas
        const esc = (s: string) =>
          s
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
        const companyLabel = esc(data.contractingCompany || data.companyName || 'DCM Servicios & Consultoría');
        const nitBadge = data.companyNit?.trim()
          ? ` <span style="font-size:9.5px;font-weight:700;font-family:monospace;color:#1e293b;margin-left:8px;">NIT: ${esc(data.companyNit.trim())}</span>`
          : '';
        const continuityHdr = document.createElement('div');
        continuityHdr.className = 'mb-2 avoid-break';
        continuityHdr.innerHTML = `
          <table class="header-official-table w-full border-collapse border-2 border-black bg-white text-[10.5px]">
            <colgroup>
              <col style="width: 18%;" />
              <col style="width: 52%;" />
              <col style="width: 30%;" />
            </colgroup>
            <tbody>
              <tr>
                <td class="border border-black p-1.5 text-center align-middle bg-white">
                  <div class="flex items-center justify-center min-h-[84px]">
                    ${data.companyLogo ? `<img src="${data.companyLogo}" alt="Logo Empresa" class="max-h-16 max-w-full object-contain mx-auto block" />` : `<div class="inline-block font-black text-brand-700 text-[11px] tracking-wider border border-brand-700 px-2.5 py-1 bg-brand-50 rounded-xs">DCM</div>`}
                  </div>
                </td>
                <td class="border border-black px-3 py-1.5 text-center align-middle bg-white">
                  <div class="uppercase text-[10px] text-slate-800 font-bold tracking-tight leading-snug">SISTEMA DE GESTIÓN DE LA SEGURIDAD Y SALUD EN EL TRABAJO</div>
                  <div class="font-black text-[12px] uppercase tracking-wide text-black leading-snug mt-0.5">${companyLabel}${nitBadge}</div>
                  <div class="text-[10px] text-black font-extrabold uppercase tracking-wide leading-snug mt-1">PERMISO DE TRABAJO EN ALTURAS — CONTINUACIÓN Y CONTROL (RES. 4272/2021)</div>
                </td>
                <td class="border border-black p-0 align-middle bg-white h-full">
                  <div class="flex flex-col divide-y divide-black text-[10px] h-full">
                    <div class="flex items-stretch min-h-[21px] flex-1">
                      <div class="w-[42%] px-1.5 py-0.5 font-bold text-[9.5px] text-slate-900 bg-brand-50/70 border-r border-black flex items-center justify-center leading-snug">Permiso N°</div>
                      <div class="w-[58%] px-1.5 py-0.5 font-black text-[10.5px] text-black flex items-center justify-center leading-snug">${esc(data.permitNumber || '001')}</div>
                    </div>
                    <div class="flex items-stretch min-h-[21px] flex-1">
                      <div class="w-[42%] px-1.5 py-0.5 font-bold text-[9.5px] text-slate-900 bg-brand-50/70 border-r border-black flex items-center justify-center leading-snug">Código</div>
                      <div class="w-[58%] px-1.5 py-0.5 font-bold text-[10px] text-black flex items-center justify-center leading-snug">${esc(data.documentCode || 'F-SST-045')}</div>
                    </div>
                    <div class="flex items-stretch min-h-[21px] flex-1">
                      <div class="w-[42%] px-1.5 py-0.5 font-bold text-[9.5px] text-slate-900 bg-brand-50/70 border-r border-black flex items-center justify-center leading-snug">Versión</div>
                      <div class="w-[58%] px-1.5 py-0.5 font-bold text-[10px] text-black flex items-center justify-center leading-snug">${esc(data.documentVersion || '01')}</div>
                    </div>
                    <div class="flex items-stretch min-h-[21px] flex-1">
                      <div class="w-[42%] px-1.5 py-0.5 font-bold text-[9.5px] text-slate-900 bg-brand-50/70 border-r border-black flex items-center justify-center leading-snug">Vigencia</div>
                      <div class="w-[58%] px-1.5 py-0.5 font-bold text-[10px] text-black flex items-center justify-center leading-snug">${esc(data.documentValidity || 'JUNIO 2021')}</div>
                    </div>
                    <div class="flex items-stretch min-h-[21px] flex-1 bg-brand-100/80">
                      <div class="w-[42%] px-1.5 py-0.5 font-bold text-[9.5px] text-slate-900 border-r border-black flex items-center justify-center leading-snug">Página</div>
                      <div class="w-[58%] px-1.5 py-0.5 font-black text-[10px] text-black flex items-center justify-center leading-snug">Pág. 2 de 2</div>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        `;
        page2.appendChild(continuityHdr);

        for (let c = 4; c < children.length - 1; c++) {
          page2.appendChild(children[c]);
        }
        if (children.length > 0) {
          const footer2 = children[children.length - 1];
          const span2 = footer2.querySelector('span:last-child');
          if (span2) span2.textContent = 'Pág. 2 de 2';
          page2.appendChild(footer2);
        }

        unifiedEl.replaceWith(page1, page2);
      }
    }

    const pageElements = Array.from(clone.querySelectorAll<HTMLElement>('.pdf-page'));

    pageElements.forEach(pageEl => {
      pageEl.style.width = `${targetWidth}px`;
      pageEl.style.minWidth = `${targetWidth}px`;
      pageEl.style.maxWidth = `${targetWidth}px`;
      pageEl.style.minHeight = '1290px';
      pageEl.style.boxSizing = 'border-box';
      pageEl.style.display = 'flex';
      pageEl.style.flexDirection = 'column';
      pageEl.style.justifyContent = 'flex-start';
      pageEl.style.padding = '20px';
      pageEl.style.backgroundColor = '#ffffff';
      pageEl.style.boxShadow = 'none';
      pageEl.style.border = 'none';
      pageEl.style.margin = '0';
    });

    sandbox.appendChild(clone);
    document.body.appendChild(sandbox);

    try {
      // 1. Asegurar que las fuentes del sistema y web fonts estén listas
      if (document.fonts) {
        try {
          await document.fonts.ready;
        } catch {}
      }

      // 2. Esperar que carguen logotipos, firmas y cualquier imagen embebida
      const images = Array.from(clone.querySelectorAll('img'));
      await Promise.all(
        images.map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
            setTimeout(resolve, 500);
          });
        })
      );

      // 2.5 Recortar márgenes transparentes de firmas guardadas para que queden centradas en cada casilla
      const sigImgs = Array.from(
        clone.querySelectorAll<HTMLImageElement>('img[alt*="Firma"], img[alt*="firma"]')
      );
      await Promise.all(
        sigImgs.map(async (img) => {
          try {
            if (!img.naturalWidth || !img.naturalHeight) return;
            const c = document.createElement('canvas');
            c.width = img.naturalWidth;
            c.height = img.naturalHeight;
            const ctx = c.getContext('2d');
            if (!ctx) return;
            ctx.drawImage(img, 0, 0);
            const pixels = ctx.getImageData(0, 0, c.width, c.height).data;
            let minX = c.width;
            let minY = c.height;
            let maxX = -1;
            let maxY = -1;
            for (let y = 0; y < c.height; y++) {
              for (let x = 0; x < c.width; x++) {
                const idx = (y * c.width + x) * 4;
                const a = pixels[idx + 3];
                const r = pixels[idx];
                const g = pixels[idx + 1];
                const b = pixels[idx + 2];
                if (a > 20 && (r < 245 || g < 245 || b < 245)) {
                  if (x < minX) minX = x;
                  if (x > maxX) maxX = x;
                  if (y < minY) minY = y;
                  if (y > maxY) maxY = y;
                }
              }
            }
            if (maxX >= minX && maxY >= minY) {
              const pad = 6;
              const sx = Math.max(0, minX - pad);
              const sy = Math.max(0, minY - pad);
              const sw = Math.min(c.width - sx, maxX - minX + 1 + pad * 2);
              const sh = Math.min(c.height - sy, maxY - minY + 1 + pad * 2);
              const out = document.createElement('canvas');
              out.width = sw;
              out.height = sh;
              const outCtx = out.getContext('2d');
              if (outCtx) {
                outCtx.drawImage(c, sx, sy, sw, sh, 0, 0, sw, sh);
                const croppedUrl = out.toDataURL('image/png');
                await new Promise<void>((res) => {
                  img.onload = () => res();
                  img.onerror = () => res();
                  img.src = croppedUrl;
                  if (img.complete) res();
                });
              }
            }
          } catch {
            // Ignorar imágenes con restricción CORS
          }
        })
      );

      // 3. Pausa para reflow y aplicación de estilos completos
      await new Promise(resolve => setTimeout(resolve, 200));

      // 3.5 Convertir campos de formulario visibles del clon a texto fijo usando medidas reales post-reflow
      replaceCloneFormControlsWithStaticText(clone);

      // 3.6 Verificar que ninguna página supere el ancho de 1000px para preservar bordes derechos
      clampOverflowingPageElements(pageElements, targetWidth);

      // 4. Configurar PDF Carta (Letter)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter',
        compress: true
      });

      const pageWidthMm = 215.9; // Carta (8.5 pulg = 215.9mm)
      const pageHeightMm = 279.4; // Carta (11 pulg = 279.4mm)
      const marginMm = 6.0; // Margen uniforme
      const printableWidthMm = pageWidthMm - (marginMm * 2); // 203.9 mm
      const printableHeightMm = pageHeightMm - (marginMm * 2); // 267.4 mm

      let addedPagesCount = 0;

      for (let i = 0; i < pageElements.length; i++) {
        const pageEl = pageElements[i];

        // 5. Captura con html2canvas (prioriza foreignObjectRendering con respaldo automático)
        const canvas = await capturePageCanvas(pageEl, targetWidth);

        if (isCanvasBlank(canvas)) continue;

        // 6. Proporción exacta Carta sin desplazamiento de márgenes
        const aspectRatio = canvas.width / canvas.height;
        let renderWidth = printableWidthMm;
        let renderHeight = printableWidthMm / aspectRatio;

        // Si la página sobrepasa la altura imprimible, ajustar proporcionalmente
        if (renderHeight > printableHeightMm) {
          const scaleFactor = printableHeightMm / renderHeight;
          renderWidth = renderWidth * scaleFactor;
          renderHeight = printableHeightMm;
        }

        // Posicionamiento horizontal centrado y margen superior fijo (evita que los márgenes se corran)
        const posX = (pageWidthMm - renderWidth) / 2;
        const posY = marginMm;

        if (addedPagesCount > 0) {
          pdf.addPage('letter', 'portrait');
        }

        const imgData = canvas.toDataURL('image/jpeg', 0.96);
        pdf.addImage(imgData, 'JPEG', posX, posY, renderWidth, renderHeight, undefined, 'FAST');
        addedPagesCount++;
      }

      pdf.save(`Permiso_Alturas_Oficial_${data.documentCode || 'F-SST-045'}_No${data.permitNumber || '001'}_${data.date || 'SinFecha'}.pdf`);
    } catch (err) {
      console.error('Error al generar PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
      if (document.body.contains(sandbox)) {
        document.body.removeChild(sandbox);
      }
    }
  };

  const handleReset = () => {
    if (window.confirm('¿Está seguro de que desea limpiar todo el formulario? Se perderán los datos del permiso actual y el borrador autoguardado, pero se conservará el logo corporativo y la configuración del documento.')) {
      clearAutoSavedPermitData();
      const storedConfig = getStoredHeaderConfig();
      const currentLogo = data.companyLogo !== undefined ? data.companyLogo : (storedConfig.logo !== undefined ? storedConfig.logo : DEFAULT_INVEASAS_LOGO);
      setData({
        ...initialPermitData,
        companyLogo: currentLogo,
        documentCode: data.documentCode || storedConfig.code,
        documentVersion: data.documentVersion || storedConfig.version,
        documentValidity: data.documentValidity || storedConfig.validity,
        companyName: data.companyName || storedConfig.companyName || 'DCM Servicios & Consultoría',
        companyNit: data.companyNit !== undefined ? data.companyNit : (storedConfig.companyNit || ''),
        contractingCompany: data.contractingCompany || data.companyName || storedConfig.companyName || 'DCM Servicios & Consultoría',
      });
      setActivePermitMeta(null, null);
      setLastAutoSaveTime(null);
      setRestoredDraftNotice({ visible: false, time: null });
    }
  };

  const handleLock = () => {
    lockApp();
    setIsLocallyLocked(true);
  };

  // Defensa en profundidad: nunca exponer el formulario ni sus funciones sin usuario autenticado en Firebase
  if (!authReady || !user || !auth.currentUser) {
    return null;
  }

  if (isLocallyLocked) {
    return <AccessLockScreen onUnlock={() => setIsLocallyLocked(false)} />;
  }

  return (
    <div className={`min-h-screen bg-slate-100 print:bg-white flex flex-col items-center font-sans ${isPreview ? 'preview-mode' : ''}`}>
      
      {/* Top Controls Bar (Hidden in Print) */}
      <header className="w-full bg-slate-900 text-white py-2.5 px-3 sm:px-5 shadow-md sticky top-0 z-40 print:hidden border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5">
          {/* Título e identidad */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-brand-700/30 border border-brand-500/30 flex items-center justify-center shrink-0">
              <FileText className="text-brand-300" size={18} />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold tracking-tight text-white truncate">
                Permiso de Trabajo en Alturas
              </h1>
              <p className="text-[11px] text-slate-400 truncate">
                Resolución 4272 de 2021 · Doc:{' '}
                <span className="font-mono text-slate-300">{data.documentCode || 'F-SST-045'}</span>
              </p>
            </div>
          </div>

          {/* Controles organizados: Archivo/Personal + Autoguardado + Secundarios + Principal + Menú "⋯" */}
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between lg:justify-end gap-2">
            {/* Historial, Directorio de Personal y Guardar en Historial */}
            <div className="flex items-center bg-slate-800/90 border border-slate-700 rounded-lg p-0.5 gap-0.5 shrink-0">
              <button
                type="button"
                onClick={openHistory}
                title="Abrir historial y búsqueda de permisos"
                className="min-h-[36px] sm:min-h-[30px] flex-1 sm:flex-initial px-2.5 py-1 rounded-md text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-700/80 flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
              >
                <History size={15} className="text-brand-300 shrink-0" />
                <span>Historial</span>
                {user && permits.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-sm bg-brand-700 text-white text-[10px] font-bold tabular-nums">
                    {permits.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => openDirectory({ title: 'Directorio de Personal y Firmas' })}
                title="Gestionar directorio de personal y firmas guardadas"
                className="min-h-[36px] sm:min-h-[30px] flex-1 sm:flex-initial px-2.5 py-1 rounded-md text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-700/80 flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Users size={15} className="text-brand-300 shrink-0" />
                <span>Personal</span>
                {user && personnel.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-sm bg-slate-700 text-slate-200 text-[10px] font-bold tabular-nums">
                    {personnel.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSaveToHistory(false)}
                disabled={isSavingToHistory}
                title={user ? 'Guardar o actualizar este permiso en el historial' : 'Conectar cuenta y guardar en historial'}
                className="min-h-[36px] sm:min-h-[30px] flex-1 sm:flex-initial px-2.5 py-1 rounded-md text-xs font-medium text-emerald-300 hover:text-white hover:bg-emerald-700/70 flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60"
              >
                <BookmarkPlus size={15} className="shrink-0" />
                <span>{isSavingToHistory ? 'Guardando...' : 'Archivar'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2">
              {/* Indicador de Autoguardado */}
              <button
                type="button"
                onClick={handleManualSave}
                title="Autoguardado activo cada 30 segundos en este navegador. Haz clic para guardar inmediatamente."
                className={`min-h-[40px] sm:min-h-[34px] px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border whitespace-nowrap shrink-0 ${
                  isAutoSaving
                    ? 'bg-brand-950/90 border-brand-500 text-brand-200'
                    : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                {isAutoSaving ? (
                  <>
                    <CloudUpload size={14} className="text-brand-300 animate-pulse shrink-0" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    <span className="hidden md:inline text-slate-400">Guardado:</span>
                    <span className="text-slate-200 font-semibold tabular-nums">
                      {formatAutoSaveTime(lastAutoSaveTime)}
                    </span>
                    <Save size={12} className="text-slate-400 ml-0.5 shrink-0 hidden sm:inline" />
                  </>
                )}
              </button>

              {/* Acciones secundarias agrupadas: Vista Previa, Compartir, Imprimir */}
              <div className="flex items-center bg-slate-800/90 border border-slate-700 rounded-lg p-0.5 gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPreview(!isPreview)}
                  title={isPreview ? 'Salir de vista previa' : 'Vista previa del documento'}
                  className={`min-h-[36px] min-w-[40px] sm:min-h-[30px] sm:min-w-0 px-2.5 py-1 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                    isPreview
                      ? 'bg-brand-600 hover:bg-brand-500 text-white'
                      : 'text-slate-200 hover:text-white hover:bg-slate-700/80'
                  }`}
                >
                  {isPreview ? <EyeOff size={15} /> : <Eye size={15} />}
                  <span className="hidden sm:inline">{isPreview ? 'Salir' : 'Vista previa'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  title="Compartir enlace de la aplicación (el logo actual permanecerá fijado para quienes ingresen)"
                  className={`min-h-[36px] min-w-[40px] sm:min-h-[30px] sm:min-w-0 px-2.5 py-1 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                    copiedLinkFeedback
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'text-slate-200 hover:text-white hover:bg-slate-700/80'
                  }`}
                >
                  {copiedLinkFeedback ? <Check size={15} /> : <Share2 size={15} />}
                  <span className="hidden sm:inline">
                    {copiedLinkFeedback ? 'Copiado' : 'Compartir'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  title="Imprimir documento"
                  className="min-h-[36px] min-w-[40px] sm:min-h-[30px] sm:min-w-0 px-2.5 py-1 rounded-md text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-700/80 flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <Printer size={15} />
                  <span className="hidden sm:inline">Imprimir</span>
                </button>
              </div>

              {/* Menú "⋯" para seguridad y limpieza */}
              <div className="relative shrink-0" ref={headerMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsHeaderMenuOpen(prev => !prev)}
                  aria-expanded={isHeaderMenuOpen}
                  aria-haspopup="menu"
                  title="Más opciones y seguridad"
                  className={`min-h-[40px] min-w-[44px] sm:min-h-[34px] sm:min-w-[36px] px-2 rounded-lg border flex items-center justify-center transition-colors ${
                    isHeaderMenuOpen
                      ? 'bg-slate-700 border-slate-500 text-white'
                      : 'bg-slate-800/90 hover:bg-slate-700 border-slate-700 text-slate-200 hover:text-white'
                  }`}
                >
                  <MoreHorizontal size={18} />
                </button>

                {isHeaderMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-72 sm:w-80 rounded-xl bg-slate-900 border border-slate-700 shadow-xl py-1.5 z-50 text-xs max-h-[82vh] overflow-y-auto"
                  >
                    <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Archivo y Personal
                    </div>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsHeaderMenuOpen(false);
                        openHistory();
                      }}
                      className="w-full px-3.5 py-2.5 text-left text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 transition-colors min-h-[42px]"
                    >
                      <History size={15} className="text-brand-300 shrink-0" />
                      <span>Historial y búsqueda de permisos</span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsHeaderMenuOpen(false);
                        openDirectory({ title: 'Directorio de Personal y Firmas' });
                      }}
                      className="w-full px-3.5 py-2.5 text-left text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 transition-colors min-h-[42px]"
                    >
                      <Users size={15} className="text-brand-300 shrink-0" />
                      <span>Directorio de personal y firmas</span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsHeaderMenuOpen(false);
                        handleDuplicateCurrentPermit();
                      }}
                      className="w-full px-3.5 py-2.5 text-left text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 transition-colors min-h-[42px]"
                    >
                      <Copy size={15} className="text-emerald-400 shrink-0" />
                      <span>Duplicar permiso actual</span>
                    </button>

                    <div className="my-1.5 border-t border-slate-800" />

                    <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Empresa, Encabezado y Logo
                    </div>

                    <button
                      type="button"
                      role="menuitem"
                      aria-expanded={isHeaderConfigExpanded}
                      onClick={() => setIsHeaderConfigExpanded(prev => !prev)}
                      className="w-full px-3.5 py-2.5 text-left text-slate-200 hover:bg-slate-800 hover:text-white flex items-center justify-between gap-2 transition-colors min-h-[42px]"
                    >
                      <span className="flex items-center gap-2.5">
                        <Building2 size={15} className="text-brand-300 shrink-0" />
                        <span>Editar empresa, NIT y formato</span>
                      </span>
                      {isHeaderConfigExpanded ? (
                        <ChevronUp size={15} className="text-slate-400 shrink-0" />
                      ) : (
                        <ChevronDown size={15} className="text-slate-400 shrink-0" />
                      )}
                    </button>

                    {isHeaderConfigExpanded && (
                      <div className="mx-2 my-1.5 p-3 rounded-lg bg-slate-800/80 border border-slate-700 space-y-2.5">
                        <div>
                          <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-300 mb-1">
                            Nombre de la empresa
                          </label>
                          <input
                            type="text"
                            value={data.contractingCompany || data.companyName || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateData({ companyName: val, contractingCompany: val });
                              try { localStorage.setItem('sst_company_name', val); } catch {}
                            }}
                            placeholder="DCM Servicios & Consultoría"
                            className="w-full px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-600 focus:border-brand-400 outline-none text-xs text-white placeholder:text-slate-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-300 mb-1">
                            NIT de la empresa
                          </label>
                          <input
                            type="text"
                            value={data.companyNit ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateData({ companyNit: val });
                              try { localStorage.setItem('sst_company_nit', val); } catch {}
                            }}
                            placeholder="Ej: 900.123.456-7"
                            className="w-full px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-600 focus:border-brand-400 outline-none text-xs font-mono text-white placeholder:text-slate-500"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-1.5">
                          <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-300 mb-1">
                              Código
                            </label>
                            <input
                              type="text"
                              value={data.documentCode ?? ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateData({ documentCode: val });
                                try { localStorage.setItem('sst_doc_code', val); } catch {}
                              }}
                              placeholder="F-SST-045"
                              className="w-full px-2 py-1.5 rounded-md bg-slate-900 border border-slate-600 focus:border-brand-400 outline-none text-[11px] font-mono text-white placeholder:text-slate-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-300 mb-1">
                              Versión
                            </label>
                            <input
                              type="text"
                              value={data.documentVersion ?? ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateData({ documentVersion: val });
                                try { localStorage.setItem('sst_doc_version', val); } catch {}
                              }}
                              placeholder="01"
                              className="w-full px-2 py-1.5 rounded-md bg-slate-900 border border-slate-600 focus:border-brand-400 outline-none text-[11px] font-mono text-white placeholder:text-slate-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-300 mb-1">
                              Vigencia
                            </label>
                            <input
                              type="text"
                              value={data.documentValidity ?? ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateData({ documentValidity: val });
                                try { localStorage.setItem('sst_doc_validity', val); } catch {}
                              }}
                              placeholder="JUNIO 2021"
                              className="w-full px-2 py-1.5 rounded-md bg-slate-900 border border-slate-600 focus:border-brand-400 outline-none text-[11px] font-mono text-white placeholder:text-slate-500"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            handleSaveLogoAsTemplate();
                            setIsHeaderConfigExpanded(false);
                          }}
                          className="w-full py-1.5 px-2.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <BookmarkCheck size={14} className="shrink-0" />
                          <span>Guardar en plantilla</span>
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsHeaderMenuOpen(false);
                        logoFileInputRef.current?.click();
                      }}
                      className="w-full px-3.5 py-2.5 text-left text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 transition-colors min-h-[42px]"
                    >
                      <RefreshCw size={15} className="text-brand-300 shrink-0" />
                      <span>Cambiar logo</span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsHeaderMenuOpen(false);
                        handleSaveLogoAsTemplate();
                      }}
                      className="w-full px-3.5 py-2.5 text-left text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 transition-colors min-h-[42px]"
                    >
                      <BookmarkCheck size={15} className="text-emerald-400 shrink-0" />
                      <span>Guardar como plantilla</span>
                    </button>

                    {data.companyLogo !== DEFAULT_INVEASAS_LOGO && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setIsHeaderMenuOpen(false);
                          handleRestoreDefaultLogo();
                        }}
                        className="w-full px-3.5 py-2.5 text-left text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 transition-colors min-h-[42px]"
                      >
                        <RotateCcw size={15} className="text-brand-300 shrink-0" />
                        <span>Restaurar logo oficial</span>
                      </button>
                    )}

                    {Boolean(data.companyLogo) && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setIsHeaderMenuOpen(false);
                          handleRemoveLogo();
                        }}
                        className="w-full px-3.5 py-2.5 text-left text-red-400 hover:bg-red-950/60 hover:text-red-300 flex items-center gap-2.5 transition-colors min-h-[42px]"
                      >
                        <Trash2 size={15} className="shrink-0" />
                        <span>Quitar logo</span>
                      </button>
                    )}

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsHeaderMenuOpen(false);
                        handleRestoreFactoryDefaults();
                      }}
                      className="w-full px-3.5 py-2.5 text-left text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 transition-colors min-h-[42px]"
                    >
                      <RotateCcw size={15} className="text-slate-400 shrink-0" />
                      <span>Restablecer predeterminado</span>
                    </button>

                    <div className="my-1.5 border-t border-slate-800" />

                    <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Seguridad y Cuenta
                    </div>

                    {user ? (
                      <div className="px-3 py-2.5 flex items-center justify-between gap-2 bg-slate-800/60 mx-2 my-1.5 rounded-lg border border-slate-700/80">
                        <div className="min-w-0">
                          <div className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wide">
                            Conectado
                          </div>
                          <div className="text-[11px] text-slate-200 truncate" title={user.email || ''}>
                            {user.email || user.displayName || 'Usuario Firebase'}
                          </div>
                        </div>
                        <button
                          type="button"
                          role="menuitem"
                          aria-label="Cerrar sesión"
                          title="Cerrar sesión"
                          onClick={async (e) => {
                            e.stopPropagation();
                            setIsHeaderMenuOpen(false);
                            lockApp();
                            await signOutGoogle();
                          }}
                          className="min-w-[36px] min-h-[36px] p-2 rounded-lg bg-red-950/50 border border-red-800/60 text-red-300 hover:bg-red-600 hover:text-white hover:border-red-500 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                        >
                          <LogOut size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setIsHeaderMenuOpen(false);
                          openAuthModal();
                        }}
                        className="w-full px-3.5 py-2.5 text-left text-emerald-300 hover:bg-slate-800 hover:text-emerald-200 flex items-center gap-2.5 transition-colors min-h-[42px]"
                      >
                        <LogIn size={15} className="shrink-0" />
                        <span>Iniciar sesión en la nube</span>
                      </button>
                    )}
                  </div>
                )}

                <input
                  ref={logoFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  aria-label="Seleccionar archivo de logo"
                />
              </div>
            </div>

            {/* Botón discreto de instalación PWA (solo visible si el navegador dispara beforeinstallprompt) */}
            {installPromptEvent && (
              <button
                type="button"
                onClick={handleInstallApp}
                title="Instalar aplicación en este dispositivo"
                className="print:hidden min-h-[38px] sm:min-h-[34px] px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-600 flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Smartphone size={14} className="text-brand-300 shrink-0" />
                <span>Instalar app</span>
              </button>
            )}

            {/* Acción principal clara: Descargar PDF */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf}
              title="Descargar documento oficial en formato Carta de alta resolución listo para presentar o imprimir"
              className={`min-h-[44px] sm:min-h-[34px] px-4 py-2 sm:py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors text-white shadow-sm whitespace-nowrap shrink-0 ${
                isGeneratingPdf
                  ? 'bg-brand-500 cursor-wait'
                  : 'bg-brand-600 hover:bg-brand-500 active:bg-brand-700'
              }`}
            >
              <Download size={15} className={isGeneratingPdf ? 'animate-bounce shrink-0' : 'shrink-0'} />
              <span>{isGeneratingPdf ? 'Generando PDF...' : 'Descargar PDF'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Banner de confirmación o advertencia */}
      {logoFeedback && (
        <div
          className={`w-full border-b px-3 sm:px-4 py-2 flex items-center justify-between text-xs shadow-xs print:hidden ${
            feedbackTone === 'warning'
              ? 'bg-amber-950/95 border-amber-700/80 text-amber-100'
              : 'bg-emerald-950/95 border-emerald-700/80 text-emerald-100'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackTone === 'warning' ? (
              <AlertTriangle size={16} className="text-amber-400 shrink-0" />
            ) : (
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            )}
            <span className="font-medium">{logoFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setLogoFeedback(null)}
            className={`p-0.5 rounded ${
              feedbackTone === 'warning'
                ? 'text-amber-300 hover:text-white'
                : 'text-emerald-300 hover:text-white'
            }`}
            aria-label="Cerrar notificación"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Banner de Borrador Restaurado automáticamente tras recarga */}
      {restoredDraftNotice.visible && !isPreview && (
        <div className="w-full bg-emerald-950/90 border-b border-emerald-700/80 text-emerald-100 px-3 sm:px-4 py-2 flex items-center justify-between text-xs shadow-xs print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>
              <strong>Borrador restaurado:</strong> Se han recuperado tus datos guardados automáticamente {restoredDraftNotice.time ? `(${restoredDraftNotice.time})` : ''}. No perdiste ningún avance tras la recarga.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setRestoredDraftNotice({ visible: false, time: null })}
              className="px-2.5 py-0.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[11px] font-semibold transition-colors"
            >
              Entendido
            </button>
            <button
              type="button"
              onClick={() => {
                setRestoredDraftNotice({ visible: false, time: null });
                handleReset();
              }}
              className="text-[11px] text-emerald-300 hover:text-white underline ml-1"
              title="Borrar borrador y volver al formulario vacío"
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      {/* Notice Banner */}
      {isPreview && !isGeneratingPdf && (
        <div className="w-full bg-brand-700 text-white font-semibold text-center text-xs py-1.5 shadow print:hidden">
          MODO VISTA PREVIA ACTIVO — Visualización unificada del formato oficial para auditoría SG-SST (Res. 4272/2021).
        </div>
      )}

      {/* Main Document Layout */}
      <main className="w-full max-w-5xl py-2 sm:py-6 px-1.5 sm:px-4 print:p-0 print:m-0">
        <div 
          ref={formRef}
          className="w-full bg-white print:bg-white flex flex-col gap-6 print:gap-0"
        >
          {/* ===================== FORMATO UNIFICADO CONTINUO (CERO ESPACIOS EN BLANCO) ===================== */}
          {layoutMode === 'unified' && (
            <section id="pdf-page-unified" className="pdf-page pdf-page-unified bg-white p-4 sm:p-5 print:p-0 shadow-lg print:shadow-none border border-gray-200 print:border-none flex flex-col gap-1.5">
              <Header data={data} updateData={updateData} pageNum={1} totalPages={1} isUnified={true} onNotify={showLogoFeedback} />
              <GeneralInfo data={data} updateData={updateData} />
              <WorkersSection data={data} updateData={updateData} />
              <HealthSection data={data} updateData={updateData} />
              <PPESection data={data} updateData={updateData} />
              <AccessSystemsSection data={data} updateData={updateData} />
              <SignaturesSection 
                data={data} 
                updateData={updateData} 
                onDownloadPDF={handleDownloadPDF} 
                isGeneratingPdf={isGeneratingPdf} 
              />
              <DocumentFooter pageNum={1} totalPages={1} isUnified={true} />
            </section>
          )}

          {/* ===================== FORMATO 2 PÁGINAS CARTA ===================== */}
          {layoutMode === '2-pages' && (
            <>
              {/* Página 1 de 2: Encabezado Oficial, Info General, Trabajadores Autorizados y Aptitud Psicofísica */}
              <section id="pdf-page-1" className="pdf-page bg-white p-4 sm:p-5 print:p-0 shadow-lg print:shadow-none border border-gray-200 print:border-none flex flex-col gap-1.5">
                <Header data={data} updateData={updateData} pageNum={1} totalPages={2} onNotify={showLogoFeedback} />
                <GeneralInfo data={data} updateData={updateData} />
                <WorkersSection data={data} updateData={updateData} />
                <HealthSection data={data} updateData={updateData} />
                <DocumentFooter pageNum={1} totalPages={2} />
              </section>

              {/* Página 2 de 2: Encabezado Continuidad, EPP, Sistemas Acceso, Firmas Autorizadas y Cierre del Permiso */}
              <section id="pdf-page-2" className="pdf-page bg-white p-4 sm:p-5 print:p-0 shadow-lg print:shadow-none border border-gray-200 print:border-none flex flex-col gap-1.5">
                <ContinuityHeader data={data} pageNum={2} totalPages={2} />
                <PPESection data={data} updateData={updateData} />
                <AccessSystemsSection data={data} updateData={updateData} />
                <SignaturesSection 
                  data={data} 
                  updateData={updateData} 
                  onDownloadPDF={handleDownloadPDF} 
                  isGeneratingPdf={isGeneratingPdf} 
                />
                <DocumentFooter pageNum={2} totalPages={2} />
              </section>
            </>
          )}

          {/* ===================== FORMATO EXTENDIDO (3 PÁGINAS) ===================== */}
          {layoutMode === '3-pages' && (
            <>
              {/* Página 1 de 3: Encabezado, Info General y Registro Completo de Trabajadores */}
              <section id="pdf-page-1" className="pdf-page bg-white p-4 sm:p-5 print:p-0 shadow-lg print:shadow-none border border-gray-200 print:border-none flex flex-col gap-1.5">
                <Header data={data} updateData={updateData} pageNum={1} totalPages={3} onNotify={showLogoFeedback} />
                <GeneralInfo data={data} updateData={updateData} />
                <WorkersSection data={data} updateData={updateData} />
                <DocumentFooter pageNum={1} totalPages={3} />
              </section>

              {/* Página 2 de 3: Aptitud Psicofísica (Salud) y Elementos de Protección Personal (EPP) */}
              <section id="pdf-page-2" className="pdf-page bg-white p-4 sm:p-5 print:p-0 shadow-lg print:shadow-none border border-gray-200 print:border-none flex flex-col gap-1.5">
                <ContinuityHeader data={data} pageNum={2} totalPages={3} />
                <HealthSection data={data} updateData={updateData} />
                <PPESection data={data} updateData={updateData} />
                <DocumentFooter pageNum={2} totalPages={3} />
              </section>

              {/* Página 3 de 3: Sistemas de Acceso, Firmas, Revalidación y Cierre Legal */}
              <section id="pdf-page-3" className="pdf-page bg-white p-4 sm:p-5 print:p-0 shadow-lg print:shadow-none border border-gray-200 print:border-none flex flex-col gap-1.5">
                <ContinuityHeader data={data} pageNum={3} totalPages={3} />
                <AccessSystemsSection data={data} updateData={updateData} />
                <SignaturesSection 
                  data={data} 
                  updateData={updateData} 
                  onDownloadPDF={handleDownloadPDF} 
                  isGeneratingPdf={isGeneratingPdf} 
                />
                <DocumentFooter pageNum={3} totalPages={3} />
              </section>
            </>
          )}
        </div>
      </main>

      {/* Alerta de Validación de Firmas Requeridas antes de Generar PDF */}
      {signatureAlert.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 print:hidden animate-fade-in">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden border border-red-300">
            <div className="bg-red-700 text-white p-3 font-bold flex justify-between items-center">
              <span className="flex items-center gap-2 text-sm sm:text-base">
                <AlertTriangle size={18} /> Requisito Legal de Firmas SG-SST
              </span>
              <button 
                type="button" 
                onClick={() => setSignatureAlert({ isOpen: false, messages: [] })} 
                className="hover:bg-red-800 p-1 rounded"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 text-slate-800 flex flex-col gap-3">
              <p className="text-xs text-slate-700 leading-relaxed">
                Según la <strong>Resolución 4272 de 2021</strong>, para generar y descargar el documento PDF oficial es indispensable que el <strong>Responsable del SST</strong> y el <strong>Trabajador Autorizado</strong> hayan estampado su firma digital (canvas no vacío).
              </p>
              <div className="p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-900">
                <strong>Firmas pendientes de registrar:</strong>
                <ul className="list-disc list-inside mt-1.5 space-y-1">
                  {signatureAlert.messages.map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              </div>
              <p className="text-[11px] text-slate-500">
                Hemos ubicado la pantalla en la sección de firmas para que pueda registrar los trazos requeridos.
              </p>
            </div>
            <div className="bg-slate-100 p-3 flex justify-end gap-2 border-t border-slate-200">
              <button 
                type="button" 
                onClick={() => {
                  setSignatureAlert({ isOpen: false, messages: [] });
                  const sigElement = document.getElementById('signatures-section');
                  if (sigElement) {
                    sigElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }} 
                className="px-4 py-1.5 text-xs font-semibold bg-brand-700 hover:bg-brand-800 text-white rounded cursor-pointer"
              >
                Entendido, Ir a Firmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Security Code Modification Modal */}
      <SecurityModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
      />

      {/* Historial de Permisos y Directorio de Personal */}
      <PermitHistoryModal
        currentData={data}
        onLoadPermit={handleLoadFromHistory}
        onDuplicatePermit={handleApplyDuplicatedPermit}
        onNotify={showLogoFeedback}
      />
      <PersonnelDirectoryModal onNotify={showLogoFeedback} />
      <AuthModal />

      {/* Modal de Progreso para Generación de PDF (Garantiza experiencia limpia en celulares) */}
      {isGeneratingPdf && (
        <div 
          className="fixed inset-0 z-[99999] bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center select-none"
          role="status"
          aria-live="polite"
        >
          <div className="bg-white rounded-xl shadow-2xl p-6 sm:p-7 max-w-sm w-full flex flex-col items-center border border-slate-200">
            <div className="w-14 h-14 rounded-full bg-brand-50 border-2 border-brand-600 flex items-center justify-center text-brand-700 mb-3 animate-pulse">
              <Download size={26} className="animate-bounce" />
            </div>
            <h3 className="text-base font-black text-slate-900 mb-1">
              Generando PDF Oficial
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Alineando márgenes uniformes (6 mm), tablas y firmas en alta resolución (2x) conforme a la <strong>Resolución 4272/2021</strong>.
            </p>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-2">
              <div className="bg-brand-600 h-2 rounded-full animate-pulse w-full" />
            </div>
            <span className="text-[11px] font-semibold text-brand-700">
              Listo para cualquier celular o computadora...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

