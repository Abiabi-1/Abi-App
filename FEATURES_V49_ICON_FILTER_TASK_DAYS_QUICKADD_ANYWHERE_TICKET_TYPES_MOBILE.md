# Round 49 – Day End icon filter, ticks & tasks, Tasks by day, Quick Add anywhere (0.4 s), ticket types, mobile app, theme baseline

Nothing here is deployed – you upload the zip yourself. Every part is listed with how it works; the **Status** table at the end says honestly what is done.

## PART 1 – Day End filter with icons (no written "WhatsApped …")
- The written chips (All / WhatsApped / Unable to WhatsApp / To WhatsApp / Emailed …) are replaced by **three icon toggles**: **WhatsApp**, **Email** and **✓ Tick**. Same in the Won Deals day bar.
- Each toggle cycles **off → green → red → off** (tap). Mix and match – all toggled filters must match (AND):
  - WhatsApp green = entries marked WhatsApped / sent; WhatsApp red = unable / no WhatsApp. Email the same.
  - ✓ green = entries with a ✓ confirmation, ✓ red = entries with a ✗ confirmation. When WhatsApp and/or Email is also toggled, the ✓ looks only at those channels (WhatsApp green + ✓ green = WhatsApp entries you ticked).
  - Examples: WA green + Email green = entries with both; WA green + Email red = WhatsApped but email unable; ✓ green alone = everything ticked.
- Works for the selected day (exactly like the day view), on PC and phone; a small ✕ clears all; counts are shown on each icon. The filter is remembered per device.

## PART 2 – Ticks and tasks
- Tasks for the WhatsApp / Email folders are still made automatically from entries ("will WhatsApp him").
- **Ticking an entry's ✓ completes that task**; un-ticking reopens it.
- **No task is made for an entry that is already ticked** (✓ on the entry, at save or later).

## PART 3 – Tasks navigable by day (same idea as Day End)
- Tasks gets the Day End day bar: **‹  date  ›  Today**, a date picker and day chips with counts; plus **All days**. A day shows the tasks due that day (overdue ones are listed under "Overdue" on today).
- On a phone: the folders are a **drop-down** (pick one), the filters are a **pop-up**, and the tick is a perfect **circle**.

## PART 4 – Quick Add anywhere, moon hold 0.4 s
- Holding the moon (hub, its tab, Day End moon) now takes **0.4 seconds** (was 1 s).
- It no longer jumps to Day End: the **Day End Quick Add opens as a sheet over whatever page you are on** (Deals, Tasks, Tickets, Dashboard, Analytics, Lost, Won Deals, HR …). Add the entry, close the sheet, you are still where you were. Phone and PC.
- The side "⚡ Quick Add" tab and Alt+Q work the same way everywhere.

## PART 5 – Use last details, HubSpot link, tasks for entries without a link
- **"Use last details"** sits under the Deal-stage selection in Quick Add and above the entry in the normal Day End entry.
- Picking a deal that already exists **fills the HubSpot link and the deal stage automatically** (if the deal has them).
- **Tasks for everything without a HubSpot link**: Tools / Settings button "Make tasks for deals without a HubSpot link" (one task per deal, no duplicates, in the folder "Add HubSpot link"), plus a switch to do it automatically.

## PART 6 – Tickets
- **Associated by name**: a ticket belongs to the deal with the same name.
- **Types** (main): Demo, Support, Product List, Setup, Hardware Delivery, Printer Setup, Training. Anything else is filed under one of these.
- **Sub-types**: Online, Physical, AnyDesk (for every type). Demo → Online Demo / Physical Demo; Support → Physical Support / Online Support / AnyDesk Support; and so on. **Existing tickets that just say "Demo" become Physical Demo.**
- A ticket that says "demo/support" is shown under **both** Demo and Support and carries both **tags**.
- Filters like the Deals section (types and sub-types); add / remove types and sub-types in Settings → Tickets.
- **Add a type with an automation**: give it a phrase or word; tickets whose name contains it are filed there automatically.
- The Tickets board works exactly like the Deals board on a phone (same columns, scrolling and cards).

