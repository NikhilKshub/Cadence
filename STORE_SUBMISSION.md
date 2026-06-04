# Cadence — Microsoft Store Submission Checklist

## Required Assets
- [ ] App icon 300x300px (PNG, no transparency)
- [ ] Store logo 50x50px
- [ ] Screenshot 1: Library view (1366x768)
- [ ] Screenshot 2: Now Playing with lyrics
- [ ] Screenshot 3: Home dashboard
- [ ] Screenshot 4: Settings page
- [ ] Screenshot 5: Mini player

## Store Listing
- App name: Cadence
- Short description (max 270 chars):
  "Cadence is a premium offline music player 
  for Windows. Features synced lyrics, album 
  art, Last.fm scrobbling, Discord presence, 
  sleep timer and beautiful dark UI."
- Category: Music
- Age rating: Everyone
- Privacy policy URL: Required (create one)
- Support URL: Required

## Pricing
- Free (recommended for initial launch)
- Or: Free with optional tip/donation

## Build Steps
1. Run: npm run tauri build
2. Find installer at: 
   src-tauri/target/release/bundle/
3. Test the installer on a clean Windows machine
4. Sign the app (required for Store):
   - Get code signing certificate OR
   - Use Microsoft Store's automatic signing

## Privacy Policy Template
- Cadence does not collect personal data
- Music files stay on device
- Last.fm integration is optional
- Only song title/artist sent to Last.fm
- No analytics or tracking
