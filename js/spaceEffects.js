import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

export class SpaceEffects {
  constructor() {
    this.group = new THREE.Group();
    this.time = 0;
    this.createOrbitalRings();
    this.createNebulaEffects();
    this.createCosmicDust();
    this.createDynamicStarfield();
  }

  createOrbitalRings() {
    this.rings = [];
    const ringCount = 5; // Increased number of rings
    
    for (let i = 0; i < ringCount; i++) {
      const geometry = new THREE.TorusGeometry(15 + i * 8, 0.1, 32, 200); // More segments for smoother deformation
      const material = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          energy: { value: 0 },
          baseColor: { value: new THREE.Color().setHSL(i/ringCount, 0.9, 0.6) },
          frequencyBand: { value: 0 }
        },
        vertexShader: `
          uniform float time;
          uniform float energy;
          uniform float frequencyBand;
          varying vec3 vPosition;
          
          void main() {
            vPosition = position;
            vec3 pos = position;
            
            // Complex wave deformation
            float wave1 = sin(pos.x * 2.0 + time * 3.0) * cos(pos.z * 2.0 + time);
            float wave2 = cos(pos.x * 3.0 - time * 2.0) * sin(pos.z * 3.0 + time * 0.5);
            float wave3 = sin(pos.x * 0.5 + time) * sin(pos.z * 0.5 - time * 0.2);
            
            // Combine waves with frequency response
            float totalWave = (wave1 + wave2 + wave3) * energy * 2.0;
            
            // Add spiral motion
            float spiral = sin(time * 0.5 + pos.x * 0.2) * cos(time * 0.3 + pos.z * 0.2);
            
            // Apply deformations
            pos.x += totalWave * cos(time);
            pos.y += totalWave + spiral * energy;
            pos.z += totalWave * sin(time);
            
            // Scale based on frequency
            float scale = 1.0 + frequencyBand * 0.3;
            pos *= scale;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 baseColor;
          uniform float energy;
          uniform float time;
          varying vec3 vPosition;
          
          void main() {
            // Dynamic color variation
            vec3 color = baseColor;
            float pulse = sin(time * 3.0) * 0.5 + 0.5;
            
            // Enhanced glow effect
            color *= 1.0 + energy * 2.0 + pulse * 0.5;
            
            // Add color variation based on position
            float positionFactor = sin(vPosition.x * 0.1 + time) * cos(vPosition.z * 0.1 + time);
            color += vec3(0.2, 0.3, 0.4) * positionFactor * energy;
            
            // Enhance brightness based on energy
            float alpha = (0.6 + energy * 0.4) * (0.8 + pulse * 0.2);
            
            gl_FragColor = vec4(color, alpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      });
      
      const ring = new THREE.Mesh(geometry, material);
      ring.rotation.x = Math.PI/2 + Math.random() * 0.5;
      ring.rotation.y = Math.random() * Math.PI * 2;
      this.rings.push(ring);
      this.group.add(ring);
    }
  }

  createNebulaEffects() {
    const geometry = new THREE.IcosahedronGeometry(50, 4);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        energy: { value: 0 }
      },
      vertexShader: `
        varying vec3 vPosition;
        void main() {
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float energy;
        varying vec3 vPosition;
        
        float noise(vec3 p) {
          return fract(sin(dot(p, vec3(12.9898, 78.233, 45.5432))) * 43758.5453);
        }
        
        void main() {
          float n = noise(vPosition + time);
          vec3 color = mix(
            vec3(0.5, 0.0, 1.0),
            vec3(0.0, 1.0, 0.5),
            n + sin(time + vPosition.x * 0.1) * 0.5 + 0.5
          );
          float alpha = smoothstep(0.3, 0.7, n) * (0.1 + energy * 0.2);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    
    this.nebula = new THREE.Mesh(geometry, material);
    this.group.add(this.nebula);
  }

  createCosmicDust() {
    const particleCount = 1000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const radius = Math.random() * 40 + 20;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);
      
      const color = new THREE.Color().setHSL(Math.random(), 0.8, 0.5);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
      
      sizes[i] = Math.random() * 2 + 1;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        energy: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        uniform float time;
        uniform float energy;
        varying vec3 vColor;
        
        void main() {
          vColor = color;
          vec3 pos = position;
          float wave = sin(pos.x * 0.1 + time) * cos(pos.z * 0.1 + time);
          pos += normal * wave * energy * 2.0;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (1.0 + energy) * (300.0 / length(pos.xyz));
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.cosmicDust = new THREE.Points(geometry, material);
    this.group.add(this.cosmicDust);
  }

  createDynamicStarfield() {
    const starCount = 10000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const colors = new Float32Array(starCount * 3);
    
    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      // Distribute stars in a sphere
      const radius = Math.random() * 1000 + 100;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);
      
      // Varied star sizes
      sizes[i] = Math.random() * 3 + 1;
      
      // Star colors (mostly white with slight variations)
      const colorTemp = Math.random();
      colors[i3] = 0.9 + colorTemp * 0.1;     // R
      colors[i3 + 1] = 0.9 + colorTemp * 0.1; // G
      colors[i3 + 2] = 1.0;                   // B
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        energy: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float time;
        uniform float energy;
        
        void main() {
          vColor = color;
          vec3 pos = position;
          
          // Subtle star movement
          float movement = sin(time * 0.2 + pos.x * 0.01) * cos(time * 0.15 + pos.z * 0.01);
          pos.y += movement * energy * 10.0;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          
          // Dynamic star size based on energy
          gl_PointSize = size * (1.0 + energy * 0.5) * (300.0 / length(mvPosition.xyz));
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          
          // Soft star glow
          float strength = 1.0 - (d * 2.0);
          strength = pow(strength, 1.5);
          
          gl_FragColor = vec4(vColor, strength);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.starfield = new THREE.Points(geometry, material);
    this.group.add(this.starfield);
  }

  update(frequencyData) {
    this.time += 0.016;
    const avgEnergy = frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length / 255;
    
    // Update rings with frequency bands
    this.rings.forEach((ring, i) => {
      const bandIndex = Math.floor(i * frequencyData.length / this.rings.length);
      const bandEnergy = frequencyData[bandIndex] / 255;
      
      ring.material.uniforms.time.value = this.time;
      ring.material.uniforms.energy.value = avgEnergy;
      ring.material.uniforms.frequencyBand.value = bandEnergy;
      
      // Dynamic ring rotation
      ring.rotation.z += (0.005 + bandEnergy * 0.02) * (i % 2 ? 1 : -1);
      ring.rotation.x += bandEnergy * 0.01;
      
      // Ring scale pulsing
      const scale = 1 + bandEnergy * 0.2;
      ring.scale.set(scale, scale, scale);
    });
    
    // Update starfield
    if (this.starfield) {
      this.starfield.material.uniforms.time.value = this.time;
      this.starfield.material.uniforms.energy.value = avgEnergy;
      this.starfield.rotation.y += 0.0001;
      this.starfield.rotation.x += 0.0001 * avgEnergy;
    }
    
    // Update other effects
    this.updateNebulaEffects(avgEnergy);
    this.updateCosmicDust(frequencyData);
  }

  updateNebulaEffects(avgEnergy) {
    this.nebula.material.uniforms.time.value = this.time;
    this.nebula.material.uniforms.energy.value = avgEnergy;
    this.nebula.rotation.y = this.time * 0.05;
  }

  updateCosmicDust(frequencyData) {
    this.cosmicDust.material.uniforms.time.value = this.time;
    this.cosmicDust.material.uniforms.energy.value = frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length / 255;
  }

  onBeat(intensity) {
    this.group.scale.setScalar(1 + intensity * 0.2);
    setTimeout(() => {
      this.group.scale.setScalar(1);
    }, 200);
  }
}