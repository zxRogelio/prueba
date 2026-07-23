import logging
import math
import os
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from flask import Flask, jsonify, request

SERVICE_NAME = "titanium-sales-ml"
MODEL_VERSION = os.getenv("MODEL_VERSION", "1.0")
APP_ROOT = Path(__file__).resolve().parent
DEFAULT_MODEL_PATH = "model/modelo_ventas_productos.joblib"

FEATURE_COLUMNS = [
    "producto",
    "ventas_mes_anterior",
    "promedio_movil_ventas_3_meses",
    "promedio_movil_ventas_6_meses",
    "promedio_movil_ventas_12_meses",
    "vistas_producto_mes_anterior",
    "promedio_movil_vistas_3_meses",
]

NUMERIC_FEATURE_COLUMNS = [
    "ventas_mes_anterior",
    "promedio_movil_ventas_3_meses",
    "promedio_movil_ventas_6_meses",
    "promedio_movil_ventas_12_meses",
    "vistas_producto_mes_anterior",
    "promedio_movil_vistas_3_meses",
]

MAX_RECORDS_PER_REQUEST = 1000
MAX_PRODUCT_NAME_LENGTH = 200
MAX_PRODUCT_ID_LENGTH = 160

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger(SERVICE_NAME)


class ModelLoadError(RuntimeError):
    pass


class RequestValidationError(ValueError):
    pass


def _resolve_model_path(model_path: str | os.PathLike[str] | None = None) -> Path:
    configured_path = Path(str(model_path or os.getenv("MODEL_PATH") or DEFAULT_MODEL_PATH))
    if configured_path.is_absolute():
        return configured_path
    return APP_ROOT / configured_path


def _final_estimator(model: Any) -> Any:
    steps = getattr(model, "steps", None)
    if steps:
        return steps[-1][1]
    return model


def _model_name(model: Any) -> str:
    return type(_final_estimator(model)).__name__


def _limit_model_threads(model: Any) -> None:
    estimator = _final_estimator(model)
    if hasattr(estimator, "n_jobs"):
        try:
            estimator.n_jobs = 1
            logger.info("Modelo configurado con n_jobs=1")
        except Exception as error:
            logger.warning("No se pudo ajustar n_jobs del modelo: %s", error)


def load_model(model_path: str | os.PathLike[str] | None = None) -> Any:
    resolved_path = _resolve_model_path(model_path)
    if not resolved_path.exists():
        raise ModelLoadError(f"No existe el archivo de modelo: {resolved_path}")

    try:
        model = joblib.load(resolved_path)
    except Exception as error:
        raise ModelLoadError(f"No se pudo cargar el modelo: {resolved_path}") from error

    _limit_model_threads(model)
    return model


def _normalize_product_id(value: Any, record_index: int) -> int | str:
    if isinstance(value, bool) or value is None:
        raise RequestValidationError(f"records[{record_index}].productId es obligatorio.")

    if isinstance(value, int):
        if value <= 0:
            raise RequestValidationError(f"records[{record_index}].productId debe ser positivo.")
        return value

    if isinstance(value, str):
        normalized = value.strip()
        if not normalized:
            raise RequestValidationError(f"records[{record_index}].productId es obligatorio.")
        if len(normalized) > MAX_PRODUCT_ID_LENGTH:
            raise RequestValidationError(
                f"records[{record_index}].productId supera {MAX_PRODUCT_ID_LENGTH} caracteres."
            )
        if normalized.isdigit():
            return int(normalized)
        return normalized

    raise RequestValidationError(f"records[{record_index}].productId tiene formato invalido.")


def _normalize_product_name(value: Any, record_index: int) -> str:
    if not isinstance(value, str):
        raise RequestValidationError(f"records[{record_index}].producto es obligatorio.")

    normalized = value.strip()
    if not normalized:
        raise RequestValidationError(f"records[{record_index}].producto es obligatorio.")

    if len(normalized) > MAX_PRODUCT_NAME_LENGTH:
        raise RequestValidationError(
            f"records[{record_index}].producto supera {MAX_PRODUCT_NAME_LENGTH} caracteres."
        )

    return normalized


def _normalize_non_negative_number(value: Any, field: str, record_index: int) -> float:
    if isinstance(value, bool) or value is None:
        raise RequestValidationError(f"records[{record_index}].{field} es obligatorio.")

    try:
        normalized = float(value)
    except (TypeError, ValueError) as error:
        raise RequestValidationError(
            f"records[{record_index}].{field} debe ser numerico."
        ) from error

    if not math.isfinite(normalized):
        raise RequestValidationError(
            f"records[{record_index}].{field} debe ser un numero finito."
        )

    if normalized < 0:
        raise RequestValidationError(
            f"records[{record_index}].{field} no puede ser negativo."
        )

    return normalized


