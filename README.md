# Precision Herd Management - Swine

Precision Herd Management — Swine is a dedicated swine application. Other livestock species will use separate applications so their registrations, reproductive workflows, reports, and exports can be designed independently.

## Package 1 foundation

- Email/password authentication
- Secure farm onboarding
- Responsive desktop and mobile navigation
- Dashboard
- Basic animal entry and herd list
- Prospective-boar library with stud, pedigree, registration, semen price, strengths, and notes
- Mating-plan database foundation
- Private storage buckets for animal, registration, health, and stud files
- Row Level Security for all included tables
- Netlify single-page application routing

## Package 2 reproduction release

- Full animal profiles and editable identification
- Sire and dam links between herd animals
- Swine registration records
- Prospective boar library and three-boar mating comparison
- Saved mating plans
- Breeding cycles
- Synchronization events
- AI and natural-service records
- Automatic 114-day estimated farrowing date
- Pregnancy checks
- Farrowing outcomes
- Atomic litter and individual piglet creation

## Package 2.1 animal-centered reproduction (v0.3.0)

- Heat history with 18-21 day projected windows
- Target farrow date with automatic 114-day target breeding date
- Direct sow/gilt synchronization, breeding, pregnancy, and farrowing records
- Independent Boar Library and direct mating comparisons
- Separate Litters section; new litter pigs are not Herd Animals
- Individual ear notch, class, teats, birth/weaning, status, sale, and retention records
- Explicit Move to Herd action for selected litter pigs
- NSR and CPS registration/certificate CSV exports

## Package 2.2 archive and record cleanup (v0.3.1)

- Active Herd Animals separated from historical Outside the Herd records
- Automatic routing of sold, culled, deceased, and archived animals
- Separate historical view for terminal litter-pig outcomes
- Completed-litter archive after every pig has a final outcome or enters Herd Animals
- Archived litters retain pig details and NSR/CPS exports
- Restore archived animals and litters to active sections
- Guarded permanent deletion for animals, individual litter pigs, and erroneous whole litters

## Package 2.3 deferred litter sire update (v0.3.2)

- Assign or change the recorded sire from the Litter Details page
- Uses the existing Boar Library, including the option to leave the sire unknown
- Refreshes the litter heading, archive view, and NSR/CPS export data after saving
- Application-only update with no new Supabase migration

## Package 2.4 sow summary and reproductive status (v0.3.3)

- Age in years/months on Herd Animals
- Parity calculated from each sow's recorded farrowing/litter history
- Reproductive-status designation on Herd Animals
- Animal Profile dropdown for Open, Bred, and Lactating/Nursing
- Conditional due date for Bred sows/gilts

## Package 3 health and workflow expansion (v0.4.0)

- Directly editable animal pedigree and controlled swine breed selections
- Crossbred profiles without registration panels
- Litter Total $ earned and sow Lifetime $ Sold calculations
- Single-date 19-day heat projections and selectable future cycles
- Two-way 114-day Target Breeding / Target Farrow calculations
- Matrix/PG 600 15-day calendar with linked heat, breeding, and farrowing dates
- Organized Archived Animals/Litters folders
- Categorized Boar Selection list, profiles, and guarded deletion
- Herd-wide treatment table with expandable animal history and withdrawal dates

New installations run the six migrations in filename order. Existing v0.3.3 installations use [PACKAGE-3-INSTALL.md](PACKAGE-3-INSTALL.md).
