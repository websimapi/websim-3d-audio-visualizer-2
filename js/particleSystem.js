import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

export class ParticleSystem {
  constructor() {
    this.particleCount = 1000;
    this.positions = new Float32Array(this.particleCount * 3);
    this.velocities = new Float32Array(this.particleCount * 3);
    
    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.1,
      blending: THREE.AdditiveBlending,
      transparent: true
    });
    
    this.initializeParticles();
    this.points = new THREE.Points(this.geometry, this.material);
  }

  initializeParticles() {
    for (let i = 0; i < this.particleCount; i++) {
      // Random spherical distribution
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 5 + Math.random() * 2;
      
      this.positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      this.positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      this.positions[i * 3 + 2] = r * Math.cos(phi);
      
      // Random initial velocities
      this.velocities[i * 3] = (Math.random() - 0.5) * 0.1;
      this.velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.1;
      this.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
    }
    
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
  }

  update(frequencyData) {
    const positions = this.geometry.attributes.position.array;
    const avgFrequency = frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length;
    
    for (let i = 0; i < this.particleCount; i++) {
      // Update positions based on velocity
      positions[i * 3] += this.velocities[i * 3];
      positions[i * 3 + 1] += this.velocities[i * 3 + 1];
      positions[i * 3 + 2] += this.velocities[i * 3 + 2];
      
      // Apply forces based on audio
      const distance = Math.sqrt(
        positions[i * 3] * positions[i * 3] +
        positions[i * 3 + 1] * positions[i * 3 + 1] +
        positions[i * 3 + 2] * positions[i * 3 + 2]
      );
      
      // Add some attraction to center
      const force = (5 - distance) * 0.01;
      this.velocities[i * 3] += positions[i * 3] * force / distance;
      this.velocities[i * 3 + 1] += positions[i * 3 + 1] * force / distance;
      this.velocities[i * 3 + 2] += positions[i * 3 + 2] * force / distance;
      
      // Add some random motion based on audio
      this.velocities[i * 3] += (Math.random() - 0.5) * avgFrequency * 0.0001;
      this.velocities[i * 3 + 1] += (Math.random() - 0.5) * avgFrequency * 0.0001;
      this.velocities[i * 3 + 2] += (Math.random() - 0.5) * avgFrequency * 0.0001;
      
      // Damping
      this.velocities[i * 3] *= 0.98;
      this.velocities[i * 3 + 1] *= 0.98;
      this.velocities[i * 3 + 2] *= 0.98;
    }
    
    this.geometry.attributes.position.needsUpdate = true;
  }
}