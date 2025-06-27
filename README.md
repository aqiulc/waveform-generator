# Waveform Generator

A modern, browser-based audio waveform visualization tool that creates beautiful, customizable waveforms from audio files.

## Live Demo

🚀 **[Try it live here!](https://aqiulc.github.io/waveform-generator/)**

## Features

- **Audio File Support**: Upload MP3, WAV, and FLAC audio files
- **Real-time Visualization**: Generate smooth, professional-looking waveforms
- **Theme Presets**: Quick access to popular themes (SoundCloud, Spotify, Neon, Modern)
- **Customization Options**:
  - Adjustable waveform and background colors
  - Resizable canvas (400-1240px width, 100-400px height)
  - Gradient effects and anti-aliasing
- **Export Formats**:
  - PNG images
  - SVG vector graphics
  - JSON data with waveform metrics
  - WAV audio representation
- **Embed Code Generation**: Get HTML embed code for your waveforms
- **Mobile Responsive**: Works on desktop and mobile devices

## Usage

1. **Open the Application**: Open `index.html` in a modern web browser
2. **Upload Audio**: Click "Choose Audio File" and select your audio file
3. **Wait for Processing**: The app will decode your audio and generate the waveform
4. **Customize**: Use the color pickers and sliders to adjust appearance
5. **Export**: Download your waveform in your preferred format

## Technical Details

### Audio Processing
- Uses Web Audio API for high-quality audio decoding
- Generates waveform data using RMS (Root Mean Square) and peak detection
- Processes audio in blocks for smooth visualization
- Handles various audio formats through browser codec support

### Rendering
- HTML5 Canvas with anti-aliasing for smooth graphics
- Gradient effects for professional appearance
- Rounded rectangle bars similar to SoundCloud style
- Responsive design with CSS Grid and Flexbox

### Export Capabilities
- **PNG**: High-quality raster images
- **SVG**: Scalable vector graphics with gradients
- **JSON**: Complete waveform data and metadata
- **WAV**: Audio file representing the waveform amplitude

## Browser Compatibility

- Chrome/Edge 66+
- Firefox 60+
- Safari 14+

Requires browsers with Web Audio API support.

## File Structure

```
waveform-generator/
├── index.html          # Main HTML structure
├── styles.css          # CSS styling and responsive design
├── waveform-generator.js # Core JavaScript application
└── README.md           # This file
```

## Getting Started

Simply download the files and open `index.html` in your web browser. No installation or build process required.

## License

This project is open source and available under the MIT License.