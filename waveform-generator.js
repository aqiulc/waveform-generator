class WaveformGenerator {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.waveformData = null;
        this.canvas = null;
        this.ctx = null;
        this.currentFileName = '';
        
        this.initializeElements();
        this.bindEvents();
    }
    
    initializeElements() {
        this.canvas = document.getElementById('waveformCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.fileInput = document.getElementById('audioFile');
        this.progressSection = document.getElementById('progressSection');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.waveformSection = document.getElementById('waveformSection');
        this.embedSection = document.getElementById('embedSection');
        this.embedCode = document.getElementById('embedCode');
    }
    
    bindEvents() {
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        
        // Preset theme buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const waveColor = btn.dataset.wave;
                const bgColor = btn.dataset.bg;
                document.getElementById('waveformColor').value = waveColor;
                document.getElementById('backgroundColor').value = bgColor;
                this.redrawWaveform();
            });
        });
        
        // Customization controls
        document.getElementById('waveformColor').addEventListener('input', () => this.redrawWaveform());
        document.getElementById('backgroundColor').addEventListener('input', () => this.redrawWaveform());
        document.getElementById('waveformWidth').addEventListener('input', (e) => {
            document.getElementById('widthValue').textContent = e.target.value + 'px';
            this.resizeCanvas();
        });
        document.getElementById('waveformHeight').addEventListener('input', (e) => {
            document.getElementById('heightValue').textContent = e.target.value + 'px';
            this.resizeCanvas();
        });
        
        // Download buttons
        document.getElementById('downloadPNG').addEventListener('click', () => this.downloadPNG());
        document.getElementById('downloadSVG').addEventListener('click', () => this.downloadSVG());
        document.getElementById('downloadJSON').addEventListener('click', () => this.downloadJSON());
        document.getElementById('downloadWAV').addEventListener('click', () => this.downloadWAV());
        document.getElementById('copyEmbed').addEventListener('click', () => this.copyEmbedCode());
    }
    
    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Validate file type
        const fileName = file.name.toLowerCase();
        const supportedFormats = ['.mp3', '.wav', '.flac'];
        const isValidFormat = file.type.includes('audio/') || 
                            supportedFormats.some(format => fileName.endsWith(format));
        
        if (!isValidFormat) {
            alert('Please select a valid audio file (MP3, WAV, or FLAC).');
            return;
        }
        
        this.currentFileName = file.name.replace(/\.[^/.]+$/, "");
        this.showProgress();
        
        try {
            // Initialize audio context
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            // Resume audio context if suspended (required by some browsers)
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            this.updateProgress(20, 'Reading file...');
            const arrayBuffer = await file.arrayBuffer();
            console.log('File size:', arrayBuffer.byteLength, 'bytes');
            
            this.updateProgress(40, 'Decoding audio...');
            this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            console.log('Audio decoded:', this.audioBuffer.duration, 'seconds');
            
            this.updateProgress(60, 'Generating waveform...');
            this.waveformData = this.generateWaveformData();
            console.log('Waveform data generated:', this.waveformData.length, 'points');
            
            this.updateProgress(80, 'Rendering waveform...');
            this.drawWaveform();
            
            this.updateProgress(100, 'Complete!');
            setTimeout(() => {
                this.hideProgress();
                this.showWaveform();
                this.generateEmbedCode();
            }, 500);
            
        } catch (error) {
            console.error('Error processing audio:', error);
            let errorMessage = 'Error processing file. ';
            
            if (error.name === 'EncodingError' || error.message.includes('decode')) {
                errorMessage += 'Invalid audio format or corrupted file.';
            } else if (error.name === 'NotSupportedError') {
                errorMessage += 'Audio format not supported by your browser.';
            } else {
                errorMessage += 'Please try another audio file.';
            }
            
            this.updateProgress(0, errorMessage);
            setTimeout(() => this.hideProgress(), 3000);
        }
    }
    
    generateWaveformData() {
        const audioData = this.audioBuffer.getChannelData(0);
        const samples = 800; // Number of waveform bars
        const blockSize = Math.floor(audioData.length / samples);
        const waveformData = [];
        
        console.log('Audio buffer length:', audioData.length);
        console.log('Block size:', blockSize);
        
        for (let i = 0; i < samples; i++) {
            let blockStart = blockSize * i;
            let sum = 0;
            let max = 0;
            
            // Ensure we don't go out of bounds
            const blockEnd = Math.min(blockStart + blockSize, audioData.length);
            const actualBlockSize = blockEnd - blockStart;
            
            for (let j = blockStart; j < blockEnd; j++) {
                const sample = Math.abs(audioData[j]);
                sum += sample * sample; // Square for RMS calculation
                max = Math.max(max, sample);
            }
            
            // Calculate RMS properly
            const rms = actualBlockSize > 0 ? Math.sqrt(sum / actualBlockSize) : 0;
            waveformData.push({
                rms: rms,
                peak: max,
                value: Math.max(rms, max * 0.7) // Use combination of RMS and peak
            });
        }
        
        // Normalize the data
        const maxValue = Math.max(...waveformData.map(d => d.value));
        console.log('Max value:', maxValue);
        
        if (maxValue === 0) {
            console.warn('No audio data detected - file may be silent or corrupted');
            return waveformData.map(d => ({
                ...d,
                normalized: 0
            }));
        }
        
        return waveformData.map(d => ({
            ...d,
            normalized: d.value / maxValue
        }));
    }
    
    drawWaveform() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const color = document.getElementById('waveformColor').value;
        const bgColor = document.getElementById('backgroundColor').value;
        
        console.log('Drawing waveform:', width, height, this.waveformData?.length);
        
        // Clear canvas with background color
        this.ctx.fillStyle = bgColor;
        this.ctx.fillRect(0, 0, width, height);
        
        if (!this.waveformData || this.waveformData.length === 0) {
            console.warn('No waveform data to draw');
            return;
        }
        
        // Enable anti-aliasing for smoother rendering
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        
        const barWidth = Math.max(width / this.waveformData.length, 1);
        const centerY = height / 2;
        const maxBarHeight = centerY * 0.85;
        const barSpacing = Math.max(barWidth * 0.1, 0.5); // 10% spacing between bars
        const actualBarWidth = barWidth - barSpacing;
        
        // Create gradient for SoundCloud-like effect
        const gradient = this.ctx.createLinearGradient(0, 0, 0, height);
        const baseColor = this.hexToRgb(color);
        
        // Create beautiful gradient from light to dark
        gradient.addColorStop(0, `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.9)`);
        gradient.addColorStop(0.3, `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 1)`);
        gradient.addColorStop(0.7, `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 1)`);
        gradient.addColorStop(1, `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.9)`);
        
        this.ctx.fillStyle = gradient;
        
        // Draw smooth waveform bars
        this.waveformData.forEach((data, i) => {
            const x = i * barWidth + barSpacing / 2;
            
            // Apply smoothing to reduce harsh jumps
            let smoothedValue = data.normalized;
            if (i > 0 && i < this.waveformData.length - 1) {
                smoothedValue = (this.waveformData[i-1].normalized + data.normalized + this.waveformData[i+1].normalized) / 3;
            }
            
            const barHeight = Math.max(smoothedValue * maxBarHeight, 1);
            
            // Draw rounded rectangle bars for SoundCloud style
            this.drawRoundedBar(x, centerY - barHeight, actualBarWidth, barHeight * 2, Math.min(actualBarWidth / 4, 2));
        });
        
        console.log('Waveform drawn successfully');
    }
    
    // Helper function to draw rounded rectangles
    drawRoundedBar(x, y, width, height, radius) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
        this.ctx.fill();
    }
    
    // Helper function to convert hex color to RGB
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : {r: 255, g: 85, b: 0}; // fallback to SoundCloud orange
    }
    
    redrawWaveform() {
        if (this.waveformData) {
            this.drawWaveform();
        }
    }
    
    resizeCanvas() {
        const width = document.getElementById('waveformWidth').value;
        const height = document.getElementById('waveformHeight').value;
        
        this.canvas.width = width;
        this.canvas.height = height;
        
        if (this.waveformData) {
            this.drawWaveform();
        }
    }
    
    downloadPNG() {
        this.canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${this.currentFileName}_waveform.png`;
            a.click();
            URL.revokeObjectURL(url);
        });
    }
    
    downloadSVG() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const color = document.getElementById('waveformColor').value;
        const bgColor = document.getElementById('backgroundColor').value;
        
        let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
        svg += `<defs>`;
        
        // Create gradient definition
        const baseColor = this.hexToRgb(color);
        svg += `<linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">`;
        svg += `<stop offset="0%" style="stop-color:rgba(${baseColor.r},${baseColor.g},${baseColor.b},0.9);stop-opacity:1" />`;
        svg += `<stop offset="30%" style="stop-color:rgba(${baseColor.r},${baseColor.g},${baseColor.b},1);stop-opacity:1" />`;
        svg += `<stop offset="70%" style="stop-color:rgba(${baseColor.r},${baseColor.g},${baseColor.b},1);stop-opacity:1" />`;
        svg += `<stop offset="100%" style="stop-color:rgba(${baseColor.r},${baseColor.g},${baseColor.b},0.9);stop-opacity:1" />`;
        svg += `</linearGradient>`;
        svg += `</defs>`;
        
        svg += `<rect width="${width}" height="${height}" fill="${bgColor}"/>`;
        
        const barWidth = Math.max(width / this.waveformData.length, 1);
        const centerY = height / 2;
        const maxBarHeight = centerY * 0.85;
        const barSpacing = Math.max(barWidth * 0.1, 0.5);
        const actualBarWidth = barWidth - barSpacing;
        const radius = Math.min(actualBarWidth / 4, 2);
        
        this.waveformData.forEach((data, i) => {
            const x = i * barWidth + barSpacing / 2;
            
            // Apply smoothing
            let smoothedValue = data.normalized;
            if (i > 0 && i < this.waveformData.length - 1) {
                smoothedValue = (this.waveformData[i-1].normalized + data.normalized + this.waveformData[i+1].normalized) / 3;
            }
            
            const barHeight = Math.max(smoothedValue * maxBarHeight, 1);
            const totalHeight = barHeight * 2;
            
            // Create rounded rectangle
            svg += `<rect x="${x}" y="${centerY - barHeight}" width="${actualBarWidth}" height="${totalHeight}" 
                    rx="${radius}" ry="${radius}" fill="url(#waveGradient)"/>`;
        });
        
        svg += '</svg>';
        
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentFileName}_waveform.svg`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    downloadJSON() {
        const jsonData = {
            filename: this.currentFileName,
            duration: this.audioBuffer.duration,
            sampleRate: this.audioBuffer.sampleRate,
            channels: this.audioBuffer.numberOfChannels,
            waveformData: this.waveformData,
            settings: {
                width: this.canvas.width,
                height: this.canvas.height,
                color: document.getElementById('waveformColor').value,
                backgroundColor: document.getElementById('backgroundColor').value
            }
        };
        
        const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentFileName}_waveform_data.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    downloadWAV() {
        // Create a silent WAV file with amplitude representing waveform data
        const sampleRate = 44100;
        const duration = 10; // 10 seconds
        const numSamples = sampleRate * duration;
        const buffer = new ArrayBuffer(44 + numSamples * 2);
        const view = new DataView(buffer);
        
        // WAV header
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };
        
        writeString(0, 'RIFF');
        view.setUint32(4, 36 + numSamples * 2, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, numSamples * 2, true);
        
        // Generate audio data based on waveform
        const samplesPerBar = Math.floor(numSamples / this.waveformData.length);
        let offset = 44;
        
        this.waveformData.forEach((data, i) => {
            const amplitude = Math.floor(data.normalized * 32767);
            for (let j = 0; j < samplesPerBar; j++) {
                view.setInt16(offset, amplitude, true);
                offset += 2;
            }
        });
        
        const blob = new Blob([buffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentFileName}_waveform.wav`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    generateEmbedCode() {
        const canvas = this.canvas;
        const dataURL = canvas.toDataURL('image/png');
        
        const embedHTML = `<div style="width: ${canvas.width}px; height: ${canvas.height}px; background-image: url('${dataURL}'); background-size: cover; background-repeat: no-repeat;"></div>`;
        
        this.embedCode.value = embedHTML;
        this.embedSection.style.display = 'block';
    }
    
    copyEmbedCode() {
        this.embedCode.select();
        document.execCommand('copy');
        
        const button = document.getElementById('copyEmbed');
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        setTimeout(() => {
            button.textContent = originalText;
        }, 2000);
    }
    
    showProgress() {
        this.progressSection.style.display = 'block';
        this.waveformSection.style.display = 'none';
        this.embedSection.style.display = 'none';
    }
    
    hideProgress() {
        this.progressSection.style.display = 'none';
    }
    
    showWaveform() {
        this.waveformSection.style.display = 'block';
    }
    
    updateProgress(percent, text) {
        this.progressFill.style.width = percent + '%';
        this.progressText.textContent = text;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new WaveformGenerator();
});