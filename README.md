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

## Planned Package 3

- Health protocols, sickness cases, treatments, withdrawals, tasks, and reports

New installations run the three migrations in filename order. Existing Package 2 installations use [PACKAGE-2.1-INSTALL.md](PACKAGE-2.1-INSTALL.md).
