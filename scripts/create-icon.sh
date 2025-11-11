#!/bin/bash

# Simple script to convert PNG icon to .icns for macOS

ICON_DIR="assets/icons"
ICON_PNG="$ICON_DIR/icon.png"
ICON_ICNS="$ICON_DIR/icon.icns"

# Check if icon.png exists
if [ ! -f "$ICON_PNG" ]; then
    echo "❌ Error: $ICON_PNG not found!"
    echo ""
    echo "Please save your icon image as: $ICON_PNG"
    echo "Recommended size: 1024x1024 or 512x512 pixels"
    exit 1
fi

echo "🔄 Converting icon to .icns format..."

# Create iconset directory
ICONSET_DIR="$ICON_DIR/icon.iconset"
mkdir -p "$ICONSET_DIR"

# Check if sips is available (macOS)
if command -v sips &> /dev/null; then
    echo "📐 Resizing icon to required sizes..."
    sips -z 16 16     "$ICON_PNG" --out "$ICONSET_DIR/icon_16x16.png" &> /dev/null
    sips -z 32 32     "$ICON_PNG" --out "$ICONSET_DIR/icon_16x16@2x.png" &> /dev/null
    sips -z 32 32     "$ICON_PNG" --out "$ICONSET_DIR/icon_32x32.png" &> /dev/null
    sips -z 64 64     "$ICON_PNG" --out "$ICONSET_DIR/icon_32x32@2x.png" &> /dev/null
    sips -z 128 128   "$ICON_PNG" --out "$ICONSET_DIR/icon_128x128.png" &> /dev/null
    sips -z 256 256   "$ICON_PNG" --out "$ICONSET_DIR/icon_128x128@2x.png" &> /dev/null
    sips -z 256 256   "$ICON_PNG" --out "$ICONSET_DIR/icon_256x256.png" &> /dev/null
    sips -z 512 512   "$ICON_PNG" --out "$ICONSET_DIR/icon_256x256@2x.png" &> /dev/null
    sips -z 512 512   "$ICON_PNG" --out "$ICONSET_DIR/icon_512x512.png" &> /dev/null
    sips -z 1024 1024 "$ICON_PNG" --out "$ICONSET_DIR/icon_512x512@2x.png" &> /dev/null
    
    echo "🎨 Converting to .icns..."
    iconutil -c icns "$ICONSET_DIR" -o "$ICON_ICNS"
    
    # Clean up
    rm -rf "$ICONSET_DIR"
    
    if [ -f "$ICON_ICNS" ]; then
        echo "✅ Success! Icon created at: $ICON_ICNS"
        echo "🚀 You can now run: npm run build:mac"
    else
        echo "❌ Error: Failed to create .icns file"
        exit 1
    fi
else
    echo "❌ Error: 'sips' command not found (macOS only)"
    echo ""
    echo "Alternative options:"
    echo "1. Use an online converter: https://cloudconvert.com/png-to-icns"
    echo "   - Upload: $ICON_PNG"
    echo "   - Download and save as: $ICON_ICNS"
    echo ""
    echo "2. Use Image2icon app from Mac App Store"
    exit 1
fi

