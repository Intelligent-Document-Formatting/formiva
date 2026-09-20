"""DocuForge AI - Offline Production ML Document Classifier

Handles 12-class document element classification with context features,
confidence gating, and backward compatibility.
"""

from pathlib import Path
import re
from typing import Any, Dict, List, Optional
import joblib
import numpy as np
import pandas as pd
from scipy.sparse import hstack

CONFIDENCE_THRESHOLD = 0.80

BASE_DIR = Path(__file__).resolve().parent.parent
ML_DIR = BASE_DIR / "ml"
MODEL_V2_PATH = ML_DIR / "model_v2.joblib"
MODEL_LEGACY_PATH = ML_DIR / "model.pkl"

# Explicit export to satisfy imports across legacy and modern routers
MODEL_PATH = (
    MODEL_V2_PATH
    if MODEL_V2_PATH.exists()
    else (MODEL_LEGACY_PATH if MODEL_LEGACY_PATH.exists() else MODEL_V2_PATH)
)

TARGET_CLASSES = [
    "TITLE",
    "AUTHOR",
    "CHAPTER",
    "HEADING_1",
    "HEADING_2",
    "HEADING_3",
    "BODY",
    "ABSTRACT",
    "KEYWORDS",
    "CAPTION",
    "QUOTE",
    "REFERENCE",
]

KEYWORD_PATTERNS = {
    "abstract": re.compile(r"^(abstract|summary)\b", re.IGNORECASE),
    "references": re.compile(
        r"^(references|bibliography|works cited)\b", re.IGNORECASE
    ),
    "keywords": re.compile(r"^(keywords?|index terms?)\b", re.IGNORECASE),
    "caption": re.compile(r"^(figure|fig\.|table|tab\.)\s+\d+", re.IGNORECASE),
    "callout": re.compile(r"^(key\s*terms?|example|notes?)\s*:", re.IGNORECASE),
    "acknowledgment": re.compile(r"^(acknowledg(e)?ments?)\b", re.IGNORECASE),
}

NUMBERING_REGEX = re.compile(r"^(\d+(\.\d+)*|[A-Z](\.\d+)*|[IVXLCDM]+\.)\s+")
CHAPTER_REGEX = re.compile(r"^CHAPTER\s*(\d+|[IVXLCDM]+)\b", re.IGNORECASE)


# ============================================================
# FEATURE EXTRACTION HELPERS
# ============================================================


def extract_single_dense_features(text: str) -> Dict[str, float]:
  clean = str(text or "").strip()
  words = clean.split()
  word_count = len(words)
  char_count = len(clean)

  if word_count == 0:
    return {
        "char_count": 0.0,
        "word_count": 0.0,
        "avg_word_len": 0.0,
        "is_all_caps": 0.0,
        "is_title_case": 0.0,
        "starts_with_number": 0.0,
        "ends_with_period": 0.0,
        "ends_with_colon": 0.0,
        "digit_ratio": 0.0,
        "cap_ratio": 0.0,
        "kw_abstract": 0.0,
        "kw_references": 0.0,
        "kw_keywords": 0.0,
        "kw_caption": 0.0,
        "kw_callout": 0.0,
        "is_chapter_kw": 0.0,
    }

  letters = [c for c in clean if c.isalpha()]
  cap_letters = [c for c in letters if c.isupper()]
  digits = [c for c in clean if c.isdigit()]

  return {
      "char_count": float(char_count),
      "word_count": float(word_count),
      "avg_word_len": float(char_count / word_count),
      "is_all_caps": 1.0 if clean.isupper() and len(letters) > 3 else 0.0,
      "is_title_case": 1.0 if clean.istitle() and word_count <= 12 else 0.0,
      "starts_with_number": 1.0 if bool(NUMBERING_REGEX.match(clean)) else 0.0,
      "ends_with_period": 1.0 if clean.endswith(".") else 0.0,
      "ends_with_colon": 1.0 if clean.endswith(":") else 0.0,
      "digit_ratio": float(len(digits) / max(char_count, 1)),
      "cap_ratio": float(len(cap_letters) / max(len(letters), 1)),
      "kw_abstract": (
          1.0 if bool(KEYWORD_PATTERNS["abstract"].search(clean)) else 0.0
      ),
      "kw_references": (
          1.0 if bool(KEYWORD_PATTERNS["references"].search(clean)) else 0.0
      ),
      "kw_keywords": (
          1.0 if bool(KEYWORD_PATTERNS["keywords"].search(clean)) else 0.0
      ),
      "kw_caption": (
          1.0 if bool(KEYWORD_PATTERNS["caption"].search(clean)) else 0.0
      ),
      "kw_callout": (
          1.0 if bool(KEYWORD_PATTERNS["callout"].search(clean)) else 0.0
      ),
      "is_chapter_kw": 1.0 if bool(CHAPTER_REGEX.match(clean)) else 0.0,
  }


