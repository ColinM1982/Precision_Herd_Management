# Package 2.1 Patch Manifest

Version: 0.3.0

## Add

- `src/lib/exports.ts`
- `src/pages/Litters.tsx`
- `src/pages/LitterProfile.tsx`
- `supabase/migrations/202608040003_animal_centered_reproduction.sql`
- `supabase/verify/03_VERIFY_ANIMAL_CENTERED_REPRODUCTION.sql`
- `PACKAGE-2.1-INSTALL.md`
- `PACKAGE-2.1-MANIFEST.md`
- `REGISTRATION-EXPORT-FIELD-MAP.md`

## Replace

- `src/App.tsx`
- `src/styles.css`
- `src/types/database.ts`
- `src/lib/terminology.ts`
- `src/pages/AnimalProfile.tsx`
- `src/pages/BoarSelection.tsx`
- `src/pages/Reproduction.tsx`
- `package.json`
- `package-lock.json`
- `README.md`
- `INSTALLATION-GUIDE.md`

## Database behavior

- Adds new tables and columns without deleting existing Package 2 data.
- Makes the Breeding Cycle link optional for synchronization, breeding, and pregnancy checks.
- New farrowings create `litter_pigs`, not `animals`.
- Existing Package 2 litter animals are preserved and linked during migration.
