const app= document.getElementById('app');
const startBtn = document.getElementById('startBtn');
const socials = document.getElementById('.socials');

lucide.createIcons();

function flash(el){
    el.classList.add('h1');
    setTimeout(() => el.classList.remove('h1'), 2000);
}

startBtn.onclick = () => app.classList.add('started');

document.querySelectorAll('[data-action]').forEach((link) =>{
    link.onclick = (e) => {
        e.prevenDefault();
        if (link.dataset.action === 'about') flash(startBtn);
        if (link.dataset.action === 'contact') flash(socials);
        if (link.dataset.action === 'work') openModal();
    };
});

const modal = document.getElementById('modal');
const list = document.getElementById('list');

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