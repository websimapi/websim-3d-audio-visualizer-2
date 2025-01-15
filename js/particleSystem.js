import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

export class ParticleSystem {
  constructor() {
    this.particleCount = 3000;
    this.positions = new Float32Array(this.particleCount * 3);
    this.velocities = new Float32Array(this.particleCount * 3);
    this.accelerations = new Float32Array(this.particleCount * 3);
    this.colors = new Float32Array(this.particleCount * 3);
    this.lifetimes = new Float32Array(this.particleCount);
    this.maxDistance = 100; // Increased max distance
    this.time = 0;
    
    this.geometry = new THREE.BufferGeometry();
    
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        energyLevel: { value: 0.0 },
        maxDistance: { value: this.maxDistance }
      },
      vertexShader: `
        attribute vec3 color;
        attribute float lifetime;
        varying vec3 vColor;
        uniform float time;
        uniform float energyLevel;
        uniform float maxDistance;
        
        float cubicPulse(float c, float w, float x) {
          x = abs(x - c);
          if (x > w) return 0.0;
          x /= w;
          return 1.0 - x * x * (3.0 - 2.0 * x);
        }
        
        void main() {
          vColor = color;
          
          vec3 pos = position;
          float dist = length(pos);
          float scale = cubicPulse(maxDistance * 0.5, maxDistance * 0.5, dist);
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          float size = 4.0 * (1.0 + energyLevel) * (1.0 - dist/maxDistance);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        
        void main() {
          float r = length(gl_PointCoord - vec2(0.5));
          if (r > 0.5) discard;
          
          float glow = 0.5 * (1.0 - r * 2.0);
          vec3 finalColor = vColor + glow * 0.5;
          gl_FragColor = vec4(finalColor, smoothstep(0.5, 0.2, r));
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.initializeParticles();
    this.points = new THREE.Points(this.geometry, this.material);
  }

  initializeParticles() {
    for (let i = 0; i < this.particleCount; i++) {
      this.resetParticle(i, true);
    }
    
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('lifetime', new THREE.BufferAttribute(this.lifetimes, 1));
  }

  resetParticle(i, isInit = false) {
    // Spherical distribution with full 6DOF
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = 2 * Math.PI * Math.random();
    const r = isInit ? 
      Math.random() * this.maxDistance : 
      Math.random() * this.maxDistance * 0.1 + this.maxDistance * 0.1;

    this.positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    this.positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    this.positions[i * 3 + 2] = r * Math.cos(phi);

    // Controlled initial velocity
    const speed = 0.2 + Math.random() * 0.3; // Reduced speed range
    const velPhi = Math.acos(2 * Math.random() - 1);
    const velTheta = 2 * Math.PI * Math.random();
    
    this.velocities[i * 3] = speed * Math.sin(velPhi) * Math.cos(velTheta);
    this.velocities[i * 3 + 1] = speed * Math.sin(velPhi) * Math.sin(velTheta);
    this.velocities[i * 3 + 2] = speed * Math.cos(velPhi);

    // Gentle rotation influence
    const rotAxis = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    ).normalize();
    
    const rotSpeed = Math.random() * 0.01; // Reduced rotation speed
    this.accelerations[i * 3] = rotAxis.x * rotSpeed;
    this.accelerations[i * 3 + 1] = rotAxis.y * rotSpeed;
    this.accelerations[i * 3 + 2] = rotAxis.z * rotSpeed;

    // Music-reactive colors
    const hue = Math.random();
    const saturation = 0.8 + Math.random() * 0.2;
    const lightness = 0.5 + Math.random() * 0.3;
    const color = new THREE.Color().setHSL(hue, saturation, lightness);
    
    this.colors[i * 3] = color.r;
    this.colors[i * 3 + 1] = color.g;
    this.colors[i * 3 + 2] = color.b;

    this.lifetimes[i] = Math.random() * Math.PI * 2;
  }

  update(frequencyData) {
    this.time += 0.016;
    
    const positions = this.geometry.attributes.position.array;
    const colors = this.geometry.attributes.color.array;
    const avgFrequency = frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length;
    const normalizedEnergy = avgFrequency / 255.0;
    
    this.material.uniforms.time.value = this.time;
    this.material.uniforms.energyLevel.value = normalizedEnergy;
    
    for (let i = 0; i < this.particleCount; i++) {
      const freqIndex = Math.floor(i / this.particleCount * frequencyData.length);
      const freqValue = frequencyData[freqIndex] / 255.0;
      
      // Music-influenced motion
      const energyFactor = freqValue * 0.1; // Reduced energy influence
      
      // Update velocities with music influence
      this.velocities[i * 3] += this.accelerations[i * 3] + (Math.random() - 0.5) * energyFactor;
      this.velocities[i * 3 + 1] += this.accelerations[i * 3 + 1] + (Math.random() - 0.5) * energyFactor;
      this.velocities[i * 3 + 2] += this.accelerations[i * 3 + 2] + (Math.random() - 0.5) * energyFactor;
      
      // Apply velocities to positions
      positions[i * 3] += this.velocities[i * 3] * (1 + freqValue * 0.5);
      positions[i * 3 + 1] += this.velocities[i * 3 + 1] * (1 + freqValue * 0.5);
      positions[i * 3 + 2] += this.velocities[i * 3 + 2] * (1 + freqValue * 0.5);
      
      // Check distance and reset if needed
      const distance = Math.sqrt(
        positions[i * 3] * positions[i * 3] +
        positions[i * 3 + 1] * positions[i * 3 + 1] +
        positions[i * 3 + 2] * positions[i * 3 + 2]
      );
      
      if (distance > this.maxDistance || Math.random() < 0.0005) {
        this.resetParticle(i);
      }
      
      // Update colors based on music and position
      this.lifetimes[i] += 0.005 + freqValue * 0.01; // Slower color cycling
      const hue = (this.lifetimes[i] + distance / this.maxDistance) % 1;
      const saturation = 0.8 + freqValue * 0.2;
      const lightness = 0.5 + freqValue * 0.3;
      
      const color = new THREE.Color().setHSL(hue, saturation, lightness);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      
      // Apply stronger damping for more controlled motion
      const damping = 0.99 - normalizedEnergy * 0.01;
      this.velocities[i * 3] *= damping;
      this.velocities[i * 3 + 1] *= damping;
      this.velocities[i * 3 + 2] *= damping;
    }
    
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.lifetime.needsUpdate = true;
  }
}