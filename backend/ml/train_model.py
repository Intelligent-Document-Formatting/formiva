"""
DocuForge AI - Offline ML Model Training
Classifies 12 document elements using TF-IDF and Logistic Regression.
Merges seeded data, document_elements.csv, and docbank_training.csv.
"""

from pathlib import Path
import sys
import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import FeatureUnion, Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

# ============================================================
# PATHS & SETTINGS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent
DATASET_PATH = BASE_DIR / "dataset" / "document_elements.csv"
DOCBANK_PATH = BASE_DIR / "dataset" / "docbank_training.csv"
MODEL_DIR = BASE_DIR / "ml"
MODEL_PATH = MODEL_DIR / "model.pkl"

RANDOM_STATE = 42
TEST_SIZE = 0.20

TARGET_CLASSES = [
    "TITLE", "AUTHOR", "CHAPTER", "HEADING_1", "HEADING_2",
    "HEADING_3", "BODY", "ABSTRACT", "KEYWORDS", "CAPTION",
    "QUOTE", "REFERENCE"
]

# Baseline training data covering all 12 classes
SEEDED_DATA = [
    # TITLE
    ("Automated Offline Manuscript Typography and Structural Analysis System", "TITLE"),
    ("Deep Learning Approaches for Multi-Class Document Hierarchy Recognition", "TITLE"),
    ("Design and Implementation of an Automated Offline Document Formatter", "TITLE"),
    # AUTHOR
    ("Dr. Aris Thorne, Jane Doe, and Michael R. Zhang", "AUTHOR"),
    ("Department of Computer Science, University of Technology", "AUTHOR"),
    ("Sophia Martinez and William Jenkins", "AUTHOR"),
    # CHAPTER
    ("CHAPTER 1: INTRODUCTION", "CHAPTER"),
    ("Chapter 2 Related Work and Literature", "CHAPTER"),
    ("CHAPTER 3 SYSTEM ARCHITECTURE AND PIPELINE", "CHAPTER"),
    # HEADING_1
    ("1.0 Background and Problem Motivation", "HEADING_1"),
    ("2.0 Proposed Document Processing Methodology", "HEADING_1"),
    ("3.0 Experimental Results and Comparative Analysis", "HEADING_1"),
    # HEADING_2
    ("1.1 Feature Extraction and Structural Signals", "HEADING_2"),
    ("2.1 Document Linearization and Block Splitting", "HEADING_2"),
    ("3.1 Ablation Study Across Classifier Baselines", "HEADING_2"),
    # HEADING_3
    ("1.1.1 Character N-Gram Calibration", "HEADING_3"),
    ("2.1.2 Run-Level Style Inspection", "HEADING_3"),
    ("3.1.3 Runtime Latency Under Memory Constraints", "HEADING_3"),
    # BODY
    ("Document processing systems require reliable pipelines that can operate offline without cloud dependencies.", "BODY"),
    ("We evaluate memory consumption across chunk sizes ranging from 50 to 500 paragraphs to prevent latency bottlenecks.", "BODY"),
    ("The gradient descent converged smoothly during training, confirming consistent optimization across all features.", "BODY"),
    # ABSTRACT
    ("Abstract—Automating publication formatting eliminates human inconsistency. This paper proposes an offline ML parser.", "ABSTRACT"),
    ("Abstract: Manual document styling is tedious and error-prone. We introduce an intelligent deterministic layout formatter.", "ABSTRACT"),
    # KEYWORDS
    ("Keywords: natural language processing, document formatting, offline classification, python-docx", "KEYWORDS"),
    ("Index Terms—Machine learning, layout analysis, deterministic typography, air-gapped system.", "KEYWORDS"),
    # CAPTION
    ("Figure 1: High-level architectural pipeline of DocuForge AI.", "CAPTION"),
    ("Table 2: Comparison of macro-averaged F1 scores across classification baselines.", "CAPTION"),
    ("Fig. 3. Confusion matrix showing multiclass separation across all 12 target classes.", "CAPTION"),
    # QUOTE
    ("\"Simplicity is prerequisite for reliability; software complexity breeds vulnerability.\" — Edsger W. Dijkstra", "QUOTE"),
    ("\"Any sufficiently advanced technology is indistinguishable from magic.\" — Arthur C. Clarke", "QUOTE"),
    # REFERENCE
    ("[1] J. Smith and A. Doe, \"Linear classification paradigms for complex documents,\" IEEE Trans., 2021.", "REFERENCE"),
    ("[2] R. K. Vance et al., \"DocBank: A Benchmark Dataset for Document Layout Analysis,\" arXiv:2006.01038, 2020.", "REFERENCE"),
    ("[3] L. Breiman, \"Random Forests,\" Machine Learning, vol. 45, no. 1, pp. 5–32, 2001.", "REFERENCE"),
]

