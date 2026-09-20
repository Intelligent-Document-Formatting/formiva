"""
DocuForge AI - Offline ML Model Training (v2)
Merges text TF-IDF with structural sequence features, applies class weighting,
calibrates probabilities via holdout prefit, and outputs versioned model_v2.joblib.
"""

from pathlib import Path
import sys
import joblib
import numpy as np
import pandas as pd
from scipy.sparse import hstack
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import FeatureUnion
from sklearn.preprocessing import StandardScaler

from ml.classifier import extract_document_sequence_dense_features

# ============================================================
# PATHS & SETTINGS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent
DATASET_PATH = BASE_DIR / "dataset" / "document_elements.csv"
DOCBANK_PATH = BASE_DIR / "dataset" / "docbank_training.csv"
MODEL_DIR = BASE_DIR / "ml"
MODEL_V2_PATH = MODEL_DIR / "model_v2.joblib"
MODEL_LEGACY_PATH = MODEL_DIR / "model.pkl"

RANDOM_STATE = 42
TEST_SIZE = 0.15
CONFIDENCE_THRESHOLD = 0.80

TARGET_CLASSES = [
    "TITLE", "AUTHOR", "CHAPTER", "HEADING_1", "HEADING_2",
    "HEADING_3", "BODY", "ABSTRACT", "KEYWORDS", "CAPTION",
    "QUOTE", "REFERENCE"
]

SEEDED_DATA = [
    ("Automated Offline Manuscript Typography and Structural Analysis System", "TITLE"),
    ("Deep Learning Approaches for Multi-Class Document Hierarchy Recognition", "TITLE"),
    ("Design and Implementation of an Automated Offline Document Formatter", "TITLE"),
    ("A Comprehensive Study on Distributed Operating Systems and Synchronization Primitives", "TITLE"),
    ("Dr. Aris Thorne, Jane Doe, and Michael R. Zhang", "AUTHOR"),
    ("Department of Computer Science, University of Technology", "AUTHOR"),
    ("Sophia Martinez and William Jenkins", "AUTHOR"),
    ("Prof. Alan Turing, Dr. Claude Shannon", "AUTHOR"),
    ("CHAPTER 1: INTRODUCTION", "CHAPTER"),
    ("Chapter 2 Related Work and Literature", "CHAPTER"),
    ("CHAPTER 3 SYSTEM ARCHITECTURE AND PIPELINE", "CHAPTER"),
    ("Chapter 4 Experimental Results and Discussion", "CHAPTER"),
    ("1.0 Background and Problem Motivation", "HEADING_1"),
    ("2.0 Proposed Document Processing Methodology", "HEADING_1"),
    ("3.0 Experimental Results and Comparative Analysis", "HEADING_1"),
    ("4.0 System Validation and Performance Bounds", "HEADING_1"),
    ("1.1 Feature Extraction and Structural Signals", "HEADING_2"),
    ("2.1 Document Linearization and Block Splitting", "HEADING_2"),
    ("3.1 Ablation Study Across Classifier Baselines", "HEADING_2"),
    ("4.1 Offline Execution Bounds and Constraints", "HEADING_2"),
    ("1.1.1 Character N-Gram Calibration", "HEADING_3"),
    ("2.1.2 Run-Level Style Inspection", "HEADING_3"),
    ("3.1.3 Runtime Latency Under Memory Constraints", "HEADING_3"),
    ("4.1.1 Deterministic Fallback Rules", "HEADING_3"),
    ("Document processing systems require reliable pipelines that can operate offline without cloud dependencies.", "BODY"),
    ("We evaluate memory consumption across chunk sizes ranging from 50 to 500 paragraphs to prevent latency bottlenecks.", "BODY"),
    ("The gradient descent converged smoothly during training, confirming consistent optimization across all features.", "BODY"),
    ("Experimental prototyping constitutes the primary validation baseline during continuous system development.", "BODY"),
    ("Abstract—Automating publication formatting eliminates human inconsistency. This paper proposes an offline ML parser.", "ABSTRACT"),
    ("Abstract: Manual document styling is tedious and error-prone. We introduce an intelligent deterministic layout formatter.", "ABSTRACT"),
    ("Keywords: natural language processing, document formatting, offline classification, python-docx", "KEYWORDS"),
    ("Index Terms—Machine learning, layout analysis, deterministic typography, air-gapped system.", "KEYWORDS"),
    ("Figure 1: High-level architectural pipeline of DocuForge AI.", "CAPTION"),
    ("Table 2: Comparison of macro-averaged F1 scores across classification baselines.", "CAPTION"),
    ("Fig. 3. Confusion matrix showing multiclass separation across all 12 target classes.", "CAPTION"),
    ("\"Simplicity is prerequisite for reliability; software complexity breeds vulnerability.\" — Edsger W. Dijkstra", "QUOTE"),
    ("\"Any sufficiently advanced technology is indistinguishable from magic.\" — Arthur C. Clarke", "QUOTE"),
    ("[1] J. Smith and A. Doe, \"Linear classification paradigms for complex documents,\" IEEE Trans., 2021.", "REFERENCE"),
    ("[2] R. K. Vance et al., \"DocBank: A Benchmark Dataset for Document Layout Analysis,\" arXiv:2006.01038, 2020.", "REFERENCE"),
    ("[3] L. Breiman, \"Random Forests,\" Machine Learning, vol. 45, no. 1, pp. 5–32, 2001.", "REFERENCE"),
]

