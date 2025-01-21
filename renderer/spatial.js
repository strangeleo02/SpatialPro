const stemControlsDiv = document.getElementById('stemControls');
const spatialCanvas = document.getElementById('spatialCanvas');
const ctx = spatialCanvas.getContext('2d');


const colours = ["#ff0000","#00ff00","#0000ff","#ffff00"]

let activeStem = null;

let howlerSounds = []
const canvasRect = spatialCanvas.getBoundingClientRect();

let centerX = spatialCanvas.width / 2;
let centerY = spatialCanvas.height / 2;

let stems = JSON.parse(localStorage.getItem('stems') || '[]');

if (!Array.isArray(stems) || stems.length === 0) {
    alert("No stems found. Please process an audio file first.");
    window.location.href = 'index.html';
}

function drawCircle(x, y, radius, color) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
}


function updateStemPosition(stemIndex, x, y) {
    if (!howlerSounds[stemIndex]) return;
    const canvasX = x - canvasRect.left;
    const canvasY = y - canvasRect.top;

     // Normalizing the positions
    const normalizedX = (canvasX - centerX) / centerX;
     const normalizedY = (canvasY - centerY) / centerY;


    howlerSounds[stemIndex].pos(normalizedX, 0, normalizedY)
}

function drawCanvas() {
    ctx.clearRect(0, 0, spatialCanvas.width, spatialCanvas.height);
    drawCircle(centerX, centerY, 5, '#ffffff');

    stems.forEach((stem, index) => {

      if (!howlerSounds[index]) return

     const x = howlerSounds[index]._pos3d[0]
     const z = howlerSounds[index]._pos3d[2]
     const canvasX = centerX +  (centerX * x);
     const canvasY = centerY + (centerY * z);
       drawCircle(canvasX, canvasY, 10, colours[index])
      });
}


stems.forEach((stem, index) => {
    const stemDiv = document.createElement('div');
    stemDiv.classList.add('stem-control');
    stemDiv.style.borderColor = colours[index]

    const label = document.createElement('label');
    label.textContent = `Stem ${index + 1} - ${stem.split('/').pop().split(".")[0]}`
    label.style.color = colours[index]
    stemDiv.appendChild(label);

    const volumeSlider = document.createElement('input');
    volumeSlider.type = 'range';
    volumeSlider.min = 0;
    volumeSlider.max = 1;
    volumeSlider.step = 0.01;
    volumeSlider.value = 1;
    volumeSlider.addEventListener('input', () => {
        if (howlerSounds[index])
            howlerSounds[index].volume(volumeSlider.value);
    });
    stemDiv.appendChild(volumeSlider);

    const elevationSlider = document.createElement('input');
    elevationSlider.type = 'range';
    elevationSlider.min = -1;
    elevationSlider.max = 1;
    elevationSlider.step = 0.01;
    elevationSlider.value = 0;

    elevationSlider.addEventListener('input', () => {
        if (howlerSounds[index])
            howlerSounds[index].pos(howlerSounds[index]._pos3d[0], elevationSlider.value, howlerSounds[index]._pos3d[2]);
            drawCanvas()
    });
    stemDiv.appendChild(elevationSlider);

    const sound = new Howl({
        src: [stem],
        loop: true,
        autoplay: true,
         volume: volumeSlider.value,
        onload: function() {
            howlerSounds[index] = sound;
             // set random initial position
              let randomX = (Math.random() * 2 - 1);
              let randomZ = (Math.random() * 2 - 1);
              howlerSounds[index].pos(randomX, elevationSlider.value, randomZ);
              drawCanvas()
        },
    });

    stemControlsDiv.appendChild(stemDiv);
});

spatialCanvas.addEventListener('mousemove', (e) => {
    if (activeStem !== null){
        updateStemPosition(activeStem, e.clientX, e.clientY)
        drawCanvas()
    }
})


spatialCanvas.addEventListener('mousedown', (e) => {
    const x = e.clientX - canvasRect.left
    const y = e.clientY - canvasRect.top


    for (let i = 0; i < stems.length; i++) {
           if (!howlerSounds[i]) continue

           const canvasX = centerX +  (centerX * howlerSounds[i]._pos3d[0]);
           const canvasY = centerY + (centerY * howlerSounds[i]._pos3d[2]);

        const distance = Math.sqrt((x - canvasX)**2 + (y - canvasY)**2);
        if (distance < 10){
             activeStem = i;
             spatialCanvas.style.cursor = "grabbing";
             return;
        }
    }

    activeStem = null;
    spatialCanvas.style.cursor = "grab";
})

spatialCanvas.addEventListener('mouseup', (e) => {
    activeStem = null
    spatialCanvas.style.cursor = "grab";
});

spatialCanvas.addEventListener('mouseout', (e) => {
    activeStem = null;
    spatialCanvas.style.cursor = "grab";
})

setInterval(drawCanvas, 1000 / 60);