# Map alternative tags to the 12 canonical classes
LABEL_MAP = {
    "PARAGRAPH": "BODY",
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
# LOAD & MERGE DATASETS
# ============================================================

def load_dataset() -> pd.DataFrame:
    records = []
    
    # 1. Add baseline seeds
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
                    raw_lbl = str(row["label"]).strip().upper()
                    norm_lbl = LABEL_MAP.get(raw_lbl, raw_lbl)
                    if norm_lbl in TARGET_CLASSES:
                        records.append({"text": str(row["text"]).strip(), "label": norm_lbl})
        except Exception as e:
            print(f"Warning reading document_elements.csv: {e}")

    # 3. Add cleaned docbank_training.csv
    if DOCBANK_PATH.exists():
        try:
            df_docbank = pd.read_csv(DOCBANK_PATH)
            if "text" in df_docbank.columns and "label" in df_docbank.columns:
                for _, row in df_docbank.dropna(subset=["text", "label"]).iterrows():
                    raw_lbl = str(row["label"]).strip().upper()
                    norm_lbl = LABEL_MAP.get(raw_lbl, raw_lbl)
                    if norm_lbl in TARGET_CLASSES:
                        records.append({"text": str(row["text"]).strip(), "label": norm_lbl})
        except Exception as e:
            print(f"Warning reading docbank_training.csv: {e}")

    df = pd.DataFrame(records)
    df["text"] = df["text"].astype(str).str.strip()
    df = df[df["text"].str.len() > 1]
    df = df.drop_duplicates(subset=["text", "label"])
    return df

# ============================================================
# BUILD PIPELINE
# ============================================================

def build_model():
    word_vectorizer = TfidfVectorizer(
        analyzer="word",
        ngram_range=(1, 2),
        lowercase=True,
        sublinear_tf=True,
        min_df=1,
        max_features=20000,
    )

    character_vectorizer = TfidfVectorizer(
        analyzer="char_wb",
        ngram_range=(3, 5),
        lowercase=True,
        sublinear_tf=True,
        min_df=1,
        max_features=20000,
    )

    features = FeatureUnion([
        ("word_features", word_vectorizer),
        ("character_features", character_vectorizer),
    ])

    classifier = LogisticRegression(
        max_iter=2000,
        class_weight="balanced",
        random_state=RANDOM_STATE,
    )

    return Pipeline([
        ("features", features),
        ("classifier", classifier),
    ])

# ============================================================
# TRAIN & EVALUATE
# ============================================================

def train():
    print("\n========================================")
    print("DocuForge AI - Offline ML Training")
    print("========================================")

    df = load_dataset()
    print(f"Total samples : {len(df)}")
    print(f"Unique labels : {df['label'].nunique()}")
    print("\nSamples per label:")
    print(df["label"].value_counts().to_string())

    X = df["text"]
    y = df["label"]

    try:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y
        )
    except ValueError:
        print("\nNote: Stratified split unavailable due to small class counts; using random split.")
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE
        )

    model = build_model()
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    accuracy = accuracy_score(y_test, predictions)

    print("\n========================================")
    print("MODEL PERFORMANCE")
    print("========================================")
    print(f"Accuracy: {accuracy * 100:.2f}%\n")
    print(classification_report(y_test, predictions, zero_division=0))

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)

    print("========================================")
    print(f"MODEL SAVED to:\n{MODEL_PATH}")
    print("========================================")
    return model

if __name__ == "__main__":
    try:
        train()
    except Exception as error:
        print(f"\nERROR: {error}")
        sys.exit(1)