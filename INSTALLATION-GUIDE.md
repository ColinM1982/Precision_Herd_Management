# Precision Herd Management - Swine v0.3.1 Installation Guide

This guide assumes you will deploy the application the same general way as Precision Feed Management: GitHub stores the code, Supabase stores secured data, and Netlify builds the public application.

## Before you begin

You need accounts for GitHub, Supabase, and Netlify. Keep the extracted project folder intact. Do not upload only the `src` folder; GitHub needs every file in the package.

## Part 1 — Create the GitHub repository

1. Sign into GitHub and select **New repository**.
2. Name it `PRECISION-HERD-MANAGEMENT`.
3. Choose **Private** while the application is under development.
4. Do not add a README, `.gitignore`, or license on the GitHub creation screen; those files are already in this package.
5. Select **Create repository**.
6. On the empty repository page, choose **uploading an existing file**.
7. Open the extracted `PRECISION-HERD-MANAGEMENT` folder on your computer.
8. Upload all visible files and folders, including `src` and `supabase`. GitHub's browser upload may not accept an empty folder, but this package contains files in every required folder.
9. Use the commit message `Install Precision Herd Management v0.3.1` and commit directly to `main`.

### Confirm the GitHub structure

The repository root should show `package.json`, `netlify.toml`, `src`, and `supabase`. If GitHub shows another `PRECISION-HERD-MANAGEMENT` folder before those files, the project was uploaded one level too deep. Netlify must point to the directory containing `package.json`.

## Part 2 — Create and configure Supabase

1. Sign into Supabase and select **New project**.
2. Choose your organization.
3. Project name: `Precision Herd Management`.
4. Create and securely retain the database password. The app does not use this password, but you will need it for database administration.
5. Choose the closest available United States region.
6. Create the project and wait until provisioning finishes.

### Run the four migrations in order

1. In Supabase, open **SQL Editor**.
2. Select **New query**.
3. In the GitHub repository, open `supabase/migrations/202608030001_initial_foundation.sql`.
4. Copy the entire file into Supabase SQL Editor and select **Run** once.
5. Open a new query, copy `supabase/migrations/202608030002_package_2_reproduction.sql`, and select **Run** once.
6. Open another new query, copy `supabase/migrations/202608040003_animal_centered_reproduction.sql`, and select **Run** once.
7. Open another new query, copy `supabase/migrations/202608050004_outside_herd_archive_and_deletion.sql`, and select **Run** once.
8. Each successful migration normally reports `Success. No rows returned`.

Do not run any migration a second time. Future database changes will arrive as new timestamped files under `supabase/migrations`.

### Verify the migration

1. Open a second new query in SQL Editor.
2. Copy and run each verification file in order: `01_VERIFY_PACKAGE_1.sql`, `02_VERIFY_PACKAGE_2.sql`, `03_VERIFY_ANIMAL_CENTERED_REPRODUCTION.sql`, and `04_VERIFY_OUTSIDE_HERD_ARCHIVE.sql`.
3. Confirm:
   - `rowsecurity` is `true` for every listed table.
   - `create_farm_with_owner`, `is_farm_member`, and `can_manage_farm` appear.
   - Policies appear for `farm_members`, `animals`, and `stud_listings`.
   - All four storage buckets appear and `public` is `false`.
4. In the final v0.3.0 verification, confirm all ten checks show `PASS`, the three new tables show `rowsecurity = true`, and the three new policies appear. Zero data counts are normal.
5. In the v0.3.1 verification, confirm all six checks show `PASS`. Archive counts may be zero.

### Authentication settings

1. Open **Authentication → Providers → Email**.
2. Confirm **Enable Email provider** is on.
3. During initial private testing, you can turn **Confirm email** off to simplify creating test accounts. Before public release, turn confirmation back on and configure a production email sender.
4. Do not enable anonymous sign-ins.

### Copy the application credentials

