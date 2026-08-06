/**
 * Stage 3 — judge (Phase 3+, and only sometimes).
 *
 * Advisory only. Fires on a *transition* into `READY_FOR_REVIEW`, never on
 * every sweep. Output can only advise: it cannot set a status, block, or merge.
 *
 * Model access sits behind a provider-agnostic interface and is deferred to
 * Phase 3. Diff content is untrusted input.
 *
 * Not implemented here — Phase 3 tickets.
 */

export {};
