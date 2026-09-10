"""
DocuForge AI - Offline Document Element Classifier
Loads the local scikit-learn model and performs chunk-based classification.
"""

from pathlib import Path
from typing import Any, Dict, List
import joblib

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "ml" / "model.pkl"

class DocumentClassifier:
    def __init__(self):
        self.model = None
        self.load_model()

    def load_model(self):
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"ML model not found at:\n{MODEL_PATH}\n\n"
                "Please train the model first using:\n"
                "python backend/ml/train_model.py"
            )
        try:
            self.model = joblib.load(MODEL_PATH)
        except Exception as error:
            raise RuntimeError(f"Failed to load ML model: {error}")

    def predict(self, text: str) -> Dict[str, Any]:
        """Predicts a single paragraph text."""
        if not text or not text.strip():
            return {
                "text": text,
                "label": "BODY",
                "detected_type": "BODY",
                "confidence": 0.0,
            }

        text_clean = text.strip()
        prediction = str(self.model.predict([text_clean])[0])

        confidence = 0.0
        if hasattr(self.model, "predict_proba"):
            probabilities = self.model.predict_proba([text_clean])[0]
            confidence = float(max(probabilities))

        return {
            "text": text_clean,
            "label": prediction,
            "detected_type": prediction,
            "confidence": round(confidence, 4),
        }

    def predict_many(self, texts: List[str], chunk_size: int = 200) -> List[Dict[str, Any]]:
        """Chunk-based inference for handling large manuscripts efficiently."""
        if not texts:
            return []

        results = []
        valid_indices = []
        clean_texts = []

        for idx, text in enumerate(texts):
            clean = text.strip() if text else ""
            if clean:
                valid_indices.append(idx)
                clean_texts.append(clean)
            else:
                results.append({
                    "index": idx,
                    "text": text,
                    "label": "BODY",
                    "detected_type": "BODY",
                    "confidence": 0.0,
                })

        # Process non-empty texts in chunks
        for i in range(0, len(clean_texts), chunk_size):
            chunk_texts = clean_texts[i : i + chunk_size]
            chunk_indices = valid_indices[i : i + chunk_size]

            preds = self.model.predict(chunk_texts)
            probs = self.model.predict_proba(chunk_texts) if hasattr(self.model, "predict_proba") else [[1.0]] * len(chunk_texts)

            for idx, text, pred, prob in zip(chunk_indices, chunk_texts, preds, probs):
                results.append({
                    "index": idx,
                    "text": text,
                    "label": str(pred),
                    "detected_type": str(pred),
                    "confidence": round(float(max(prob)), 4),
                })

        results.sort(key=lambda x: x["index"])
        return results

# ============================================================
# SINGLETON INSTANCE & HELPERS
# ============================================================

_classifier: DocumentClassifier | None = None

def get_classifier() -> DocumentClassifier:
    global _classifier
    if _classifier is None:
        _classifier = DocumentClassifier()
    return _classifier

def classify_text(text: str) -> Dict[str, Any]:
    return get_classifier().predict(text)

# ============================================================
# OFFLINE TEST
# ============================================================

if __name__ == "__main__":
    print("Testing DocuForge AI Classifier...\n")
    classifier = get_classifier()

    samples = [
        "CHAPTER 1: INTRODUCTION",
        "1.1 Background and Motivation",
        "1.1.1 Methodology Details",
        "This research presents an offline DOCX publication system.",
        "Figure 1: Architectural Pipeline",
        "[1] J. Smith, Linear Models, 2021",
        "Abstract: Automated formatting saves manual effort.",
        "Keywords: natural language processing, docx",
    ]

    for item in samples:
        res = classifier.predict(item)
        print(f"[{res['label']:<12}] (Conf: {res['confidence'] * 100:.2f}%) -> {res['text']}")