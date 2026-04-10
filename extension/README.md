# JobSensei Chrome Extension MVP

This folder is an unpacked Chrome extension for local testing.

## Load it in Chrome

1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select the `/extension` folder from this repo

## What it does

- Reads the current job page
- Lets you review/edit company, role, URL, and JD text
- Opens JobSensei on the same browser/device
- Creates or updates the tracker application through the app-side extension bridge

## App URL

The popup defaults to `https://jobsensei.app`, but you can point it to:

- a local dev app like `http://localhost:5173`
- a Vercel preview URL
- the production app

The extension remembers the last app URL you used.
