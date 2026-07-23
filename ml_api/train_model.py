from __future__ import annotations

import json
import os
from pathlib import Path

import joblib
import pandas as pd
from scipy.sparse import save_npz
from sklearn.feature_extraction.text import TfidfVectorizer


BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
DEFAULT_DATASET_PATH = PROJECT_ROOT / "docs" / "similitud_de_coseno_Productos.csv"
DEFAULT_MODEL_DIR = BASE_DIR / "models"

REQUIRED_COLUMNS = [
    "id_producto",
    "producto",
    "productType",
    "categoryName",
    "brandName",
    "price",
    "description",
    "features",
    "supplementFlavor",
    "supplementPresentation",
    "supplementServings",
    "apparelSize",
    "apparelColor",
    "apparelMaterial",
    "texto_recomendacion",
]

STOPWORDS_ES = [
    "a",
    "al",
    "algo",
    "ante",
    "con",
    "como",
    "de",
    "del",
    "desde",
    "durante",
    "e",
    "el",
    "ella",
    "en",
    "entre",
    "es",
    "esta",
    "este",
    "esto",
    "ideal",
    "la",
    "las",
    "lo",
    "los",
    "mas",
    "mejor",
    "para",
    "por",
    "que",
    "se",
    "sin",
    "su",
    "sus",
    "un",
    "una",
    "unas",
    "unos",
    "y",
]


def text_value(value: object) -> str:
    if pd.isna(value):
        return ""
    return str(value).strip()


def join_text(*values: object) -> str:
    return " ".join(text_value(value) for value in values if text_value(value))


def repeated(value: object, times: int) -> list[str]:
    return [text_value(value)] * times


def build_model_text(row: pd.Series) -> str:
    return join_text(
        *repeated(row["producto"], 3),
        *repeated(row["productType"], 3),
        *repeated(row["categoryName"], 3),
        *repeated(row["brandName"], 2),
        row["price"],
        row["description"],
        row["features"],
        row["supplementFlavor"],
        row["supplementPresentation"],
        row["supplementServings"],
        row["apparelSize"],
        row["apparelColor"],
        row["apparelMaterial"],
        row["texto_recomendacion"],
    )


def get_dataset_path() -> Path:
    configured_path = os.getenv("DATASET_PATH")
    if not configured_path:
        return DEFAULT_DATASET_PATH.resolve()

    raw_path = Path(configured_path)
    candidates = [raw_path]

    if not raw_path.is_absolute():
        candidates.extend([
            BASE_DIR / raw_path,
            PROJECT_ROOT / raw_path,
        ])

    for candidate in candidates:
        resolved = candidate.resolve()
        if resolved.exists():
            return resolved

    return candidates[-1].resolve()


def get_model_dir() -> Path:
    return Path(os.getenv("MODEL_DIR", DEFAULT_MODEL_DIR)).resolve()


def train_and_export(
    dataset_path: Path | None = None,
    model_dir: Path | None = None,
) -> dict[str, object]:
    dataset_path = (dataset_path or get_dataset_path()).resolve()
    model_dir = (model_dir or get_model_dir()).resolve()

    if not dataset_path.exists():
        raise FileNotFoundError(f"No existe el dataset: {dataset_path}")

    model_dir.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(dataset_path, na_values=["NULL", "null", ""])
    missing_columns = [column for column in REQUIRED_COLUMNS if column not in df.columns]
    if missing_columns:
        raise ValueError(f"Faltan columnas requeridas: {missing_columns}")

    df = df[REQUIRED_COLUMNS].copy()
    df["id_producto"] = df["id_producto"].astype(int)
    df["price"] = pd.to_numeric(df["price"], errors="coerce").fillna(0)

    text_columns = [column for column in REQUIRED_COLUMNS if column not in ["id_producto", "price"]]
    df[text_columns] = df[text_columns].fillna("")
    df["texto_modelo"] = df.apply(build_model_text, axis=1)

    vectorizer = TfidfVectorizer(
        strip_accents="unicode",
        lowercase=True,
        stop_words=STOPWORDS_ES,
        ngram_range=(1, 2),
        min_df=1,
    )
    tfidf_matrix = vectorizer.fit_transform(df["texto_modelo"])

    products_path = model_dir / "productos_recomendacion.json"
    vectorizer_path = model_dir / "vectorizer.joblib"
    matrix_path = model_dir / "matriz_tfidf.npz"
    metadata_path = model_dir / "metadata.json"

    joblib.dump(vectorizer, vectorizer_path)
    save_npz(matrix_path, tfidf_matrix)

    records = df.drop(columns=["texto_modelo"]).to_dict(orient="records")
    products_path.write_text(
        json.dumps(records, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    metadata = {
        "dataset_path": str(dataset_path),
        "products_count": int(len(df)),
        "terms_count": int(tfidf_matrix.shape[1]),
        "artifacts": {
            "products": str(products_path),
            "vectorizer": str(vectorizer_path),
            "matrix": str(matrix_path),
        },
    }
    metadata_path.write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    return metadata


if __name__ == "__main__":
    result = train_and_export()
    print(json.dumps(result, ensure_ascii=False, indent=2))
