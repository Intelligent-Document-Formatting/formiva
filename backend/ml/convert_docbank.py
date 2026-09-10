"""
DocuForge AI - Clean and Convert DocBank Data
Cleans token brackets/noise and creates sentence-like training samples.
"""
import ast
import re
from pathlib import Path
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent.parent
CSV_PATH = BASE_DIR / "dataset" / "docbank_training.csv"

LABEL_MAPPING = {
    "paragraph": "BODY",
    "body": "BODY",
    "section": "HEADING_1",
    "heading_1": "HEADING_1",
    "title": "TITLE",
    "abstract": "ABSTRACT",
    "author": "AUTHOR",
    "caption": "CAPTION",
    "reference": "REFERENCE",
    "footer": "BODY",
    "list": "BODY",
    "equation": "BODY",
    "figure": "CAPTION",
    "table": "BODY",
}

def clean_text_cell(val: str) -> str:
    s = str(val).strip()
    # Strip list-like string formatting ['word'] -> word
    if s.startswith("[") and s.endswith("]"):
        try:
            parsed = ast.literal_eval(s)
            if isinstance(parsed, list):
                s = " ".join(str(x) for x in parsed)
        except Exception:
            s = re.sub(r"[\[\]'\",]", "", s)
    else:
        s = re.sub(r"^['\"]+|['\"]+$", "", s)
    
    s = re.sub(r"\s+", " ", s).strip()
    return s

def clean_and_rebuild():
    if not CSV_PATH.exists():
        print(f"Error: {CSV_PATH} not found.")
        return

    print(f"Loading raw entries from {CSV_PATH}...")
    df = pd.read_csv(CSV_PATH)

    if "text" not in df.columns or "label" not in df.columns:
        print("Invalid CSV structure. Missing 'text' or 'label' columns.")
        return

    # 1. Clean brackets, quotes, and whitespace
    df["clean_text"] = df["text"].apply(clean_text_cell)
    df["clean_label"] = df["label"].astype(str).str.lower().str.strip()
    df["clean_label"] = df["clean_label"].map(LABEL_MAPPING).fillna("BODY")

    # 2. Filter out noisy 1-2 character tokens and meaningless symbols
    cleaned_rows = []
    current_tokens = []
    current_label = None

    for _, row in df.iterrows():
        txt = row["clean_text"]
        lbl = row["clean_label"]

        # Skip punctuation-only or single character garbage
        if len(txt) <= 2 and not txt.isalnum():
            continue

        # Group adjacent tokens of the same label into realistic text blocks (up to 20 words)
        if current_label is None:
            current_label = lbl
            current_tokens.append(txt)
        elif current_label == lbl and len(current_tokens) < 20:
            current_tokens.append(txt)
        else:
            merged_sentence = " ".join(current_tokens).strip()
            if len(merged_sentence) > 3:
                cleaned_rows.append({"text": merged_sentence, "label": current_label})
            current_tokens = [txt]
            current_label = lbl

    if current_tokens:
        merged_sentence = " ".join(current_tokens).strip()
        if len(merged_sentence) > 3:
            cleaned_rows.append({"text": merged_sentence, "label": current_label})

    clean_df = pd.DataFrame(cleaned_rows).drop_duplicates(subset=["text"])
    clean_df.to_csv(CSV_PATH, index=False)

    print(f"\nDone! Cleaned dataset saved to: {CSV_PATH}")
    print(f"Valid Samples Remaining: {len(clean_df)}")
    print("\nBalanced Class Distribution:")
    print(clean_df["label"].value_counts())

if __name__ == "__main__":
    clean_and_rebuild()