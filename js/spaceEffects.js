import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

export class SpaceEffects {
  constructor() {
    this.group = new THREE.Group();
    this.time = 0;
    this.createOrbitalRings();
    this.createNebulaEffects();
    this.createCosmicDust();
  }

  createOrbitalRings() {
    this.rings = [];
    const ringCount = 3;
    
    for (let i = 0; i < ringCount; i++) {
      const geometry = new THREE.TorusGeometry(20 + i * 10, 0.2, 16, 100);
      const material = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          energy: { value: 0 },
          baseColor: { value: new THREE.Color().setHSL(i/ringCount, 0.8, 0.5) }
        },
        vertexShader: `
          uniform float time;
          uniform float energy;
          varying vec3 vPosition;
          
          void main() {
            vPosition = position;
            vec3 pos = position;
            float wave = sin(pos.x * 0.5 + time * 2.0) * cos(pos.z * 0.5 + time);
            pos.y += wave * energy;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 baseColor;
          uniform float energy;
          uniform float time;
          varying vec3 vPosition;
          
          void main() {
            float pulse = sin(time * 3.0) * 0.5 + 0.5;
            vec3 color = baseColor * (1.0 + energy + pulse * 0.3);
            gl_FragColor = vec4(color, 0.7);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending
      });
      
      const ring = new THREE.Mesh(geometry, material);
      ring.rotation.x = Math.PI/2;
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

  update(frequencyData) {
    this.time += 0.016;
    const avgEnergy = frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length / 255;
    
    // Update rings
    this.rings.forEach((ring, i) => {
      ring.material.uniforms.time.value = this.time;
      ring.material.uniforms.energy.value = avgEnergy;
      ring.rotation.z = this.time * (0.1 + i * 0.05) + avgEnergy;
    });
    
    // Update nebula
    this.nebula.material.uniforms.time.value = this.time;
    this.nebula.material.uniforms.energy.value = avgEnergy;
    this.nebula.rotation.y = this.time * 0.05;
    
    // Update cosmic dust
    this.cosmicDust.material.uniforms.time.value = this.time;
    this.cosmicDust.material.uniforms.energy.value = avgEnergy;
  }

  onBeat(intensity) {
    this.group.scale.setScalar(1 + intensity * 0.2);
    setTimeout(() => {
      this.group.scale.setScalar(1);
    }, 200);
  }
}