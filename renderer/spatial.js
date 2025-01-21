const stemControlsDiv = document.getElementById('stemControls');
const spatialCanvas = document.getElementById('spatialCanvas');
const ctx = spatialCanvas.getContext('2d');

const COLORS = ["#ff0000", "#00ff00", "#0000ff", "#ffff00"];
const FRAME_RATE = 60;

let activeStem = null;
let howlerSounds = [];
let animationFrameId = null;
let isDragging = false;

const canvasRect = spatialCanvas.getBoundingClientRect();
const centerX = spatialCanvas.width / 2;
const centerY = spatialCanvas.height / 2;

// Load stems from localStorage
let stems = [];
try {
    stems = JSON.parse(localStorage.getItem('stems') || '[]');
    if (!Array.isArray(stems) || stems.length === 0) {
        throw new Error('No stems found');
    }
} catch (error) {
    alert("No valid stems found. Please process an audio file first.");
    window.location.href = 'index.html';
}

function drawCircle(x, y, radius, color) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
}

function normalizePosition(clientX, clientY) {
    const canvasX = clientX - canvasRect.left;
    const canvasY = clientY - canvasRect.top;
    return {
        x: (canvasX - centerX) / centerX,
        y: (canvasY - centerY) / centerY
    };
}

function updateStemPosition(stemIndex, clientX, clientY) {
    if (!howlerSounds[stemIndex]) return;
    
    const { x, y } = normalizePosition(clientX, clientY);
    howlerSounds[stemIndex].pos(x, 0, y);
}

function drawCanvas() {
    ctx.clearRect(0, 0, spatialCanvas.width, spatialCanvas.height);
    
    // Draw center point
    drawCircle(centerX, centerY, 5, '#ffffff');

    // Draw stems
    stems.forEach((stem, index) => {
        if (!howlerSounds[index]) return;

        const pos = howlerSounds[index]._pos3d;
        const canvasX = centerX + (centerX * pos[0]);
        const canvasY = centerY + (centerY * pos[2]);
        
        // Draw stem position
        drawCircle(canvasX, canvasY, 10, COLORS[index]);
    });

    if (isDragging) {
        animationFrameId = requestAnimationFrame(drawCanvas);
    }
}

function createStemControl(stem, index) {
    const stemDiv = document.createElement('div');
    stemDiv.classList.add('stem-control');
    stemDiv.style.borderColor = COLORS[index];

    const label = document.createElement('label');
    label.textContent = `Stem ${index + 1} - ${stem.split('/').pop().split(".")[0]}`;
    label.style.color = COLORS[index];
    stemDiv.appendChild(label);

    const volumeSlider = createSlider(0, 1, 0.01, 1, (value) => {
        if (howlerSounds[index]) {
            howlerSounds[index].volume(value);
        }
    });

    const elevationSlider = createSlider(-1, 1, 0.01, 0, (value) => {
        if (howlerSounds[index]) {
            howlerSounds[index].pos(
                howlerSounds[index]._pos3d[0],
                value,
                howlerSounds[index]._pos3d[2]
            );
            drawCanvas();
        }
    });

    stemDiv.appendChild(volumeSlider);
    stemDiv.appendChild(elevationSlider);

    return { stemDiv, volumeSlider, elevationSlider };
}

function createSlider(min, max, step, value, onChange) {
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = min;
    slider.max = max;
    slider.step = step;
    slider.value = value;
    slider.addEventListener('input', () => onChange(slider.value));
    return slider;
}

// Initialize stems
stems.forEach((stem, index) => {
    const { stemDiv, volumeSlider, elevationSlider } = createStemControl(stem, index);

    const sound = new Howl({
        src: [stem],
        loop: true,
        autoplay: true,
        volume: volumeSlider.value,
        onload: () => {
            howlerSounds[index] = sound;
            const randomX = Math.random() * 2 - 1;
            const randomZ = Math.random() * 2 - 1;
            sound.pos(randomX, elevationSlider.value, randomZ);
            drawCanvas();
        },
        onloaderror: (id, error) => {
            console.error(`Error loading sound ${index}:`, error);
            alert(`Failed to load stem ${index + 1}`);
        }
    });

    stemControlsDiv.appendChild(stemDiv);
});

// Event Listeners
spatialCanvas.addEventListener('mousedown', (e) => {
    const x = e.clientX - canvasRect.left;
    const y = e.clientY - canvasRect.top;

    for (let i = 0; i < stems.length; i++) {
        if (!howlerSounds[i]) continue;

        const pos = howlerSounds[i]._pos3d;
        const canvasX = centerX + (centerX * pos[0]);
        const canvasY = centerY + (centerY * pos[2]);

        const distance = Math.sqrt((x - canvasX)**2 + (y - canvasY)**2);
        if (distance < 10) {
            activeStem = i;
            isDragging = true;
            spatialCanvas.style.cursor = "grabbing";
            drawCanvas();
            return;
        }
    }
});

spatialCanvas.addEventListener('mousemove', (e) => {
    if (activeStem !== null) {
        updateStemPosition(activeStem, e.clientX, e.clientY);
    }
});

function stopDragging() {
    activeStem = null;
    isDragging = false;
    spatialCanvas.style.cursor = "grab";
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
}

spatialCanvas.addEventListener('mouseup', stopDragging);
spatialCanvas.addEventListener('mouseout', stopDragging);

// Initial draw
drawCanvas();