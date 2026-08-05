# Precision Herd Management - Swine v0.3.0

## Package 2.1: Animal-Centered Reproduction

This upgrade replaces the required Breeding Cycle workflow with records attached directly to each sow or gilt. Existing Package 2 data is preserved.

## What changes

- Last-heat history with 18-21 day projected windows and three future cycles.
- Target farrow date automatically calculates a target breeding date at 114 days.
- Direct sow/gilt records for synchronization, breeding, pregnancy checks, and farrowing.
- Independent Boar Library and direct mating comparisons - no Breeding Cycle required.
- Separate Litters section. New litter pigs are not inserted into Herd Animals.
- Individual litter-pig records for ear notch, class, teats, birth/weaning data, status, sale data, and optional Move to Herd.
- CSV exports aligned to the supplied NSR registration, NSR breeding certificate, CPS litter application, and CPS natural-service certificate forms.

## Install in this order

### 1. Confirm Package 2 was already installed

You previously ran:

`supabase/migrations/202608030002_package_2_reproduction.sql`

If that migration returned `Success. No rows returned`, do not run it again.

### 2. Run the new database migration once

Open Supabase > SQL Editor > New query. Copy the complete contents of:

`supabase/migrations/202608040003_animal_centered_reproduction.sql`

Select Run. The correct response is:

`Success. No rows returned`

This migration does not delete animals, breeding cycles, events, or existing litters. If an older Package 2 litter already created herd animal records, those animals stay in the herd and are linked to the new litter-pig rows.

### 3. Verify the database

Open a new SQL query and run:

`supabase/verify/03_VERIFY_ANIMAL_CENTERED_REPRODUCTION.sql`

The SQL editor will show four result tables:

1. Ten checks - every row must show `PASS`.
2. Three tables - every row must show `rowsecurity = true`.
3. Three policies - one each for heat events, litter pigs, and registry profiles.
4. Data counts - zeros are normal before you enter records.

### 4. Update the application source

If using the patch ZIP, copy its files into the same paths in the current repository and allow the new files to be added. Do not copy `node_modules` or `dist`.

The important new application files are:

- `src/pages/Litters.tsx`
- `src/pages/LitterProfile.tsx`
- `src/lib/exports.ts`

The patch also replaces the reproduction page and updates the app routes, dashboard, settings, boar library, animal profile, types, and styles.

### 5. Deploy

Commit/push the updated source to the branch connected to Netlify. Netlify should run:

`npm run build`

The verified production build completes successfully with v0.3.0.

### 6. Enter registration export information

In the app, open Settings. Complete the NSR and/or CPS Registration Export Details. Add the dam's registration number on her Animal Profile and the service sire's registration, ear notch, owner, and owner number in Boar Selection.

## First-use test

1. Open Reproduction and select a sow/gilt.
2. Add her last heat and confirm the 18-21 day next-heat window appears.
3. Add a target farrow date and confirm the target breeding date is 114 days earlier.
4. Record a test litter with two animals.
5. Open Litters and confirm two pig rows appear.
6. Open Animals and confirm those two pigs were not added to the herd.
7. Enter one pig's notch/class information and test an NSR or CPS CSV export.

## Important distinction

Breeding cycles remain in the database only so no older records are lost. The v0.3.0 app does not require or create a Breeding Cycle for new reproduction work.
