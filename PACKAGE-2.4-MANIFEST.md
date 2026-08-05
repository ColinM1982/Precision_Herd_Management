# Package 2.4 Patch Manifest

Version: 0.3.3

## Add

- `PACKAGE-2.4-INSTALL.md`
- `PACKAGE-2.4-MANIFEST.md`
- `supabase/migrations/202608050005_reproductive_status_summary.sql`
- `supabase/verify/05_VERIFY_REPRODUCTIVE_STATUS_SUMMARY.sql`

## Replace

- `src/App.tsx`
- `src/pages/AnimalProfile.tsx`
- `src/pages/LitterProfile.tsx`
- `src/types/database.ts`
- `src/styles.css`
- `package.json`
- `package-lock.json`
- `README.md`
- `INSTALLATION-GUIDE.md`

## Database behavior

- Adds `animals.reproductive_due_date`.
- Normalizes sow/gilt reproductive status to `open`, `bred`, or `lactating_nursing`.
- Defaults existing blank sow/gilt reproductive statuses to `open`.
- Preserves all animals, litters, farrowing records, and prior due dates associated with recognized Bred/Pregnant statuses.
- Parity is calculated from existing `birth_events`; no duplicate parity field is stored on the animal.

## Included v0.3.2 application behavior

- Adds the Recorded sire selector to Litter Details.
- Allows an unknown sire to be assigned, changed, or cleared later.
- Updates the litter heading, archive view, farrowing record, and NSR/CPS export source.
