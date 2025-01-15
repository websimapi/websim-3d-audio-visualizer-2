export class AudioAnalyzer {
  constructor() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(this.bufferLength);
    
    // Initialize mel scale bands
    this.melBands = this.calculateMelBands();
  }

  calculateMelBands() {
    // Calculate 24 mel scale bands
    const melBands = [];
    const minFreq = 20;
    const maxFreq = 20000;
    const numBands = 24;
    
    for (let i = 0; i < numBands + 1; i++) {
      const mel = i * (this.toMel(maxFreq) - this.toMel(minFreq)) / numBands + this.toMel(minFreq);
      melBands.push(this.fromMel(mel));
    }
    
    return melBands;
  }

  toMel(f) {
    return 2595 * Math.log10(1 + f / 700);
  }

  fromMel(m) {
    return 700 * (Math.pow(10, m / 2595) - 1);
  }

  loadAudioFile(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      this.audioContext.decodeAudioData(e.target.result, (buffer) => {
        if (this.source) {
          this.source.disconnect();
        }
        
        this.source = this.audioContext.createBufferSource();
        this.source.buffer = buffer;
        this.source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
      });
    };
    
    reader.readAsArrayBuffer(file);
  }

  play() {
    if (this.source) {
      this.source.start(0);
    }
  }

  pause() {
    if (this.source) {
      this.source.stop();
    }
  }

  getFrequencyData() {
    this.analyser.getByteFrequencyData(this.dataArray);
    return this.dataArray;
  }
}