def _validate_records(payload: Any) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    if not isinstance(payload, dict):
        raise RequestValidationError("El cuerpo debe ser un objeto JSON.")

    records = payload.get("records")
    if not isinstance(records, list):
        raise RequestValidationError("records debe ser una lista.")

    if len(records) == 0:
        raise RequestValidationError("records no puede estar vacio.")

    if len(records) > MAX_RECORDS_PER_REQUEST:
        raise RequestValidationError(
            f"records no puede superar {MAX_RECORDS_PER_REQUEST} elementos."
        )

    dataframe_rows: list[dict[str, Any]] = []
    references: list[dict[str, Any]] = []

    for index, record in enumerate(records):
        if not isinstance(record, dict):
            raise RequestValidationError(f"records[{index}] debe ser un objeto.")

        product_id = _normalize_product_id(record.get("productId"), index)
        product_name = _normalize_product_name(record.get("producto"), index)

        dataframe_row: dict[str, Any] = {"producto": product_name}
        for field in NUMERIC_FEATURE_COLUMNS:
            if field not in record:
                raise RequestValidationError(f"Variable faltante: records[{index}].{field}.")
            dataframe_row[field] = _normalize_non_negative_number(record[field], field, index)

        dataframe_rows.append(dataframe_row)
        references.append({"productId": product_id, "producto": product_name})

    return dataframe_rows, references


def _require_api_key(app: Flask) -> tuple[bool, tuple[Any, int] | None]:
    configured_key = app.config.get("ML_API_KEY")
    if not configured_key:
        return False, (
            jsonify({"error": "ML_API_KEY no esta configurada en el microservicio."}),
            503,
        )

    request_key = request.headers.get("X-ML-API-Key")
    if not request_key:
        return False, (jsonify({"error": "Clave del microservicio ausente."}), 401)

    if request_key != configured_key:
        return False, (jsonify({"error": "Clave del microservicio invalida."}), 401)

    return True, None


def create_app(
    *,
    model: Any | None = None,
    model_path: str | os.PathLike[str] | None = None,
    load_model_on_start: bool = True,
) -> Flask:
    app = Flask(__name__)
    app.config["ML_API_KEY"] = os.getenv("ML_API_KEY")
    app.config["MODEL_VERSION"] = MODEL_VERSION
    app.config["MODEL_OBJECT"] = model

    if model is None and load_model_on_start:
        app.config["MODEL_OBJECT"] = load_model(model_path)

    if app.config["MODEL_OBJECT"] is not None:
        app.config["MODEL_NAME"] = _model_name(app.config["MODEL_OBJECT"])
    else:
        app.config["MODEL_NAME"] = None

    @app.get("/health")
    def health():
        return jsonify(
            {
                "ok": True,
                "service": SERVICE_NAME,
                "modelLoaded": app.config["MODEL_OBJECT"] is not None,
                "modelName": app.config["MODEL_NAME"],
                "modelVersion": app.config["MODEL_VERSION"],
            }
        )

    @app.post("/predict")
    def predict():
        authorized, error_response = _require_api_key(app)
        if not authorized:
            return error_response

        model_object = app.config.get("MODEL_OBJECT")
        if model_object is None:
            return jsonify({"error": "Modelo no cargado."}), 503

        payload = request.get_json(silent=True)
        try:
            dataframe_rows, references = _validate_records(payload)
            frame = pd.DataFrame(dataframe_rows, columns=FEATURE_COLUMNS)
            raw_predictions = model_object.predict(frame)
        except RequestValidationError as error:
            return jsonify({"error": str(error)}), 400
        except Exception as error:
            logger.exception("Error seguro al generar predicciones: %s", error)
            return jsonify({"error": "No se pudieron generar las predicciones."}), 500

        predictions = []
        try:
            for reference, raw_prediction in zip(references, raw_predictions, strict=True):
                prediction_decimal = max(0.0, float(raw_prediction))
                predictions.append(
                    {
                        "productId": reference["productId"],
                        "producto": reference["producto"],
                        "prediccionDecimal": round(prediction_decimal, 4),
                        "unidadesEstimadas": int(math.floor(prediction_decimal + 0.5)),
                    }
                )
        except Exception as error:
            logger.exception("Respuesta invalida del modelo: %s", error)
            return jsonify({"error": "El modelo devolvio una respuesta invalida."}), 500

        return jsonify(
            {
                "model": app.config["MODEL_NAME"],
                "modelVersion": app.config["MODEL_VERSION"],
                "predictions": predictions,
            }
        )

    return app


app = create_app()


if __name__ == "__main__":
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8001"))
    app.run(host=host, port=port)
