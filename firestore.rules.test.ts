/**
 * Security Rules Verification Suite (Phase 0 TDD Specification)
 * Verifies the "Dirty Dozen" adversarial payloads against Firestore rules invariants.
 */

export interface TestCase {
  name: string;
  collection: 'permits' | 'personnel';
  operation: 'create' | 'update' | 'get' | 'list' | 'delete';
  expected: 'PERMISSION_DENIED';
  description: string;
}

export const DIRTY_DOZEN_TESTS: TestCase[] = [
  {
    name: '01_unauthenticated_create',
    collection: 'permits',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    description: 'Reject permit creation when request.auth is null'
  },
  {
    name: '02_unverified_email_create',
    collection: 'personnel',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    description: 'Reject write when email_verified is false'
  },
  {
    name: '03_owner_spoofing_create',
    collection: 'permits',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    description: 'Reject document when ownerId != request.auth.uid'
  },
  {
    name: '04_unscoped_list_query',
    collection: 'permits',
    operation: 'list',
    expected: 'PERMISSION_DENIED',
    description: 'Reject list query missing ownerId == request.auth.uid constraint'
  },
  {
    name: '05_owner_hijack_update',
    collection: 'personnel',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    description: 'Reject update attempting to mutate ownerId or createdAt'
  },
  {
    name: '06_ghost_field_injection',
    collection: 'permits',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    description: 'Reject payload containing undeclared shadow field (e.g. adminOverride)'
  },
  {
    name: '07_forged_timestamp',
    collection: 'personnel',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    description: 'Reject payload where createdAt/updatedAt !== request.time'
  },
  {
    name: '08_invalid_doc_id',
    collection: 'permits',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    description: 'Reject document IDs failing ^[a-zA-Z0-9_-]+$ or > 128 chars'
  },
  {
    name: '09_closed_permit_mutation',
    collection: 'permits',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    description: 'Reject updates to permits in terminal cerrado status'
  },
  {
    name: '10_invalid_enum',
    collection: 'personnel',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    description: 'Reject docType/category/status outside allowed enum values'
  },
  {
    name: '11_oversized_payload',
    collection: 'personnel',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    description: 'Reject signature > 250000 bytes or workers list > 30 items'
  },
  {
    name: '12_type_confusion',
    collection: 'permits',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    description: 'Reject non-map permitData or invalid boolean/list element types'
  }
];