1. Open **Project Settings → API** (in some Supabase layouts this appears as **Settings → API Keys**).
2. Copy the **Project URL**.
3. Copy the public **anon** or **publishable** key intended for browser applications.
4. Never place the `service_role` or secret key in Netlify or browser code. The public key is safe only because the migration enables Row Level Security.

The SQL migration already creates these private storage buckets:

- `animal-photos`
- `registration-documents`
- `health-documents`
- `stud-media`

You do not need to create them manually. File paths will begin with the farm UUID so the storage policies can identify the correct farm.

## Part 3 — Deploy through Netlify

1. Sign into Netlify.
2. Select **Add new site → Import an existing project**.
3. Choose GitHub and authorize access if prompted.
4. Select `PRECISION-HERD-MANAGEMENT`.
5. Leave **Base directory** blank if `package.json` is in the repository root.
6. Set **Build command** to `npm run build`.
7. Set **Publish directory** to `dist`.
8. Before deploying, open **Environment variables** and add:

| Key | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | The Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | The public anon/publishable browser key |

9. Select **Deploy**.
10. Netlify will run `npm install` automatically and then run the build command.

The included `netlify.toml` repeats the build settings and provides the redirect required for React pages such as `/animals`, `/planning`, and `/litters` to work when refreshed.

### If the build fails

Check these first:

- `package.json` is at the repository root.
- Both environment-variable names are exact and contain no spaces.
- The Supabase URL begins with `https://`.
- You uploaded the entire `src` folder.
- Netlify is deploying the `main` branch.

After correcting a setting, use **Deploys → Trigger deploy → Clear cache and deploy site**.

## Part 4 — Connect Netlify authentication redirects

1. Copy the final Netlify URL, such as `https://precision-herd-management.netlify.app`.
2. In Supabase, open **Authentication → URL Configuration**.
3. Set **Site URL** to the Netlify URL.
4. Under **Redirect URLs**, add:
   - `https://YOUR-SITE.netlify.app/**`
   - `http://localhost:5173/**` for optional local development
5. Save the settings.

If you later connect a custom domain, replace the Site URL with the custom domain and add `https://YOUR-CUSTOM-DOMAIN/**` to the allowed redirects. Keep the Netlify address as an allowed redirect while testing.

## Part 5 — First application test

Perform this test in order:

1. Open the Netlify site.
2. Create an account.
3. If email confirmation is enabled, confirm the email and sign in.
4. Create `Lookout Mountain Farms` during onboarding.
5. Add one test animal, such as Elvira or Tammy.
6. Confirm it appears in **Animals**.
7. Add one prospective boar with a stud, sire, dam, registration information, and semen price.
8. Confirm it appears in **Boar Selection**.
9. Open **Reproduction**, add the sow's last heat, and confirm an 18-21 day next-heat window appears.
10. Add a target farrow date and confirm the target breeding date is calculated 114 days earlier.
11. Record a two-pig test litter and confirm both pig rows appear in **Litters**, not **Animals**.
12. Sign out and back in and confirm the records remain visible.

### Basic security test

Create a second test account in a private/incognito browser window. It should be prompted to create its own farm and must not see the first account's animals or boars. This confirms the farm-membership RLS boundary is working.

## Part 6 — Making future updates

Each update package will identify files as **Add**, **Replace**, or **Run in Supabase**.

1. Upload or replace the listed application files in GitHub.
2. Commit the changes to `main`.
3. Netlify automatically deploys the commit.
4. If the package includes a new SQL migration, run only that new file in Supabase SQL Editor.
5. Run the matching verification SQL file.

Never rerun an older migration to apply a new update. The timestamped files provide an audit trail and prevent uncertainty about which database changes have already been installed.

## Current release boundary

Health protocols, sickness cases, treatments, withdrawals, tasks, and health reports remain planned for Package 3. The v0.3.1 source includes animal-centered reproduction, independent litters, Outside the Herd history, completed-litter archiving, guarded deletion, and NSR/CPS CSV exports.
