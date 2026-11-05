# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

분홍 맨홀 (pink-manhole): a mobile-first responsive web app where citizens report pink manholes with photos and a location. All reports are public. No sign-up is needed to report. It runs on free tiers only (Vercel Hobby, Supabase Free, GitHub).

Current scope is **data collection only**. Submitting to 국민신문고 is out of scope for now, but the `submitted` status is kept for later.

## Copy conventions

- Always write the service name with a space: **"분홍 맨홀"**, never "분홍맨홀". This applies to every user-facing string, title, metadata entry, file name and doc. Code identifiers such as `pink-manhole` are not affected.
- Use correct Korean word spacing in UI copy (e.g. "알 수 있는", not "알수있는").

## Commands

```bash
pnpm dev            # dev server (Turbopack)
pnpm build          # production build — run before pushing. Stop `pnpm dev` first: both share .next and the dev server ends up serving stale modules
pnpm lint           # ESLint
supabase db push    # apply supabase/migrations to the linked remote project
supabase migration new <name>   # create a new migration (never edit applied ones)
```

There is no test runner yet.

## Stack

Next.js 16 (App Router, `src/`), React 19, TypeScript, Tailwind v4, shadcn/ui (`src/components/ui`), Supabase (Postgres + Storage), zod. Next 16 renamed middleware to **proxy** (`src/proxy.ts`). Check `node_modules/next/dist/docs/` before using Next APIs.

Maps use **Kakao**. All SDK code stays in `src/features/map/`: `kakao-loader.ts` loads the SDK and runs Places search, and `MapView` is the adapter component that handles markers, clustering, region bubbles and controls. Reverse geocoding uses the Kakao REST key on the server only (`src/server/services/geocode.ts`, exposed to the location step through `GET /api/geocode`).

## Architecture rules

- **Reads are public, writes go through the server.** Clients read `reports` and `report_photos` directly with the publishable key. RLS only exposes reports that are not hidden (`is_hidden`) and not soft-deleted (`deleted_at`), and photos that are not `private`. Public users never write to tables. Report creation goes through `POST /api/reports` with the secret key (`createAdminClient()`, which bypasses RLS).
- **Moderation model.** A report is public as soon as it is submitted. Each photo stays blurred until an admin approves it (`report_photos.moderation_status`: `pending` → `approved` | `private`). Report `status` is one of `reviewing` (검토중), `registered` (등록) or `submitted` (민원 접수). When no photo is pending anymore, `admin_moderate_photo` automatically moves `reviewing` to `registered`. 비공개 (`is_hidden`) and 삭제 (`deleted_at`, soft delete) are admin-only states.
- **Two buckets.** `report-uploads` is private and holds the originals. `report-photos` is public and only ever holds files that may be shown: blur previews of pending photos, and approved photos of visible reports. Paths are identical in both buckets (`{reportId}/{i}.jpg`, `_thumb.jpg`, `_blur.jpg`). `syncReportFiles()` in `src/server/services/photo-files.ts` is the single place that moves files to the right bucket. Call it after every change to moderation, visibility or deletion. Public URLs come from `publicPhoto()` in `src/shared/photo.ts`.
- **Upload validation is server-side.** The client compresses to JPEG for size only. `processDraftPhotos()` downloads each upload, decodes it with sharp (which rejects non-images by their content), re-encodes it (which strips EXIF/GPS), and creates the thumbnail and blur. Limits: JPEG/PNG/WebP, 10MB per file, `MAX_PHOTOS` = 3.
- **Submission flow.** `POST /api/uploads` returns a `draftId` and one signed upload URL per photo, pointing at the private bucket. The client then uploads the files. `POST /api/reports` processes the photos, reverse geocodes, calls `create_report` (service_role only), and then syncs the files. `draftId` becomes the report id, so retries are idempotent. After a successful submit, the user is redirected to `/home?submitted=1`, which shows a "등록이 완료되었습니다" toast.
- **Admin (`/admin`).** There is exactly one admin: Supabase Auth email/password, with the user listed in `admin_users` (a single-row table). A DB trigger also rejects any additional `auth.users` insert, so there is no sign-up path. Authorization is checked in three layers:
  1. `src/proxy.ts` refreshes the session and redirects signed-out users to `/admin/login`.
  2. Every admin page calls `requireAdminPage()`, and every server action in `src/server/admin-actions.ts` calls `requireAdminAction()`.
  3. Admin queries use the **admin's own session** (`src/lib/supabase/server.ts`), so RLS `is_admin()` policies apply. Mutations go through `SECURITY INVOKER` SQL functions (`admin_moderate_photo`, `admin_set_status`, `admin_set_hidden`, `admin_set_deleted`) that also write `admin_activity_logs` atomically.
  - Never use the secret key for admin actions.
  - Admin photo URLs come from `getAdminPhotoUrls()`: public URLs for files in the public bucket, 1-hour signed URLs for files in the private bucket.
