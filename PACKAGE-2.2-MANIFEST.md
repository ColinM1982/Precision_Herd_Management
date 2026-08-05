# Package 2.2 Patch Manifest

Version: 0.3.1

## Add

- `src/pages/OutsideHerd.tsx`
- `supabase/migrations/202608050004_outside_herd_archive_and_deletion.sql`
- `supabase/verify/04_VERIFY_OUTSIDE_HERD_ARCHIVE.sql`
- `PACKAGE-2.2-INSTALL.md`
- `PACKAGE-2.2-MANIFEST.md`

## Replace

- `src/App.tsx`
- `src/pages/AnimalProfile.tsx`
- `src/pages/Litters.tsx`
- `src/pages/LitterProfile.tsx`
- `src/types/database.ts`
- `src/styles.css`
- `package.json`
- `package-lock.json`
- `README.md`
- `INSTALLATION-GUIDE.md`

## Database behavior

- Adds an animal status date and a litter archived date.
- Backfills dates for existing terminal herd-animal statuses without changing their status.
- Adds guarded functions for permanent deletion.
- Does not automatically archive or delete existing litters.
- Does not move any existing litter pig into or out of Herd Animals.

