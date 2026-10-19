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
    };
});