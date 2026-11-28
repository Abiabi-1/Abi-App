# Round 63 – Everything back exactly the way it was before

Request (28 Nov 2026): *"The whole thing looks so much worse now. I want everything to be exactly the way it was before. Just compare with the file and make it how it was before first. All the designs and features. Even Quick Add is messed up. All the features in Analytics are missing too."*

## What is wrong with the rebuild (compared with the file)
I compared the rebuild with your file (`abi-deploy.zip`, the app as it was). The rebuild (Rounds 57–62) is not the same app:
- **Quick Add:** different layout and behaviour.
- **Analytics:** most of it is missing. The old one has the report builder with Filters (data, period, dates, stage, plan, measure, group, sort), saved reports, Pipeline & insights, goals, forecast, best hours to call, missing info and more.
- **Design:** the design differs in many places (top bar labels, page layouts, toolbars, cards, the phone bottom bar with Quick Add in the middle).

Copying the look section by section can't make it *exactly* the same, because each old page has hundreds of small details.

## What this round does
- **The site's main page is your old app again, byte for byte the file you sent.** That is `index.html`, `sw.js`, `manifest.webmanifest`, the icons and `schema.sql`, taken from `abi-deploy.zip`. All designs and all features are exactly as before, because it *is* the old file.
- `config.js` is kept as it was before Round 62.
- The rebuild is **not deleted**. It stays in the repository at `next/` (and its source in `app/`), so nothing is lost. It is just no longer the main page.
- Removed from the site root: only the files Round 62 added there (`assets/`, `fil.jpg`, `gly.jpg`, `.nojekyll`, `old/`). `old/` was just a copy of the same old app.
- Merged into `main` and pushed.

## Your data
- The old app reads the same storage on the device and the same cloud rows it always used, so everything you had before is there.
- The rebuild was never live on your site: Round 62 needed a deploy step on your side that wasn't done, and I couldn't check it from here. So nothing was saved only in the rebuild.

## Next (only when you say)
The original reason for the rebuild was the sync problems. Round 57 §3 lists them: changes from the other device disappearing, deleted items coming back, entry times getting mixed up, updates waiting for a reload, and live updates stopping after an hour. They can be fixed **inside the old app**, without changing anything you see.

## Status
**Done. Merged into `main` and pushed.**
- Every site file in the repository root is now byte-for-byte the same as your `abi-deploy.zip`. This was checked file by file.
- `config.js` is the same as before Round 62.
- A check of the root page (no network) passed: all the old tabs are there, Analytics shows Pipeline & insights, and there are no page errors.
- If your site is linked to GitHub, it shows the old app again after this push. If you upload it by hand, `abi-deploy.zip` (your own file) is exactly what is now in the repository.
- The rebuild (`next/`, `app/`) is kept, not deleted.
