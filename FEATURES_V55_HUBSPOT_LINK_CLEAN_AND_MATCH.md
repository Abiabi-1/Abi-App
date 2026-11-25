# Round 55 – Remove "?taskid=…" from HubSpot links and make "Use last details" recognise them

Request (25 Nov): "I'm adding the HubSpot link while doing tasks there, so there is a ?taskid=(numbers). The last details don't get recognised. I want everything after ?taskid removed from the link, and for Use last details to identify it better."

## Why it fails today
- A HubSpot link copied from a task looks like `https://app.hubspot.com/contacts/<portal>/deal/<dealId>?taskId=<taskNumber>`.
- The matching code (`Use last details`, the "Seen N× · last …" line, the deal grouping in Deals) compares **the last digits found anywhere in the text** or the **exact link text**. With `?taskId=…` on the end, the last digits are the *task* number, which is different every time, so the same deal is never recognised and the same deal even splits into several deals.

## What changes
1. **Everything from `?taskid` onward is removed from the link automatically** (case-insensitive: `?taskId=`, `?taskid=`, `&taskId=`, also `task_id`), while you type, paste or fill a link box – Day End entries, Day End Quick Add, Won Deals form and Quick Add, deal / ticket / lost-deal forms and the deal record edit box. The box shows the clean link straight away.
2. **Links already saved are cleaned too**: a one-time pass over the saved data (Day End entries, Won Deals, Deals, Tickets, Lost Deals, Tasks, call log …) removes `?taskid…` from every stored link, and every later save is cleaned as well, so nothing with a task id can slip into storage. Because the cloud compares content, the cleaned data syncs to your other devices.
3. **Better recognition** ("Use last details", "Already in Deals", the "Seen N× · last …" line, duplicate warning, deal grouping):
   - links are compared by the **HubSpot deal id** in the link (`…/deal/<id>`, `…/record/0-3/<id>`), so `http`/`https`, `www`, a trailing `/`, capitals and any other `?…` or `#…` tail no longer matter;
   - a link that has no recognisable id is compared by its cleaned text;
   - plain links without a task id work exactly as before.
4. Deals that were split only because each task link carried a different task id **come back together** (same deal id → same deal).
5. The same clean-up applies on PC and phone, in all three pages (hub, Day End, Won Deals).

## Not changing
Anything after the link, notes, names, phone/e-mail rules (still never stored), the look of the boxes, the hint's wording, the existing keys of deals whose links never had a task id.

## Limits (honest)
- Only `taskid` is cut. Other query parts (`?eschref=…`) stay in the stored text but no longer stop recognition (matching uses the deal id).
- Deals that had been split by task ids may carry their old call/best-time history under the old, separate keys; the merged deal starts from the keys of the clean link.

## Tests
Clean function cases (taskId first / last / lower case / `task_id` / no task id / `www.` link / non-link text); typing and pasting into Day End entry, Quick Add and Won Deals; stored data with task ids is cleaned by the one-time pass and by later saves; "Seen" line and "Use last details" appear for the same deal with a different task id and a trailing slash; two entries with different task ids make one deal; PC and phone.

## Status
**Built and tested. NOT deployed.**
- Done: new shared helper `hubLink` (`tools/links55.tpl.js`, in hub + Day End + Won Deals): `clean()` removes `?taskId…` / `&taskid…` / `task_id…` to the end of the link; link boxes are cleaned at once on paste / blur / change and about half a second after typing stops (so typing `?taskId=` letter by letter does not leave `=555` behind); every save of app data is cleaned, and saved data is cleaned once per page load (only rewrites when a task id is found).
- "Use last details" / "Already in Deals" now matches by HubSpot record id (`same()`), so different task ids, trailing `/`, `http`/`https`, `www`, other `?…` or `#…` tails no longer matter; the "Seen N× · last…" line uses the same id (`tail()` in entry41). Deals no longer list the same link twice; deals that only differed by task id merge into one.
- Tested: `tests/test_v55.py` 24/24 (PC + phone): clean cases, same()/different ids, saved data cleaned, one deal with one link, later save cleaned, typing + paste in Quick Add, Use last details + Seen line with a different task id and trailing slash, normal entry box. Re-run clean: v41_entry, v39, v41_mob, v53, v54, v21, header, v28.
- Not done / limits: only `taskid` is cut (other query parts stay in the text but no longer block matching). Old per-deal call/best-time history stored under keys made from task-id links stays under those old keys. The Seen line's counter restarts under the new id-based key format (counts are rebuilt from the saved entries, so nothing is lost). Not tested on a real iPhone or against real HubSpot links beyond the `/contacts/<portal>/deal/<id>` shape; `/record/0-3/<id>` is handled but untested.
