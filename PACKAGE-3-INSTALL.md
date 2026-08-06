# Precision Herd Management - Swine v0.4.0

## Package 3: Health and Workflow Expansion

This patch upgrades a working v0.3.3 installation. It adds the initial Health treatment package and the requested animal, litter, reproduction, archive, and Boar Selection improvements.

## Install in this order

### 1. Update Supabase

Run this file once in the existing Precision Herd Management Supabase project:

`supabase/migrations/202608050006_package_3_health_and_workflow.sql`

Expected result:

`Success. No rows returned`

Do not rerun an earlier migration. If a red error appears, stop before updating GitHub.

### 2. Verify Supabase

Run:

`supabase/verify/06_VERIFY_PACKAGE_3_HEALTH_AND_WORKFLOW.sql`

Confirm all eight checks in the first result say `PASS`. The remaining result sections should show:

- `health_treatments` with `rowsecurity = true`
- Policy `members manage health treatments`
- Informational counts for treatments, Matrix/PG 600 schedules, and the three boar categories; zero counts are normal

### 3. Update GitHub

Upload the contents of this patch to the root of the existing GitHub repository and replace matching files. Commit with:

`Upgrade Precision Herd Management to v0.4.0 Package 3`

### 4. Confirm Netlify

Wait for the automatic Netlify deployment to show **Published**, open the application, and press `Ctrl + F5`.

## First-use test

1. Open an Animal Profile and confirm Breed is a dropdown and Sire/Dam are directly editable under Pedigree information.
2. Select Crossbred and confirm Registrations is hidden.
3. Mark a litter pig Sold with a sale price; confirm Total $ earned updates on the litter and Lifetime $ Sold updates on the sow.
4. Add a heat and confirm the next three projected dates use 19-day intervals. Select one and confirm Plan Mating opens with Target Breeding prefilled.
5. Change either Target Breeding or Target Farrow and confirm the other date recalculates using 114 days.
6. Save a Matrix/PG 600 sync record and confirm the 15-day calendar, Next Heat, Target Breeding, and Target Farrowing dates.
7. Confirm Archived Animals/Litters opens with Litter-pig history and both subfolders closed.
8. Open Boar Selection, confirm the three list categories and expandable details, then open a boar profile.
9. Open Health and add a treatment for an animal; confirm it appears in that animal's expandable history.
