/**
 * Which revision a journey runner is. In the repository this is git: the
 * commit and the last commit that touched the evidence scope.
 *
 * The live previews can only be reached from a machine outside this sandbox
 * (a GitHub Actions runner in the public site repository), which has the
 * runner scripts but not the private app repository. There the runner is
 * given JOURNEYS_DECLARED_REVISION and records the sha256 of every script it
 * ran, so the claim is checkable: journey-evidence.mjs accepts a declared
 * revision only when each recorded file hashes to the same bytes as that file
 * at that revision in the app repository.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';

export const EVIDENCE_SCOPE = [
  'apps',
  'packages',
  'scripts',
  'package.json',
  'pnpm-workspace.yaml',
  'pnpm-lock.yaml',
  'turbo.json',
  'tsconfig.base.json',
];

/** @param root repository root of the runner; @param files absolute paths of the runner's own code */
export function runnerRevision(root, files) {
  const declared = process.env.JOURNEYS_DECLARED_REVISION;
  if (declared) {
    return {
      commit: null,
      sourceRevision: declared,
      revisionDeclaration: {
        where: process.env.JOURNEYS_DECLARED_WHERE ?? null,
        files: files.map((file) => ({
          path: relative(root, file),
          sha256: createHash('sha256').update(readFileSync(file)).digest('hex'),
        })),
      },
    };
  }
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  return {
    commit: git('rev-parse', 'HEAD'),
    sourceRevision: git('log', '-1', '--format=%H', '--', ...EVIDENCE_SCOPE),
    revisionDeclaration: null,
  };
}