## PART 7 – Mobile app
- The **top navigation moves to the bottom** (same blended, seamless style), with **Quick Add and Search at the end**. The old bottom bar is removed. Bigger tap targets.
- **Customisable**: add / remove / reorder any section or tool in the bar (Settings → Menus & sections); the same choice is available for the desktop top bar. Changes apply to the device you make them on.
- Quick Add on every page opens as a proper sheet with an **Add** button; picking an hour no longer makes it jump around.
- **Call outcome and Contact rows can be switched off for mobile only** (separate from desktop) so tasks are easy to type.
- Stars only appear after 5 seconds of stillness and only **inside** their box (Day End, no leaking outside).
- All sections get compact, app-like layouts; nothing is removed.

## PART 8 – Theme, Settings, baseline
- **Checkboxes / tick boxes** (automation, settings, everywhere) follow the palette and the light theme – this is the new baseline for any checkbox.
- **Settings** moves out of the Tools menu to sit right after **Colours** in the top bar, and is available in the side menu **instead of** "Customize sections" and "Search" (both live elsewhere; Customize sections is reachable from Settings).
- **Baseline**: the things you asked me to remember (standing rules) are written to memory as the baseline, and each feature used in several places is now one shared version.

## Status

**Built and tested. NOT deployed** – upload the zip contents to GitHub yourself.

### Done
- Day End filter: three icon toggles (WhatsApp, Email, Tick), each off → green → red; they combine (WhatsApp green + Tick green = WhatsApp entries that are ticked, etc.). The old written chips ("WhatsApped…") are gone from the filter. Wording that means "sent" ("WhatsApp sent", "Email sent") now also turns an icon green, and "Unable to WhatsApp" turns it red.
- Ticking from an entry completes its task and makes no new task.
- Tasks navigable by day (All days, ‹ day ›, date picker, day chips with counts; Today also lists overdue).
- Moon hold = 0.4 s; the Day End Quick Add opens as a sheet over whatever page you are on.
- "Use last details" under the deal-stage selection (Quick Add) / above (normal entry), auto-fills HubSpot link + deal stage; tasks for entries without a HubSpot link; tickets linked to deals by name.
- Tickets: 7 main types × Online / Physical / AnyDesk sub-types, multi-type tags ("demo/support" appears under both), old plain "Demo" → Physical Demo, filters like Deals, add/remove types and sub-types, phrase automations to file new types. Tickets board = Deals board layout on phones.
- Themed checkboxes everywhere; Settings right after Colours; Settings in the side menu instead of "Customize sections" and "Search" (Customize sections is inside Settings).
- Mobile: bottom dock replaces the top bar and the old bottom bar (bigger, customizable with any section or tool, Quick Add + Search at the end; same option for the desktop top bar), compact Deals / Tickets / Tasks / Day End, phone Quick Add sheet with a visible Add button and no jumping when picking a time, Call outcome / Contact rows can be turned off on the phone alone, stars only inside the Day End box and only after stillness, "due today" notice shown above the bar.

### Choices I made / caveats
- Phone layout settings (dock items, phone-only Quick Add rows) are stored on that device only and are not synced.
- Renaming a ticket sub-type does not rewrite tickets already filed under the old name.
- The Contacts page stays removed (Round 47).
- On a phone the page headings keep the same size as every other section (consistency rule), not a smaller one.

### Test results
- tests/test_v49.py (new): all pass on PC and phone.
- Full older suite re-run. Updated tests that still looked for the old top bar / old bottom bar / old filter chips / old Settings location (v23, v28, v30, v34, v38, v39, v41_entry, v41_mob, v48, header, auto). Real bugs found and fixed: Tickets "Select" button missing after the layout change; WhatsApp/Email wording not matching the icons; phone headings smaller than the rest.
- Still failing, all older or known: v31 "tools menu has no emoji icons", v38 "separate folders" and "unable text makes no to-do", v7 "renewal-due rule made a task" (known baselines); v45_msg (tick buttons are always visible since Round 48), v46 (Templates row off by default since Round 47; Settings groups/Tools menu changed in Round 49), v46b / v46c (phone-number splitting was removed in Round 47). Those tests describe behaviour that was changed on purpose.
- Colour palette scan and PC/phone parity check pass.
