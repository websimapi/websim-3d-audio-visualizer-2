import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/controls/OrbitControls.js';
import { AudioAnalyzer } from './audioAnalyzer.js';
import { ParticleSystem } from './particleSystem.js';
import { VisualizerGeometry } from './visualizerGeometry.js';
import { SpaceEffects } from './spaceEffects.js';

class AudioVisualizer {
  constructor() {
    this.setup();
    this.createScene();
    this.bindEvents();
    this.animate();
    this.lastBeat = 0;
    this.beatThreshold = 0.5;
    this.beatHoldTime = 200; // ms
    this.activeBackground = 0;
    this.transitionTime = 0;
    this.backgroundTransitionDuration = 5000; // 5 seconds
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
    this.scene.background = new THREE.Color(0x000000);
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 10, 30);
    this.camera.far = 1000;
    this.camera.updateProjectionMatrix();
    
    // Add orbit controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    
    // Create geometry
    this.visualizerGeometry = new VisualizerGeometry();
    this.scene.add(this.visualizerGeometry.mesh);
    
    // Create particle system
    this.particleSystem = new ParticleSystem();
    this.scene.add(this.particleSystem.points);
    
    // Add space effects
    this.spaceEffects = new SpaceEffects(this.scene);
    
    // Enhanced lighting setup
    const ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);

    // Add point lights for dynamic lighting
    this.pointLights = [];
    const colors = [0xff0000, 0x00ff00, 0x0000ff];
    for (let i = 0; i < 3; i++) {
      const light = new THREE.PointLight(colors[i], 1, 50);
      light.position.set(
        Math.sin(i * Math.PI * 2/3) * 10,
        0,
        Math.cos(i * Math.PI * 2/3) * 10
      );
      this.pointLights.push(light);
      this.scene.add(light);
    }
    
    // Add fog for depth effect
    this.scene.fog = new THREE.FogExp2(0x000000, 0.001);
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
      const avgEnergy = frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length;
      
      // Update all visualizers
      this.visualizerGeometry.update(frequencyData);
      this.particleSystem.update(frequencyData);
      this.spaceEffects.update(frequencyData);
      this.updateLights(frequencyData);
      
      // Handle background transitions
      this.updateBackgroundTransitions(avgEnergy);
      
      // Beat detection
      if (avgEnergy > this.beatThreshold && Date.now() - this.lastBeat > this.beatHoldTime) {
        this.onBeat();
        this.lastBeat = Date.now();
      }
    }
    
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  onBeat() {
    // Trigger visual effects on beat
    this.camera.position.z += Math.random() * 0.5 - 0.25;
    this.visualizerGeometry.material.uniforms.blobScale.value = 1.2;
    setTimeout(() => {
      this.visualizerGeometry.material.uniforms.blobScale.value = 1.0;
    }, 200);
  }

  updateBackgroundTransitions(avgEnergy) {
    const now = Date.now();
    
    // Trigger transition based on energy and time
    if (avgEnergy > 200 && now - this.transitionTime > this.backgroundTransitionDuration) {
      this.activeBackground = (this.activeBackground + 1) % 3;
      this.transitionTime = now;
      
      // Adjust camera and effects based on active background
      switch(this.activeBackground) {
        case 0: // Starfield focus
          this.camera.position.z = 30;
          break;
        case 1: // Nebula focus
          this.camera.position.z = 50;
          break;
        case 2: // Wormhole focus
          this.camera.position.z = 70;
          break;
      }
    }
    
    // Smooth camera transitions
    this.camera.position.lerp(
      new THREE.Vector3(
        this.camera.position.x,
        this.camera.position.y,
        this.camera.position.z
      ),
      0.02
    );
  }

  updateLights(frequencyData) {
    const time = Date.now() * 0.001;
    this.pointLights.forEach((light, i) => {
      const freq = frequencyData[Math.floor(i * frequencyData.length / 3)] / 255;
      light.intensity = 0.5 + freq * 2;
      light.position.x = Math.sin(time + i * Math.PI * 2/3) * 10;
      light.position.z = Math.cos(time + i * Math.PI * 2/3) * 10;
      light.position.y = Math.sin(time * 2) * 3;
    });
  }

}

// Initialize visualizer
new AudioVisualizer();