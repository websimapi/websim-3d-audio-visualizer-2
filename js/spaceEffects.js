import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

export class SpaceEffects {
  constructor(scene) {
    this.scene = scene;
    this.time = 0;
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
        energyLevel: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float time;
        uniform float energyLevel;
        
        void main() {
          vColor = color;
          vec3 pos = position;
          pos.x += sin(time * 0.5 + position.z * 0.02) * (1.0 + energyLevel);
          pos.y += cos(time * 0.4 + position.x * 0.02) * (1.0 + energyLevel);
          pos.z += sin(time * 0.3 + position.y * 0.02) * (1.0 + energyLevel);
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (1.0 + energyLevel) * (300.0 / -mvPosition.z);
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
        energyLevel: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float time;
        uniform float energyLevel;
        
        void main() {
          vColor = color;
          vec3 pos = position;
          float wave = sin(time * 0.2 + length(position) * 0.1) * (1.0 + energyLevel * 2.0);
          pos += normalize(position) * wave;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (1.0 + energyLevel) * (100.0 / -mvPosition.z);
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
        energyLevel: { value: 0 }
      },
      vertexShader: `
        attribute vec3 color;
        varying vec3 vColor;
        uniform float time;
        uniform float energyLevel;
        
        void main() {
          vColor = color;
          vec3 pos = position;
          float angle = time * (1.0 + energyLevel) + length(position) * 0.02;
          mat3 rotation = mat3(
            cos(angle), -sin(angle), 0,
            sin(angle), cos(angle), 0,
            0, 0, 1
          );
          pos = rotation * pos;
          pos += normalize(pos) * sin(time * 2.0 + length(pos)) * energyLevel * 5.0;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = 3.0 * (1.0 + energyLevel) * (300.0 / -mvPosition.z);
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
    
    // Update starfield
    this.starfield.material.uniforms.time.value = time;
    this.starfield.material.uniforms.energyLevel.value = avgEnergy;
    this.starfield.rotation.y = time * 0.05;
    
    // Update nebula
    this.nebula.material.uniforms.time.value = time;
    this.nebula.material.uniforms.energyLevel.value = avgEnergy;
    this.nebula.rotation.z = time * 0.02;
    
    // Update wormhole
    this.wormhole.material.uniforms.time.value = time;
    this.wormhole.material.uniforms.energyLevel.value = avgEnergy;
    this.wormhole.rotation.z = time * 0.1 * (1 + avgEnergy);
  }
}