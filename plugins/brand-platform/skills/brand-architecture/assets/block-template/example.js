/**
 * <block-name> block
 *
 * Brand-aware pattern reference. Copy this folder, rename the files to match
 * the folder name exactly (the EDS loader derives paths from the block name),
 * and delete what you don't need.
 */

import { createOptimizedPicture, fetchPlaceholders, readBlockConfig } from '../../scripts/aem.js';
import { getBrandConfig, hasFeature } from '../../scripts/brand.js';

export default async function decorate(block) {
  // Guard first. Authors produce shapes you did not anticipate, and a block
  // that throws takes the whole page with it.
  const rows = [...block.children];
  if (!rows.length) { block.remove(); return; }

  // Variants come from the class list, never from the DOM shape.
  const isCompact = block.classList.contains('compact');

  // Optional key/value settings authored in the block's first rows.
  const { limit = '6' } = readBlockConfig(block);

  // Brand comes from the platform. Never re-derive it from the URL, and never
  // branch on a brand name — branch on a capability so brand N opts in through
  // brands.json alone.
  const { pathPrefix, indexPath, key } = getBrandConfig();
  const ph = await fetchPlaceholders(pathPrefix);

  if (hasFeature('partsFinder')) {
    // ...capability-gated behaviour
  }

  // Assets and endpoints are built from config, never written as literals.
  const logo = `/icons/${key}/logo.svg`;

  // Images always go through the optimizer, with explicit dimensions.
  block.querySelectorAll('img').forEach((img) => {
    img.closest('picture')?.replaceWith(
      createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]),
    );
  });

  // User-facing strings come from placeholders so a brand can restate every
  // label without a code change, and localisation comes for free.
  const cta = document.createElement('a');
  cta.textContent = ph.viewAllCta || 'View all';
  cta.href = `${pathPrefix}/all`;
  cta.className = 'button';
  block.append(cta);

  block.classList.toggle('is-compact', isCompact);
}
