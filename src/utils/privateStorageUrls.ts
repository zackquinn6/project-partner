import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Helpers for buckets that are private (RLS enforced).
 *
 * Historically some URLs were stored in the database in the public
 * `/storage/v1/object/public/<bucket>/<path>` form. Those URLs no longer work once the bucket is
 * private, so we extract the object path and mint a short-lived signed URL instead.
 */
export function extractStoragePath(urlOrPath: string, bucket: string): string | null {
  if (!urlOrPath) return null;

  const marker = `/storage/v1/object/public/${bucket}/`;
  const signedMarker = `/storage/v1/object/sign/${bucket}/`;

  for (const m of [marker, signedMarker]) {
    const idx = urlOrPath.indexOf(m);
    if (idx !== -1) {
      return urlOrPath.slice(idx + m.length).split('?')[0];
    }
  }

  // Already a plain object path
  if (!urlOrPath.startsWith('http')) {
    return urlOrPath.replace(new RegExp(`^${bucket}/`), '');
  }

  return null;
}

export async function getSignedStorageUrl(
  urlOrPath: string,
  bucket: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const path = extractStoragePath(urlOrPath, bucket);
  if (!path) return null;

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error) {
    console.error(`Failed to create signed URL for ${bucket}/${path}:`, error.message);
    return null;
  }
  return data?.signedUrl ?? null;
}

/**
 * Resolve a list of stored URLs/paths into signed URLs, keyed by the original value.
 */
export function useSignedStorageUrls(
  urlsOrPaths: (string | null | undefined)[],
  bucket: string,
  expiresInSeconds = 3600
): Record<string, string> {
  const [signed, setSigned] = useState<Record<string, string>>({});
  const key = urlsOrPaths.filter(Boolean).join('|');

  useEffect(() => {
    let cancelled = false;
    const values = key ? key.split('|') : [];

    if (values.length === 0) {
      setSigned({});
      return;
    }

    (async () => {
      const entries = await Promise.all(
        values.map(async (value) => {
          const url = await getSignedStorageUrl(value, bucket, expiresInSeconds);
          return [value, url] as const;
        })
      );

      if (cancelled) return;
      const next: Record<string, string> = {};
      for (const [value, url] of entries) {
        if (url) next[value] = url;
      }
      setSigned(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [key, bucket, expiresInSeconds]);

  return signed;
}
