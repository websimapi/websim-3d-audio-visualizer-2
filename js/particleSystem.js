import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

export class ParticleSystem {
  constructor() {
    this.particleCount = 2000;
    this.positions = new Float32Array(this.particleCount * 3);
    this.velocities = new Float32Array(this.particleCount * 3);
    this.colors = new Float32Array(this.particleCount * 3);
    this.time = 0;
    
    this.geometry = new THREE.BufferGeometry();
    
    // Create custom particle material with shader
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        energyLevel: { value: 0.0 }
      },
      vertexShader: `
        attribute vec3 color;
        varying vec3 vColor;
        uniform float time;
        uniform float energyLevel;
        
        void main() {
          vColor = color;
          // Apply spiral motion
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float size = 2.0 * (1.0 + energyLevel);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        
        void main() {
          float r = length(gl_PointCoord - vec2(0.5));
          if (r > 0.5) discard;
          
          // Smooth particle rendering
          float smoothness = 1.0 - smoothstep(0.3, 0.5, r);
          gl_FragColor = vec4(vColor, smoothness);
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
      // Complex spiral distribution
      const t = i / this.particleCount;
      const theta = 50 * t * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 5 + Math.random() * 2;
      
      this.positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      this.positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      this.positions[i * 3 + 2] = r * Math.cos(phi);
      
      // Initialize velocities with curl noise
      this.velocities[i * 3] = (Math.random() - 0.5) * 0.1;
      this.velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.1;
      this.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
      
      // Initialize colors based on position
      const hue = theta / (Math.PI * 2);
      const color = new THREE.Color().setHSL(hue, 0.8, 0.5);
      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;
    }
    
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
  }

  update(frequencyData) {
    this.time += 0.016;
    
    const positions = this.geometry.attributes.position.array;
    const colors = this.geometry.attributes.color.array;
    const avgFrequency = frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length;
    
    this.material.uniforms.time.value = this.time;
    this.material.uniforms.energyLevel.value = avgFrequency / 255.0;
    
    for (let i = 0; i < this.particleCount; i++) {
      // Update positions with complex motion
      positions[i * 3] += this.velocities[i * 3];
      positions[i * 3 + 1] += this.velocities[i * 3 + 1];
      positions[i * 3 + 2] += this.velocities[i * 3 + 2];
      
      // Calculate forces
      const distance = Math.sqrt(
        positions[i * 3] * positions[i * 3] +
        positions[i * 3 + 1] * positions[i * 3 + 1] +
        positions[i * 3 + 2] * positions[i * 3 + 2]
      );
      
      // Apply vortex force
      const vortexForce = 0.1 * avgFrequency / 255.0;
      const theta = Math.atan2(positions[i * 3 + 2], positions[i * 3]);
      this.velocities[i * 3] += -Math.sin(theta) * vortexForce;
      this.velocities[i * 3 + 2] += Math.cos(theta) * vortexForce;
      
      // Center attraction
      const force = (5 - distance) * 0.01;
      this.velocities[i * 3] += positions[i * 3] * force / distance;
      this.velocities[i * 3 + 1] += positions[i * 3 + 1] * force / distance;
      this.velocities[i * 3 + 2] += positions[i * 3 + 2] * force / distance;
      
      // Update colors based on velocity
      const speed = Math.sqrt(
        this.velocities[i * 3] * this.velocities[i * 3] +
        this.velocities[i * 3 + 1] * this.velocities[i * 3 + 1] +
        this.velocities[i * 3 + 2] * this.velocities[i * 3 + 2]
      );
      
      const hue = (theta + Math.PI) / (Math.PI * 2);
      const saturation = Math.min(1, speed * 5);
      const lightness = 0.5 + 0.2 * Math.sin(this.time + distance);
      const color = new THREE.Color().setHSL(hue, saturation, lightness);
      
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      
      // Apply damping
      this.velocities[i * 3] *= 0.98;
      this.velocities[i * 3 + 1] *= 0.98;
      this.velocities[i * 3 + 2] *= 0.98;
    }
    
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }
}