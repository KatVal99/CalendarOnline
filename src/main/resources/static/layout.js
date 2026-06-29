(() => {
    const movingStars = [];

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function updateClock() {
        const clock = document.getElementById('liveClock');
        if (!clock) {
            return;
        }
        const now = new Date();
        clock.textContent = now.toLocaleTimeString('it-IT');
    }

    function initPixelStars() {
        const layer = document.getElementById('pixelStarsLayer');
        if (!layer || layer.dataset.ready === 'true') {
            return;
        }
        layer.dataset.ready = 'true';

        const classes = ['star-yellow', 'star-blue', 'star-pink', 'star-green', 'star-orange'];
        const starCount = 8;

        for (let index = 0; index < starCount; index += 1) {
            const star = document.createElement('div');
            star.className = `pixel-star-sprite ${classes[index % classes.length]}`;
            layer.appendChild(star);

            const direction = Math.random() > 0.5 ? 1 : -1;
            const trail = [];
            const trailLength = 3;
            for (let trailIndex = 0; trailIndex < trailLength; trailIndex += 1) {
                const trailStar = document.createElement('div');
                trailStar.className = `pixel-star-sprite pixel-star-trail ${classes[index % classes.length]}`;
                layer.appendChild(trailStar);
                trail.push({
                    element: trailStar,
                    distance: 14 + trailIndex * 12,
                    phaseOffset: 0.22 + trailIndex * 0.12,
                    scale: 0.35 - trailIndex * 0.06
                });
            }

            movingStars.push({
                element: star,
                trail,
                x: Math.random() * Math.max(50, window.innerWidth - 120),
                baseY: Math.random() * Math.max(120, window.innerHeight - 220) + 40,
                speed: 1.1 + Math.random() * 1.8,
                direction,
                phase: Math.random() * Math.PI * 2,
                waveAmplitude: 10 + Math.random() * 20,
                secondaryAmplitude: 4 + Math.random() * 10,
                waveFrequency: 0.05 + Math.random() * 0.04
            });
        }

        const tick = () => {
            const maxX = window.innerWidth - 80;
            const maxY = window.innerHeight - 70;

            movingStars.forEach((starState) => {
                starState.x += starState.speed * starState.direction;
                starState.phase += starState.waveFrequency;

                if (starState.x <= -80) {
                    starState.x = maxX + 60;
                } else if (starState.x >= maxX + 60) {
                    starState.x = -80;
                }

                const y = clamp(
                    starState.baseY
                    + Math.sin(starState.phase) * starState.waveAmplitude
                    + Math.sin(starState.phase * 2.3) * starState.secondaryAmplitude,
                    10,
                    maxY
                );

                starState.element.style.transform = `translate(${starState.x}px, ${y}px)`;

                starState.trail.forEach((trailState) => {
                    const trailX = starState.x - trailState.distance * starState.direction;
                    const trailY = clamp(
                        starState.baseY
                        + Math.sin(starState.phase - trailState.phaseOffset) * starState.waveAmplitude * 0.8
                        + Math.sin((starState.phase - trailState.phaseOffset) * 2.3) * starState.secondaryAmplitude * 0.8,
                        10,
                        maxY
                    );
                    trailState.element.style.transform = `translate(${trailX}px, ${trailY}px) scale(${trailState.scale})`;
                });

                if (Math.random() < 0.0025) {
                    starState.element.classList.add('bounce');
                    setTimeout(() => starState.element.classList.remove('bounce'), 450);
                }
            });

            window.requestAnimationFrame(tick);
        };

        window.requestAnimationFrame(tick);
    }

    document.addEventListener('DOMContentLoaded', () => {
        if (window.BudgetApp) {
            window.BudgetApp.initCommon();
        }
        updateClock();
        setInterval(updateClock, 1000);
        initPixelStars();
    });
})();

