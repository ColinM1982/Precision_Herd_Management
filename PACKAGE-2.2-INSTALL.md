# Precision Herd Management - Swine v0.3.1

## Package 2.2: Outside the Herd and Completed-Litter Archive

This is an in-place update for a working v0.3.0 installation. It preserves existing animals, litter pigs, litters, reproduction records, and registration exports.

## Install in this order

### 1. Run the new Supabase migration once

In the existing Supabase project, open **SQL Editor → New query** and run the complete contents of:

`supabase/migrations/202608050004_outside_herd_archive_and_deletion.sql`

Expected result:

`Success. No rows returned`

Do not rerun migrations `...30001`, `...30002`, or `...40003`.

### 2. Verify Supabase

Open a new query and run:

`supabase/verify/04_VERIFY_OUTSIDE_HERD_ARCHIVE.sql`

The first result should contain six rows and every row should show `PASS`. The second result contains informational counts; zero is valid.

### 3. Update GitHub

Upload the contents of this patch to the root of the existing GitHub repository. Allow matching files to be replaced and new files to be added. Do not upload the outside patch folder as an extra directory.

Commit message:

`Upgrade Precision Herd Management to v0.3.1`

### 4. Confirm Netlify

Wait for the automatic Netlify deployment to show **Published**, then open the application and press `Ctrl + F5`.

## First-use test

1. Change a test herd animal to `sold`, save it, and confirm it leaves **Herd Animals** and appears under **Outside the Herd**.
2. Open the animal from Outside the Herd, change its status back to `active`, and confirm it returns to Herd Animals.
3. Open a test litter and give every pig either a completed status or use **Move to Herd**.
4. Select **Archive litter** and confirm it leaves active Litters and appears in the Archived Litters repository.
5. Open the archived litter and confirm its pig details and registration exports remain available.
6. Use permanent Delete only on a disposable test animal, test litter pig, or test litter entered in error.

## Status and deletion rules

- Herd Animals contains `active` and `for_sale` animals.
- Sold, culled, deceased, and archived herd animals appear under Outside the Herd.
- Terminal litter-pig outcomes appear under Outside the Herd when the pig was not moved to Herd Animals.
- A litter can be archived only after every pig has a terminal outcome or has been moved to Herd Animals.
- An archived litter can be returned to active Litters without losing data.
- Permanent deletion requires confirmation and cannot be undone.
- Deleting a whole litter is blocked if any pig has already been moved to Herd Animals.

