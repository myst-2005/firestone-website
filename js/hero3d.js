/* =========================================================
   FIRESTONE — 3D HERO SCENE (Three.js)
   - Extruded Firestone "FS" mark (layered-plane extrusion)
   - Rising fire embers (GPU particles)
   - Radar-pulse detection grid floor
   - Pressure-gauge rings + alarm-network constellation
   Classic script that dynamically imports Three, so it also
   works when index.html is opened straight from disk.
   ========================================================= */
(async function () {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  let THREE;
  try {
    THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
  } catch (e) {
    document.documentElement.classList.add('no-webgl');
    window.dispatchEvent(new Event('hero3d:ready'));
    return;
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hero = canvas.parentElement;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    document.documentElement.classList.add('no-webgl');
    window.dispatchEvent(new Event('hero3d:ready'));
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x060908, 0.035);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  camera.position.set(0, 0.6, 13);

  const GREEN = new THREE.Color('#22c55e');
  const EMBER = new THREE.Color('#ff5a1f');

  /* ---------- ROOT GROUP (positioned per breakpoint) ---------- */
  const root = new THREE.Group();
  scene.add(root);

  /* ---------- 1. FS MARK — layered extrusion ---------- */
  const markGroup = new THREE.Group();
  root.add(markGroup);

  const tex = new THREE.TextureLoader().load(window.FS_MARK || 'assets/mark.png');
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const LAYERS = 44;
  const DEPTH = 0.55;
  const SIZE = 4.2;
  const layerGeo = new THREE.PlaneGeometry(SIZE, SIZE);
  const layers = [];
  const sharedUniforms = { uTime: { value: 0 } };

  for (let i = 0; i < LAYERS; i++) {
    const t = i / (LAYERS - 1);
    const isFront = i === LAYERS - 1;
    const isBack = i === 0;
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: tex },
        uTime: sharedUniforms.uTime,
        uShade: { value: t },
        uFront: { value: isFront ? 1 : 0 },
        uBack: { value: isBack ? 1 : 0 },
        uReveal: { value: 0 }
      },
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main(){
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }`,
      fragmentShader: /* glsl */`
        uniform sampler2D map;
        uniform float uTime, uShade, uFront, uBack, uReveal;
        varying vec2 vUv;
        void main(){
          vec4 c = texture2D(map, vUv);
          if (c.a < 0.5) discard;
          // reveal wipe bottom->top
          if (vUv.y > uReveal * 1.15) discard;
          float isGreen = step(0.06, c.g - max(c.r, c.b));
          vec3 green  = vec3(0.10, 0.80, 0.34);
          vec3 silver = vec3(0.93, 0.96, 0.94);
          vec3 face = mix(silver, green, isGreen);
          // extrusion walls: darker, with a warm ember tint towards the back
          vec3 wall = mix(face * 0.22, face * 0.55, uShade);
          wall += vec3(1.0, 0.35, 0.08) * (1.0 - uShade) * 0.10;
          vec3 col = mix(wall, face, max(uFront, uBack));
          // light sweep across the front face
          float d = vUv.x + vUv.y * 0.7 - mod(uTime * 0.32, 3.2) + 0.6;
          float sweep = smoothstep(0.09, 0.0, abs(d));
          col += sweep * 0.55 * uFront;
          // edge glow near the reveal line
          float edge = smoothstep(0.08, 0.0, abs(vUv.y - uReveal * 1.15)) * step(uReveal, 0.99);
          col += vec3(1.0, 0.45, 0.1) * edge * 2.0;
          gl_FragColor = vec4(col, 1.0);
        }`,
      side: THREE.DoubleSide
    });
    const m = new THREE.Mesh(layerGeo, mat);
    m.userData.finalZ = -DEPTH / 2 + t * DEPTH;
    m.userData.startZ = (t - 0.5) * 9;
    m.position.z = reduceMotion ? m.userData.finalZ : m.userData.startZ;
    markGroup.add(m);
    layers.push(m);
  }

  /* soft glow behind the mark */
  function radialTexture(inner, outer) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, inner);
    grd.addColorStop(1, outer);
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(11, 11),
    new THREE.MeshBasicMaterial({
      map: radialTexture('rgba(34,197,94,0.55)', 'rgba(34,197,94,0)'),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    })
  );
  glow.position.z = -1.6;
  root.add(glow);

  const emberGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 7),
    new THREE.MeshBasicMaterial({
      map: radialTexture('rgba(255,90,31,0.45)', 'rgba(255,90,31,0)'),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    })
  );
  emberGlow.position.set(0, -3.1, -2.2);
  root.add(emberGlow);

  /* ---------- 2. GAUGE RINGS ---------- */
  const rings = new THREE.Group();
  root.add(rings);

  const ringMat = new THREE.MeshBasicMaterial({ color: GREEN, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(3.25, 0.012, 8, 220), ringMat);
  rings.add(ring1);

  // tick marks (pressure gauge dial)
  const TICKS = 90;
  const tickGeo = new THREE.BoxGeometry(0.018, 0.16, 0.018);
  const tickMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false });
  const ticks = new THREE.InstancedMesh(tickGeo, tickMat, TICKS);
  const dummy = new THREE.Object3D();
  const tickColor = new THREE.Color();
  for (let i = 0; i < TICKS; i++) {
    const a = (i / TICKS) * Math.PI * 2;
    const r = 3.55;
    dummy.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
    dummy.rotation.z = a - Math.PI / 2;
    const big = i % 5 === 0;
    dummy.scale.set(1, big ? 1.9 : 1, 1);
    dummy.updateMatrix();
    ticks.setMatrixAt(i, dummy.matrix);
    // last quarter red = danger zone
    tickColor.set(i > TICKS * 0.78 ? '#ff5a1f' : (big ? '#ffffff' : '#7f8f86'));
    ticks.setColorAt(i, tickColor);
  }
  rings.add(ticks);

  // dashed outer arc (ember)
  const arcPts = [];
  for (let i = 0; i <= 160; i++) {
    const a = -0.4 + (i / 160) * 1.6;
    arcPts.push(new THREE.Vector3(Math.cos(a) * 3.95, Math.sin(a) * 3.95, 0));
  }
  const arc = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(arcPts),
    new THREE.LineDashedMaterial({ color: EMBER, dashSize: 0.08, gapSize: 0.06, transparent: true, opacity: 0.9 })
  );
  arc.computeLineDistances();
  rings.add(arc);

  // orbiting "sensor" dot
  const orbiter = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 16, 16),
    new THREE.MeshBasicMaterial({ color: '#ffb020' })
  );
  rings.add(orbiter);
  const orbiterHalo = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.9),
    new THREE.MeshBasicMaterial({ map: radialTexture('rgba(255,176,32,0.9)', 'rgba(255,90,31,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  rings.add(orbiterHalo);
  rings.position.z = -0.6;
  rings.scale.setScalar(reduceMotion ? 1 : 0.001);

  /* ---------- 3. ALARM NETWORK CONSTELLATION ---------- */
  const net = new THREE.Group();
  scene.add(net);
  const NODES = 26;
  const nodePos = [];
  const nodeGeo = new THREE.OctahedronGeometry(0.075, 0);
  const nodeMat = new THREE.MeshBasicMaterial({ color: GREEN, wireframe: true, transparent: true, opacity: 0.9 });
  const nodes = [];
  for (let i = 0; i < NODES; i++) {
    const p = new THREE.Vector3(
      (Math.random() - 0.5) * 26,
      (Math.random() - 0.35) * 11,
      -3 - Math.random() * 9
    );
    nodePos.push(p);
    const n = new THREE.Mesh(nodeGeo, nodeMat);
    n.position.copy(p);
    n.userData.spin = 0.3 + Math.random();
    net.add(n);
    nodes.push(n);
  }
  const linePts = [];
  for (let i = 0; i < NODES; i++) {
    for (let j = i + 1; j < NODES; j++) {
      if (nodePos[i].distanceTo(nodePos[j]) < 5.2) linePts.push(nodePos[i], nodePos[j]);
    }
  }
  const netLines = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(linePts),
    new THREE.LineBasicMaterial({ color: GREEN, transparent: true, opacity: 0.12 })
  );
  net.add(netLines);

  /* ---------- 4. EMBERS ---------- */
  const EMBERS = window.innerWidth < 700 ? 700 : 1500;
  const eGeo = new THREE.BufferGeometry();
  const ePos = new Float32Array(EMBERS * 3);
  const eSeed = new Float32Array(EMBERS * 4);
  for (let i = 0; i < EMBERS; i++) {
    ePos[i * 3] = (Math.random() - 0.5) * 30;
    ePos[i * 3 + 1] = Math.random() * 16;
    ePos[i * 3 + 2] = (Math.random() - 0.5) * 14 - 2;
    eSeed[i * 4] = Math.random();               // phase
    eSeed[i * 4 + 1] = 0.35 + Math.random() * 1.0; // speed
    eSeed[i * 4 + 2] = 0.5 + Math.random() * 1.6;  // size
    eSeed[i * 4 + 3] = Math.random();           // hue
  }
  eGeo.setAttribute('position', new THREE.BufferAttribute(ePos, 3));
  eGeo.setAttribute('aSeed', new THREE.BufferAttribute(eSeed, 4));
  const eMat = new THREE.ShaderMaterial({
    uniforms: { uTime: sharedUniforms.uTime, uPixel: { value: renderer.getPixelRatio() }, uHeat: { value: 1 } },
    vertexShader: /* glsl */`
      attribute vec4 aSeed;
      uniform float uTime, uPixel, uHeat;
      varying float vLife;
      varying float vHue;
      void main(){
        vec3 p = position;
        float H = 16.0;
        float y = mod(p.y + uTime * aSeed.y * uHeat, H);
        vLife = y / H;
        p.y = y - 5.5;
        p.x += sin(uTime * 0.7 + aSeed.x * 40.0) * 0.6 * vLife + sin(uTime*0.3 + p.y*0.4) * 0.4;
        p.z += cos(uTime * 0.5 + aSeed.x * 30.0) * 0.4 * vLife;
        vHue = aSeed.w;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = aSeed.z * uPixel * (1.0 - vLife * 0.7) * (26.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      varying float vLife;
      varying float vHue;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        if (d > 0.5) discard;
        float core = smoothstep(0.5, 0.0, d);
        vec3 hot  = vec3(1.0, 0.82, 0.35);
        vec3 warm = vec3(1.0, 0.36, 0.08);
        vec3 cool = vec3(0.75, 0.10, 0.04);
        vec3 col = mix(hot, warm, smoothstep(0.0, 0.45, vLife));
        col = mix(col, cool, smoothstep(0.45, 1.0, vLife));
        col = mix(col, vec3(0.2,0.85,0.4), step(0.93, vHue)); // occasional green spark
        float alpha = core * (1.0 - smoothstep(0.55, 1.0, vLife)) * smoothstep(0.0, 0.06, vLife);
        gl_FragColor = vec4(col * 1.4, alpha);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const embers = new THREE.Points(eGeo, eMat);
  scene.add(embers);

  /* ---------- 5. DETECTION GRID FLOOR ---------- */
  const floorMat = new THREE.ShaderMaterial({
    uniforms: { uTime: sharedUniforms.uTime, uColor: { value: GREEN }, uEmber: { value: EMBER } },
    vertexShader: /* glsl */`
      varying vec3 vW;
      void main(){
        vec4 w = modelMatrix * vec4(position,1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime;
      uniform vec3 uColor, uEmber;
      varying vec3 vW;
      float gridLine(vec2 p, float scale){
        vec2 g = abs(fract(p * scale - 0.5) - 0.5) / fwidth(p * scale);
        return 1.0 - min(min(g.x, g.y), 1.0);
      }
      void main(){
        vec2 p = vW.xz;
        float g1 = gridLine(p, 0.5);
        float g2 = gridLine(p, 2.0) * 0.25;
        float dist = length(p - vec2(0.0, -2.0));
        float fade = smoothstep(26.0, 2.0, dist);
        // expanding detection pulses
        float r1 = mod(uTime * 3.2, 28.0);
        float r2 = mod(uTime * 3.2 + 14.0, 28.0);
        float pulse = smoothstep(0.55, 0.0, abs(dist - r1)) * (1.0 - r1/28.0)
                    + smoothstep(0.55, 0.0, abs(dist - r2)) * (1.0 - r2/28.0);
        vec3 col = uColor * (g1 + g2) * 0.55 + uColor * pulse * 0.9 + uEmber * pulse * g1 * 0.8;
        float a = (g1 * 0.6 + g2 + pulse * 0.6) * fade;
        gl_FragColor = vec4(col, a);
      }`,
    transparent: true,
    depthWrite: false
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -3.4;
  scene.add(floor);

  /* ---------- LAYOUT / RESIZE ---------- */
  let wide = true;
  function layout() {
    const w = hero.clientWidth;
    const h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    wide = camera.aspect > 1.05;
    if (wide) {
      root.position.set(3.4, 0.55, 0);
      root.scale.setScalar(1);
      camera.fov = 38;
    } else {
      root.position.set(0, 2.6, -2);
      root.scale.setScalar(0.72);
      camera.fov = 52;
    }
    camera.updateProjectionMatrix();
  }
  layout();
  window.addEventListener('resize', layout);

  /* ---------- INPUT ---------- */
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => {
    mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  let scrollP = 0;
  window.addEventListener('scroll', () => {
    scrollP = Math.min(1, window.scrollY / Math.max(1, hero.offsetHeight));
  }, { passive: true });

  /* ---------- VISIBILITY ---------- */
  let visible = true;
  new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; }, { threshold: 0 }).observe(hero);

  /* ---------- LOOP ---------- */
  const clock = new THREE.Clock();
  let introT = reduceMotion ? 10 : 0;
  const easeOut = (x) => 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 4);

  function frame() {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) { clock.getDelta(); return; }
    const dt = Math.min(clock.getDelta(), 0.05);
    const speed = reduceMotion ? 0.15 : 1;
    sharedUniforms.uTime.value += dt * speed;
    const t = sharedUniforms.uTime.value;
    introT += dt;

    // intro assembly: layers fly together, then the reveal wipe runs
    for (let i = 0; i < LAYERS; i++) {
      const L = layers[i];
      const k = easeOut((introT - 0.25 - (i / LAYERS) * 0.5) / 1.4);
      L.position.z = L.userData.startZ + (L.userData.finalZ - L.userData.startZ) * k;
      L.material.uniforms.uReveal.value = easeOut((introT - 0.1) / 1.6);
    }
    const rk = easeOut((introT - 1.0) / 1.3);
    rings.scale.setScalar(Math.max(0.001, rk));

    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;

    // mark motion
    markGroup.rotation.y = Math.sin(t * 0.45) * 0.42 + mouse.x * 0.45 + scrollP * 1.2;
    markGroup.rotation.x = Math.sin(t * 0.33) * 0.08 + mouse.y * 0.18 + scrollP * 0.35;
    markGroup.position.y = Math.sin(t * 0.9) * 0.12;

    rings.rotation.z = t * 0.12;
    rings.rotation.y = mouse.x * 0.25 + Math.sin(t * 0.3) * 0.15;
    rings.rotation.x = -mouse.y * 0.15;
    arc.rotation.z = -t * 0.5;
    const oa = t * 0.9;
    orbiter.position.set(Math.cos(oa) * 3.25, Math.sin(oa) * 3.25, 0);
    orbiterHalo.position.copy(orbiter.position);

    glow.material.opacity = 0.75 + Math.sin(t * 1.6) * 0.15;
    emberGlow.material.opacity = 0.65 + Math.sin(t * 2.3) * 0.15 + Math.sin(t * 5.1) * 0.06;

    for (const n of nodes) { n.rotation.y += dt * n.userData.spin; n.rotation.x += dt * n.userData.spin * 0.5; }
    net.rotation.y = mouse.x * 0.06 + Math.sin(t * 0.05) * 0.05;
    netLines.material.opacity = 0.09 + Math.sin(t * 1.2) * 0.04;

    // camera parallax + scroll dolly
    const camX = mouse.x * 0.7;
    const camY = 0.6 - mouse.y * 0.4 - scrollP * 1.2;
    camera.position.x += (camX - camera.position.x) * 0.05;
    camera.position.y += (camY - camera.position.y) * 0.05;
    camera.position.z = (wide ? 13 : 15) + scrollP * 4;
    camera.lookAt(wide ? 0.6 : 0, wide ? 0.2 : 0.4, 0);

    renderer.render(scene, camera);
  }
  frame();

  hero.classList.add('is-3d');
  window.dispatchEvent(new Event('hero3d:ready'));
})();
