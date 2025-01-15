import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

export class VisualizerGeometry {
  constructor() {
    this.segments = 128;
    this.rings = 50;
    this.radius = 5;
    
    this.geometry = new THREE.ParametricBufferGeometry(
      this.parametricFunction.bind(this), 
      this.segments, 
      this.rings
    );
    
    this.material = new THREE.MeshPhongMaterial({
      color: 0x00ff00,
      wireframe: true,
      specular: 0x666666,
      shininess: 10
    });
    
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.frequencies = new Float32Array(this.segments);
  }

  parametricFunction(u, v, target) {
    const theta = u * Math.PI * 2;
    const phi = v * Math.PI * 2;
    
    let r = this.radius;
    // Add frequency-based displacement
    const freqIndex = Math.floor(u * this.frequencies.length);
    r += (this.frequencies[freqIndex] || 0) * 0.02;
    
    target.x = r * Math.sin(theta) * Math.cos(phi);
    target.y = r * Math.sin(theta) * Math.sin(phi);
    target.z = r * Math.cos(theta);
  }

  update(frequencyData) {
    // Update frequencies
    for (let i = 0; i < this.segments; i++) {
      this.frequencies[i] = frequencyData[i] || 0;
    }
    
    // Update geometry
    this.geometry = new THREE.ParametricBufferGeometry(
      this.parametricFunction.bind(this),
      this.segments,
      this.rings
    );
    
    this.mesh.geometry.dispose();
    this.mesh.geometry = this.geometry;
  }
}