const uploadButton = document.getElementById('uploadButton');
const separateButton = document.getElementById('separateButton');
const filePathDisplay = document.getElementById('filePathDisplay');
const messageDisplay = document.getElementById('message');

let audioFilePath = null;

function updateMessage(message, isError = false) {
    messageDisplay.textContent = message;
    messageDisplay.style.color = isError ? '#ff4444' : '#ddd';
}

function setLoading(isLoading) {
    uploadButton.disabled = isLoading;
    separateButton.disabled = isLoading || !audioFilePath;
    if (isLoading) {
        separateButton.textContent = 'Processing...';
    } else {
        separateButton.textContent = 'Separate Stems';
    }
}

uploadButton.addEventListener('click', async () => {
    try {
        audioFilePath = await window.electronAPI.selectAudioFile();
        if (audioFilePath) {
            filePathDisplay.textContent = audioFilePath;
            separateButton.disabled = false;
            updateMessage('');
        } else {
            filePathDisplay.textContent = 'No file selected';
            separateButton.disabled = true;
        }
    } catch (error) {
        updateMessage('Error selecting file: ' + error.message, true);
        console.error('File selection error:', error);
    }
});

// Listen for progress updates
window.electronAPI.onProgress((event, progress) => {
    updateMessage(`Processing: ${progress}`);
});

separateButton.addEventListener('click', async () => {
    if (!audioFilePath) {
        updateMessage('Please select an audio file first.', true);
        return;
    }

    setLoading(true);
    try {
        updateMessage('Separating stems... This may take several minutes.');
        const result = await window.electronAPI.separateStems(audioFilePath);

        if (!result) {
            throw new Error('No result returned from stem separation');
        }

        switch (result.status) {
            case 'success':
                updateMessage('Stems separated successfully!');
                localStorage.setItem('stems', JSON.stringify(result.stems));
                // Short delay to show success message
                setTimeout(() => {
                    window.location.href = 'spatial.html';
                }, 1000);
                break;
            
            case 'cancelled':
                updateMessage('Separation cancelled by user.');
                break;
            
            case 'error':
                throw new Error(result.message || 'Unknown error occurred');
            
            default:
                throw new Error('Invalid response from stem separation');
        }
    } catch (error) {
        console.error('Separation error:', error);
        updateMessage(`Error: ${error.message}`, true);
    } finally {
        setLoading(false);
    }
});