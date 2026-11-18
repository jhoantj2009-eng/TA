import { DEFAULT_INVEASAS_LOGO, DEFAULT_DOC_CONFIG } from './defaultLogo';

export interface WorkerHealth {
  hallucinogens: 'SI' | 'NO' | 'N/A' | '';
  medication: 'SI' | 'NO' | 'N/A' | '';
  epilepsy: 'SI' | 'NO' | 'N/A' | '';
  acrophobia: 'SI' | 'NO' | 'N/A' | '';
  pregnancy: 'SI' | 'NO' | 'N/A' | '';
}

export interface WorkerInfo {
  id: string;
  name: string;
  docType: string;
  docNumber: string;
  em: boolean; // Exámen médico
  ss: boolean; // Seguridad social
  ca: boolean; // Certificado de alturas
  pa: boolean; // Punto de Anclaje
  signature: string; // Base64 image
  health: WorkerHealth;
}

export interface SignatureData {
  name: string;
  docNumber: string;
  role?: string;
  date?: string;
  signature: string; // Base64
}

export interface ClosureData {
  closingTime: string;
  deliveryName: string;
  deliverySig: string;
  receivedName: string;
  receivedSig: string;
}

export interface PermitData {
  // General Info
  companyName: string;
  companyNit?: string;
  contractingCompany: string; // Empresa Contratante (Res. 4272/2021)
  contractorCompany: string; // Empresa Contratista / Ejecutora (Res. 4272/2021)
  location: string;
  permitNumber: string;
  companyLogo: string;
  documentCode: string;
  documentVersion: string;
  documentValidity: string;
  date: string;
  validUntil: string;
  workType: string;
  workHeight: string;
  startTime: string;
  endTime: string;

  // Workers
  workers: WorkerInfo[];
  safetyHelper: {
    required: 'SI' | 'N.A' | '';
    name: string;
    signature: string;
  };

  // Activity
  activityDescription: string;

  // Health
  health: {
    observations: string;
  };

  // PPE & Safety
  ppe: {
    fallProtection: Record<string, 'SI' | 'N/A' | ''>;
    fallProtectionOtrosText: string;
    personal: Record<string, 'SI' | 'N/A' | ''>;
    personalOtrosText: string;
    collective: Record<string, 'SI' | 'N/A' | ''>;
    collectiveOtrosText: string;
    tools: { name: string; qty: string }[];
  };

  // Access Systems
  accessSystems: {
    stairs: {
      used: 'SI' | 'NO' | '';
      model: string;
      brand: string;
      capacity: string;
      type: string;
      checklist: Record<string, 'SI' | 'NO' | 'N.A' | ''>;
      isApt: 'Si' | 'No' | '';
    };
    scaffolding: {
      used: 'SI' | 'NO' | '';
      checklist: Record<string, 'SI' | 'NO' | 'N.A' | ''>;
      isApt: 'Si' | 'No' | '';
    };
    suspendedScaffold?: {
      used: 'SI' | 'NO' | '';
      checklist: Record<string, 'SI' | 'NO' | 'N.A' | ''>;
      isApt: 'Si' | 'No' | '';
    };
    pretales: {
      used: 'SI' | 'NO' | '';
      checklist: Record<string, 'SI' | 'NO' | 'N.A' | ''>;
      isApt: 'Si' | 'No' | '';
    };
    ropes: {
      used: 'SI' | 'NO' | '';
      checklist: Record<string, 'SI' | 'NO' | 'N.A' | ''>;
      isApt: 'Si' | 'No' | '';
    };
    platform: {
      used: 'SI' | 'NO' | '';
      model: string;
      brand: string;
      capacity: string;
      type: string;
      checklist: Record<string, 'SI' | 'NO' | 'N.A' | ''>;
      isApt: 'Si' | 'No' | '';
    };
    fixedStructure: {
      used: 'SI' | 'NO' | '';
    };
  };

  observations: string;

  // Signatures & Approvals
  emergencyActivator: SignatureData;
  authorizer: SignatureData;
  coordinator: SignatureData;
  
  // Revalidation
  revalidation: {
    suspensionTime: string;
    suspensionReason: string;
    resumeTime: string;
    cancelTime: string;
    cancelReason: string;
  };

  // Closure
  closure: ClosureData;
}

export type PersonnelCategory =
  | 'worker'
  | 'coordinator'
  | 'authorizer'
  | 'emergencyActivator'
  | 'safetyHelper'
  | 'general';

export type PersonnelDocType = 'CC' | 'CE' | 'TI' | 'PAS' | 'PEP';

export interface PersonnelRecord {
  id: string;
  ownerId: string;
  name: string;
  docType: PersonnelDocType;
  docNumber: string;
  category: PersonnelCategory;
  role: string;
  em: boolean;
  ss: boolean;
  ca: boolean;
  pa: boolean;
  signature: string;
  notes: string;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export type PermitStatus = 'borrador' | 'activo' | 'cerrado';

export interface PermitHistoryRecord {
  id: string;
  ownerId: string;
  permitNumber: string;
  date: string;
  validUntil: string;
  location: string;
  workType: string;
  workHeight: string;
  contractingCompany: string;
  contractorCompany: string;
  activityDescription: string;
  workerSummary: string;
  status: PermitStatus;
  permitData: PermitData;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export const initialPermitData: PermitData = {
  companyName: 'DCM Servicios & Consultoría',
  companyNit: '',
  contractingCompany: 'DCM Servicios & Consultoría',
  contractorCompany: '',
  location: 'Bodega Central / Área de Operaciones',
  permitNumber: '001',
  companyLogo: DEFAULT_INVEASAS_LOGO,
  documentCode: DEFAULT_DOC_CONFIG.code,
  documentVersion: DEFAULT_DOC_CONFIG.version,
  documentValidity: DEFAULT_DOC_CONFIG.validity,
  date: '',
  validUntil: '',
  workType: '',
  workHeight: '',
  startTime: '',
  endTime: '',
  workers: [
    { id: '1', name: '', docType: '', docNumber: '', em: false, ss: false, ca: false, pa: false, signature: '', health: { hallucinogens: '', medication: '', epilepsy: '', acrophobia: '', pregnancy: '' } }
  ],
  safetyHelper: { required: '', name: '', signature: '' },
  activityDescription: '',
  health: { observations: '' },
  ppe: {
    fallProtection: {}, fallProtectionOtrosText: '', 
    personal: {}, personalOtrosText: '',
    collective: {}, collectiveOtrosText: '',
    tools: [{ name: '', qty: '' }]
  },
  accessSystems: {
    stairs: { used: '', model: '', brand: '', capacity: '', type: '', checklist: {}, isApt: '' },
    scaffolding: { used: '', checklist: {}, isApt: '' },
    suspendedScaffold: { used: '', checklist: {}, isApt: '' },
    pretales: { used: '', checklist: {}, isApt: '' },
    ropes: { used: '', checklist: {}, isApt: '' },
    platform: { used: '', model: '', brand: '', capacity: '', type: '', checklist: {}, isApt: '' },
    fixedStructure: { used: '' }
  },
  observations: '',
  emergencyActivator: { name: '', docNumber: '', signature: '' },
  authorizer: { name: '', docNumber: '', role: '', signature: '' },
  coordinator: { name: '', docNumber: '', date: '', signature: '' },
  revalidation: { suspensionTime: '', suspensionReason: '', resumeTime: '', cancelTime: '', cancelReason: '' },
  closure: { closingTime: '', deliveryName: '', deliverySig: '', receivedName: '', receivedSig: '' }
};
