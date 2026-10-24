import * as THREE from 'three';

const { lerp, smoothstep } = THREE.MathUtils;

let renderer;
try {
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('scene') });
} catch {
    document.getElementById('nogl').hidden = false;
    document.getElementById('loading').classList.add('hide');
    document.addEventListener('enter', () => document.dispatchEvent(new Event('complete')));
    throw new Error('WebGL is not available');
}
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog('#141829', 12, 90);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
camera.position.set(0, 1, 8);

function resize() {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
}
resize();
addEventListener('resize', resize);

scene.add(new THREE.AmbientLight('#b0a0ff', 1.8));

const sun = new THREE.DirectionalLight('#fff0dd', 8);
sun.position.set(15, 25, 10);

const purple = new THREE.SpotLight('#aa44ff', 10, 80, 0.6, 0.5);
purple.position.set(-10, 15, -5);

const front = new THREE.PointLight('#e0d0ff', 3, 30);
front.position.set(0, 5, 10);

const glow = new THREE.PointLight('#ff5500', 2, 8);
glow.position.set(0, 0, 1);

scene.add(sun, purple, front, glow);

const manager = new THREE.LoadingManager(() => document.getElementById('loading').classList.add('hide'));
const loader = new THREE.TextureLoader(manager);

const ph = (id, type = 'diff') => `https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/${id}/${id}_${type}_1k.jpg`;

const mat = (id, color, rx, ry, roughness = 0.6) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness });
    const set = (type, key) => loader.load(ph(id, type), (t) => {
        if (key === 'map') t.colorSpace = THREE.SRGBColorSpace;
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(rx, ry);
        m[key] = t;
        m.needsUpdate = true;
    });
    set('diff', 'map');
    set('nor_gl', 'normalMap');
    return m;
};

const wood = mat('wood_cabinet_worn_long', '#8c6a4a', 2, 2);
const darkWood = mat('wood_cabinet_worn_long', '#7a5c3e', 2, 2);
const brick = mat('castle_brick_broken_06', '#c08560', 1, 2);
const stone = mat('medieval_blocks_05', '#9aa0b8', 2, 2);
const roof = mat('roof_tiles_14', '#7a6450', 4, 2);
const gold = new THREE.MeshStandardMaterial({
    color: '#ffcc33',
    metalness: 0.9,
    roughness: 0.3,
    emissive: '#443300',
    emissiveIntensity: 0.1
});

const rig = new THREE.Group();
const temple = new THREE.Group();
temple.position.y = -2;
rig.add(temple);
scene.add(rig);

// warm glow under the roof eaves so the underside isn't pitch black
const eave = new THREE.PointLight('#ffb070', 5, 12);
eave.position.set(0, 2.3, 2.5);
temple.add(eave);

const frame = new THREE.Group();
frame.position.y = 1.5;
temple.add(frame);

function add(parent, geometry, material, x, y, z) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
}

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cone = (r, h) => new THREE.ConeGeometry(r, h, 4);

// ---------- glow helpers (soft halos, glowing materials) ----------
const glowCanvas = document.createElement('canvas');
glowCanvas.width = glowCanvas.height = 128;
{
    const c = glowCanvas.getContext('2d');
    const gr = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.35, 'rgba(255,255,255,0.35)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gr;
    c.fillRect(0, 0, 128, 128);
}
const glowTex = new THREE.CanvasTexture(glowCanvas);
glowTex.colorSpace = THREE.SRGBColorSpace;

function halo(parent, x, y, z, size, color, opacity = 0.5) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, color, opacity, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false
    }));
    s.position.set(x, y, z);
    s.scale.set(size, size, 1);
    parent.add(s);
    return s;
}

const glowMats = {};
const glowMat = (color) => {
    if (!glowMats[color]) glowMats[color] = new THREE.MeshBasicMaterial({ color, toneMapped: false });
    return glowMats[color];
};

// twinkling four-point star sprites
const starCanvas = document.createElement('canvas');
starCanvas.width = starCanvas.height = 128;
{
    const c = starCanvas.getContext('2d');
    c.translate(64, 64);
    const gr = c.createRadialGradient(0, 0, 0, 0, 0, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.18, 'rgba(255,255,255,0.55)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gr;
    [[0, 1], [Math.PI / 2, 1], [Math.PI / 4, 0.45], [-Math.PI / 4, 0.45]].forEach(([a, len]) => {
        c.save();
        c.rotate(a);
        c.beginPath();
        c.moveTo(-64 * len, 0);
        c.quadraticCurveTo(0, -5, 64 * len, 0);
        c.quadraticCurveTo(0, 5, -64 * len, 0);
        c.fill();
        c.restore();
    });
}
const starTex = new THREE.CanvasTexture(starCanvas);
starTex.colorSpace = THREE.SRGBColorSpace;

const sparkles = [];
function sparkle(parent, x, y, z, size, color) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: starTex, color, opacity: 0.9, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false
    }));
    sp.position.set(x, y, z);
    sp.scale.set(size, size, 1);
    parent.add(sp);
    sparkles.push(sp);
    return sp;
}

