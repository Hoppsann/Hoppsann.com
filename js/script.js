const cards = document.querySelectorAll(".cards > div");

const maxTiltDegree = 5;
const maxGlareOpacity = 0.2;
const outsideThreshold = 200; // px beyond card edge where effect fully stops

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// distance from cursor to nearest point on the rect (0 if cursor is inside it)
function distanceToRect(px, py, rect) {
    const dx = Math.max(rect.left - px, 0, px - rect.right);
    const dy = Math.max(rect.top - py, 0, py - rect.bottom);
    return Math.sqrt(dx * dx + dy * dy);
}

document.addEventListener("mousemove", (event) => {
    cards.forEach(card => {
        const glare = card.querySelector(".glare");
        const cardRec = card.getBoundingClientRect();

        const halfWidth = cardRec.width / 2;
        const halfHeight = cardRec.height / 2;

        const cardCenterX = cardRec.left + halfWidth;
        const cardCenterY = cardRec.top + halfHeight;

        const deltaX = event.clientX - cardCenterX;
        const deltaY = event.clientY - cardCenterY;

        const rx = clamp(deltaY / halfHeight, -1, 1);
        const ry = clamp(deltaX / halfWidth, -1, 1);

        const distanceToTheCenter = Math.sqrt(deltaX ** 2 + deltaY ** 2);
        const maxDistance = Math.max(halfWidth, halfHeight);
        const normalizedDist = clamp(distanceToTheCenter / maxDistance, 0, 1);

        // how close cursor is to the card itself (0 = touching/inside, 1 = at/past threshold)
        const distOutside = distanceToRect(event.clientX, event.clientY, cardRec);
        const intensity = 1 - clamp(distOutside / outsideThreshold, 0, 1);

        const degree = normalizedDist * maxTiltDegree * intensity;

        card.style.transform = `perspective(400px) rotate3d(${-rx}, ${ry}, 0, ${degree}deg)`;

        glare.style.transform = `translate(${-ry * 100}%, ${-rx * 100}%) scale(5)`;
        glare.style.opacity = normalizedDist * maxGlareOpacity * intensity;
    });
});