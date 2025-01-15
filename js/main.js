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
    this.renderer = new THREE.WebGLRenderer({
      canvas: document.getElementById('visualizer'),
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x000000, 1); 
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.8; 
    
    this.audioAnalyzer = new AudioAnalyzer();
    this.playing = false;
  }

  createScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000); 
    this.scene.fog = new THREE.FogExp2(0x000000, 0.001);
    
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 2000);
    this.camera.position.set(0, 5, 15);
    
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 1000;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.3;
    
    this.visualizerGeometry = new VisualizerGeometry();
    this.scene.add(this.visualizerGeometry.mesh);
    
    this.particleSystem = new ParticleSystem();
    this.scene.add(this.particleSystem.points);
    
    this.spaceEffects = new SpaceEffects();
    this.scene.add(this.spaceEffects.group);
    
    const ambientLight = new THREE.AmbientLight(0x111111, 0.2);
    this.scene.add(ambientLight);

    this.pointLights = [];
    const colors = [0x3366ff, 0xff3366, 0x33ff66];
    for (let i = 0; i < 3; i++) {
      const light = new THREE.PointLight(colors[i], 1.5, 100);
      light.position.set(
        Math.sin(i * Math.PI * 2/3) * 20,
        0,
        Math.cos(i * Math.PI * 2/3) * 20
      );
      this.pointLights.push(light);
      this.scene.add(light);
    }

    const starCount = 5000;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    
    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const radius = Math.random() * 1000 + 200;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      
      starPositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i3 + 2] = radius * Math.cos(phi);
      
      const colorTemp = Math.random();
      starColors[i3] = 0.6 + colorTemp * 0.4;     
      starColors[i3 + 1] = 0.6 + colorTemp * 0.4; 
      starColors[i3 + 2] = 0.7 + colorTemp * 0.3; 
    }
    
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    
    const starMaterial = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });
    
    this.starfield = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(this.starfield);
    
    const nebulaMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        varying vec3 vPosition;
        void main() {
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec3 vPosition;
        
        float noise(vec3 p) {
          return fract(sin(dot(p, vec3(12.9898, 78.233, 45.5432))) * 43758.5453);
        }
        
        void main() {
          float n = noise(vPosition * 0.001 + time * 0.0001);
          vec3 color = mix(
            vec3(0.0, 0.0, 0.1),
            vec3(0.0, 0.0, 0.2),
            n
          );
          gl_FragColor = vec4(color, 0.3);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });
    
    const nebulaGeometry = new THREE.SphereGeometry(1000, 32, 32);
    this.nebulaBackground = new THREE.Mesh(nebulaGeometry, nebulaMaterial);
    this.scene.add(this.nebulaBackground);
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
      
      if (avgEnergy > this.beatThreshold && Date.now() - this.lastBeat > this.beatHoldTime) {
        this.onBeat(avgEnergy);
        this.lastBeat = Date.now();
      }
      
      this.visualizerGeometry.update(frequencyData);
      this.particleSystem.update(frequencyData);
      this.spaceEffects.update(frequencyData);
      this.updateLights(frequencyData);
      
      this.starfield.rotation.y += 0.0001;
      this.starfield.rotation.x += 0.0001;
    }
    
    this.controls.update();
    this.nebulaBackground.material.uniforms.time.value += 0.01;
    this.renderer.render(this.scene, this.camera);
  }

  onBeat(energy) {
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

new AudioVisualizer();