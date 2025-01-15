import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

export class ParticleSystem {
  constructor() {
    this.particleCount = 2500; 
    this.positions = new Float32Array(this.particleCount * 3);
    this.velocities = new Float32Array(this.particleCount * 3);
    this.colors = new Float32Array(this.particleCount * 3);
    this.time = 0;
    this.lastEnergy = 0; 
    
    this.geometry = new THREE.BufferGeometry();
    
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        energyLevel: { value: 0.0 },
        smoothEnergy: { value: 0.0 } 
      },
      vertexShader: `
        attribute vec3 color;
        varying vec3 vColor;
        uniform float time;
        uniform float energyLevel;
        uniform float smoothEnergy;
        
        float noise(vec3 p) {
          vec3 i = floor(p);
          vec3 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          
          float n = i.x + i.y * 157.0 + 113.0 * i.z;
          vec4 v = fract(sin(vec4(n, n + 1.0, n + 157.0, n + 158.0)) * 43758.5453);
          
          float a = mix(v.x, v.y, f.x);
          float b = mix(v.z, v.w, f.x);
          return mix(a, b, f.y);
        }
        
        void main() {
          vColor = color;
          vec3 pos = position;
          
          float spiralRadius = length(pos.xz);
          float angle = atan(pos.z, pos.x) + time * (0.1 + smoothEnergy * 0.1);
          float heightOffset = noise(vec3(angle * 0.5, time * 0.2, spiralRadius * 0.1)) * 2.0;
          
          pos.x = spiralRadius * cos(angle);
          pos.z = spiralRadius * sin(angle);
          pos.y += heightOffset * (1.0 + smoothEnergy);
          
          float wave = sin(time * 0.5 + spiralRadius * 0.2) * 
                      cos(angle * 3.0) * 
                      (1.0 + smoothEnergy);
          pos += normalize(position) * wave;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          float size = 2.0 * (1.0 + smoothEnergy);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        
        void main() {
          float r = length(gl_PointCoord - vec2(0.5));
          float alpha = smoothstep(0.5, 0.2, r); 
          gl_FragColor = vec4(vColor, alpha);
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
      const t = i / this.particleCount;
      const spiralAngle = 50 * t * Math.PI * 2;
      const radius = 5 + (Math.pow(t, 0.5) * 15); 
      
      this.positions[i * 3] = radius * Math.cos(spiralAngle);
      this.positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      this.positions[i * 3 + 2] = radius * Math.sin(spiralAngle);
      
      this.velocities[i * 3] = (Math.random() - 0.5) * 0.05;
      this.velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.05;
      this.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.05;
      
      const hue = spiralAngle / (Math.PI * 2);
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
    const normalizedEnergy = avgFrequency / 255.0;
    
    this.lastEnergy = this.lastEnergy * 0.95 + normalizedEnergy * 0.05;
    this.material.uniforms.smoothEnergy.value = this.lastEnergy;
    this.material.uniforms.energyLevel.value = normalizedEnergy;
    this.material.uniforms.time.value = this.time;
    
    const colorUpdateSpeed = 0.1;
    for (let i = 0; i < this.particleCount; i++) {
      const freqIndex = Math.floor(i / this.particleCount * frequencyData.length);
      const freqValue = frequencyData[freqIndex] / 255.0;
      
      const radius = Math.sqrt(
        positions[i * 3] * positions[i * 3] +
        positions[i * 3 + 2] * positions[i * 3 + 2]
      );
      
      const angle = Math.atan2(positions[i * 3 + 2], positions[i * 3]);
      const newAngle = angle + 0.002 * (1 + this.lastEnergy);
      
      positions[i * 3] = radius * Math.cos(newAngle);
      positions[i * 3 + 2] = radius * Math.sin(newAngle);
      
      positions[i * 3 + 1] += this.velocities[i * 3 + 1];
      this.velocities[i * 3 + 1] += (Math.random() - 0.5) * 0.01 * this.lastEnergy;
      this.velocities[i * 3 + 1] *= 0.98; 
      
      const targetHue = (angle + Math.PI) / (Math.PI * 2) + freqValue * 0.2;
      const currentColor = new THREE.Color(
        colors[i * 3],
        colors[i * 3 + 1],
        colors[i * 3 + 2]
      );
      const targetColor = new THREE.Color().setHSL(
        targetHue,
        0.8 + this.lastEnergy * 0.2,
        0.5 + this.lastEnergy * 0.3
      );
      
      currentColor.lerp(targetColor, colorUpdateSpeed);
      
      colors[i * 3] = currentColor.r;
      colors[i * 3 + 1] = currentColor.g;
      colors[i * 3 + 2] = currentColor.b;
    }
    
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }
}