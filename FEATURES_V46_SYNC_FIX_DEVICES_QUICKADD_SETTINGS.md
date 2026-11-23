# Round 46 – Sync fix (no more refreshing), Devices & sessions, Quick Add customising, Settings hub

Everything you asked for in this round is listed below, nothing skipped. Part A is the most important one (the refreshing).
Nothing existing is removed: every old button, row and tool is still there. The new switches only let you hide things, and the defaults keep today's behaviour except where you asked for a change (marked **changed default**).

---

## PART A – The refreshing problem (root cause + proper fix)

### A1. What was really happening
1. Your app keeps its data in the phone's/PC's own storage, and the cloud keeps a copy so the devices match.
2. When the other device saved something, this device received it and **reloaded the whole page** to show it. Reloading is what threw away what you were typing, scrolled you to the top and made the screen flash.
3. After a reload the app starts up again. Several parts write small things at start-up (automation checks, the WhatsApp/Email task scanner, Smart rules, order/cache items). Those writes were sent to the cloud, and **the other device then reloaded because of them**, and its start-up wrote again… a ping-pong between two devices. It slows down when nothing differs, but every real change started it again.
4. The "guard" from Round 43 only counted reloads (max 2 in 30 s) and then showed a message ("Sync paused…"). It limited the damage, it did not remove the cause, and the message kept popping up.
5. A reload was also triggered when the update changed **nothing** (for example both devices created the same automatic task with the same id).

I reproduced this with two simulated devices on the test cloud: one entry written on device A made device B reload, B's start-up writes made A reload again, and so on for several rounds before it settled.

### A2. Do sockets fix it?
No – sockets only make updates **arrive faster** (we already use them since Round 43). Fast delivery of an update that then reloads the page makes the interruptions more frequent, not fewer. The fix is in **what the app does when an update arrives**.

### A3. How other apps do it (what I copied)
| App type | What they do |
|---|---|
| Google Docs, Notion, Figma | Never reload. Changes arrive as small pieces and are merged into what is on screen. Your own typing always wins locally. |
| WhatsApp / iMessage | Send immediately, receive through a live connection (socket), show the change in place. |
| Local-first apps (Linear, Obsidian Sync, Replicache) | Data lives on the device, a background process merges. The screen only repaints the part that changed, and never while you are in the middle of editing it. |
| Dropbox / iCloud | Version numbers per item, a 3-way merge when two devices changed the same thing, conflicts kept, nothing silently lost. |
Our data merge (version numbers + 3-way merge) was already of that kind. What was missing is the "never reload / repaint in place / wait while the user is busy" part.

### A4. The fix (all implemented)
1. **No more full-page reload.** An update from the other device is saved into the device and then shown in place: the Tasks, Tickets, Contacts, settings, snippets etc. refresh themselves; only the Day End / Won Deals frame that actually owns the changed data is re-drawn (not the whole app).
2. **Never while you are busy.** The update waits until you have not touched the keyboard, mouse or screen for 12 seconds **and** no text box is focused or half-filled. It is then applied in the background. If you keep working, it simply waits (a small, quiet "Update ready" pill is the only sign – no pop-ups). Leaving the app (phone locked / tab hidden) applies it right then if nothing is half-typed.
3. **Only real changes.** If the update makes no difference to this device's data (same content, only different order/spacing), nothing happens at all – no re-draw, no reload, no toast.
4. **Start-up chatter cannot ping-pong any more.** Items that only record background activity (automation run log, Studio statistics, message-task "seen" list) are merged silently without any re-draw. A device never re-saves an item just because it received it.
5. **The guard is replaced** by a calm limit: if updates keep arriving more than 6 times in a minute, applying is slowed down to once per minute – silently. The old "Sync paused" pop-up is gone.
6. **Re-draw keeps your place.** When a frame has to be redrawn, its scroll position is restored.
7. **Scanner and automations are quiet on startup** (they re-check on the update, but only write when they actually create/change something).
8. A **Sync settings** section (Settings → Sync & devices) shows the state and lets you switch "Apply updates automatically when I pause" off (then updates wait for a tap on the pill).
Test result for the 2-device loop script is in the status table.

### Honest limits
- Two devices typing in the **same** entry at the same moment still ends in a merge (nothing lost; the conflict log keeps both). That is normal for every app.
- The cloud and the live connection were tested with the test cloud, not with your real Supabase.

---

## PART B – Devices & sessions

### What you get
**Settings → Sync & devices** (also in the cloud pill menu → "Devices"): a list of every device signed in to your account: name (e.g. "iPhone – Safari", "Windows PC – Chrome"), "This device" badge, **Online now** (green dot) or "last seen 2 h ago", first signed in, and a **Sign out** button per device. Also **Sign out all other devices**.

