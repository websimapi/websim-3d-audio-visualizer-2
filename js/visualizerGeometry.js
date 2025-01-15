import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

export class VisualizerGeometry {
  constructor() {
    this.time = 0;
    this.energyHistory = new Array(10).fill(0);
    this.planets = [];

    // Create multiple planet visualizers
    for (let i = 0; i < 5; i++) { // Create 5 smaller planet visualizers
      const radius = 2 + Math.random() * 2; // Vary the sizes
      const segments = 64 + Math.floor(Math.random() * 64);
      const rings = 30 + Math.floor(Math.random() * 20);

      const geometry = new THREE.SphereGeometry(radius, segments, rings);
      const material = this.createPlanetMaterial(i);
      const planet = new THREE.Mesh(geometry, material);

      // Position planets at different distances and angles
      const angle = (i / 5) * Math.PI * 2;
      const distance = 15 + Math.random() * 10;
      planet.position.set(
        Math.cos(angle) * distance,
        (Math.random() - 0.5) * 10,
        Math.sin(angle) * distance
      );

      this.planets.push({
        mesh: planet,
        basePosition: planet.position.clone(),
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        orbitSpeed: 0.001 + Math.random() * 0.002,
        orbitRadius: distance,
        orbitOffset: angle
      });
    }
  }

  createPlanetMaterial(index) {
    // Create unique material for each planet with different base colors
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        energyLevel: { value: 0.0 },
        sustainedEnergy: { value: 0.0 },
        baseColor: { value: new THREE.Color().setHSL(index/5, 0.8, 0.5) },
        frequencyData: { value: new Float32Array(128) }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        uniform float time;
        uniform float energyLevel;
        uniform float sustainedEnergy;
        uniform float frequencyData[128];

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;

          // Dynamic deformation based on audio
          vec3 pos = position;
          float displacement = 0.0;

          for(int i = 0; i < 8; i++) {
            float freq = frequencyData[i * 16];
            displacement += sin(pos.x * 2.0 + time + float(i)) * freq * 0.02;
            displacement += cos(pos.y * 2.0 + time + float(i)) * freq * 0.02;
            displacement += sin(pos.z * 2.0 + time + float(i)) * freq * 0.02;
          }

          pos += normal * displacement * (1.0 + sustainedEnergy);

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        uniform float time;
        uniform vec3 baseColor;
        uniform float energyLevel;
        uniform float sustainedEnergy;

        void main() {
          vec3 color = baseColor;

          // Dynamic color variation
          float pulse = (sin(time * 2.0) * 0.5 + 0.5) * energyLevel;
          color *= 1.0 + pulse;

          // Add rim lighting
          float rimLight = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
          rimLight = pow(rimLight, 3.0) * (1.0 + sustainedEnergy * 2.0);

          color += vec3(rimLight) * sustainedEnergy;

          gl_FragColor = vec4(color, 1.0);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
  }

  update(frequencyData) {
    this.time += 0.016;

    const avgEnergy = frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length / 255;
    this.energyHistory.push(avgEnergy);
    this.energyHistory.shift();
    const sustainedEnergy = this.energyHistory.reduce((a, b) => Math.max(a, b), 0);

    // Update all planets
    this.planets.forEach((planet, i) => {
      const material = planet.mesh.material;
      material.uniforms.time.value = this.time;
      material.uniforms.energyLevel.value = avgEnergy;
      material.uniforms.sustainedEnergy.value = sustainedEnergy;

      // Update frequency data
      const normalizedFreqs = new Float32Array(frequencyData.length);
      for (let j = 0; j < frequencyData.length; j++) {
        normalizedFreqs[j] = frequencyData[j] / 255.0;
      }
      material.uniforms.frequencyData.value = normalizedFreqs;

      // Update planet position and rotation
      planet.mesh.rotation.y += planet.rotationSpeed * (1 + avgEnergy);
      planet.mesh.rotation.x += planet.rotationSpeed * 0.5 * avgEnergy;

      // Orbital motion affected by audio
      const orbitSpeed = planet.orbitSpeed * (1 + sustainedEnergy * 2);
      const time = this.time * orbitSpeed;
      const orbitRadius = planet.orbitRadius * (1 + avgEnergy * 0.2);

      planet.mesh.position.x = Math.cos(time + planet.orbitOffset) * orbitRadius;
      planet.mesh.position.z = Math.sin(time + planet.orbitOffset) * orbitRadius;
      planet.mesh.position.y += (Math.random() - 0.5) * avgEnergy * 0.5;
      planet.mesh.position.y *= 0.95; // Damping to prevent extreme vertical drift
    });
  }

  getPlanets() {
    return this.planets.map(p => p.mesh);
  }
}