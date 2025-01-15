import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

export class VisualizerGeometry {
  constructor() {
    this.segments = 128;
    this.rings = 50;
    this.radius = 5;
    this.frequencies = new Float32Array(this.segments);
    
    // Create initial geometry with default values
    const geometry = new THREE.SphereGeometry(this.radius, this.segments, this.rings);
    
    this.material = new THREE.MeshPhongMaterial({
      color: 0x00ff00,
      wireframe: true,
      specular: 0x666666,
      shininess: 10
    });
    
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.originalPositions = geometry.attributes.position.array.slice();
  }

  update(frequencyData) {
    // Update frequencies
    for (let i = 0; i < this.segments; i++) {
      this.frequencies[i] = frequencyData[i] || 0;
    }
    
    const positions = this.mesh.geometry.attributes.position.array;
    
    // Update vertex positions based on frequencies
    for (let i = 0; i < positions.length; i += 3) {
      const originalX = this.originalPositions[i];
      const originalY = this.originalPositions[i + 1];
      const originalZ = this.originalPositions[i + 2];
      
      // Calculate distance from center
      const distance = Math.sqrt(
        originalX * originalX + 
        originalY * originalY + 
        originalZ * originalZ
      );
      
      // Calculate angle for frequency mapping
      const angle = Math.atan2(originalZ, originalX);
      const freqIndex = Math.floor((angle + Math.PI) / (Math.PI * 2) * this.segments);
      const displacement = (this.frequencies[freqIndex] || 0) * 0.02;
      
      // Apply displacement in the direction of the vertex
      const scale = 1 + displacement;
      positions[i] = originalX * scale;
      positions[i + 1] = originalY * scale;
      positions[i + 2] = originalZ * scale;
    }
    
    this.mesh.geometry.attributes.position.needsUpdate = true;
  }
}