# Simulide App (Frontend)

## Overview

Simulide App is the React-based frontend for a real-time collaborative
text editor built on **Operational Transformation (OT)**.

The frontend is responsible for:
- Providing a low-latency editing experience
- Translating user intent into deterministic text operations
- Maintaining a consistent local document model
- Synchronizing state with the backend via HTTP + SignalR

The system is designed to feel *local-first* while converging on a
single authoritative document state managed by the backend.

---

## Architectural Goals

1. **Immediate User Feedback**
    - Local edits must apply instantly without waiting on the network.

2. **Deterministic Convergence**
    - All clients must eventually converge on the same document state.

3. **Clear Authority Boundaries**
    - Backend owns truth.
    - Frontend owns responsiveness.

4. **Scale-Ready Collaboration**
    - No assumptions that a single backend instance exists.

---

## System Responsibilities

### What the Frontend Owns

- Rendering and editing UX
- Local document state
- Pending (optimistic) operations
- OT transformation of remote operations
- Session participation (join / leave)
- Cursor and presence projection (future)

### What the Frontend Does *Not* Own

- Authoritative document content
- Version sequencing
- Conflict resolution policy
- Persistence
- Global ordering of operations

---

## Document Lifecycle

1. **Bootstrap**
    - Fetch document content + version via HTTP.
    - Initialize local document state.

2. **Join Collaboration Session**
    - Connect to SignalR hub.
    - Join document-specific session.

3. **Local Editing Loop**
    - User edit → create operation.
    - Apply operation locally (optimistic).
    - Queue operation as pending.
    - Send operation to backend.

4. **Synchronization**
    - Receive remote operations.
    - Transform against pending operations.
    - Apply transformed result.
    - Process acknowledgements.

---

## Operation Model

All collaboration is expressed through a single operation contract:

- `id`
- `documentId`
- `type` (`insert` | `delete`)
- `position`
- `content` (insert only)
- `length` (delete only)
- `version` (document version the op was based on)

This model is intentionally shared with the backend to ensure
deterministic behavior across the system.

---

## Local-First Editing Strategy

The editor follows a **local-first, optimistic update model**:

- Local operations apply immediately.
- Network latency is hidden.
- Backend responses reconcile correctness.

This requires:
- A pending operation queue
- Transforming remote operations against local pending state
- Removing pending operations only after server acknowledgement

This is the core correctness boundary of the frontend.

---

## Versioning and Recovery

Each operation is versioned.

If the backend rejects an operation due to version mismatch:
- The frontend must treat the local state as potentially invalid.
- Recovery may include:
    - Re-fetching the document
    - Clearing pending operations
    - Replaying local intent (future improvement)

The system prefers **correctness over silent divergence**.

---

## State Management Principles

- A **single source of truth** for document state must exist.
- UI components render from state, they do not own it.
- Collaboration logic must never depend on UI-only state.

This avoids race conditions between rendering, editing,
and synchronization layers.

---

## Syntax Highlighting (Planned)

Syntax highlighting will be implemented as a **pure projection**
on top of the document text.

Important constraints:
- Highlighting must never mutate document content.
- Text remains the authoritative model.
- Highlighting derives from text + metadata only.

This keeps OT logic isolated from presentation concerns.

---

## Scaling & Presence (Planned)

As the system scales:
- Multiple frontend instances will exist.
- Presence and cursor state will be ephemeral.

Future Redis-backed coordination will support:
- Active user tracking
- Cursor positions
- Session membership
- Fanout coordination

None of this state will be written to the primary database.

---

## Observability Expectations

To support debugging and correctness verification:
- Operation lifecycle should be traceable
- Version transitions should be logged
- Rejections and transforms should be observable

Collaborative systems fail silently without strong observability.

---

## Non-Goals

- Offline-first editing (for now)
- Rich text semantics (currently plain text)
- Peer-to-peer synchronization

---

## Summary

Simulide App is designed as a **deterministic, local-first client**
that prioritizes responsiveness while deferring correctness
and authority to the backend.

Its architecture intentionally mirrors backend contracts to ensure
long-term maintainability as collaboration complexity increases.
