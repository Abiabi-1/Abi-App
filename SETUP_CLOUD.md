# Put your app in the cloud (phone + PC) — about 20 minutes, one time

You do three things: **(1)** make a free Supabase project, **(2)** paste two values into `config.js`, **(3)** upload the `deploy` folder to a host. Then open the link on your PC and phone and sign in.

Nothing here changes how the app looks or works. It adds a small **Cloud** pill in the top bar (green = saved to the cloud) and a sign-in screen.

## 1. Create the Supabase project (free)
1. Go to **supabase.com** → Sign up → **New project**. Name it anything, set a database password (save it somewhere), pick the region closest to you.
2. Wait about 2 minutes until it finishes setting up.
3. Left menu → **SQL Editor** → **New query** → open `schema.sql` (in the deploy folder), copy everything, paste, press **Run**. It should say "Success".
4. Left menu → **Project Settings → API**. Copy the **Project URL** and the **anon public** key.

## 2. Put the two values in config.js
Open `deploy/config.js` in Notepad, paste the URL and the key between the quotes, save.

## 3. Upload the deploy folder
Easiest: **app.netlify.com/drop** → drag the whole `deploy` folder onto the page. You get a link like `https://something.netlify.app`. (Netlify will ask you to create a free account to keep the site permanently — do it, otherwise it expires.)
Alternative: Cloudflare Pages → Direct Upload, same idea.

## 4. Tell Supabase your link
Supabase → **Authentication → URL Configuration**: set **Site URL** to your link. This makes the password-reset email work.

## 5. Create your account (on your PC first)
1. Open your link → **Create account** → email + password.
2. If Supabase says "check your email", open the confirmation email, click it, then sign in. (Or turn off **Authentication → Providers → Email → Confirm email** to skip this.)
3. The app uploads what is on that PC. If your cloud was empty, nothing else to decide.
4. **Important:** the PC where your real data lives must be the first one you sign in on. If you sign in on the phone first, the phone's empty data would be what gets uploaded first.

## 6. Lock the door
Supabase → **Authentication → Sign In / Providers** → turn **off "Allow new users to sign up"**. Now only your account can ever get in. (To add teammates later, turn it on briefly or invite them from the Users page.)

## 7. Phone
Open the link in Chrome (Android) or Safari (iPhone), sign in, then **Add to Home screen** / **Install app**. It opens full screen like an app.

## How syncing behaves
- Everything is saved on the device first, so the app keeps working with no internet and sends changes when you're back online.
- Changes sync a few seconds after you stop typing, and the other device picks them up within ~20 seconds (or when you switch back to the app).
- If you typed something into a box and haven't added it yet when an update arrives, the app waits and shows an "Updates are ready — Apply now" bar instead of wiping your text.
- If two devices change the same field at the same time, this device's value wins and the other is saved in a conflict log (Cloud pill → Download conflict log).
- Synced: Day End Report, Won Deals, Lost Deals, Tickets, Deals (pipelines/notes), Contacts, Tasks, Smart text phrases, templates, trash and activity log. Not synced (stays per device): theme.
- Before a first merge a backup of the device's data is downloaded automatically.

## Know these limits (free plan)
- Supabase **pauses a free project after ~1 week with no use**. Open the app at least weekly; if paused, press "Restore" in the Supabase dashboard (data is kept).
- The free plan has **no automatic backups**. Use the app's **Backup** button now and then.
- Keep your link private; the sign-in protects the data, not the page itself.
- Forgot password: "Forgot password?" on the sign-in screen sends a reset link.

## Faster sync (optional, Round 43)
In Supabase → SQL editor run: `alter publication supabase_realtime add table public.kv;` — other devices then update within about a second. Without it, sync still works (checks every 6 seconds).

## Round 46: devices list (optional, one more SQL block)
The Settings → Sync & devices screen lists every device that is signed in and lets you sign one out. It needs one more table.
1. Supabase → SQL Editor → New query.
2. Paste the block at the very end of `schema.sql` (it starts with "Round 46: devices") — or paste the whole file again, it is safe to run twice.
3. Run. Nothing else changes. Until you do, the app works as before and the list only knows "this device".

## Why the app no longer refreshes by itself (Round 46)
Updates from your other device are now applied in place and only when you have paused for about 12 seconds (and nothing half-typed is in a box). If you want to decide yourself, Settings → Sync & devices → switch off "Apply updates automatically when I pause"; a small bar then offers "Apply now".

## Round 47: no phone numbers / e-mails – making sure the cloud copy is clean too
The app now cleans everything it saves, and the first time this version opens on a device it cleans what is already stored there; because that clean-up is a normal save, it also replaces the cloud copy. The cloud keeps **only the latest version of each item** (the `kv` table has one row per item), so once one cleaned device has synced, the live cloud copy has no numbers or e-mails.
Do this **in order**:
1. Open the new version on your **PC first** and wait for the "Privacy clean-up" notice (Settings → Privacy → *Scan now* should say "Nothing found"). Let it sync (cloud pill shows synced).
2. Then open it on the **phone** (it cleans itself the same way). Do not open the *old* version on any device any more – an old copy would send its numbers back up.
3. Optional check (Supabase → SQL Editor): `select key from public.kv where value ~ '\+?[0-9][0-9 .()-]{6,}[0-9]' or value ~ '[A-Za-z0-9._-]+@[A-Za-z0-9.-]+\.[a-z]{2,}';` – the only rows that may still match are plain prices / ids; contacts and Won Deals should not be listed.
4. Optional: the Contacts data is not used any more – `delete from public.kv where key = 'crm_v1';` removes it from the cloud for good.
5. Things the app cannot reach: Supabase's own database backups (paid plans keep point-in-time copies for a few days), your phone's iCloud/Google backup, files you exported earlier (CSV/PDF) and messages you already sent.
