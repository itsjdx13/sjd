# Roco Guys: checks still requiring a person

These checks are **not yet verified**. Automated checks cannot confirm spoken Persian pronunciation, real phone permissions, installation, or physical touch behavior.

## Windows with your screen reader

Use demo data and your usual screen reader. Do not enter real employee information.

1. Open the login screen. Navigate through the heading, email, password, role and login button. Check that labels and the demo-only explanation are understandable.
2. Submit an invalid email and then a short password. Focus should move to the incorrect field. Confirm the spoken error explains how to correct it.
3. Open requests and choose “درخواست جدید”. The dialog title should be announced; background navigation should not be reachable while it is open.
4. Choose hourly leave and submit without filling its times or reason. Check that each error is read with its own field. Correct the times and submit again: focus should move to the reason.
5. Tab forward and backward through the entire dialog. Escape should close it and return focus to “درخواست جدید”.
6. Visit profile. Check the selected tab, arrow-key changes, and the matching panel heading/content.
7. Check clock status, request-submission confirmation, import results and download announcements. Confirm Persian dates, employee codes and mixed numbers are understandable.
8. Navigate with headings/landmarks and test enlarged text. Report any unreachable controls, repetitive announcements or text hidden by fixed navigation.

For each issue, record the route, browser, screen reader, action, expected speech/focus, and actual result. Do not mark this checklist complete solely because automated tests pass.

## Real Android and iPhone

The current preview address is local to the Windows computer. A phone cannot open that computer's `127.0.0.1` address. Arrange an explicitly approved secure preview accessible to the phone before testing; no public deployment was made for this pass.

1. Verify the app fills the screen, with no device frame, overflow or Persian text clipping.
2. Open a request, show the real keyboard, scroll to the final buttons, and dismiss the dialog by button/backdrop/swipe. Check keyboard and bottom-navigation overlap.
3. Test camera/location denial, permission recovery and QR scanning against a separate workplace display. Use demo punches only.
4. Load online first, then reopen offline. Check that offline status is clear and that existing data survives.
5. Test the browser's installation flow and reopening the installed app. Record actual browser/OS versions and behavior; desktop emulation is not a substitute.

Demo limitations remain: client-only sessions/permissions and QR secret, sample historical attendance, attachments stored as names, and browser-local data that does not automatically sync between devices.
