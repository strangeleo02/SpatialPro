from flask import Flask, request, jsonify
import os
import subprocess

app = Flask(__name__)
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

        # Use Demucs to split audio into stems
        try:
            subprocess.run(['demucs', '-n', 'mdx_extra_q', file_path, '--out', OUTPUT_FOLDER], check=True)
        except subprocess.CalledProcessError as e:
            return jsonify({"error": "Demucs failed", "details": str(e)}), 500

        stems_dir = os.path.join(OUTPUT_FOLDER, os.path.splitext(audio_file.filename)[0])
        if not os.path.exists(stems_dir):
            return jsonify({"error": "Stems directory not found. Processing might have failed."}), 500

        stems = [os.path.join(stems_dir, f) for f in os.listdir(stems_dir) if f.endswith('.wav')]
        return jsonify(stems)
    except Exception as e:
        return jsonify({"error": "An error occurred", "details": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