LABEL_MAP = {
    "PARAGRAPH": "BODY",
    "BODY_PARAGRAPH": "BODY",
    "CHAPTER TITLE": "CHAPTER",
    "SECTION": "HEADING_1",
    "HEADING": "HEADING_1",
    "HEADING 1": "HEADING_1",
    "HEADING 2": "HEADING_2",
    "HEADING 3": "HEADING_3",
    "FIGURE CAPTION": "CAPTION",
    "TABLE CAPTION": "CAPTION",
    "FIGURE": "CAPTION",
    "TABLE": "BODY",
    "LIST": "BODY",
    "FOOTER": "BODY",
    "EQUATION": "BODY",
    "REFERENCES": "REFERENCE",
    "INDEX TERMS": "KEYWORDS",
    "KEYWORD": "KEYWORDS",
}

# ============================================================
# DATA LOADING & BALANCED RESAMPLING
# ============================================================

def load_dataset() -> pd.DataFrame:
    records = []

    # 1. Add seeds
    for text, label in SEEDED_DATA:
        records.append({"text": text, "label": label})
        if label in ["CHAPTER", "TITLE", "HEADING_1", "ABSTRACT"]:
            records.append({"text": text.upper(), "label": label})

    # 2. Add document_elements.csv
    if DATASET_PATH.exists():
        try:
            df_csv = pd.read_csv(DATASET_PATH)
            if "text" in df_csv.columns and "label" in df_csv.columns:
                for _, row in df_csv.dropna(subset=["text", "label"]).iterrows():
                    norm_lbl = LABEL_MAP.get(str(row["label"]).strip().upper(), str(row["label"]).strip().upper())
                    if norm_lbl in TARGET_CLASSES:
                        records.append({"text": str(row["text"]).strip(), "label": norm_lbl})
        except Exception as e:
            print(f"[Train] Warning reading {DATASET_PATH}: {e}")

    # 3. Add docbank_training.csv
    if DOCBANK_PATH.exists():
        try:
            df_docbank = pd.read_csv(DOCBANK_PATH)
            if "text" in df_docbank.columns and "label" in df_docbank.columns:
                for _, row in df_docbank.dropna(subset=["text", "label"]).iterrows():
                    norm_lbl = LABEL_MAP.get(str(row["label"]).strip().upper(), str(row["label"]).strip().upper())
                    if norm_lbl in TARGET_CLASSES:
                        records.append({"text": str(row["text"]).strip(), "label": norm_lbl})
        except Exception as e:
            print(f"[Train] Warning reading {DOCBANK_PATH}: {e}")

    df = pd.DataFrame(records)
    df["text"] = df["text"].astype(str).str.strip()
    df = df[df["text"].str.len() > 1]
    df = df.drop_duplicates(subset=["text", "label"])

    # Ensure every target class has at least 30 samples to comfortably support calibration splits
    min_required_samples = 30
    augmented = [df]
    class_counts = df["label"].value_counts()

    for target in TARGET_CLASSES:
        count = class_counts.get(target, 0)
        if count == 0:
            seed_subset = [text for text, lbl in SEEDED_DATA if lbl == target]
            if seed_subset:
                df_dummy = pd.DataFrame([{"text": s, "label": target} for s in seed_subset * min_required_samples])
                augmented.append(df_dummy)
        elif count < min_required_samples:
            multiplier = int(np.ceil(min_required_samples / count))
            subset = df[df["label"] == target]
            for _ in range(multiplier - 1):
                augmented.append(subset)

    df_final = pd.concat(augmented, ignore_index=True)
    return df_final


