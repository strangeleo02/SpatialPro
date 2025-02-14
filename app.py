from werkzeug.utils import secure_filename
from flask import Flask, request, jsonify, send_from_directory, after_this_request, send_file
from flask_cors import CORS
import os
import subprocess
import shutil
import tempfile
import io  # Import io for in-memory file handling

app = Flask(__name__)
CORS(app)
UPLOAD_FOLDER = 'uploads'
OUTPUT_FOLDER = 'stems'
MIXED_FOLDER = 'mixed'  # New folder for mixed audio
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)
os.makedirs(MIXED_FOLDER, exist_ok=True)  # Create mixed folder

# --- (Rest of your existing app.py code) ---

@app.route('/process-audio', methods=['POST'])
def process_audio():
    try:
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file uploaded"}), 400

        audio_file = request.files['audio']
        file_path = os.path.join(UPLOAD_FOLDER, audio_file.filename)
        audio_file.save(file_path)

        # Create a temporary directory for Demucs output
        temp_dir = tempfile.mkdtemp()
        print(f"Created temporary directory: {temp_dir}")

        # Run Demucs
        try:
            subprocess.run(['demucs', '-n', 'htdemucs', file_path, '--out', temp_dir], check=True)
        except subprocess.CalledProcessError as e:
            print(f"Demucs process failed: {e}")
            shutil.rmtree(temp_dir)  # Clean up temp directory on error
            return jsonify({"error": "Demucs processing failed", "details": str(e)}), 500


        # Locate the stems directory within the temp directory
        stems_dir = os.path.join(temp_dir, 'htdemucs', os.path.splitext(audio_file.filename)[0])
        if not os.path.exists(stems_dir):
            shutil.rmtree(temp_dir)
            return jsonify({"error": f"Stems directory not found: {stems_dir}"}), 500

        stems = [os.path.join(stems_dir, f) for f in os.listdir(stems_dir) if f.endswith('.wav')]

        # Copy stems to the permanent output folder.  Critical step.
        final_stems = []
        for stem in stems:
            stem_filename = os.path.basename(stem)
            final_stem_path = os.path.join(OUTPUT_FOLDER, stem_filename)
            shutil.copy(stem, final_stem_path)  # Copy the file
            final_stems.append(final_stem_path)



        # Generate URLs relative to the server
        final_stems = [f"/{os.path.relpath(s, os.getcwd())}" for s in final_stems]


        # Schedule the removal of the temporary directory AFTER the response is sent
        @after_this_request
        def remove_temp_dir(response):
            try:
                shutil.rmtree(temp_dir)
                print(f"Removed temporary directory: {temp_dir}")
            except Exception as e:
                print(f"Error while removing temporary directory {temp_dir}: {e}")
            return response


        return jsonify({"stems": final_stems})
    except Exception as e:
        # Log full error details
        return jsonify({"error": "An error occurred", "details": str(e)}), 500

@app.route('/<path:filename>')
def serve_static(filename):
    parts = filename.split('/')
    if len(parts) > 1:
        if parts[0] == 'stems':
            directory = os.path.join(*parts[0:1]) # corrected for single 'stems' subdirectory
            file = '/'.join(parts[1:]) # corrected to only serve contents from stems directory
            return send_from_directory(directory, file)
    return send_from_directory('.', filename)

# Optional: Route to receive and save mixed audio (not used in the current frontend)
@app.route('/save-mix', methods=['POST'])
def save_mix():
    try:
        if 'mixed_audio' not in request.files:
            return jsonify({"error": "No mixed audio file uploaded"}), 400

        mixed_audio_file = request.files['mixed_audio']
        # Sanitize filename!  Important for security.
        filename = secure_filename(mixed_audio_file.filename)  # Use werkzeug's secure_filename
        file_path = os.path.join(MIXED_FOLDER, filename)
        mixed_audio_file.save(file_path)
        return jsonify({"message": "Mixed audio saved successfully"})

    except Exception as e:
        return jsonify({"error": "An error occurred", "details": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)

# Add this import at the top of your app.py file
