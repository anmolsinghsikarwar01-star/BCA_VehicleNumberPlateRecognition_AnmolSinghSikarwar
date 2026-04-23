from flask import Flask, render_template, request, jsonify
import os
from test_videos import run_anpr  # This calls your function

app = Flask(__name__)
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload_video', methods=['POST'])
def upload_video():
    if 'video' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['video']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    video_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(video_path)

    print(f"--- Starting ANPR on: {file.filename} ---")
    try:
        # Pass the uploaded video to your ANPR script
        results = run_anpr(video_path)
        return jsonify({'result': results})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Running on port 5000
    app.run(debug=True)