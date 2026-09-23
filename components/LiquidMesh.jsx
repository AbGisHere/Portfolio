'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform vec2 uPointer;
  uniform float uScrollVelocity;
  varying float vDisplacement;

  //	Simplex 3D Noise by Ian McEwan, Ashima Arts
  vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
  float snoise(vec3 v){
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
    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 1.0 / 7.0;
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
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    vec3 pos = position;
    float noise = snoise(vec3(pos.x * 1.4, pos.y * 1.4, uTime * 0.18));
    float pointerDist = distance(uv, uPointer * 0.5 + 0.5);
    float pointerPush = smoothstep(0.5, 0.0, pointerDist) * 0.6;
    float displacement = noise * (0.18 + uScrollVelocity * 0.6) + pointerPush;
    vDisplacement = displacement;
    pos += normal * displacement;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  varying float vDisplacement;

  void main() {
    vec3 deep = vec3(0.121, 0.227, 0.227); // teal
    vec3 hot = vec3(1.0, 0.353, 0.122); // accent
    float t = smoothstep(-0.2, 0.5, vDisplacement);
    vec3 color = mix(deep, hot, t);
    float alpha = 0.55 + t * 0.35;
    gl_FragColor = vec4(color, alpha);
  }
`;

export default function LiquidMesh() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 3.2;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    mount.appendChild(renderer.domElement);

    const geometry = new THREE.IcosahedronGeometry(1.35, 64);
    const uniforms = {
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uScrollVelocity: { value: 0 },
    };
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms,
      transparent: true,
      wireframe: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    let lastScrollY = window.scrollY;
    let frameId;

    function resize() {
      const { clientWidth, clientHeight } = mount;
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight);
    }

    function onPointerMove(e) {
      const rect = mount.getBoundingClientRect();
      uniforms.uPointer.value.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      uniforms.uPointer.value.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    }

    function onScroll() {
      const y = window.scrollY;
      uniforms.uScrollVelocity.value = Math.min(Math.abs(y - lastScrollY) * 0.02, 1.5);
      lastScrollY = y;
    }

    const clock = new THREE.Clock();
    function animate() {
      frameId = requestAnimationFrame(animate);
      uniforms.uTime.value = clock.getElapsedTime();
      uniforms.uScrollVelocity.value *= 0.92;
      mesh.rotation.y += 0.0009;
      mesh.rotation.x += 0.0004;
      renderer.render(scene, camera);
    }

    resize();
    animate();

    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', onScroll);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="liquid-mesh" aria-hidden="true" />;
}
