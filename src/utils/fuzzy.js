/**
 * Lightweight fuzzy matching utilities (no external dependencies).
 *
 * The matcher is a case-insensitive subsequence matcher: every character of
 * the query must appear in the target in order, but not necessarily
 * contiguously (e.g. "sen" matches "Сеня", "abc" matches "aXbYc").
 * A score is returned so results can be ranked — contiguous and
 * start-of-word matches score higher.
 */

const normalize = (str) => (str || '').toString().toLowerCase().trim();

/**
 * Returns a match score for `query` against `target`, or -1 if there is no
 * fuzzy match. Higher score means a better match.
 */
export const fuzzyScore = (query, target) => {
  const q = normalize(query);
  const t = normalize(target);

  if (q.length === 0) return 0;
  if (t.length === 0) return -1;

  // Exact substring is always the strongest match.
  const substrIndex = t.indexOf(q);
  if (substrIndex !== -1) {
    // Prefer matches closer to the beginning of the target.
    return 1000 - substrIndex;
  }

  let score = 0;
  let qi = 0;
  let prevMatchIndex = -1;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      // Reward consecutive matches.
      if (prevMatchIndex === ti - 1) {
        score += 5;
      } else {
        score += 1;
      }
      // Reward matches at the start of a word.
      if (ti === 0 || t[ti - 1] === ' ' || t[ti - 1] === '/') {
        score += 3;
      }
      prevMatchIndex = ti;
      qi++;
    }
  }

  // All query characters must be consumed for a valid match.
  return qi === q.length ? score : -1;
};

/**
 * Convenience boolean matcher.
 */
export const fuzzyMatch = (query, target) => fuzzyScore(query, target) >= 0;
