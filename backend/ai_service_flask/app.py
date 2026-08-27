from flask import Flask, request, jsonify
from flask_cors import CORS
from model_loader import predict_toxicity

app = Flask(__name__)
CORS(app)

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    text = data.get("text")

    if not text:
        return jsonify({"error": "No text provided"}), 400

    scores = predict_toxicity(text)

    return jsonify(scores)

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)