import { Category, CategoryScope } from '../api/types';

/**
 * Filters the shared category list down to the ones relevant for a given
 * area and ensures no duplicates exist by ID or normalized name.
 * A category scoped to 'both' (or with no scope set) shows up everywhere;
 * one scoped to 'post' or 'market' only shows up there.
 * The synthetic 'all' entry always passes through and stays first.
 */
export function categoriesForScope(categories: Category[], scope: Exclude<CategoryScope, 'both'>): Category[] {
  const filtered = categories.filter((c) => {
    if (c.id === 'all') return true;
    const catScope = c.scope || 'both';
    return catScope === 'both' || catScope === scope;
  });

  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const deduped: Category[] = [];

  for (const c of filtered) {
    const normName = c.name.trim().toLowerCase();
    if (seenIds.has(c.id) || (c.id !== 'all' && seenNames.has(normName))) {
      continue;
    }
    seenIds.add(c.id);
    if (c.id !== 'all') seenNames.add(normName);
    deduped.push(c);
  }

  return deduped;
}
