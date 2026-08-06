# Package 3 Patch Manifest

Version: 0.4.0

## Add

- `PACKAGE-3-INSTALL.md`
- `PACKAGE-3-MANIFEST.md`
- `src/lib/breeds.tsx`
- `src/pages/Health.tsx`
- `supabase/migrations/202608050006_package_3_health_and_workflow.sql`
- `supabase/verify/06_VERIFY_PACKAGE_3_HEALTH_AND_WORKFLOW.sql`

## Replace

- `src/App.tsx`
- `src/lib/terminology.ts`
- `src/pages/AnimalProfile.tsx`
- `src/pages/BoarSelection.tsx`
- `src/pages/LitterProfile.tsx`
- `src/pages/Litters.tsx`
- `src/pages/OutsideHerd.tsx`
- `src/pages/Reproduction.tsx`
- `src/styles.css`
- `src/types/database.ts`
- `package.json`
- `package-lock.json`
- `README.md`
- `INSTALLATION-GUIDE.md`

## Database behavior

- Adds a controlled category to each Boar Library entry.
- Adds Matrix/PG 600 protocol milestone dates to synchronization records.
- Adds the RLS-protected `health_treatments` table linked to Herd Animals.
- Preserves existing animal, litter, sale, reproduction, registration, and boar records.
- Calculates litter and sow sale totals from existing litter-pig sale prices; no duplicate financial total is stored.
