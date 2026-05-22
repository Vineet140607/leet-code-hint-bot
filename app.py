import os

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from groq import Groq

load_dotenv()

app = Flask(__name__)
CORS(app)

api_key = os.getenv("GROQ_API_KEY")
MODEL_NAME = "llama-3.3-70b-versatile"
SYSTEM_PROMPT = (
    "You are a LeetCode hint bot. Never reveal the full solution.\n"
    "Level 1: subtle hint only, no approach.\n"
    "Level 2: give the strategy/approach.\n"
    "Level 3: near-complete hint, no actual code."
)

client = Groq(api_key=api_key)


@app.post("/get-hint")
def get_hint():
    payload = request.get_json(silent=True) or {}
    problem = payload.get("problem", "")
    code = payload.get("code", "")
    level = payload.get("level")

    if not isinstance(problem, str) or not isinstance(code, str):
        return jsonify({"error": "problem and code must be strings"}), 400

    if level not in [1, 2, 3]:
        return jsonify({"error": "level must be 1, 2, or 3"}), 400

    user_prompt = (
        f"Hint level requested: {level}\n\n"
        f"Problem:\n{problem}\n\n"
        f"Current code:\n{code}\n\n"
        "Give only a hint that matches the requested level."
    )

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.5,
            max_tokens=350,
        )
        hint_text = response.choices[0].message.content.strip()
        return jsonify({"hint": hint_text})
    except Exception as exc:
        return jsonify({"error": f"Failed to generate hint: {str(exc)}"}), 500

@app.route("/")
def home():
    return "LeetCode Hint Bot is Running!"
    
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
