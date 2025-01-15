import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

export class VisualizerGeometry {
  constructor() {
    this.segments = 128;
    this.rings = 50;
    this.baseRadius = 5;
    this.frequencies = new Float32Array(this.segments);
    this.time = 0;
    this.energyHistory = new Array(10).fill(0);
    
    // Create geometry with advanced parameters
    const geometry = new THREE.SphereGeometry(this.baseRadius, this.segments, this.rings);
    
    // Enhanced material with more dynamic effects
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        baseColor: { value: new THREE.Color(0x00ff00) },
        energyLevel: { value: 0.0 },
        sustainedEnergy: { value: 0.0 },
        lightPos: { value: new THREE.Vector3(10, 10, 10) },
        frequencyData: { value: new Float32Array(128) }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying float vFrequencyIndex;
        uniform float time;
        uniform float energyLevel;
        uniform float sustainedEnergy;
        uniform float frequencyData[128];
        
        float getNoise(vec3 p) {
          return sin(p.x * 10.0 + time) * sin(p.y * 10.0 + time) * sin(p.z * 10.0 + time);
        }
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          
          // Calculate vertex frequency index
          vFrequencyIndex = float(gl_VertexID % 128);
          
          // Complex deformation based on multiple frequencies
          float freqValue = frequencyData[int(vFrequencyIndex)];
          float wave = sin(position.y * 10.0 + time) * energyLevel;
          float noise = getNoise(position);
          
          // Dynamic growth factor based on sustained energy
          float growthFactor = 1.0 + sustainedEnergy * 0.5;
          
          // Combine multiple displacement effects
          vec3 displacement = normal * (
            wave * 0.2 +
            noise * 0.1 * energyLevel +
            freqValue * 0.02 +
            sin(time * 2.0 + position.y * 5.0) * 0.1 * energyLevel
          );
          
          vec3 newPosition = position * growthFactor + displacement;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying float vFrequencyIndex;
        uniform float time;
        uniform vec3 baseColor;
        uniform float energyLevel;
        uniform float sustainedEnergy;
        uniform vec3 lightPos;
        
        vec3 hsv2rgb(vec3 c) {
          vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
          vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
          return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }
        
        void main() {
          // Dynamic color based on frequency and position
          float hue = vFrequencyIndex / 128.0 + time * 0.1;
          float saturation = 0.5 + 0.5 * sustainedEnergy;
          float luminance = 0.4 + 0.3 * energyLevel + 0.3 * sin(time + vPosition.y);
          
          vec3 color = hsv2rgb(vec3(hue, saturation, luminance));
          
          // Enhanced lighting calculation
          vec3 lightDir = normalize(lightPos - vPosition);
          float diff = max(dot(vNormal, lightDir), 0.0);
          vec3 reflection = reflect(-lightDir, vNormal);
          float spec = pow(max(dot(reflection, normalize(vec3(0,0,1))), 0.0), 32.0);
          
          // Add rim lighting
          float rim = 1.0 - max(dot(vNormal, vec3(0,0,1)), 0.0);
          rim = pow(rim, 3.0) * energyLevel;
          
          // Combine everything with energy-based glow
          vec3 finalColor = color * (diff + 0.3) + 
                           vec3(spec) * energyLevel + 
                           vec3(1,0.8,0.2) * rim * energyLevel;
          
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });
    
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.originalPositions = geometry.attributes.position.array.slice();
  }

  update(frequencyData) {
    this.time += 0.016;
    
    // Calculate various energy levels
    const avgEnergy = frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length;
    const normalizedEnergy = avgEnergy / 255.0;
    
    // Update energy history for sustained effects
    this.energyHistory.push(normalizedEnergy);
    this.energyHistory.shift();
    const sustainedEnergy = this.energyHistory.reduce((a, b) => Math.max(a, b), 0);
    
    // Update shader uniforms
    this.material.uniforms.energyLevel.value = normalizedEnergy;
    this.material.uniforms.sustainedEnergy.value = sustainedEnergy;
    this.material.uniforms.time.value = this.time;
    
    // Update frequency data uniform
    const normalizedFrequencies = new Float32Array(frequencyData.length);
    for (let i = 0; i < frequencyData.length; i++) {
      normalizedFrequencies[i] = frequencyData[i] / 255.0;
    }
    this.material.uniforms.frequencyData.value = normalizedFrequencies;
    
    // Dynamic light position
    const lightR = 10 + sustainedEnergy * 5;
    const lightH = 10 + normalizedEnergy * 5;
    this.material.uniforms.lightPos.value.set(
      lightR * Math.cos(this.time * 0.5),
      lightH + Math.sin(this.time * 0.3) * 2,
      lightR * Math.sin(this.time * 0.5)
    );
  }
}