### How it works
- Each device registers itself in a small `devices` table (id, name, browser, platform, first seen, last seen) and refreshes "last seen" every minute while the app is open (and when it opens/closes).
- "Online now" = seen in the last 2½ minutes.
- **Removing a device** marks it removed in the table. That device notices within seconds (live connection) or at its next check, **signs itself out of the cloud** (data stays on that device, it just stops syncing and shows the sign-in screen).
- **Sign out all other devices** additionally asks the login service to end every other session of your account (Supabase "sign out others"), so those devices cannot even renew their login.
- You need to run **one new block of SQL** (it is at the end of `cloud/schema.sql`, safe to run again). Until then the list shows only "This device" and a note telling you to run it.

### Honest limits
- A removed device that is switched off is signed out the next time it opens and connects. The login service can only invalidate a single device's login for real with the "sign out others" option; the per-device Sign out is the app's own removal (it works as long as the app code is the one from this version).
- Devices that never updated to this version will not appear in the list until they do.

---

## PART C – Quick Add

### C1. What those rows are (answer to "what even is that?")
| Row | What it is |
|---|---|
| **Recent** | The last deals you entered; tap one to fill the boxes. |
| Quick notes (No answer, Left message …) | Phrases that go into the Notes box. Already editable (✎). |
| **Templates** | **Entry templates** (note + stage presets such as "Demo booked", "Going live", "Paid"). They are **not** your WhatsApp/email message templates (those live in Tools → Templates). |
| **Call outcome** | Logs how a call went (Answered, No answer, Busy …) into the call statistics. |
| **Contact** | The WhatsApp / Email buttons (WhatsApped, No WhatsApp, WhatsApp today, Emailed, No email, Email today) that feed the automatic WhatsApp / Email tasks. |

### C2. Customise Quick Add (every row switchable)
A small **✎ Customise** button at the end of the Details area (and Settings → Quick Add):
- Show or hide each row: Recent, Quick notes, Templates, Call outcome, Contact.
- **Call outcome**: show/hide each outcome, rename how it is shown, change order, add back hidden ones.
- **Contact shortcuts**: same (show/hide, rename the label, reorder, add back).
- Quick notes and Templates keep their existing ✎ editors.
- **Everything is one shared setting**: change it in Quick Add and it changes in every hour block of Day End, in Won Deals forms and the Won Deals Quick Add (anywhere those rows appear), on phone and PC.
- **Compact rows** (switch): smaller, tighter rows for the Quick Add area.
- Default: all rows shown, as before.

### C3. Hold a type to jump to its section
In Quick Add, with an hour selected, **holding Task / Call / WhatsApp / Ticket / Other** scrolls Day End to that section inside that hour (opens the hour if closed) and flashes it – the same way holding an hour jumps to the hour.

### C4. Recents: one scrollable row
The Recent row is now a **single line** you can scroll sideways: drag it (touch or mouse), use the mouse wheel, or the small ‹ › buttons that appear when the mouse is near an edge (same as the day tabs). It no longer wraps into several lines above the boxes. It also shows more (up to 12).

### C5. No more huge drop-down for numbers/names
The browser's big list of all deals/numbers is replaced (default **changed**) by compact suggestions: while you type a number or deal, the Recent row **filters to the matching deals** (max 12, one line, scrollable). Options in Customise: *Compact (default)*, *Old drop-down*, *Off*.

### C6. "Use last details" no longer covers the boxes
It was a floating bar placed over/near the number box. It now appears **inline in the Details area where Templates / Contact / Call outcome are** (a one-line bar: "Already in Deals: Name (stage) · Use last details · ✕"). Where it appears can be changed: *With the rows (default)*, *Right under the box*, *Floating (old)*.

### C7. Typing preview (long text)
The long-text preview is now the **same size and place as the Smart Text popup**: as wide as the box you type in (min. 280 px), directly under it (above it if there is no room), max 3 lines – no full-width bar over other details. It only appears when Smart Text has **nothing to suggest**: Smart Text options show first; when they run out, the preview shows what you are typing as the top row of that same box. Option *Old bottom bar* in Customise.

---

## PART D – Entries with two numbers in one box
The app already supports **extra numbers** on an entry (main number + extra numbers, each can have its own note). Older entries where you typed two numbers into the main box (`7771234 / 7775678`, `7771234, 7775678`, `7771234 7775678`, `+960 777 1234 & 999 5678`) are found by **Settings → Data → Split double numbers**:
1. It lists every Day End and Won Deals entry with two numbers in one box and shows what it will become (first number stays, the second becomes an extra number of the same deal – same deal name, same stage/plan/price/notes).
2. You tap **Split all** (or untick single ones). A restore point is taken first and can be undone.
3. Because both numbers now belong to the entry, typing **either** number later offers **Use last details** with the deal's details (history looks at extra numbers too).
A one-time quiet notice appears when such entries exist.

