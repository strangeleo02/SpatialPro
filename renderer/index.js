const uploadButton = document.getElementById('uploadButton');
const separateButton = document.getElementById('separateButton');
const filePathDisplay = document.getElementById('filePathDisplay');
const messageDisplay = document.getElementById('message');

let audioFilePath = null;

uploadButton.addEventListener('click', async () => {
    audioFilePath = await window.electronAPI.selectAudioFile();
    if (audioFilePath) {
        filePathDisplay.textContent = audioFilePath;
        separateButton.disabled = false;
    } else {
        filePathDisplay.textContent = 'No file selected';
        separateButton.disabled = true;
    }
});

separateButton.addEventListener('click', async () => {
    if (!audioFilePath) {
        messageDisplay.textContent = 'Please select an audio file first.';
        return;
    }

    try {
        messageDisplay.textContent = 'Separating stems...';
        const result = await window.electronAPI.separateStems(audioFilePath);

        if (result && result.status === 'success') {
            messageDisplay.textContent = 'Stems separated and saved.';
            localStorage.setItem('stems', JSON.stringify(result.stems));
            window.location.href = 'spatial.html';
        } else {
            messageDisplay.textContent = 'Error: Stems not separated.';
        }
    } catch (error) {
        console.error(error);
        messageDisplay.textContent = `Error separating stems. Check console for details: ${error.toString().substring(0,200)}...`;
    }
});