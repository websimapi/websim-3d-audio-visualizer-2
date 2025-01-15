import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

export class SpaceEffects {
  constructor(scene) {
    this.scene = scene;
    this.time = 0;
    this.lastEnergy = 0;
    this.setupStarfield();
    this.setupNebula();
    this.setupWormhole();
  }

  setupStarfield() {
    const starCount = 5000;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const radius = 50 + Math.random() * 150;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      
      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = radius * Math.cos(phi);
      
      const color = new THREE.Color().setHSL(Math.random(), 0.5, 0.8);
      starColors[i * 3] = color.r;
      starColors[i * 3 + 1] = color.g;
      starColors[i * 3 + 2] = color.b;
      
      starSizes[i] = Math.random() * 2 + 1;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    starGeometry.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));

    const starMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        energyLevel: { value: 0 },
        smoothEnergy: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float time;
        uniform float smoothEnergy;
        
        float smoothNoise(vec3 p) {
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
          
          // Smoother star motion
          float noise = smoothNoise(vec3(
            pos.x * 0.02 + time * 0.1,
            pos.y * 0.02,
            pos.z * 0.02 + time * 0.05
          ));
          
          pos += normalize(pos) * noise * (1.0 + smoothEnergy) * 2.0;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (1.0 + smoothEnergy * 0.5) * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        
        void main() {
          float r = length(gl_PointCoord - vec2(0.5));
          if (r > 0.5) discard;
          gl_FragColor = vec4(vColor, 1.0 - r * 2.0);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.starfield = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(this.starfield);
  }

  setupNebula() {
    const nebulaGeometry = new THREE.BufferGeometry();
    const nebulaCount = 1000;
    const positions = new Float32Array(nebulaCount * 3);
    const colors = new Float32Array(nebulaCount * 3);
    const sizes = new Float32Array(nebulaCount);

    for (let i = 0; i < nebulaCount; i++) {
      const radius = 30 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      
      const hue = Math.random() * 0.2 + 0.5; // Purple-blue range
      const color = new THREE.Color().setHSL(hue, 0.8, 0.6);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      
      sizes[i] = Math.random() * 10 + 5;
    }

    nebulaGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    nebulaGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    nebulaGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const nebulaMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        energyLevel: { value: 0 },
        smoothEnergy: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float time;
        uniform float smoothEnergy;
        
        void main() {
          vColor = color;
          vec3 pos = position;
          
          // Smoother nebula motion
          float wave = sin(time * 0.1 + length(position) * 0.05) * 
                      (1.0 + smoothEnergy * 2.0);
          pos += normalize(position) * wave;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (1.0 + smoothEnergy) * (100.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        
        void main() {
          float r = length(gl_PointCoord - vec2(0.5));
          float alpha = smoothstep(0.5, 0.0, r);
          gl_FragColor = vec4(vColor, alpha * 0.5);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.nebula = new THREE.Points(nebulaGeometry, nebulaMaterial);
    this.scene.add(this.nebula);
  }

  setupWormhole() {
    const geometry = new THREE.BufferGeometry();
    const particleCount = 2000;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const t = i / particleCount;
      const angle = t * Math.PI * 20;
      const radius = 20 + t * 30;
      
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius;
      positions[i * 3 + 2] = (t - 0.5) * 100;
      
      const color = new THREE.Color().setHSL(t * 0.5 + 0.5, 0.8, 0.5);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        energyLevel: { value: 0 },
        smoothEnergy: { value: 0 }
      },
      vertexShader: `
        attribute vec3 color;
        varying vec3 vColor;
        uniform float time;
        uniform float smoothEnergy;
        
        void main() {
          vColor = color;
          vec3 pos = position;
          float angle = time * (1.0 + smoothEnergy) + length(position) * 0.02;
          mat3 rotation = mat3(
            cos(angle), -sin(angle), 0,
            sin(angle), cos(angle), 0,
            0, 0, 1
          );
          pos = rotation * pos;
          pos += normalize(pos) * sin(time * 2.0 + length(pos)) * smoothEnergy * 5.0;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = 3.0 * (1.0 + smoothEnergy) * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        
        void main() {
          float r = length(gl_PointCoord - vec2(0.5));
          if (r > 0.5) discard;
          gl_FragColor = vec4(vColor, 1.0 - r * 2.0);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.wormhole = new THREE.Points(geometry, material);
    this.scene.add(this.wormhole);
  }

  update(frequencyData) {
    const time = Date.now() * 0.001;
    const avgEnergy = frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length / 255;
    
    // Smooth energy transition
    this.lastEnergy = this.lastEnergy * 0.95 + avgEnergy * 0.05;
    
    // Update all effects with smooth energy
    if (this.starfield) {
      this.starfield.material.uniforms.time.value = time;
      this.starfield.material.uniforms.energyLevel.value = avgEnergy;
      this.starfield.material.uniforms.smoothEnergy.value = this.lastEnergy;
      this.starfield.rotation.y = time * 0.02; // Slower rotation
    }
    
    if (this.nebula) {
      this.nebula.material.uniforms.time.value = time;
      this.nebula.material.uniforms.energyLevel.value = avgEnergy;
      this.nebula.material.uniforms.smoothEnergy.value = this.lastEnergy;
      this.nebula.rotation.z = time * 0.01; // Slower rotation
    }
    
    if (this.wormhole) {
      this.wormhole.material.uniforms.time.value = time;
      this.wormhole.material.uniforms.energyLevel.value = avgEnergy;
      this.wormhole.material.uniforms.smoothEnergy.value = this.lastEnergy;
      this.wormhole.rotation.z = time * 0.05 * (1 + this.lastEnergy); // Smoother rotation
    }
  }
}