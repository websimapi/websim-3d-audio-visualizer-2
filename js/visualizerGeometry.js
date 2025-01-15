import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

export class VisualizerGeometry {
  constructor() {
    this.segments = 128;
    this.rings = 50;
    this.baseRadius = 5;
    this.frequencies = new Float32Array(this.segments);
    this.time = 0;
    this.energyHistory = new Array(10).fill(0);
    this.lastDeformation = new Float32Array(this.segments * this.rings * 3);
    
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
        blobScale: { value: 1.0 },
        noiseIntensity: { value: 1.0 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying float vFrequencyIndex;
        uniform float time;
        uniform float energyLevel;
        uniform float sustainedEnergy;
        uniform float frequencyData[128];
        uniform float blobScale;
        uniform float noiseIntensity;
        
        // Improved noise function
        vec3 mod289(vec3 x) {
          return x - floor(x * (1.0 / 289.0)) * 289.0;
        }
        
        vec4 mod289(vec4 x) {
          return x - floor(x * (1.0 / 289.0)) * 289.0;
        }
        
        vec4 permute(vec4 x) {
          return mod289(((x*34.0)+1.0)*x);
        }
        
        vec4 taylorInvSqrt(vec4 r) {
          return 1.79284291400159 - 0.85373472095314 * r;
        }
        
        float snoise(vec3 v) {
          const vec2 C = vec2(1.0/6.0, 1.0/3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
          
          vec3 i  = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);
          
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min(g.xyz, l.zxy);
          vec3 i2 = max(g.xyz, l.zxy);
          
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          
          i = mod289(i);
          vec4 p = permute(permute(permute(
                    i.z + vec4(0.0, i1.z, i2.z, 1.0))
                    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
                    
          float n_ = 0.142857142857;
          vec3 ns = n_ * D.wyz - D.xzx;
          
          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_);
          
          vec4 x = x_ *ns.x + ns.yyyy;
          vec4 y = y_ *ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          
          vec4 b0 = vec4(x.xy, y.xy);
          vec4 b1 = vec4(x.zw, y.zw);
          
          vec4 s0 = floor(b0)*2.0 + 1.0;
          vec4 s1 = floor(b1)*2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          
          vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
          vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
          
          vec3 p0 = vec3(a0.xy,h.x);
          vec3 p1 = vec3(a0.zw,h.y);
          vec3 p2 = vec3(a1.xy,h.z);
          vec3 p3 = vec3(a1.zw,h.w);
          
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
          p0 *= norm.x;
          p1 *= norm.y;
          p2 *= norm.z;
          p3 *= norm.w;
          
          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          vFrequencyIndex = float(gl_VertexID % 128);
          
          // Enhanced geometric deformation
          float freqValue = frequencyData[int(vFrequencyIndex)];
          vec3 noisePos = position * 0.5 + vec3(time * 0.2);
          float noise = snoise(noisePos) * noiseIntensity;
          
          // Dynamic blob effect
          float blobPhase = time * 2.0;
          float blobNoise = snoise(position * 0.3 + vec3(blobPhase));
          
          // Combine multiple displacement effects
          vec3 displacement = normal * (
            (sin(position.y * 10.0 + time) * energyLevel * 0.3) +
            (noise * energyLevel * 0.4) +
            (freqValue * 0.03) +
            (blobNoise * sustainedEnergy * 0.5)
          );
          
          // Apply growth factor
          float growthFactor = 1.0 + sustainedEnergy * 0.8 * blobScale;
          vec3 newPosition = (position * growthFactor + displacement);
          
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
          // Enhanced dynamic color
          float hue = vFrequencyIndex / 128.0 + time * 0.1 + vPosition.y * 0.1;
          float saturation = 0.7 + 0.3 * sustainedEnergy;
          float luminance = 0.5 + 0.3 * energyLevel + 0.2 * sin(time * 2.0 + vPosition.y * 3.0);
          
          vec3 color = hsv2rgb(vec3(hue, saturation, luminance));
          
          // Enhanced lighting
          vec3 lightDir = normalize(lightPos - vPosition);
          float diff = max(dot(vNormal, lightDir), 0.0);
          vec3 reflection = reflect(-lightDir, vNormal);
          float spec = pow(max(dot(reflection, normalize(vec3(0,0,1))), 0.0), 32.0);
          
          // Dynamic rim lighting
          float rim = 1.0 - max(dot(vNormal, vec3(0,0,1)), 0.0);
          rim = pow(rim, 2.0) * (1.0 + sustainedEnergy);
          
          vec3 finalColor = color * (diff + 0.3) + 
                           vec3(spec) * energyLevel + 
                           vec3(1,0.9,0.8) * rim * energyLevel;
                           
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