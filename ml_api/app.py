from __future__ import annotations

import json
import os
import unicodedata
from pathlib import Path

import joblib
import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS
from scipy.sparse import load_npz
from sklearn.metrics.pairwise import cosine_similarity

from train_model import DEFAULT_MODEL_DIR, train_and_export


BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = Path(os.getenv("MODEL_DIR", DEFAULT_MODEL_DIR)).resolve()
PRODUCTS_PATH = MODEL_DIR / "productos_recomendacion.json"
VECTORIZER_PATH = MODEL_DIR / "vectorizer.joblib"
MATRIX_PATH = MODEL_DIR / "matriz_tfidf.npz"
METADATA_PATH = MODEL_DIR / "metadata.json"

app = Flask(__name__)
CORS(app)

products: list[dict] = []
vectorizer = None
tfidf_matrix = None
metadata: dict = {}
index_by_product_id: dict[int, int] = {}


def normalize_text(value: object) -> str:
    text = str(value or "").strip().lower()
    text = unicodedata.normalize("NFKD", text)
    return "".join(character for character in text if not unicodedata.combining(character))


def parse_bool(value: object, default: bool = True) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    return normalize_text(value) not in {"false", "0", "no", "n"}


def parse_limit(value: object, default: int = 4) -> int:
    try:
        limit = int(value or default)
    except (TypeError, ValueError):
        return default
    return min(max(limit, 1), 12)


def ensure_artifacts() -> None:
    required_files = [PRODUCTS_PATH, VECTORIZER_PATH, MATRIX_PATH]
    if all(path.exists() for path in required_files):
        return
    train_and_export(model_dir=MODEL_DIR)


def load_model() -> None:
    global products, vectorizer, tfidf_matrix, metadata, index_by_product_id

    ensure_artifacts()

    products = json.loads(PRODUCTS_PATH.read_text(encoding="utf-8"))
    vectorizer = joblib.load(VECTORIZER_PATH)
    tfidf_matrix = load_npz(MATRIX_PATH)
    metadata = (
        json.loads(METADATA_PATH.read_text(encoding="utf-8"))
        if METADATA_PATH.exists()
        else {}
    )
    index_by_product_id = {
        int(product["id_producto"]): index
        for index, product in enumerate(products)
    }


def product_type_at(index: int) -> str:
    return str(products[index].get("productType") or "")


def product_result(index: int, score: float) -> dict:
    product = products[index]
    return {
        "id_producto": int(product["id_producto"]),
        "producto": product.get("producto"),
        "productType": product.get("productType"),
        "categoryName": product.get("categoryName"),
        "brandName": product.get("brandName"),
        "score_similitud": round(float(score), 6),
    }


def recommendations_from_scores(
    scores: np.ndarray,
    excluded_ids: set[int],
    allowed_types: set[str] | None,
    limit: int,
) -> list[dict]:
    candidates = []

    for index, score in enumerate(scores):
        product_id = int(products[index]["id_producto"])
        if product_id in excluded_ids:
            continue
        if allowed_types and product_type_at(index) not in allowed_types:
            continue
        if score <= 0:
            continue
        candidates.append((index, float(score)))

    candidates.sort(key=lambda item: item[1], reverse=True)
    return [product_result(index, score) for index, score in candidates[:limit]]


@app.get("/health")
def health():
    return jsonify(
        {
            "ok": True,
            "products_count": len(products),
            "terms_count": int(tfidf_matrix.shape[1]) if tfidf_matrix is not None else 0,
        }
    )


@app.get("/recommendations/product/<int:product_id>")
def recommend_by_product(product_id: int):
    if product_id not in index_by_product_id:
        return jsonify({"error": "Producto no encontrado"}), 404

    limit = parse_limit(request.args.get("limit"), 4)
    same_type = parse_bool(request.args.get("sameType"), True)
    base_index = index_by_product_id[product_id]

    scores = cosine_similarity(tfidf_matrix[base_index], tfidf_matrix).ravel()
    allowed_types = {product_type_at(base_index)} if same_type else None

    recommendations = recommendations_from_scores(
        scores=scores,
        excluded_ids={product_id},
        allowed_types=allowed_types,
        limit=limit,
    )

    return jsonify({"recommendations": recommendations})


@app.post("/recommendations/cart")
def recommend_by_cart():
    payload = request.get_json(silent=True) or {}
    product_ids = payload.get("productIds") or []
    if not isinstance(product_ids, list):
        return jsonify({"error": "productIds debe ser una lista"}), 400

    valid_ids = []
    for product_id in product_ids:
        try:
            normalized_id = int(product_id)
        except (TypeError, ValueError):
            continue
        if normalized_id in index_by_product_id and normalized_id not in valid_ids:
            valid_ids.append(normalized_id)

    if not valid_ids:
        return jsonify({"recommendations": []})

    limit = parse_limit(payload.get("limit"), 2)
    same_type = parse_bool(payload.get("sameType"), True)
    base_indexes = [index_by_product_id[product_id] for product_id in valid_ids]
    score_rows = cosine_similarity(tfidf_matrix[base_indexes], tfidf_matrix)
    scores = score_rows.mean(axis=0)
    allowed_types = (
        {product_type_at(index) for index in base_indexes}
        if same_type
        else None
    )

    recommendations = recommendations_from_scores(
        scores=scores,
        excluded_ids=set(valid_ids),
        allowed_types=allowed_types,
        limit=limit,
    )

    return jsonify({"recommendations": recommendations})


@app.post("/reload")
def reload_model():
    train_and_export(model_dir=MODEL_DIR)
    load_model()
    return jsonify({"ok": True, "metadata": metadata})


load_model()


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5050"))
    app.run(host="0.0.0.0", port=port, debug=os.getenv("FLASK_DEBUG") == "1")
