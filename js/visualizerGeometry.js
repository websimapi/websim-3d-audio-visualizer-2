import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

export class VisualizerGeometry {
  constructor() {
    this.segments = 128;
    this.rings = 50;
    this.radius = 5;
    this.frequencies = new Float32Array(this.segments);
    this.time = 0;
    
    // Create geometry with advanced parameters
    const geometry = new THREE.SphereGeometry(this.radius, this.segments, this.rings);
    
    // Create dynamic material with custom shader
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        baseColor: { value: new THREE.Color(0x00ff00) },
        energyLevel: { value: 0.0 },
        lightPos: { value: new THREE.Vector3(10, 10, 10) }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        uniform float time;
        uniform float energyLevel;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          
          // Apply wave propagation
          float wave = sin(position.y * 10.0 + time) * energyLevel;
          vec3 newPosition = position + normal * wave * 0.2;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        uniform float time;
        uniform vec3 baseColor;
        uniform float energyLevel;
        uniform vec3 lightPos;
        
        void main() {
          // Dynamic color based on position and energy
          vec3 color = baseColor;
          float hue = atan(vPosition.z, vPosition.x) / (2.0 * 3.14159) + 0.5;
          float saturation = 0.5 + 0.5 * tanh(energyLevel * 3.0);
          float luminance = 0.3 + 0.4 * sin(time * 0.5) * energyLevel;
          
          // Lighting calculation
          vec3 lightDir = normalize(lightPos - vPosition);
          float diff = max(dot(vNormal, lightDir), 0.0);
          vec3 reflection = reflect(-lightDir, vNormal);
          float spec = pow(max(dot(reflection, normalize(vec3(0,0,1))), 0.0), 32.0);
          
          // Combine everything
          vec3 finalColor = color * (diff + 0.3) + vec3(spec) * energyLevel;
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });
    
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.originalPositions = geometry.attributes.position.array.slice();
  }

  update(frequencyData) {
    this.time += 0.016; // Assuming 60fps
    
    // Calculate average energy level
    const avgEnergy = frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length;
    this.material.uniforms.energyLevel.value = avgEnergy / 255.0;
    this.material.uniforms.time.value = this.time;
    
    // Update light position
    const lightR = 10;
    const lightH = 10;
    this.material.uniforms.lightPos.value.set(
      lightR * Math.cos(this.time * 0.5),
      lightH + Math.sin(this.time * 0.3) * 2,
      lightR * Math.sin(this.time * 0.5)
    );
    
    // Update frequencies and geometry
    for (let i = 0; i < this.segments; i++) {
      this.frequencies[i] = frequencyData[i] || 0;
    }
    
    const positions = this.mesh.geometry.attributes.position.array;
    
    for (let i = 0; i < positions.length; i += 3) {
      const originalX = this.originalPositions[i];
      const originalY = this.originalPositions[i + 1];
      const originalZ = this.originalPositions[i + 2];
      
      // Calculate complex displacement based on multiple frequencies
      const distance = Math.sqrt(
        originalX * originalX + 
        originalY * originalY + 
        originalZ * originalZ
      );
      
      const angle = Math.atan2(originalZ, originalX);
      const freqIndex = Math.floor((angle + Math.PI) / (Math.PI * 2) * this.segments);
      
      // Apply multiple frequency bands for more complex deformation
      let displacement = 0;
      for (let band = 0; band < 4; band++) {
        const bandIndex = (freqIndex + band * this.segments/4) % this.segments;
        displacement += (this.frequencies[bandIndex] || 0) * 0.01 * Math.exp(-band * 0.5);
      }
      
      // Apply displacement with wave propagation
      const scale = 1 + displacement * (1 + 0.2 * Math.sin(distance * 2 + this.time * 3));
      positions[i] = originalX * scale;
      positions[i + 1] = originalY * scale;
      positions[i + 2] = originalZ * scale;
    }
    
    this.mesh.geometry.attributes.position.needsUpdate = true;
  }
}