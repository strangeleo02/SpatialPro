from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import subprocess

app = Flask(__name__)
CORS(app)
UPLOAD_FOLDER = 'uploads'
OUTPUT_FOLDER = 'stems'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

@app.route('/process-audio', methods=['POST'])
def process_audio():
    try:
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file uploaded"}), 400

        audio_file = request.files['audio']
        file_path = os.path.join(UPLOAD_FOLDER, audio_file.filename)
        audio_file.save(file_path)

        # Run Demucs
        subprocess.run(['demucs', '-n', 'htdemucs', file_path, '--out', OUTPUT_FOLDER], check=True)

        # Locate the stems directory
        stems_dir = os.path.join(OUTPUT_FOLDER, 'htdemucs', os.path.splitext(audio_file.filename)[0])
        if not os.path.exists(stems_dir):
            return jsonify({"error": f"Stems directory not found: {stems_dir}"}), 500

        stems = [os.path.join(stems_dir, f) for f in os.listdir(stems_dir) if f.endswith('.wav')]
        # Generate URLs relative to the server
        stems = [f"/{os.path.relpath(s, os.getcwd())}" for s in stems]

        return jsonify({"stems": stems})
    except Exception as e:
        # Log full error details
        return jsonify({"error": "An error occurred", "details": str(e)}), 500

@app.route('/<path:filename>')
def serve_static(filename):
    parts = filename.split('/')
    if len(parts) > 1:
        if parts[0] == 'stems':
            directory = (parts[0:2])
            file = '/'.join(parts[2:])
            return send_from_directory(directory, file)
    return send_from_directory('.', filename)

if __name__ == '__main__':
    app.run(debug=True)