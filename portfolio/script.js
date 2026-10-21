const app= document.getElementById('app');
const startBtn = document.getElementById('startBtn');
const socials = document.querySelector('.socials');

lucide.createIcons();

function flash(el){
    el.classList.add('hl');
    setTimeout(() => el.classList.remove('hl'), 2000);
}

startBtn.onclick = () => {
    app.classList.add('started');
    openStory();
};

document.querySelectorAll('[data-action]').forEach((link) =>{
    link.onclick = (e) => {
        e.preventDefault();
        if (link.dataset.action === 'about') flash(startBtn);
        if (link.dataset.action === 'contact') flash(socials);
        if (link.dataset.action === 'work') openModal();
    };
});

const modal = document.getElementById('modal');
const list = document.getElementById('projects');

const projects = [
    { 
        title: "LALIGURAS",
        subtitle: "Silver Medalist | 28th SXC National",
        description: "A mobile, all weather Nepali air defence system designed to intercept short-range rockets, missiles, and airtillery shells. Integrated with a real-time mobile app warning system.",
        image: "",
        tags: ["Defence", "Mobile App", "Hardware"],
        color: "#ef4444, #ea580c"
    },
    {
        title: "BLACK KITE",
        smth: " ",
        subtitle: "Civic Innovation | Godawari Municipality",
        description: "An automated waste cleaning system focused on practical civic application and sustainability. Designed to solve real-world environmental challenges through robotics.",
        image: "",
        tags: ["Robotics", "Sustainability", "Civic Tech"],
        color: "#3b82f6, #0891b2"
    },
    {
        title: "CATECH",
        subtitle: "Ongoing Research | Current Project",
        description: "An active experimental hub for future-oriented innovation. Currently under development, focusing on cutting-edge technologies and research in various fields.",
        image: "",
        tags: ["R&D", "Innovation", "Future Tech"],
        color: "#a855f7, #db2777"
    }
];

list.innerHTML = projects.map((p,i) => `
<div class="card" style="--c:${p.color}; transition-delay:${i * 0.1}s">
<div class="img"><div><img src="${p.image}" alt="${p.title}"></div></div>
<div class="info">
<span class="pill">${p.subtitle}</span>
<h3>${p.title}</h3>
<p>${p.description}</p>
<div class="tags">${p.tags.map((t) => `<span>#${t}</span>`).join('')}</div>
</div>
</div>`).join('');

const cards = document.querySelectorAll('.card');

const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
        if(e.isIntersecting) {
            e.target.classList.add('show');
            io.unobserve(e.target);
        }
        });
}, {root: list, rootMargin: '-100px' });

function openModal() {
    modal.classList.add('open');
    cards.forEach((c) => io.observe(c));
}

function closeModal() {
    modal.classList.remove('open');
    setTimeout(() => cards.forEach((c) => c.classList.remove('show')), 300);
}

document.getElementById('closeBtn').onclick = closeModal;

const story = document.getElementById('story');
const level = document.getElementById('level');
const meter = document.getElementById('meter');
const canvas = document.getElementById('stars');
const ctx = canvas.getContext('2d');

function setLevel(name) {
    level.textContent = name;
    meter.innerHTML = '<span></span>';
}

function type(el) {
    const text = el.dataset.type;
    let i = 0;
    el.textContent = '';
    setTimeout(() => {
        const timer = setInterval(() => {
            el.textContent += text[i++];
            if (i >= text.length) clearInterval(timer);
        }, el.dataset.speed);
    }, el.dataset.delay || 0);
}

function openStory() {
    story.classList.add('open');
    story.scrollTop = 0;
    lastY = 0;
    document.querySelectorAll('[data-type]').forEach(type);
}

function closeStory() {
    story.classList.remove('open');
    app.classList.remove('started');
}

document.getElementById('exitBtn').onclick = closeStory;

const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
        e.target.classList.toggle('show', e.isIntersecting);
        if (e.isIntersecting) setLevel(e.target.dataset.level);
    });
}, { root: story, threshold: 0.3 });

document.querySelectorAll('.frame').forEach((f) => spy.observe(f));

canvas.width = innerWidth;
canvas.height = innerHeight;
window.onresize = () => {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
};

const stars = Array.from({ length: 400 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    z: Math.random() * 1.5 + 0.5,
    size: Math.random() * 2,
    color: `hsl(${Math.random() * 60 + 100}, 100%, 80%)`
}));

let speed = 0;
let lastY = 0;

function draw() {
    requestAnimationFrame(draw);
    if (!story.classList.contains('open')) return;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    speed += ((story.scrollTop - lastY) * 60 - speed) * 0.2;
    lastY = story.scrollTop;

    stars.forEach((s) => {
        s.y += (0.5 - speed * 0.05) * s.z;
        if (s.y > canvas.height) s.y = 0;
        if (s.y < 0) s.y = canvas.height;

        ctx.fillStyle = s.color;
        ctx.globalAlpha = Math.min(1, s.z);
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, s.size, s.size * Math.max(1, Math.abs(speed * 0.1) * s.z), 0, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
}

draw();