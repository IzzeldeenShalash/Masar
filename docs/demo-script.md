# Masar walkthrough

All agencies, service rules, incidents and announcements in this walkthrough are fictional. Real Jordan geography and optional foreground GPS provide location context, not government integration. Never present a showcase announcement as a real outage or emergency notice.

## Prepare

1. Configure `apps/api/.env` privately with your development MongoDB URI and `DEMO_MODE=true`. For local AI, run Ollama with the configured downloaded model; [Stage 6](stage-6.md) describes setup and limits.
2. Optionally run `npm.cmd run demo:scenarios` from the root. This adds labeled showcase records to that configured database; it preserves existing passwords and changed report/announcement states. Repeating it does not reset the demo after it has been acted on. Use a separate fresh development database if a fresh story is needed.
3. Run `npm.cmd run dev -- --clear`, then scan the new QR on the same Wi-Fi. The welcome screen offers account creation or sign-in. Do not start another API/Metro process alongside the launcher.
4. Fresh seed logins are `user@demo.com` and `agency@demo.com`, password `MasarDemo!2026`. Existing passwords are unchanged. For simultaneous views use the phone for the user and the web view for the agency; two browser tabs normally share the same session cookie.

## Electricity notice and independent reports

1. As the user, open Home, Reports and the notification bell. The optional seed includes `MS-SHOWCASE-1701` and `MS-SHOWCASE-1702`, two separate in-progress reports, plus a labeled active outage notice. Open each detail and its timeline.
2. To demonstrate new submission, choose Report an issue. Enter facts, optionally capture/select a real photo, review the GPS/manual location, and inspect AI suggestions or continue manually. Submission returns a real database case number and awaiting-review state; a suggestion does not assign ownership.
3. As the agency, choose Noor Electricity. Open the queue and the submitted report. Accept responsibility, add a public progress update, and show the distinction from private internal notes.
4. In Alerts, create a draft electricity outage notice, choose the relevant saved areas, preview the matching subscriber count and authorized linked reports, then confirm publication. Alternatively open the seeded active notice to demonstrate its existing links. Fictional showcase neighborhoods and real saved service cells are distinct targets: choose areas the demonstration user actually follows.
5. As the user, refresh Alerts/Home and open the bell. Show the published notice, affected areas, estimate/history and linked-report access without exposing other reporters' private data.
6. As Noor, revise the estimated restoration time and add progress, then resolve the notice with a reason. Show that the linked reports remain independently in progress.
7. For each report, complete required tasks and submit a resolution summary with genuine selected evidence. The citizen confirms one report and reopens the other with a reason. Only citizen confirmation closes the report; resolving an announcement does not.

## Scheduled road closure

1. Switch the agency workspace to Madar Roads. Open the scheduled showcase road closure in Al Amal. Its start time is initially tomorrow and no end time is supplied.
2. Show the targeted area and history. Cancel with a reason to demonstrate cancellation, or create a separate short-future scheduled notice to exercise the worker.
3. To demonstrate restart recovery, stop and restart the development launcher after that notice is due. The persistent worker publishes it once and notification deduplication prevents repeated deliveries. Refresh the subscribed user's view. An estimated end does not automatically resolve a notice.

## Accountable transfer and required task

1. Open `MS-SHOWCASE-1703`. Initially Noor remains the accepted owner while the seeded transfer to Madar is pending.
2. In Madar's incoming transfers, accept with a reason. Reopen the report and show the changed owner and preserved transfer history. Declining a separate transfer would retain its original owner.
3. Open the required Madar road-restoration task. Other agencies cannot update it. Complete it with the required evidence, then request citizen resolution review. An incomplete required task blocks that review.
4. As the citizen, inspect the public timeline, then confirm or reopen. Private agency notes and other reporters' evidence must not appear.

## Profile and recovery

Edit the profile, saved/followed places, language and notification preferences, then reload to show persistence. Contribution counts come from saved reports. Demonstrate a temporary API outage and retry, and Ollama unavailability with manual submission. Sign out to demonstrate session revocation.

This script is a reproducible walkthrough guide, not a record that all phone interactions were performed. See [verification](verification.md) and the pending [device checklist](device-qa.md).