def extract_document_sequence_dense_features(
    raw_paragraphs: List[str],
) -> pd.DataFrame:
  total = len(raw_paragraphs)
  single_records = [extract_single_dense_features(p) for p in raw_paragraphs]
  enriched: List[Dict[str, float]] = []

  last_chapter_dist = 999.0
  last_heading_dist = 999.0

  for i in range(total):
    curr = single_records[i]

    if curr["is_chapter_kw"] > 0.5:
      last_chapter_dist = 0.0
      last_heading_dist = 0.0
    elif (
        curr["is_title_case"] > 0.5
        or curr["starts_with_number"] > 0.5
        or (curr["char_count"] < 75.0 and curr["ends_with_period"] < 0.5)
    ):
      last_heading_dist = 0.0
    else:
      last_chapter_dist = min(last_chapter_dist + 1.0, 999.0)
      last_heading_dist = min(last_heading_dist + 1.0, 999.0)

    prev_feat = single_records[i - 1] if i > 0 else {}
    next_feat = single_records[i + 1] if i < total - 1 else {}

    feat_vector = {
        **curr,
        "dist_from_chapter": last_chapter_dist,
        "dist_from_heading": last_heading_dist,
        "pos_ratio": float(i / max(total, 1)),
        "prev_word_count": prev_feat.get("word_count", 0.0),
        "prev_is_all_caps": prev_feat.get("is_all_caps", 0.0),
        "prev_ends_colon": prev_feat.get("ends_with_colon", 0.0),
        "next_word_count": next_feat.get("word_count", 0.0),
        "next_ends_period": next_feat.get("ends_with_period", 0.0),
    }
    enriched.append(feat_vector)

  return pd.DataFrame(enriched)


# ============================================================
# CLASSIFIER WRAPPER
# ============================================================


