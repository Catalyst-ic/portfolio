import * as THREE from 'three';

const { lerp } = THREE.MathUtils;

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
scene.fog = new THREE.Fog('#1a0b2e', 60, 200);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
camera.position.set(0, 1, 8);

function resize() {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
}
resize();
addEventListener('resize', resize);

scene.add(new THREE.AmbientLight('#b0a0ff', 2.5));

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

function texture(url, rx = 1, ry = 1) {
    const t = loader.load(url);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    return t;
}

const ph = (id) => `https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/${id}/${id}_diff_1k.jpg`;
const mat = (id, color, rx, ry) => new THREE.MeshStandardMaterial({ map: texture(ph(id), rx, ry), color, roughness: 0.6 });

const wood = mat('wood_cabinet_worn_long', '#8c6a4a', 2, 2);
const darkWood = mat('wood_cabinet_worn_long', '#7a5c3e', 2, 2);
const brick = mat('castle_brick_broken_06', '#c08560', 1, 2);
const stone = mat('medieval_blocks_05', '#cfcfcf', 2, 2);
const roof = mat('roof_tiles_14', '#665555', 4, 2);
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

const skyUrl = 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?ixlib=rb-4.0.3&auto=format&fit=crop&w=3000&q=80';
add(temple, new THREE.SphereGeometry(100, 32, 32), new THREE.MeshBasicMaterial({ map: texture(skyUrl), side: THREE.BackSide, toneMapped: false }), 0, 0, 0);

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

const mouse = { x: 0, y: 0 };
addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / innerWidth - 0.5) * 2;
    mouse.y = (e.clientY / innerHeight - 0.5) * 2;
});

let touchX = 0;
addEventListener('touchstart', (e) => touchX = e.touches[0].clientX);
addEventListener('touchmove', (e) => {
    if (mode !== 'idle') return;
    const x = e.touches[0].clientX;
    rig.rotation.y += (x - touchX) * 0.005;
    touchX = x;
});

let mode = 'idle';
let t = 0;
let open = false;
let last = 0;

const ambience = new Audio('assets/ambience.mp3');
ambience.loop = true;
ambience.volume = 0.3;

const unlockEvents = ['pointerdown', 'touchend', 'keydown', 'click'];

function startAmbience() {
    if (!ambience.paused) return;
    ambience.play().then(() => {
        unlockEvents.forEach((ev) => removeEventListener(ev, startAmbience));
    }).catch(() => {});
}

// try immediately on page load; browsers may block this until the user interacts
startAmbience();
// fallback: start on the very first interaction (click, tap, key press)
unlockEvents.forEach((ev) => addEventListener(ev, startAmbience));

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
    startAmbience();
});

document.addEventListener('leave', () => {
    mode = 'leave';
    t = 6;
});

renderer.setAnimationLoop((now) => {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;

    const idleZ = Math.min(25, Math.max(9, 9 / camera.aspect));
    const idleY = 0.8;

    left.rotation.y = lerp(left.rotation.y, open ? Math.PI / 1.5 : 0, dt * 2);
    right.rotation.y = lerp(right.rotation.y, open ? -Math.PI / 1.5 : 0, dt * 2);

    if (mode === 'idle') {
        if (innerWidth >= 768) {
            rig.rotation.y += mouse.x * 0.01;
            rig.rotation.x = Math.max(-0.3, Math.min(0.3, rig.rotation.x + mouse.y * 0.005));
        }
        camera.position.z = lerp(camera.position.z, idleZ, dt);
        camera.position.y = lerp(camera.position.y, idleY, dt);
    }

    if (mode === 'enter' || mode === 'leave') {
        t += mode === 'enter' ? dt : -dt * 2.5;
        if (mode === 'enter' && t > 3) setOpen(true);
        if (mode === 'leave' && t < 3.5) setOpen(false);

        rig.rotation.x = lerp(rig.rotation.x, 0, dt * 5);
        rig.rotation.y = lerp(rig.rotation.y, 0, dt * 5);

        if (t < 2) {
            camera.position.z = lerp(idleZ, 25, t / 2);
            camera.position.y = lerp(idleY, 2, t / 2);
        } else {
            camera.position.z = lerp(25, -15, (t - 2) / 4);
            camera.position.y = lerp(2, -1.5, (t - 2) / 4);
        }

        if (mode === 'enter' && t >= 6) {
            mode = 'done';
            document.dispatchEvent(new Event('complete'));
        }
        if (mode === 'leave' && t <= 0) {
            mode = 'idle';
            t = 0;
        }
    }

    if (mode !== 'done') renderer.render(scene, camera);
});

setTimeout(() => document.getElementById('loading').classList.add('hide'), 8000);