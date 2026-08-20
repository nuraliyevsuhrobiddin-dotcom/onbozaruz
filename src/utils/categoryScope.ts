import { Category, CategoryScope } from '../api/types';

/**
 * Filters the shared category list down to the ones relevant for a given
 * area. A category scoped to 'both' (or with no scope set — legacy rows)
 * shows up everywhere; one scoped to 'post' or 'market' only shows up there.
 * The synthetic 'all' entry always passes through.
 */
export function categoriesForScope(categories: Category[], scope: Exclude<CategoryScope, 'both'>): Category[] {
  return categories.filter((c) => {
    if (c.id === 'all') return true;
    const catScope = c.scope || 'both';
    return catScope === 'both' || catScope === scope;
  });
}