// ---------- sky: stars + moon ----------
const sky = loader.load('https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?ixlib=rb-4.0.3&auto=format&fit=crop&w=3000&q=80');
sky.colorSpace = THREE.SRGBColorSpace;
add(temple, new THREE.SphereGeometry(100, 32, 32), new THREE.MeshBasicMaterial({ map: sky, side: THREE.BackSide, toneMapped: false, fog: false }), 0, 0, 0);

// purple/blue space clouds with pink accents, drawn over the stars
const cloudMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
        varying vec3 vDir;
        void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float uTime;
        varying vec3 vDir;

        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
            vec2 i = floor(p), f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                       mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
        }
        float fbm(vec2 p) {
            float s = 0.0, a = 0.5;
            for (int i = 0; i < 5; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; }
            return s;
        }

        void main() {
            vec3 d = normalize(vDir);
            float az = atan(d.x, -d.z);
            float el = d.y;
            float t = uTime;

            vec2 p = vec2(az * 1.9, el * 2.8);
            vec2 q = vec2(fbm(p * 1.1 + vec2(t * 0.004, 0.0)),
                          fbm(p * 1.1 + vec2(5.2, 1.3) - vec2(0.0, t * 0.003)));
            float n = fbm(p * 1.5 + q * 2.4);
            float cloud = smoothstep(0.32, 0.86, n);
            float lanes = smoothstep(0.62, 0.28, fbm(p * 2.3 + q * 3.0 + 9.0));
            float fil = pow(smoothstep(0.52, 0.92, fbm(p * 5.0 + q * 4.0 + 3.0)), 2.0);

            vec3 indigo = vec3(0.10, 0.05, 0.42);
            vec3 violet = vec3(0.45, 0.20, 0.95);
            vec3 blue = vec3(0.18, 0.42, 1.00);
            vec3 magenta = vec3(0.95, 0.22, 0.72);

            vec3 c = mix(indigo, violet, smoothstep(0.25, 0.8, n));
            c = mix(c, blue, smoothstep(0.35, 0.75, q.x) * 0.8);
            c = mix(c, magenta, smoothstep(0.58, 0.85, q.y) * 0.55);

            float fade = smoothstep(-0.12, 0.12, el);
            vec3 col = c * cloud * (0.45 + 0.55 * lanes) * 0.55 * fade;
            col += mix(blue, magenta, q.y) * fil * cloud * 0.35 * fade;

            gl_FragColor = vec4(col, 1.0);
        }
    `
});
add(temple, new THREE.SphereGeometry(96, 48, 32), cloudMat, 0, 0, 0);

const moonMat = mat('rock_boulder_dry', '#8888a0', 2, 1, 1);
moonMat.fog = false;
add(temple, new THREE.SphereGeometry(12, 48, 48), moonMat, 36, 22, -72);
halo(temple, 36, 22, -76, 54, '#b693ff', 0.5);

// comet with a pink tail
const tailCanvas = document.createElement('canvas');
tailCanvas.width = 256;
tailCanvas.height = 32;
{
    const c = tailCanvas.getContext('2d');
    const gr = c.createLinearGradient(0, 0, 256, 0);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.15, 'rgba(255,150,230,0.85)');
    gr.addColorStop(1, 'rgba(255,60,200,0)');
    c.fillStyle = gr;
    c.fillRect(0, 0, 256, 32);
    c.globalCompositeOperation = 'destination-in';
    const vg = c.createLinearGradient(0, 0, 0, 32);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(0.5, 'rgba(0,0,0,1)');
    vg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = vg;
    c.fillRect(0, 0, 256, 32);
}
const cometTail = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(tailCanvas), rotation: Math.atan2(0.83, -0.55), transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false
}));
cometTail.position.set(12.5, 34.3, -84);
cometTail.scale.set(20, 1.2, 1);
temple.add(cometTail);
const cometHead = halo(temple, 18, 26, -84, 3.2, '#ffd0f4', 0.9);

// ---------- temple ----------
add(temple, box(6, 0.2, 4), stone, 0, 0.1, 0);
add(temple, box(5, 0.2, 3), stone, 0, 0.3, 0);

add(temple, box(1, 2.5, 1), brick, -1.8, 1.5, 0);
add(temple, box(1, 2.5, 1), brick, 1.8, 1.5, 0);

add(frame, box(0.4, 2.5, 0.4), wood, -1.1, 0, 0.1);
add(frame, box(0.4, 2.5, 0.4), wood, 1.1, 0, 0.1);
add(frame, box(2.8, 0.3, 0.4), wood, 0, 1.1, 0.1);
add(frame, box(2.6, 0.1, 0.4), wood, 0, -1.2, 0.1);
add(temple, box(4, 0.4, 0.5), wood, 0, 2.9, 0.2);

function door(s) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.9, 0, 0.1);
    add(pivot, box(0.95, 2.1, 0.1), darkWood, -s * 0.475, -0.1, 0);
    add(pivot, box(0.1, 0.1, 0.05), gold, -s * 0.8, 0, 0.06);
    frame.add(pivot);
    return pivot;
}

const left = door(-1);
const right = door(1);

add(temple, cone(4.5, 1.5), roof, 0, 3.5, 0).rotation.y = Math.PI / 4;
add(temple, cone(3, 1.2), roof, 0, 4.8, 0).rotation.y = Math.PI / 4;
add(temple, new THREE.CylinderGeometry(0.05, 0.2, 0.6), gold, 0, 5.6, 0);
add(temple, new THREE.SphereGeometry(0.15), gold, 0, 6, 0);

function lion(x, ry) {
    const g = new THREE.Group();
    g.position.set(x, 0.6, 1.5);
    g.rotation.y = ry;
    add(g, box(0.8, 0.6, 1), stone, 0, -0.2, 0);
    add(g, box(0.5, 0.6, 0.7), stone, 0, 0.4, -0.1);
    add(g, box(0.4, 0.5, 0.5), stone, 0, 0.9, 0.2);
    add(g, box(0.15, 0.6, 0.15), stone, -0.15, 0.3, 0.3);
    add(g, box(0.15, 0.6, 0.15), stone, 0.15, 0.3, 0.3);
    temple.add(g);
}

lion(-2.5, 0.3);
lion(2.5, -0.3);

// ---------- terrain ----------
const hash = (i, j) => {
    const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
    return s - Math.floor(s);
};

function noise(x, y) {
    const i = Math.floor(x), j = Math.floor(y);
    const u = x - i, w = y - j;
    const a = u * u * (3 - 2 * u), b = w * w * (3 - 2 * w);
    return lerp(lerp(hash(i, j), hash(i + 1, j), a), lerp(hash(i, j + 1), hash(i + 1, j + 1), a), b);
}

function ridged(x, y) {
    let s = 0, a = 1, f = 0.04;
    for (let o = 0; o < 4; o++, a *= 0.5, f *= 2.1) s += a * (1 - Math.abs(noise(x * f + o * 17, y * f + o * 31) * 2 - 1));
    return s;
}

const R = 42;
const craters = [[-20, -16, 8, 2.2], [26, 9, 9, 2.6], [-26, 18, 7, 1.8], [10, -25, 9, 3], [-6, 30, 8, 2.4], [30, -14, 8, 2.4]];

function height(x, y) {
    const r = Math.hypot(x, y);
    const edge = 1 - smoothstep(r, R - 10, R);
    const plain = -3 + (ridged(x, y) - 0.9) * 7 * smoothstep(r, 14, 40) * edge;
    let h = lerp(0.18, plain, smoothstep(r, 7, 13));
    craters.forEach(([cx, cy, cr, depth]) => {
        const d = Math.hypot(x - cx, y - cy) / cr;
        h += depth * (0.35 * Math.exp(-(((d - 1) * 5) ** 2)) - Math.max(0, 1 - d * d)) * edge;
    });
    return h;
}

// cool lavender moon dust with pink and cyan patches
const groundMat = mat('rock_boulder_dry', '#8f8cb0', 21, 21, 1);
groundMat.vertexColors = true;
groundMat.normalScale.set(2, 2);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(2 * R, 2 * R, 160, 160), groundMat);
const g = ground.geometry.attributes.position;
const col = new Float32Array(g.count * 3);
const dustDark = new THREE.Color('#6e6b8c');
const dustLight = new THREE.Color('#c4c0e0');
const tintPink = new THREE.Color('#f2a6ff');
const tintCyan = new THREE.Color('#8fe8ff');
const dust = new THREE.Color();
for (let i = 0; i < g.count; i++) {
    const a = g.getX(i) / R, b = g.getY(i) / R;
    const x = R * a * Math.sqrt(1 - b * b / 2), y = R * b * Math.sqrt(1 - a * a / 2);
    const h = height(x, y);
    const k = 0.55 + 0.45 * noise(x * 0.12, y * 0.12);
    g.setXYZ(i, x, y, h);
    dust.copy(dustDark).lerp(dustLight, k)
        .lerp(tintPink, 0.35 * smoothstep(noise(x * 0.07 + 40, y * 0.07 + 10), 0.55, 0.85))
        .lerp(tintCyan, 0.3 * smoothstep(noise(x * 0.05 - 20, y * 0.05 + 30), 0.6, 0.9))
        .multiplyScalar(lerp(0.7, 1, smoothstep(h, -4, 1)));
    col.set([dust.r, dust.g, dust.b], i * 3);
}
ground.geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
ground.geometry.computeVertexNormals();
ground.rotation.x = -Math.PI / 2;
temple.add(ground);

const underMat = mat('rock_boulder_dry', '#4a4860', 12, 6, 1);
underMat.flatShading = true;
underMat.normalScale.set(2, 2);

const under = new THREE.CylinderGeometry(R, 3, 38, 48, 12, true);
const u = under.attributes.position;
for (let i = 0; i < u.count; i++) {
    const x = u.getX(i), y = u.getY(i), z = u.getZ(i);
    const k = noise(x * 0.25 + z * 0.17, y * 0.35 + z * 0.21) + 0.5 * noise(x * 0.9, y * 0.9 + z * 0.8);
    const s = 1 + (k - 0.75) * 0.7 * Math.sqrt((19 - y) / 38);
    u.setXYZ(i, x * s, y, z * s);
}
add(temple, under, underMat, 0, -22, 0);

// ---------- glowing details ----------
const keepOut = []; // [x, z, radius] areas that pebbles must stay out of
const blocked = (x, z) => keepOut.some(([kx, kz, kr]) => Math.hypot(x - kx, z - kz) < kr);

// crystals hanging from the underside of the island
const crystalColors = ['#a98bff', '#7aa8ff', '#8ff0ff', '#ff9be6'];

function crystals(parent, x, y, z, s, color, light = false) {
    const cg = new THREE.Group();
    cg.position.set(x, y, z);
    const cm = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.0, roughness: 0.25, metalness: 0.1, fog: false });
    const rho = 0.28 * s;
    for (let i = 0; i < 4; i++) {
        const a = i * 1.7 + Math.random();
        const r = i === 0 ? 0 : 0.35 * s;
        const sy = i === 0 ? 3.2 : 1.8 + Math.random() * 1.4;
        const c = add(cg, new THREE.OctahedronGeometry(rho), cm, Math.cos(a) * r, rho * sy * 0.75, Math.sin(a) * r);
        c.scale.set(1, sy, 1);
        c.rotation.z = (Math.random() - 0.5) * 0.4;
        c.rotation.x = (Math.random() - 0.5) * 0.4;
    }
    halo(cg, 0, 0.6 * s, 0, 3 * s, color, 0.28);
    if (light) {
        const l = new THREE.PointLight(color, 6, 10);
        l.position.set(0, 1.2 * s, 0);
        cg.add(l);
    }
    parent.add(cg);
    return cg;
}

for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + Math.random() * 0.3;
    const ly = -19 + 3 + Math.random() * 28; // local y inside the underside cylinder
    const r0 = 3 + (39 * (ly + 19)) / 38;
    const x0 = r0 * Math.sin(a), z0 = r0 * Math.cos(a);
    const kk = noise(x0 * 0.25 + z0 * 0.17, ly * 0.35 + z0 * 0.21) + 0.5 * noise(x0 * 0.9, ly * 0.9 + z0 * 0.8);
    const sc = 1 + (kk - 0.75) * 0.7 * Math.sqrt((19 - ly) / 38);
    const cg = crystals(temple, x0 * sc * 1.04, ly - 22, z0 * sc * 1.04, 0.9 + Math.random() * 0.9, crystalColors[i % crystalColors.length]);
    cg.rotation.x = Math.PI; // point downward
}

// glowing pools inside the craters
const poolColors = ['#7a5cff', '#35f0d0', '#ff5fd0', '#ffb347', '#5fa8ff', '#4dff9a'];
const pools = craters.map(([cx, cy, cr, depth], i) => {
    const pool = new THREE.Mesh(
        new THREE.CircleGeometry(cr * 0.72, 48),
        new THREE.MeshBasicMaterial({
            map: glowTex, color: poolColors[i], transparent: true, opacity: 0.8,
            blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false
        })
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(cx, height(cx, cy) + 0.45 * depth, -cy);
    temple.add(pool);
    return pool;
});

// glowing lotus flowers on the pools and at the temple entrance
const lotuses = [];
const lotusColors = ['#7aa8ff', '#b79cff', '#ff8fe0', '#8ff0ff'];
const petalGeo = new THREE.SphereGeometry(1, 10, 8);

function lotus(x, y, z, sc, color) {
    const lg = new THREE.Group();
    lg.position.set(x, y, z);
    lg.scale.setScalar(sc);
    lg.userData.s = sc;
    const pm = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.1, roughness: 0.5, fog: false });
    [[8, 1.0, 0.4], [6, 0.5, 0.34]].forEach(([count, tilt, len], ring) => {
        for (let i = 0; i < count; i++) {
            const pivot = new THREE.Group();
            pivot.rotation.y = (i / count) * Math.PI * 2 + ring * 0.4;
            const tiltG = new THREE.Group();
            tiltG.rotation.x = -tilt;
            const petal = new THREE.Mesh(petalGeo, pm);
            petal.position.z = len * 0.5;
            petal.scale.set(0.13, 0.04, len * 0.5);
            tiltG.add(petal);
            pivot.add(tiltG);
            lg.add(pivot);
        }
    });
    temple.add(lg);
    lotuses.push(lg);
}

[[-4.4, 4.4], [-1.2, 5.8], [1.2, 5.8], [4.4, 4.4]].forEach(([x, z], i) => lotus(x, height(x, -z) + 0.05, z, 1.1, lotusColors[i % 4]));
pools.forEach((pl, i) => {
    for (let k = 0; k < 4; k++) {
        const a = Math.random() * Math.PI * 2, r = (0.12 + Math.random() * 0.3) * craters[i][2];
        lotus(pl.position.x + Math.cos(a) * r, pl.position.y + 0.05, pl.position.z + Math.sin(a) * r, 1.4 + Math.random() * 0.8, lotusColors[(i + k) % 4]);
    }
});

const lampColors = ['#9ad0ff', '#c4a8ff', '#ff9be6'];
const lamps = [];

// small stone pedestal with a floating, slowly turning crystal
function lantern(x, z, color = lampColors[Math.floor(Math.random() * lampColors.length)]) {
    const lg = new THREE.Group();
    lg.position.set(x, height(x, -z), z);
    add(lg, box(0.3, 0.7, 0.3), stone, 0, 0.25, 0);
    add(lg, box(0.4, 0.12, 0.4), stone, 0, 0.62, 0);
    const gem = add(lg, new THREE.OctahedronGeometry(0.2), new THREE.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: 1.5, roughness: 0.2, fog: false
    }), 0, 1.15, 0);
    gem.scale.set(0.8, 1.5, 0.8);
    sparkle(lg, 0, 1.15, 0, 1.2, color);
    lamps.push(gem);
    temple.add(lg);
    keepOut.push([x, z, 0.8]);
}

[[-2.4, 3.8], [2.4, 3.8], [-2.4, 6], [2.4, 6]].forEach(([x, z]) => lantern(x, z));

// ---------- village ----------
const windowColors = ['#ffd27a', '#ff9ad5', '#8ff0ff', '#ffb36b'];
const windowGeo = new THREE.PlaneGeometry(0.26, 0.34);
const doorGeo = new THREE.PlaneGeometry(0.3, 0.55);

function house(x, z, w, h, tiers = 1) {
    const hg = new THREE.Group();
    hg.position.set(x, height(x, -z), z);
    hg.rotation.y = Math.atan2(-x, -z) + (Math.random() - 0.5) * 0.4;

    const wc = windowColors[Math.floor(Math.random() * windowColors.length)];
    const wm = glowMat(wc);

    add(hg, box(w + 0.2, 2, w + 0.2), stone, 0, -0.6, 0);
    add(hg, box(w, h, w), stone, 0, 0.4 + h / 2, 0);

    [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach((a, i) => {
        const p = new THREE.Group();
        p.rotation.y = a;
        hg.add(p);
        [-w * 0.28, w * 0.28].forEach((ox) => add(p, windowGeo, wm, ox, 0.4 + h * 0.62, w / 2 + 0.01));
        if (i === 0) add(p, doorGeo, glowMat('#ff8f5a'), 0, 0.4 + 0.28, w / 2 + 0.01);
    });

    const rr = w * 0.707 * 1.35;
    const rh = 0.5 + h * 0.5;
    add(hg, cone(rr, rh), roof, 0, 0.4 + h + rh / 2, 0).rotation.y = Math.PI / 4;
    let top = 0.4 + h + rh;

    if (tiers > 1) {
        const w2 = w * 0.6, h2 = h * 0.55, y0 = 0.4 + h + rh * 0.4;
        add(hg, box(w2, h2, w2), stone, 0, y0 + h2 / 2, 0);
        [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach((a) => {
            const p = new THREE.Group();
            p.rotation.y = a;
            hg.add(p);
            add(p, windowGeo, wm, 0, y0 + h2 / 2, w2 / 2 + 0.01);
        });
        const rr2 = w2 * 0.707 * 1.45, rh2 = rh * 0.75;
        add(hg, cone(rr2, rh2), roof, 0, y0 + h2 + rh2 / 2, 0).rotation.y = Math.PI / 4;
        top = y0 + h2 + rh2;
    }

    add(hg, new THREE.SphereGeometry(0.09, 10, 10), gold, 0, top + 0.05, 0);
    sparkle(hg, 0, top + 0.45, 0, 0.9, wc);
    temple.add(hg);
    keepOut.push([x, z, w * 1.5]);

    // lantern in front of the house
    const r = Math.hypot(x, z);
    const dx = -x / r, dz = -z / r;
    lantern(x + dx * (w * 0.9 + 0.6) - dz * 0.9, z + dz * (w * 0.9 + 0.6) + dx * 0.9);
}

[[-12, -12, 1.5, 1.3, 2], [-16, -8.5, 1.3, 1.1, 1], [-9, -17, 1.6, 1.4, 2], [-14, -15.5, 1.2, 1.0, 1],
 [11, -11, 1.5, 1.2, 1], [15.5, -12.5, 1.4, 1.2, 2], [8, -16, 1.3, 1.1, 1],
 [0, -15, 1.8, 1.5, 2], [-4, -19.5, 1.3, 1.1, 1], [4.5, -20, 1.4, 1.2, 1]].forEach(([x, z, w, h, t]) => house(x, z, w, h, t));

// small stupa with prayer flags
function stupa(x, z) {
    const sg = new THREE.Group();
    sg.position.set(x, height(x, -z), z);
    const white = new THREE.MeshStandardMaterial({ color: '#e9e4f5', emissive: '#2a2540', roughness: 0.7 });
    add(sg, box(3.6, 1.4, 3.6), stone, 0, -0.1, 0);
    add(sg, box(2.8, 0.35, 2.8), stone, 0, 0.78, 0);
    add(sg, new THREE.SphereGeometry(1.2, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), white, 0, 0.95, 0);
    add(sg, box(0.7, 0.55, 0.7), gold, 0, 2.425, 0);
    for (let i = 0; i < 7; i++) {
        const r = 0.42 - i * 0.045;
        add(sg, new THREE.CylinderGeometry(r * 0.85, r, 0.2, 16), gold, 0, 2.8 + i * 0.2, 0);
    }
    sparkle(sg, 0, 4.35, 0, 1.6, '#ffe9a8');

    const flags = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.34, 0.28), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }), 56);
    const flagColors = ['#2d6bff', '#ffffff', '#ff3b3b', '#2ecc71', '#ffd23b'];
    const T = new THREE.Vector3(0, 2.4, 0), up = new THREE.Vector3(0, 1, 0);
    const mtx = new THREE.Matrix4(), cc = new THREE.Color();
    const lp = [];
    let n = 0;
    for (let j = 0; j < 8; j++) {
        const a = (j * Math.PI) / 4 + 0.2;
        const E = new THREE.Vector3(Math.cos(a) * 3.0, 0.25, Math.sin(a) * 3.0);
        lp.push(T.x, T.y, T.z, E.x, E.y, E.z);
        const dir = E.clone().sub(T);
        const xA = dir.clone().normalize();
        const yA = up.clone().addScaledVector(xA, -up.dot(xA)).normalize();
        const zA = new THREE.Vector3().crossVectors(xA, yA);
        for (let i = 0; i < 7; i++) {
            const p = T.clone().addScaledVector(dir, 0.14 + i * 0.115).addScaledVector(yA, -0.14);
            mtx.makeBasis(xA, yA, zA).setPosition(p);
            flags.setMatrixAt(n, mtx);
            flags.setColorAt(n, cc.set(flagColors[(i + j) % 5]));
            n++;
        }
    }
    sg.add(flags);
    sg.add(new THREE.LineSegments(
        new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(lp, 3)),
        new THREE.LineBasicMaterial({ color: '#d9d2f0', transparent: true, opacity: 0.7 })
    ));
    temple.add(sg);
    keepOut.push([x, z, 4]);
}

stupa(-9.5, -8.5);

// crystals scattered softly over the whole island
const namedRocks = [[-16, -4, 2.0], [-24, 8, 2.3], [-30, -12, 2.6], [-20, -22, 2.3], [-6, -30, 2.8], [8, -34, 3.0], [22, -26, 2.6],
 [18, -6, 2.0], [27, 6, 2.4], [32, -14, 2.7], [14, -18, 1.9], [-28, 22, 2.0], [26, 24, 2.2],
 [-5.2, -2, 0.8], [5.3, -1.5, 0.9], [-4.8, -5, 1.0], [5, -5.5, 1.1]];
const placedCrystals = [];
for (let i = 0; i < 200 && placedCrystals.length < 26; i++) {
    const a = hash(i, 1) * Math.PI * 2;
    const r = 8.5 + Math.sqrt(hash(i, 2)) * 30;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const sc = 0.5 + hash(i, 3) * 0.5;
    if (blocked(x, z)) continue;
    if (craters.some(([cx, cy, cr]) => Math.hypot(x - cx, z + cy) < cr * 0.62)) continue;
    if (namedRocks.some(([rx, rz, rs]) => Math.hypot(x - rx, z - rz) < rs * 1.6 + 1)) continue;
    if (placedCrystals.some(([px, pz]) => Math.hypot(x - px, z - pz) < 5.5)) continue;
    crystals(temple, x, height(x, -z), z, sc, crystalColors[i % crystalColors.length]);
    placedCrystals.push([x, z]);
    keepOut.push([x, z, 1.4 * sc]);
}

// ---------- rocks ----------
const rockMat = mat('rock_boulder_dry', '#55526e', 1, 1, 1);
rockMat.flatShading = true;
rockMat.normalScale.set(2, 2);

const shapes = [1, 2, 3].map((seed) => {
    const geo = new THREE.IcosahedronGeometry(1, 3);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
        const v = new THREE.Vector3().fromBufferAttribute(p, i);
        const k = noise(v.x * 1.8 + v.z * 1.1 + seed * 9, v.y * 1.8 - v.z * 0.7) + 0.4 * noise(v.x * 6 + seed, v.y * 6 + v.z * 5);
        v.multiplyScalar(0.55 + k * 0.6);
        p.setXYZ(i, v.x, v.y, v.z);
    }
    return geo;
});

function rock(x, z, s) {
    const m = add(temple, shapes[Math.floor(Math.random() * 3)], rockMat, x, height(x, -z) + s * 0.3, z);
    m.scale.set(s, s * (0.6 + Math.random() * 0.6), s);
    m.rotation.y = Math.random() * 6;
}

namedRocks.forEach(([x, z, s]) => rock(x, z, s));

for (let i = 0; i < 130; i++) {
    const a = Math.random() * 6.28, r = 9 + Math.sqrt(Math.random()) * 30;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.abs(x) > 4 && !blocked(x, z)) rock(x, z, 0.2 + Math.random() ** 3 * 1.0);
}

// ---------- floating islets with crystals ----------
const isletMat = new THREE.MeshStandardMaterial({ color: '#8b86b8', roughness: 1 });
const islets = [[-44, 6, -30, 2.0, '#58f2ff'], [48, -3, -34, 2.4, '#ff6fd8'], [-30, 16, -58, 1.5, '#a98bff'],
    [12, 24, -62, 1.2, '#ffc15e'], [-58, -6, -8, 2.6, '#7dffb0']].map(([x, y, z, s, color]) => {
    const ig = new THREE.Group();
    ig.position.set(x, y, z);
    ig.userData.y = y;
    add(ig, new THREE.ConeGeometry(s, s * 2.2, 7), rockMat, 0, -s * 1.1, 0).rotation.x = Math.PI;
    add(ig, new THREE.CylinderGeometry(s, s * 0.96, 0.25, 7), isletMat, 0, 0.12, 0);
    crystals(ig, 0, 0.2, 0, s * 0.7, color);
    temple.add(ig);
    return ig;
});

// ---------- fireflies ----------
const fireflies = (() => {
    const n = 160;
    const pos = new Float32Array(n * 3), cols = new Float32Array(n * 3);
    const pal = ['#ffd27a', '#ff9ad5', '#8ff0ff', '#b79cff'].map((c) => new THREE.Color(c));
    for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, r = 9 + Math.sqrt(Math.random()) * 34;
        pos.set([Math.cos(a) * r, -2 + Math.random() * 7, Math.sin(a) * r], i * 3);
        const c = pal[i % pal.length];
        cols.set([c.r, c.g, c.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
        size: 0.7, map: glowTex, vertexColors: true, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false
    }));
    temple.add(pts);
    return pts;
})();

// ---------- input ----------
const clampTilt = (v) => Math.max(-0.3, Math.min(0.3, v));

const mouse = { x: 0, y: 0 };
addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / innerWidth - 0.5) * 2;
    mouse.y = (e.clientY / innerHeight - 0.5) * 2;
});

let touchX = 0;
let touchY = 0;
addEventListener('touchstart', (e) => {
    touchX = e.touches[0].clientX;
    touchY = e.touches[0].clientY;
});
addEventListener('touchmove', (e) => {
    if (mode !== 'idle') return;
    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;
    rig.rotation.y += (x - touchX) * 0.005;
    rig.rotation.x = clampTilt(rig.rotation.x + (y - touchY) * 0.005);
    touchX = x;
    touchY = y;
});

const END = 4.8; // time at which the enter animation finishes and the story appears

let mode = 'idle';
let t = 0;
let open = false;
let last = 0;

const ambience = new Audio('assets/ambience.mp3');
ambience.loop = true;
ambience.volume = 0.3;

const creak = new Audio('assets/creak.mp3');
creak.volume = 0.6;

function setOpen(value) {
    if (open === value) return;
    open = value;
    creak.play();
}

document.addEventListener('enter', () => {
    mode = 'enter';
    t = 0;
    ambience.play();
});

document.addEventListener('leave', () => {
    mode = 'leave';
    t = END;
});

renderer.setAnimationLoop((now) => {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    const sec = now / 1000;

    // ambient animation
    cloudMat.uniforms.uTime.value = sec;
    pools.forEach((p, i) => { p.material.opacity = 0.7 + 0.2 * Math.sin(sec * 1.3 + i * 1.7); });
    islets.forEach((s, i) => { s.position.y = s.userData.y + Math.sin(sec * 0.6 + i * 2) * 0.5; });
    fireflies.rotation.y += dt * 0.02;
    fireflies.position.y = Math.sin(sec * 0.5) * 0.3;
    cometHead.material.opacity = 0.8 + 0.2 * Math.sin(sec * 2);
    sparkles.forEach((sp, i) => { sp.material.opacity = 0.55 + 0.45 * Math.sin(sec * 2.6 + i * 1.9); });
    lotuses.forEach((l, i) => l.scale.setScalar(l.userData.s * (1 + 0.05 * Math.sin(sec * 1.4 + i))));
    lamps.forEach((l, i) => { l.rotation.y += dt; l.position.y = 1.15 + Math.sin(sec * 1.4 + i) * 0.05; });

    const idleZ = Math.min(25, Math.max(9, 9 / camera.aspect));
    const idleY = 0.8;
    const wideZ = Math.min(62, Math.max(48, 72 / camera.aspect));
    const wideY = wideZ * 0.09;
    const doorT = 2 + (END - 2) * wideZ / (wideZ + 15); // moment the camera reaches the door
    let w = 0;

    left.rotation.y = lerp(left.rotation.y, open ? Math.PI / 1.5 : 0, dt * 2);
    right.rotation.y = lerp(right.rotation.y, open ? -Math.PI / 1.5 : 0, dt * 2);

    if (mode === 'idle') {
        if (innerWidth >= 768) {
            rig.rotation.y += mouse.x * 0.01;
            rig.rotation.x = clampTilt(rig.rotation.x + mouse.y * 0.005);
        }
        camera.position.z = lerp(camera.position.z, idleZ, dt);
        camera.position.y = lerp(camera.position.y, idleY, dt);
    }

    if (mode === 'enter' || mode === 'leave') {
        t += mode === 'enter' ? dt : -dt * 2.5;
        if (mode === 'enter' && t > doorT - 1.2) setOpen(true);
        if (mode === 'leave' && t < doorT - 0.9) setOpen(false);

        rig.rotation.x = lerp(rig.rotation.x, 0, dt * 5);
        rig.rotation.y = lerp(rig.rotation.y, 0, dt * 5);

        if (t < 2) {
            camera.position.z = lerp(idleZ, wideZ, t / 2);
            camera.position.y = lerp(idleY, wideY, t / 2);
        } else {
            const z = lerp(wideZ, -15, (t - 2) / (END - 2));
            camera.position.z = z;
            camera.position.y = z > 25 ? lerp(2, wideY, (z - 25) / (wideZ - 25)) : lerp(2, -1.5, (25 - z) / 40);
        }

        w = t < 2 ? Math.max(0, t / 2) : Math.max(0, 1 - (t - 2) / 2);
        camera.lookAt(0, lerp(camera.position.y, -3, w), lerp(camera.position.z - 100, 0, w));

        if (mode === 'enter' && t >= END) {
            mode = 'done';
            document.dispatchEvent(new Event('complete'));
        }
        if (mode === 'leave' && t <= 0) {
            mode = 'idle';
            t = 0;
        }
    }

    scene.fog.near = lerp(12, 60, w);
    scene.fog.far = lerp(90, 260, w);

    if (mode !== 'done') renderer.render(scene, camera);
});