---

## PART E – Settings hub (organised) + customisable Tools + feature switches

### E1. Settings hub (**Tools → Settings**, also ⚙ in the cloud pill menu and Cmd/Ctrl+,)
One organised place, with a list of groups on the left (phone: list → detail):
1. **Quick Add** – everything from Part C.
2. **Features on/off** – turn whole features off entirely (list below).
3. **Tools menu** – show/hide, pin favourites, order, "most used first", search box.
4. **Menus & sections** – opens the existing "Customize sections" (top bar, side menu).
5. **Sync & devices** – state, sync now, automatic apply, devices list, sign out others (Part A/B).
6. **Automations** – on/off for message tasks, link to Automation Studio, Smart rules, Rules.
7. **Appearance & phone** – links to Palette/Theme and the existing phone comfort settings.
8. **Data & safety** – Split double numbers, restore points, backups, export.
All existing panels still open from where they were.

### E2. Feature switches (entire features, default on)
| Switch | When off |
|---|---|
| Duplicate warning ("Already saved …") | no warning, saving is never blocked |
| Follow-up prompt after saving | prompt does not appear |
| Promise tracker (“will send price list” → task) | no automatic promise task |
| WhatsApp/Email message tasks (existing switch) | no automatic message tasks |
| ✗/✓ send buttons on entries | buttons hidden in Day End |
| Call hints (best time to call …) | hints hidden |
| Hold an hour/type to jump | holding does nothing |
| Hold the moon for Quick Add | holding does nothing |
| Typing preview | no preview at all |
| Copy chips on entries | hidden |

### E3. Tools menu
- **Pin** a tool (★) → pinned tools sit at the top.
- **Most used first** (switch): the menu orders itself by how often you open each tool (counted on this device, synced).
- **Show / hide** and **order** (reuses and respects "Customize sections").
- A **search box** at the top when there are many tools. "Settings" and "Customize sections" always stay in the menu.

---

## Status (after testing – honest)
| Item | Status |
|---|---|
| A. No page reload for updates; wait while busy; no-change ignored; no start-up ping-pong; no "Sync paused" pop-up | Done – 2-device test on the test cloud: device A never reloads, B redraws only the Day End/Won Deals frame once, typing defers the update |
| B. Devices list, sign out one device, sign out others, online dot | Done on the test cloud. **Not tested on your real Supabase** – you must run the new `devices` SQL block first |
| C1–C2 Customise Quick Add (rows, outcomes, contacts rename/hide/reorder, compact rows) shared everywhere | Done (phone + PC) |
| C3 Hold a type to jump to its section inside the chosen hour | Done |
| C4 Recent as one scrollable line (drag, wheel, edge buttons) | Done |
| C5 No big drop-down (compact suggestions; old drop-down and off available) | Done |
| C6 Use-last-details inside the Details area (3 positions) | Done |
| C7 Typing preview beside the box like Smart Text, only when Smart Text has nothing; it never blocks taps below it (only its ✕ is tappable) | Done; old bottom bar kept as an option |
| D. Split two numbers in one box into two numbers of the same deal | Done for Day End and Won Deals, with restore point |
| E1 Settings hub (Tools → Settings, Ctrl/Cmd+,) | Done |
| E2 Feature switches | Done (only switches that really do something are listed) |
| E3 Tools menu pin / hide / order / most used first / search | Done |

**Tests:** the full regression list was run. Changes in defaults you asked for made 3 older tests out of date (old floating "use last details", old bottom typing bar, old datalist); I updated those tests to the old-style options and they pass. Known flaky/baseline failures that are not from this round: v7 (renewal rule), deals, v3 "call + whatsapp links", v31 "visible on hover", v27 moon-over-HR (passes alone), v38 (adds the same number twice quickly), plus time-of-day tests.

**Not done / limits (honest):**
- Nothing is deployed – you upload the zip.
- Not tested on a real phone, real Supabase or real two physical devices.
- Per-device Sign out is the app's own removal; "Sign out all others" is the account-level one.
- Hub-memory settings can still trigger a full reload on another device, but only when idle and rate-limited.
- Automations run only while the app is open.
- Customising *where* the Templates/Contact/Call-outcome rows appear is not built yet (you said "for now" – only the placement of Use-last-details and typing preview is switchable).
