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
        frequencyData: { value: new Float32Array(128) },
        colorHistory: { value: new Float32Array(128 * 3) }, // Store color history
        colorDecay: { value: 0.98 } // Control color persistence
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
        uniform float colorHistory[384]; // 128 * 3 for RGB
        uniform float colorDecay;
        
        vec3 hsv2rgb(vec3 c) {
          vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
          vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
          return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }
        
        // Advanced color blending function
        vec3 blendColors(vec3 a, vec3 b, float t) {
          // Use smoothstep for more natural transitions
          float blend = smoothstep(0.0, 1.0, t);
          
          // Convert to HSV for better blending
          vec3 hsv1 = rgb2hsv(a);
          vec3 hsv2 = rgb2hsv(b);
          
          // Interpolate in HSV space
          float hue = mod(mix(hsv1.x, hsv2.x, blend) + 1.0, 1.0);
          float sat = mix(hsv1.y, hsv2.y, blend);
          float val = mix(hsv1.z, hsv2.z, blend);
          
          return hsv2rgb(vec3(hue, sat, val));
        }
        
        vec3 rgb2hsv(vec3 c) {
          vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
          vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
          vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
          
          float d = q.x - min(q.w, q.y);
          float e = 1.0e-10;
          return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
        }
        
        void main() {
          // Get historical color data for this frequency
          int colorIndex = int(vFrequencyIndex) * 3;
          vec3 historicalColor = vec3(
            colorHistory[colorIndex],
            colorHistory[colorIndex + 1],
            colorHistory[colorIndex + 2]
          );
          
          // Dynamic color based on frequency and position
          float hue = vFrequencyIndex / 128.0 + time * 0.1;
          float saturation = 0.7 + 0.3 * sustainedEnergy;
          float luminance = 0.5 + 0.3 * energyLevel + 0.2 * sin(time + vPosition.y);
          
          vec3 currentColor = hsv2rgb(vec3(hue, saturation, luminance));
          
          // Blend current color with historical color
          vec3 color = blendColors(historicalColor, currentColor, 1.0 - colorDecay);
          
          // Enhanced lighting calculation
          vec3 lightDir = normalize(lightPos - vPosition);
          float diff = max(dot(vNormal, lightDir), 0.0);
          vec3 viewDir = normalize(-vPosition);
          vec3 halfDir = normalize(lightDir + viewDir);
          float spec = pow(max(dot(vNormal, halfDir), 0.0), 32.0);
          
          // Add rim lighting
          float rim = 1.0 - max(dot(vNormal, viewDir), 0.0);
          rim = pow(rim, 3.0) * energyLevel;
          
          // Add energy-based pulse effect
          float pulse = sin(time * 2.0 + length(vPosition)) * 0.5 + 0.5;
          float energyPulse = mix(1.0, 1.0 + pulse * 0.3, sustainedEnergy);
          
          // Combine everything with enhanced effects
          vec3 finalColor = color * (diff + 0.3) * energyPulse + 
                           vec3(spec) * energyLevel * 0.5 + 
                           vec3(1.0, 0.8, 0.2) * rim * energyLevel +
                           historicalColor * 0.3;
                           
          // Add subtle color variation based on position
          finalColor *= 1.0 + 0.1 * sin(vPosition.x * 2.0 + time) +
                             0.1 * cos(vPosition.y * 2.0 + time);
          
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
    
    // Update color history
    const colorHistory = this.material.uniforms.colorHistory.value;
    for (let i = 0; i < frequencyData.length; i++) {
      const freq = frequencyData[i] / 255.0;
      const hue = i / frequencyData.length + this.time * 0.1;
      const color = new THREE.Color().setHSL(hue, 0.7 + 0.3 * sustainedEnergy, 0.5 + 0.3 * normalizedEnergy);
      
      const index = i * 3;
      colorHistory[index] = colorHistory[index] * this.material.uniforms.colorDecay.value + color.r * (1 - this.material.uniforms.colorDecay.value);
      colorHistory[index + 1] = colorHistory[index + 1] * this.material.uniforms.colorDecay.value + color.g * (1 - this.material.uniforms.colorDecay.value);
      colorHistory[index + 2] = colorHistory[index + 2] * this.material.uniforms.colorDecay.value + color.b * (1 - this.material.uniforms.colorDecay.value);
    }
    
    // Adjust color decay based on energy
    this.material.uniforms.colorDecay.value = 0.98 - normalizedEnergy * 0.03;
  }
}