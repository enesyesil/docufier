# Icon Setup - Simple Instructions

## Easiest Method (3 steps):

### Step 1: Save your icon
Save your icon image as: `assets/icons/icon.png`
- Recommended size: 1024x1024 or 512x512 pixels
- Format: PNG with transparent background (if needed)

### Step 2: Run the conversion script
```bash
npm run icon
```

That's it! The script will automatically create `icon.icns` for you.

### Step 3: Build the app
```bash
npm run build:mac
```

---

## Alternative: Online Converter (if script doesn't work)

1. Go to: https://cloudconvert.com/png-to-icns
2. Upload your `assets/icons/icon.png`
3. Download the converted file
4. Rename it to `icon.icns` and place it in `assets/icons/`
5. Run `npm run build:mac`

---

## What the icon will be used for:
- App icon in Applications folder
- Dock icon when app is running
- File association icon for `.docf` files
- DMG installer icon

