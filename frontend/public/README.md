# Public Assets

This directory contains static assets served by the application.

## Favicon & App Icons

### favicon.svg
Modern SVG favicon that scales perfectly at any size. Features:
- Server rack with 3 server boxes
- Activity indicator (green pulse)
- Gradient styling matching the app's design system
- Dark theme background (#0f172a to #1e293b)
- Accent color (#38bdf8) for server boxes

### apple-touch-icon.svg
Optimized version for iOS home screen icons:
- Larger, simpler design for better visibility
- 180x180 viewport with proper padding
- Rounded corners for iOS styling
- Same color scheme as main favicon

### site.webmanifest
Web App Manifest for progressive web app (PWA) support:
- App name: "DILab Monitor"
- Short name: "DILab"
- Theme colors matching dark mode
- Icon configuration for various sizes

## Browser Support

- **Modern browsers** (Chrome, Firefox, Safari, Edge): Use `favicon.svg`
- **iOS devices**: Use `apple-touch-icon.svg` for home screen
- **PWA installation**: Uses `site.webmanifest` configuration

## Design Rationale

The favicon design represents:
1. **Server racks** - Core infrastructure being monitored
2. **Activity indicators** - Real-time monitoring status
3. **Color coding**:
   - Green dots: Active/healthy systems
   - Yellow dot: Warning/activity state
   - Blue gradient: Primary brand color (#38bdf8)
   - Dark background: Matches app's dark theme

## Updating the Favicon

To update the favicon:

1. Edit `favicon.svg` with any SVG editor
2. Maintain the viewBox="0 0 64 64" for consistency
3. Keep the same color palette for brand consistency
4. Update `apple-touch-icon.svg` if making major changes
5. No build step required - SVG is served directly

## Color Palette Reference

```css
/* Background */
--bg-start: #1e293b;
--bg-end: #0f172a;

/* Server boxes */
--server-start: #38bdf8;
--server-end: #0ea5e9;

/* Status indicators */
--active: #10b981;   /* Green - active */
--warning: #fbbf24;  /* Yellow - warning */
--pulse: #d1fae5;    /* Light green - pulse center */
```

## File Locations

```
frontend/
├── public/
│   ├── favicon.svg           # Main favicon (64x64)
│   ├── apple-touch-icon.svg  # iOS icon (180x180)
│   ├── site.webmanifest      # PWA manifest
│   └── README.md             # This file
└── index.html                # References all icons
```

## Testing

After making changes:
1. Hard refresh browser (Ctrl+Shift+R)
2. Check browser tab for icon
3. Test iOS home screen (Safari → Share → Add to Home Screen)
4. Verify PWA installation icon

## Future Enhancements

If needed, you can add:
- PNG versions for older browser support
- Different sizes for various contexts
- Favicon.ico for IE11 support
- MS Tile images for Windows

For now, SVG provides the best balance of:
- File size (< 3KB)
- Scalability (perfect at any resolution)
- Browser support (all modern browsers)
- Easy maintenance (text-based format)