# ============================================================
# TRAIN PIPELINE
# ============================================================

def train():
    print("\n========================================")
    print("DocuForge AI - Production ML Model Training (v2)")
    print("========================================")

    df = load_dataset()
    print(f"Total samples (after balanced augmentation): {len(df)}")
    print(f"Unique classes: {df['label'].nunique()} / {len(TARGET_CLASSES)}")
    print("\nClass distribution:")
    print(df["label"].value_counts().to_string())

    raw_texts = df["text"].tolist()
    labels = df["label"].tolist()

    # 1. Sparse text features
    tfidf = FeatureUnion([
        ("word", TfidfVectorizer(ngram_range=(1, 2), lowercase=True, sublinear_tf=True, max_features=15000)),
        ("char", TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), lowercase=True, sublinear_tf=True, max_features=15000)),
    ])
    X_sparse = tfidf.fit_transform(raw_texts)

    # 2. Dense sequence & structural features
    dense_df = extract_document_sequence_dense_features(raw_texts)
    scaler = StandardScaler()
    dense_matrix = scaler.fit_transform(dense_df)

    X_combined = hstack([X_sparse, dense_matrix])

    # First split: Train vs Holdout Evaluation
    X_train_full, X_test, y_train_full, y_test = train_test_split(
        X_combined, labels, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=labels
    )

    # Second split: Estimator fitting vs Calibration holdout (guarantees no fold count errors)
    X_train_base, X_calib, y_train_base, y_calib = train_test_split(
        X_train_full, y_train_full, test_size=0.20, random_state=RANDOM_STATE, stratify=y_train_full
    )

    # Base Random Forest with class weighting
    base_rf = RandomForestClassifier(
        n_estimators=180,
        max_depth=16,
        class_weight="balanced_subsample",
        random_state=RANDOM_STATE,
        n_jobs=-1
    )
    base_rf.fit(X_train_base, y_train_base)

    # Calibrate probabilities using the separate calibration holdout set via 'prefit'
    calibrated_clf = CalibratedClassifierCV(estimator=base_rf, method="sigmoid", cv="prefit")
    calibrated_clf.fit(X_calib, y_calib)

    predictions = calibrated_clf.predict(X_test)
    accuracy = accuracy_score(y_test, predictions)

    print("\n========================================")
    print("PRODUCTION MODEL EVALUATION")
    print("========================================")
    print(f"Validation Accuracy: {accuracy * 100:.2f}%\n")
    print(classification_report(y_test, predictions, zero_division=0))

    bundle = {
        "version": "v2.0.0",
        "model": calibrated_clf,
        "tfidf": tfidf,
        "scaler": scaler,
        "feature_cols": list(dense_df.columns),
        "confidence_threshold": CONFIDENCE_THRESHOLD,
        "target_classes": TARGET_CLASSES,
    }

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, MODEL_V2_PATH)
    joblib.dump(bundle, MODEL_LEGACY_PATH)

    print("========================================")
    print(f"Model successfully saved to:\n - {MODEL_V2_PATH.resolve()}\n - {MODEL_LEGACY_PATH.resolve()}")
    print("========================================")
    return bundle


if __name__ == "__main__":
    try:
        train()
    except Exception as error:
        print(f"\n[Fatal Training Error]: {error}")
        sys.exit(1)