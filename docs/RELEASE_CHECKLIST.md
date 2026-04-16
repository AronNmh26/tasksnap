# Week 12 Release Checklist (TaskSnap)

**Goal**
Prepare a stable, installable release build for real users.

**Release Readiness**
1. Confirm no placeholder text in UI.
2. Confirm no dead buttons.
3. Confirm critical flows work: login, create task, edit task, delete task.
4. Confirm offline behavior shows friendly errors instead of crashing.
5. Confirm notifications and storage usage work on device.

**App Info**
1. App name: TaskSnap.
2. App icon: `assets/icon.png`.
3. Privacy policy available in-app.
4. Support email: `6731503078@lamduan.mfu.ac.th`.

**Release Build (Android)**
1. Generate release keystore (keep it private and backed up).
2. Configure signing in Gradle using `key.properties` (do not commit).
3. Build a release artifact:
`expo build` or `eas build -p android` for AAB.
4. Test the release build on a real device (smoke test).
5. Update Firebase SHA-1 if login fails on release builds.

**Submission Assets**
1. Store description and short summary.
2. Screenshots from real devices.
3. Feature graphic (Play Store).

**Distribution**
1. Upload AAB to Play Console (preferred).
2. Or share APK manually for testers.

**Final Gate**
1. No crashes in primary flows.
2. UI looks clean on multiple screen sizes.
3. All buttons do something real.
