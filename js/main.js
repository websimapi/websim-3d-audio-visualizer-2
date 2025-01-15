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
    this.beatHoldTime = 200;
  }

  setup() {
    // Set up renderer with better quality
    this.renderer = new THREE.WebGLRenderer({
      canvas: document.getElementById('visualizer'),
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    
    // Set up audio analyzer
    this.audioAnalyzer = new AudioAnalyzer();
    this.playing = false;
  }

  createScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x000000, 0.001);
    
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 2000);
    this.camera.position.set(0, 5, 15);
    
    // Enhanced orbit controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 1000;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.5;
    
    // Create main visualizer geometry
    this.visualizerGeometry = new VisualizerGeometry();
    this.scene.add(this.visualizerGeometry.mesh);
    
    // Create particle system
    this.particleSystem = new ParticleSystem();
    this.scene.add(this.particleSystem.points);
    
    // Add space effects
    this.spaceEffects = new SpaceEffects();
    this.scene.add(this.spaceEffects.group);
    
    // Enhanced lighting
    const ambientLight = new THREE.AmbientLight(0x111111);
    this.scene.add(ambientLight);

    // Add dynamic point lights
    this.pointLights = [];
    const colors = [0xff3366, 0x33ff66, 0x3366ff];
    for (let i = 0; i < 3; i++) {
      const light = new THREE.PointLight(colors[i], 2, 100);
      light.position.set(
        Math.sin(i * Math.PI * 2/3) * 20,
        0,
        Math.cos(i * Math.PI * 2/3) * 20
      );
      this.pointLights.push(light);
      this.scene.add(light);
    }

    // Create starfield background
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(6000);
    for (let i = 0; i < 2000; i++) {
      const i3 = i * 3;
      const radius = Math.random() * 1000 + 100;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      starPositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i3 + 2] = radius * Math.cos(phi);
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 2,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    this.starfield = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(this.starfield);
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
      
      // Beat detection
      if (avgEnergy > this.beatThreshold && Date.now() - this.lastBeat > this.beatHoldTime) {
        this.onBeat(avgEnergy);
        this.lastBeat = Date.now();
      }
      
      this.visualizerGeometry.update(frequencyData);
      this.particleSystem.update(frequencyData);
      this.spaceEffects.update(frequencyData);
      this.updateLights(frequencyData);
      
      // Rotate starfield
      this.starfield.rotation.y += 0.0001;
      this.starfield.rotation.x += 0.0001;
    }
    
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  onBeat(energy) {
    // Enhanced beat reactions
    const intensity = energy / 255;
    this.camera.position.z += Math.random() * intensity - intensity/2;
    this.visualizerGeometry.material.uniforms.blobScale.value = 1.2 + intensity * 0.3;
    this.spaceEffects.onBeat(intensity);
    
    setTimeout(() => {
      this.visualizerGeometry.material.uniforms.blobScale.value = 1.0;
    }, 200);
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