class ProductionDocumentClassifier:
  """Offline document classifier with calibrated probabilities and fallback safety."""

  def __init__(self):
    self.model_bundle: Optional[Dict[str, Any]] = None
    self.legacy_model = None
    self.threshold = CONFIDENCE_THRESHOLD
    self.load_model()

  @property
  def model(self):
    """Exposes internal model reference for status checks."""
    if self.model_bundle:
      return self.model_bundle.get("model")
    return self.legacy_model

  def load_model(self):
    if MODEL_V2_PATH.exists():
      try:
        loaded = joblib.load(MODEL_V2_PATH)
        if isinstance(loaded, dict) and "model" in loaded:
          self.model_bundle = loaded
          self.threshold = self.model_bundle.get(
              "confidence_threshold", CONFIDENCE_THRESHOLD
          )
          return
        else:
          self.legacy_model = loaded
          return
      except Exception as exc:
        print(f"[Classifier] Warning loading {MODEL_V2_PATH}: {exc}")

    if MODEL_LEGACY_PATH.exists():
      try:
        loaded = joblib.load(MODEL_LEGACY_PATH)
        if isinstance(loaded, dict) and "model" in loaded:
          self.model_bundle = loaded
          self.threshold = self.model_bundle.get(
              "confidence_threshold", CONFIDENCE_THRESHOLD
          )
        else:
          self.legacy_model = loaded
      except Exception as exc:
        print(f"[Classifier] Warning loading legacy model: {exc}")

  def predict(self, text: str) -> Dict[str, Any]:
    """Single paragraph prediction endpoint for backward compatibility."""
    clean = text.strip()
    if not clean:
      return {"label": "BODY", "confidence": 0.0, "status": "NEEDS_REVIEW"}

    if self.model_bundle:
      tfidf = self.model_bundle["tfidf"]
      dense_scaler = self.model_bundle.get("scaler")
      classifier = self.model_bundle["model"]
      feature_cols = self.model_bundle["feature_cols"]

      dense_df = pd.DataFrame([extract_single_dense_features(clean)])
      for col in feature_cols:
        if col not in dense_df.columns:
          dense_df[col] = 0.0
      dense_df = dense_df[feature_cols]

      dense_mat = (
          dense_scaler.transform(dense_df)
          if dense_scaler
          else dense_df.to_numpy()
      )
      sparse_text = tfidf.transform([clean])
      X_combined = hstack([sparse_text, dense_mat])

      probs = classifier.predict_proba(X_combined)[0]
      best_idx = int(np.argmax(probs))
      conf = float(probs[best_idx])
      pred_type = str(classifier.classes_[best_idx])

      status = "AUTO" if conf >= self.threshold else "NEEDS_REVIEW"
      return {
          "label": pred_type,
          "detected_type": pred_type,
          "confidence": round(conf, 4),
          "status": status,
      }

    if self.legacy_model:
      try:
        if hasattr(self.legacy_model, "predict_proba"):
          probs = self.legacy_model.predict_proba([clean])[0]
          best_idx = int(np.argmax(probs))
          conf = float(probs[best_idx])
          pred_type = str(self.legacy_model.classes_[best_idx])
        else:
          pred_type = str(self.legacy_model.predict([clean])[0])
          conf = 0.75
        status = "AUTO" if conf >= self.threshold else "NEEDS_REVIEW"
        return {
            "label": pred_type,
            "detected_type": pred_type,
            "confidence": round(conf, 4),
            "status": status,
        }
      except Exception:
        pass

    return {
        "label": "BODY",
        "detected_type": "BODY",
        "confidence": 0.50,
        "status": "NEEDS_REVIEW",
    }

  def predict_sequence(
      self, raw_paragraphs: List[str]
  ) -> List[Dict[str, Any]]:
    """Document-level prediction using sequential features."""
    if not raw_paragraphs:
      return []

    if not self.model_bundle:
      return [self.predict(p) for p in raw_paragraphs]

    tfidf = self.model_bundle["tfidf"]
    dense_scaler = self.model_bundle.get("scaler")
    classifier = self.model_bundle["model"]
    feature_cols = self.model_bundle["feature_cols"]

    dense_df = extract_document_sequence_dense_features(raw_paragraphs)
    for col in feature_cols:
      if col not in dense_df.columns:
        dense_df[col] = 0.0
    dense_df = dense_df[feature_cols]

    dense_mat = (
        dense_scaler.transform(dense_df) if dense_scaler else dense_df.to_numpy()
    )
    sparse_text = tfidf.transform(raw_paragraphs)
    X_combined = hstack([sparse_text, dense_mat])

    all_probs = classifier.predict_proba(X_combined)
    results = []

    for idx, probs in enumerate(all_probs):
      best_idx = int(np.argmax(probs))
      conf = float(probs[best_idx])
      pred_type = str(classifier.classes_[best_idx])
      status = "AUTO" if conf >= self.threshold else "NEEDS_REVIEW"

      results.append({
          "index": idx,
          "label": pred_type,
          "detected_type": pred_type,
          "confidence": round(conf, 4),
          "status": status,
      })

    return results


_GLOBAL_CLASSIFIER: Optional[ProductionDocumentClassifier] = None


def get_classifier() -> ProductionDocumentClassifier:
  global _GLOBAL_CLASSIFIER
  if _GLOBAL_CLASSIFIER is None:
    _GLOBAL_CLASSIFIER = ProductionDocumentClassifier()
  return _GLOBAL_CLASSIFIER