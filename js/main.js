import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/controls/OrbitControls.js';
import { AudioAnalyzer } from './audioAnalyzer.js';
import { ParticleSystem } from './particleSystem.js';
import { VisualizerGeometry } from './visualizerGeometry.js';

class AudioVisualizer {
  constructor() {
    this.setup();
    this.createScene();
    this.bindEvents();
    this.animate();
  }

  setup() {
    // Set up renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: document.getElementById('visualizer'),
      antialias: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Set up audio analyzer
    this.audioAnalyzer = new AudioAnalyzer();
    
    // Initialize components
    this.playing = false;
  }

  createScene() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 5, 10);
    
    // Add orbit controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    
    // Create geometry
    this.visualizerGeometry = new VisualizerGeometry();
    this.scene.add(this.visualizerGeometry.mesh);
    
    // Create particle system
    this.particleSystem = new ParticleSystem();
    this.scene.add(this.particleSystem.points);
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(ambientLight);
    this.scene.add(directionalLight);
  }

  bindEvents() {
    window.addEventListener('resize', this.onResize.bind(this));
    
    document.getElementById('audioFile').addEventListener('change', (e) => {
      const file = e.target.files[0];
      this.audioAnalyzer.loadAudioFile(file);
    });
    
    document.getElementById('playPause').addEventListener('click', () => {
      if (this.playing) {
        this.audioAnalyzer.pause();
      } else {
        this.audioAnalyzer.play();
      }
      this.playing = !this.playing;
    });
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    
    if (this.playing) {
      const frequencyData = this.audioAnalyzer.getFrequencyData();
      this.visualizerGeometry.update(frequencyData);
      this.particleSystem.update(frequencyData);
    }
    
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize visualizer
new AudioVisualizer();