- **Routes.** Public pages live in the `src/app/(public)` route group, which provides the 480px mobile shell; `(public)/(tabs)` adds the bottom nav. `src/app/admin` has its own full-width layout. With `cacheComponents` on, any component that reads cookies, params or searchParams (or a client component using `usePathname`/`useSearchParams`) must be inside `<Suspense>`, otherwise `next build` fails.
- `report_no` (e.g. `PM-261103-7K3Q`) is generated by a DB default. It is a lookup convenience, not a secret or credential.
- The report flow is a single page, `/report`, implemented in `src/features/report-form/report-form.tsx`. State lives in that component's memory only. The old step URLs redirect to `/report` (see `next.config.ts`). Location can come from four sources: address/place search, current location, dragging the map, or a photo's EXIF GPS. GPS is read on the device with `exifr` (`photo-gps.ts`). If a location is already set and the photo GPS is more than 30m away, a confirmation modal is shown. The optional `memo` (≤200 chars, publicly shown) is passed through to `create_report`.
- Status and moderation labels live in `src/shared/constants.ts` and must match the `report_status` and `photo_moderation` enums.
- **Routes are never string literals.** Use `Route` and `ApiRoute` (enums in `src/shared/routes.ts`) for fixed paths, `routes.reportDetail(no)` and `routes.adminReport(id)` for dynamic paths, and `withQuery(path, { … })` for query strings (it drops empty values). Add any new page or API route to the enums first. There are two exceptions where Next.js needs literal strings: route type params (`PageProps<"/reports/[reportNo]">`, `LayoutProps<"/admin">`) and `config.matcher` in `src/proxy.ts`.
- **Metadata / share previews.** Every page sets metadata through `pageMetadata({ title, description, path, images? })` (`src/shared/seo.ts`). Next.js replaces `openGraph` between segments instead of merging it, so a partial `openGraph` would drop the image. `metadataBase` comes from `NEXT_PUBLIC_SITE_URL`, falling back to Vercel's production domain. The default 1200×630 card is `public/og/default.png`; the main-screen illustration PNG is `public/images/landing-scene.png`. Both are drawn as SVG strings in `src/components/layout/art/scene-art.ts`, which is also what `<LandingScene>` renders inline. Regenerate the PNGs with `node --experimental-strip-types scripts/og/generate.mjs`, and bump `OG_IMAGE_VERSION` in `src/shared/seo.ts` whenever the share image changes. Report pages use the approved photo, and the default card otherwise (never the blur preview). KakaoTalk caches previews, so after changing them refresh the cache in the Kakao 공유 디버거.
- Directory roles: `src/app` handles routing and composition only; `src/features/*` holds UI and client logic per feature; `src/server/*` holds server-only code (services, auth, admin server actions); `src/shared` holds zod schemas, types and constants shared by client and server.

## Environment

Copy `.env.example` to `.env.local`. The same variables must be set in Vercel. `SUPABASE_SECRET_KEY` and `KAKAO_REST_API_KEY` must never use the `NEXT_PUBLIC_` prefix. Google Analytics 4 loads only when `NEXT_PUBLIC_GA_ID` is set, and only in the `(public)` layout, so admin pages are never tracked. In the Kakao Developers app, register every site domain (localhost:3000 and the Vercel domain) under the Web platform, or the JS SDK will not load.
