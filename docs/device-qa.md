# Hands-on release checklist

All boxes below are **pending manual verification**. Passing API tests or exports does not check these off. Record device/browser, OS, Expo Go/development-client version and results when performed.

- [ ] Start with `npm.cmd run dev -- --clear`, scan the fresh QR, and see Welcome with Get started and Sign in. Normal restart without `--clear` preserves the validated session.
- [ ] Sign up, sign in as each demo role, switch Noor/Madar, open every visible tab/detail and sign out. Verify expired sessions return to sign-in and a disconnected API shows recovery without discarding a valid saved session.
- [ ] Toggle English/Arabic, restart, and confirm persistence. Inspect the sidebar/tabs, back arrows, headings, forms, sheets and timeline. Email, case IDs and coordinate pairs must retain their reading order. Agency-written content remains as written.
- [ ] Use large system text (including 200% where supported), landscape and the keyboard. Forms/actions must remain reachable without clipped errors or buttons. Check safe areas and modal dismissal.
- [ ] On desktop web, Tab through controls, verify visible focus and activate with Enter/Space. At wide widths confirm sidebar navigation and case columns; at narrow widths confirm tabs and single-column layout.
- [ ] With VoiceOver/TalkBack, inspect input labels, errors, loading/busy states, unread count, sheet title and status text. Confirm logical reading order.
- [ ] Enable reduced motion. Confirm startup/sheets and map recentering avoid unnecessary motion.
- [ ] Grant foreground location, move/reopen the app and confirm GPS recentering. Deny permission, disable location services and test Settings/manual-entry recovery. No background location should be requested.
- [ ] Capture a photo on a real device; select a library photo; cancel; deny permission; retry via Settings. Verify preview/removal, upload error handling and private authorized retrieval. Browser camera behavior may differ.
- [ ] Submit a report, recover a draft after restart, open its timeline, and verify retries do not duplicate it. Disconnect during a request and confirm a truthful error/retry state.
- [ ] Follow/unfollow a place, reload, and inspect matching announcements. Verify real GPS and saved home selection are distinguishable. Seeded incidents/notices must remain visibly fictional.
- [ ] Run the three stories in the [demo script](demo-script.md), including pending transfer accountability, required-task gating, alert/report independence, and citizen confirmation/reopening.
- [ ] Shut down Ollama, review a report, and confirm manual submission works. Restart Ollama and inspect real provider/model state. Text-only analysis must not claim to have inspected photographs.

In-app notifications require an open/foregrounded app and refresh/polling. OS push and closed-app notification delivery are not implemented or claimed.
