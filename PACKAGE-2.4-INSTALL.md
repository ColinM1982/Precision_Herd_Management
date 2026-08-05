# Precision Herd Management - Swine v0.3.3

## Package 2.4: Sow Summary and Reproductive Status

This cumulative patch upgrades a working v0.3.1 installation. It includes the deferred-litter-sire update originally prepared as v0.3.2, plus sow/gilt age, calculated parity, and reproductive status on Herd Animals. Animal Profiles use the choices **Open**, **Bred**, and **Lactating/Nursing**; choosing **Bred** reveals a due-date field.

## Install in this order

### 1. Update Supabase

In the existing Precision Herd Management Supabase project, run this file once:

`supabase/migrations/202608050005_reproductive_status_summary.sql`

Expected result:

`Success. No rows returned`

Do not rerun an earlier migration.

### 2. Verify Supabase

Run:

`supabase/verify/05_VERIFY_REPRODUCTIVE_STATUS_SUMMARY.sql`

Confirm all five checks show `PASS`. The second result table lists the current count of sows/gilts in each reproductive status. Zero due dates are normal until a Bred animal is assigned a due date.

### 3. Update GitHub

Upload the contents of this patch to the root of the existing GitHub repository. Allow matching files to be replaced. Do not upload the outside patch folder as an extra directory.

Commit message:

`Upgrade Precision Herd Management to v0.3.3`

### 4. Confirm Netlify

Wait for the automatic Netlify deployment to show **Published**, then open the application and press `Ctrl + F5`.

## First-use test

1. Open a litter whose sire was recorded as **Unknown / enter later** and confirm **Recorded sire** is available under Litter Details.
2. Open **Herd Animals** and confirm each sow/gilt shows age, parity, and reproductive status.
3. Open a sow or gilt Animal Profile.
4. Change **Reproductive status** to **Bred** and confirm **Due date** appears.
5. Enter a due date and select **Save profile**.
6. Return to **Herd Animals** and confirm the Bred designation and due date appear.
7. Change the status to **Open** or **Lactating/Nursing**, save, and confirm the prior due date is cleared.

Parity is calculated from the sow's recorded farrowing/litter history. It is not entered separately on the animal profile.
