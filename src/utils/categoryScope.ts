import { Category, CategoryScope } from '../api/types';
import { CategoryItem } from '../api/adminRepository';
import { CATEGORIES } from '../data/mockAgroData';

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

/**
 * Converts admin-managed category rows (DB shape) into the live app's
 * Category[] state — used both by the store's own hydration and by the
 * admin categories tab so the two never drift out of sync (they previously
 * did: the admin tab used to hardcode `image: ''` and skip name-based
 * de-dup, blanking every category's cover image until the next reload).
 */
export function mapCategoryItemsToCategories(items: CategoryItem[]): Category[] {
  const rawCats: Category[] = items
    .filter((c) => c.isActive)
    .map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon || 'tag',
      image: CATEGORIES.find((cat) => cat.id === c.id || cat.name.toLowerCase() === c.name.toLowerCase())?.image || '',
      count: '0',
      scope: c.scope || 'both',
    }));

  if (!rawCats.some((c) => c.id === 'all')) {
    rawCats.unshift({ id: 'all', name: 'Barchasi', icon: 'grid', image: '', count: '0', scope: 'both' });
  }

  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const uniqueCats: Category[] = [];
  for (const cat of rawCats) {
    const normName = cat.name.trim().toLowerCase();
    if (seenIds.has(cat.id) || (cat.id !== 'all' && seenNames.has(normName))) continue;
    seenIds.add(cat.id);
    if (cat.id !== 'all') seenNames.add(normName);
    uniqueCats.push(cat);
  }
  return uniqueCats;
}
