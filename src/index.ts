/**
 * Public surface of the core engine.
 *
 * The pipeline is `collect → rules → judge → decide → act`, with `render`
 * turning a verdict into Markdown and a label set. Each stage is a pure
 * function of the previous one, with exactly two exceptions:
 *
 *   - `collect` is the only stage that reads I/O.
 *   - `act` is the only stage that writes.
 *
 * That boundary is asserted by `tests/architecture.test.ts`, which fails the
 * build if an I/O import appears in a pure stage.
 *
 * `decide` has no directory yet — PR-010 scaffolds the five stages named in its
 * acceptance criteria and nothing else.
 */

export * from './types.js';

export * as collect from './collect/index.js';
export * as rules from './rules/index.js';
export * as judge from './judge/index.js';
export * as render from './render/index.js';
export * as act from './act/index.js';
export * as cli from './cli/index.js';
