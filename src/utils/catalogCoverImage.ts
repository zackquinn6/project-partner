/** Display sizes for catalog covers. Static `/project-catalog/` assets have prebuilt -w400/-w800 variants. */
export type CatalogCoverSize = 'thumb' | 'carousel' | 'grid';

const VARIANT_WIDTH: Record<CatalogCoverSize, 400 | 800> = {
  thumb: 400,
  carousel: 400,
  grid: 800,
};

const PROJECT_CATALOG_PATH = '/project-catalog/';

/** First desktop grid row (5 columns at lg). */
export const CATALOG_FIRST_ROW_DESKTOP = 5;
/** Approx. first viewport of compact mobile/tablet rows. */
export const CATALOG_FIRST_ROW_MOBILE = 8;

export function getProjectCoverUrl(project: {
  cover_image?: string | null;
  image?: string | null;
  images?: string[] | null;
}): string | undefined {
  const fromCover = project.cover_image;
  if (typeof fromCover === 'string' && fromCover.length > 0) {
    return fromCover;
  }
  const fromImage = project.image;
  if (typeof fromImage === 'string' && fromImage.length > 0) {
    return fromImage;
  }
  const fromImages = project.images?.[0];
  if (typeof fromImages === 'string' && fromImages.length > 0) {
    return fromImages;
  }
  return undefined;
}

/**
 * Map a stored cover URL to a display-sized asset.
 * Static catalog files use sibling `-w400.jpg` / `-w800.jpg` variants.
 * Other URLs (e.g. Supabase storage) are returned unchanged.
 */
export function resolveCatalogCoverUrl(url: string, size: CatalogCoverSize): string {
  if (!url.startsWith(PROJECT_CATALOG_PATH)) {
    return url;
  }

  if (/-(?:w400|w800)\.jpe?g$/i.test(url)) {
    return url;
  }

  const match = url.match(/^(.*)\.(jpe?g)$/i);
  if (!match) {
    return url;
  }

  const width = VARIANT_WIDTH[size];
  return `${match[1]}-w${width}.${match[2]}`;
}

/** Warm the browser cache for covers before the grid is shown. */
export function prefetchCatalogCovers(urls: Array<string | undefined>, size: CatalogCoverSize): void {
  for (const url of urls) {
    if (url === undefined || url.length === 0) {
      continue;
    }
    const resolved = resolveCatalogCoverUrl(url, size);
    const img = new Image();
    img.decoding = 'async';
    img.src = resolved;
  }
}
