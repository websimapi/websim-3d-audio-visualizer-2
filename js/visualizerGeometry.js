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
    this.currentForm = 0;
    this.transitionProgress = 0;

    // Create multiple base geometries
    this.geometries = [
      new THREE.SphereGeometry(this.baseRadius, this.segments, this.rings),
      new THREE.TorusGeometry(this.baseRadius * 1.2, this.baseRadius * 0.5, this.segments, this.rings),
      new THREE.OctahedronGeometry(this.baseRadius, 4),
      new THREE.IcosahedronGeometry(this.baseRadius, 2)
    ];

    this.basePositions = this.geometries.map(g => g.attributes.position.array.slice());

    // Enhanced material with more dynamic effects and form transitions
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        baseColor: { value: new THREE.Color(0x00ff00) },
        energyLevel: { value: 0.0 },
        sustainedEnergy: { value: 0.0 },
        lightPos: { value: new THREE.Vector3(10, 10, 10) },
        frequencyData: { value: new Float32Array(128) },
        blobScale: { value: 1.0 },
        noiseIntensity: { value: 1.0 },
        transitionProgress: { value: 0.0 },
        currentForm: { value: 0.0 },
        nextForm: { value: 1.0 },
        bassEnergy: { value: 0.0 },
        midEnergy: { value: 0.0 },
        highEnergy: { value: 0.0 }
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
        uniform float transitionProgress;
        uniform float currentForm;
        uniform float nextForm;
        uniform float bassEnergy;
        uniform float midEnergy;
        uniform float highEnergy;

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

          float m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }

        vec3 computeFormPosition(vec3 pos, float formType, float time) {
          // Sphere
          if(formType < 1.0) {
            return pos;
          }
          // Torus
          else if(formType < 2.0) {
            float angle = atan(pos.z, pos.x);
            float radius = length(pos.xz);
            return vec3(
              radius * cos(angle),
              pos.y * sin(time),
              radius * sin(angle)
            );
          }
          // Crystal
          else if(formType < 3.0) {
            float scale = 1.0 + 0.3 * sin(time + length(pos));
            return pos * scale;
          }
          // Fractal
          else {
            vec3 p = pos;
            float scale = 1.0 + 0.5 * sin(time * 0.5);
            for(int i = 0; i < 3; i++) {
              p = abs(p) / dot(p,p) - scale;
            }
            return p;
          }
        }

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          vFrequencyIndex = float(gl_VertexID % 128);

          // Compute positions for current and next form
          vec3 currentPos = computeFormPosition(position, currentForm, time);
          vec3 nextPos = computeFormPosition(position, nextForm, time);

          // Interpolate between forms
          vec3 morphedPosition = mix(currentPos, nextPos, transitionProgress);

          // Enhanced geometric deformation
          float freqValue = frequencyData[int(vFrequencyIndex)];
          vec3 noisePos = morphedPosition * 0.5 + vec3(time * 0.2);
          float noise = snoise(noisePos) * noiseIntensity;

          // Dynamic blob effect
          float blobPhase = time * 2.0;
          float blobNoise = snoise(morphedPosition * 0.3 + vec3(blobPhase));

          // Combine multiple displacement effects
          vec3 displacement = normal * (
            (sin(morphedPosition.y * 10.0 + time) * energyLevel * 0.3) +
            (noise * energyLevel * 0.4) +
            (freqValue * 0.03) +
            (blobNoise * sustainedEnergy * 0.5)
          );

          // Apply growth factor
          float growthFactor = 1.0 + sustainedEnergy * 0.8 * blobScale;
          vec3 newPosition = (morphedPosition * growthFactor + displacement);

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
        uniform float bassEnergy;
        uniform float midEnergy;
        uniform float highEnergy;

        vec3 hsv2rgb(vec3 c) {
          vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
          vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
          return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }

        void main() {
          // Enhanced dynamic color with more spread
          float distanceFromCenter = length(vPosition) * 0.15;
          float hue = vFrequencyIndex / 128.0 + 
                      time * 0.1 + 
                      distanceFromCenter + 
                      sin(vPosition.y * 2.0 + time) * 0.2;

          // More dramatic saturation variation
          float saturation = mix(0.8, 1.0, 
            sin(distanceFromCenter * 3.0 + time) * 0.5 + 0.5) * 
            (1.0 + sustainedEnergy * 0.5);

          // Enhanced luminance with more dynamic range
          float luminance = mix(0.4, 0.9,
            sin(time * 3.0 + vPosition.y * 4.0) * 0.5 + 0.5) * 
            (1.0 + energyLevel * 0.6);

          vec3 color = hsv2rgb(vec3(hue, saturation, luminance));

          // Enhanced lighting with more dramatic effects
          vec3 lightDir = normalize(lightPos - vPosition);
          float diff = max(dot(vNormal, lightDir), 0.0);
          vec3 reflection = reflect(-lightDir, vNormal);
          float spec = pow(max(dot(reflection, normalize(vec3(0,0,1))), 0.0), 16.0);

          // Enhanced rim lighting with color variation
          float rim = 1.0 - max(dot(vNormal, vec3(0,0,1)), 0.0);
          rim = pow(rim, 1.5) * (1.5 + sustainedEnergy);
          vec3 rimColor = hsv2rgb(vec3(hue + 0.5, 0.9, 0.9));

          // Combine all lighting effects with more intensity
          vec3 finalColor = color * (diff + 0.4) * 1.2 + 
                            vec3(spec) * energyLevel * 0.8 + 
                            rimColor * rim * energyLevel * 0.7;

          // Add subtle color pulsing
          finalColor *= 1.0 + sin(time * 2.0) * 0.1 * sustainedEnergy;

          // Enhance overall vibrancy
          finalColor = pow(finalColor, vec3(0.8));

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });

    this.mesh = new THREE.Mesh(this.geometries[0], this.material);
  }

  transitionToForm(formIndex) {
    const currentForm = this.currentForm;
    this.material.uniforms.currentForm.value = currentForm;
    this.material.uniforms.nextForm.value = formIndex;
    this.currentForm = formIndex;

    // Reset transition progress
    this.transitionProgress = 0;
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

    // Update form transition
    if(this.transitionProgress < 1.0) {
      this.transitionProgress += 0.016;
      this.material.uniforms.transitionProgress.value = 
        THREE.MathUtils.smoothstep(this.transitionProgress, 0, 1);
    }

    // Randomly transition forms based on energy levels
    if(sustainedEnergy > 0.8 && Math.random() < 0.05) {
      const nextForm = (this.currentForm + 1) % this.geometries.length;
      this.transitionToForm(nextForm);
    }

    // Dynamic form morphing based on frequency ranges
    const bassEnergy = frequencyData.slice(0, 32).reduce((a, b) => a + b, 0) / (32 * 255);
    const midEnergy = frequencyData.slice(32, 96).reduce((a, b) => a + b, 0) / (64 * 255);
    const highEnergy = frequencyData.slice(96).reduce((a, b) => a + b, 0) / (32 * 255);

    this.material.uniforms.bassEnergy.value = bassEnergy;
    this.material.uniforms.midEnergy.value = midEnergy;
    this.material.uniforms.highEnergy.value = highEnergy;
  }
}