# Firestone Fire & Security Systems — Website

A redesigned, 3D-animated front end for Firestone Fire & Security Systems LLC.

## Features
- **Three.js 3D hero**: an extruded Firestone "FS" logo that assembles itself, rising fire embers, a radar-pulse grid floor, pressure-gauge rings and a network of alarm sensors
- **Scroll animation** (GSAP ScrollTrigger): a 3D photo stack, a timeline line that fills as you scroll, background parallax, and cards that flip up into view
- **3D interactions**: service and office cards that tilt toward the mouse with a light glare, Mission/Vision cards that flip, and a draggable 3D photo carousel
- A scrolling strip of client logos, animated counters, a live system-status panel, and a quote form that opens a pre-filled email to sales@firestonefs.com
- Responsive down to mobile, and respects the system's reduced-motion setting

## Run locally
Open `index.html` directly, or serve the folder:

```bash
python -m http.server 5174
```

Then visit http://localhost:5174

## Structure
```
index.html
css/style.css
js/hero3d.js      # Three.js hero scene
js/main.js        # UI, scroll animations, carousel, modal
js/mark-data.js   # embedded logo mark texture
assets/           # optimised images, client logos, icons
```
