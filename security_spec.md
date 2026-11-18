# Security Specification — Permiso de Trabajo en Alturas

## 1. Data Invariants
1. **Identity Isolation (`ownerId`)**: Every document in `/permits/{permitId}` and `/personnel/{personId}` belongs strictly to the verified authenticated user (`request.auth.uid == resource.data.ownerId`). No cross-user reads, list queries, updates, or deletes are permitted.
2. **Email Verification Mandate**: All mutations (`create`, `update`, `delete`) require `request.auth != null` AND `request.auth.token.email_verified == true`.
3. **Immutable Ownership & Creation Timestamp**: `ownerId` and `createdAt` can never be altered after creation.
4. **Server-Side Temporal Integrity**: `createdAt` (on create) and `updatedAt` (on create and update) must equal `request.time`.
5. **Terminal State Locking**: Once a permit reaches `status == 'cerrado'`, it becomes immutable to client updates (users duplicate it into a new permit instead of mutating closed audit records).
6. **Strict Schema & Bounds**: Unknown/ghost keys are rejected via `hasAll` + `hasOnly` on create and `affectedKeys().hasOnly(...)` on update; all strings enforce explicit `.size()` limits; document IDs match `^[a-zA-Z0-9_-]+$` (`<= 128` chars).

## 2. The "Dirty Dozen" Payloads (Expected: `PERMISSION_DENIED`)
1. **Unauthenticated Read/Write**: Any operation on `/permits/*` or `/personnel/*` with `auth == null`.
2. **Unverified Email Write**: Creating a permit or person when `request.auth.token.email_verified == false`.
3. **Cross-Tenant Ownership Spoof**: Creating a document with `ownerId: "victim-uid"` instead of `request.auth.uid`.
4. **Cross-Tenant Read/List**: Querying `/permits` without `where("ownerId", "==", auth.uid)` or reading another user's `/personnel/{id}`.
5. **Owner Hijack on Update**: Updating `ownerId` on an existing document to another UID.
6. **Ghost Field Injection (Shadow Update)**: Sending `isVerified: true` or `adminOverride: true` alongside valid fields on create or update.
7. **Client Timestamp Forgery**: Sending `createdAt: new Date("2020-01-01")` instead of `request.time`.
8. **Invalid Document ID Injection**: Writing to `/permits/bad$id..1500chars` failing `^[a-zA-Z0-9_-]+$`.
9. **Terminal State Mutation**: Updating any field on a permit whose existing `status == "cerrado"`.
10. **Invalid Enum Value**: Setting `status: "hacked"` or `category: "superadmin"` or `docType: "XYZ"`.
11. **Oversized Payload / Denial of Wallet**: Sending a 500KB `activityDescription` or `signature` exceeding `.size()` limits, or `workers` array with `> 30` elements.
12. **Type Confusion**: Sending `permitData: "json-string"` (non-map) or `em: "true"` (string instead of boolean) or `workers[0]: "bad"` (non-map element).
