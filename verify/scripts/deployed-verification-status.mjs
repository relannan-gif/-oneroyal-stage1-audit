/**
 * What a deployed-previews verification may call itself (REV-GT-7), kept out
 * of verify-deployed-previews.mjs so the verifier suite can drive it.
 *
 * A run that fetched the previews but compared neither the revision they
 * name with the declared final revision nor their bytes with the local
 * builds proved only that the host answers. That is not "passed": it is
 * "incomplete", and it exits non-zero like any other result short of a pass.
 *
 *   failed      a check failed                                      → exit 1
 *   blocked     a host could not be reached at some stage           → exit 3
 *   incomplete  nothing failed or blocked, but a comparison the
 *               verification exists for was not asked for           → exit 4
 *   passed      every check passed and every comparison was made    → exit 0
 */

/** The comparisons a verification must make to be able to pass. */
export function missingComparisons({ expectRevision, localBuild }) {
  const missing = [];
  if (!expectRevision) missing.push('--expect-revision');
  if (!localBuild?.shipping) missing.push('--local-shipping');
  if (!localBuild?.qa) missing.push('--local-qa');
  return missing;
}

export const EXIT_CODES = Object.freeze({ passed: 0, failed: 1, blocked: 3, incomplete: 4 });

/** The run's status from its failed/blocked counts and its missing comparisons. */
export function verificationStatus({ failed, blocked, missing }) {
  if (failed > 0) return 'failed';
  if (blocked > 0) return 'blocked';
  if (missing.length > 0) return 'incomplete';
  return 'passed';
}
