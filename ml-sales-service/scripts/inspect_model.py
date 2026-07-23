import importlib.metadata as metadata
import json
import os
import sys
from pathlib import Path

import joblib
import pandas as pd

FEATURE_COLUMNS = [
    "producto",
    "ventas_mes_anterior",
    "promedio_movil_ventas_3_meses",
    "promedio_movil_ventas_6_meses",
    "promedio_movil_ventas_12_meses",
    "vistas_producto_mes_anterior",
    "promedio_movil_vistas_3_meses",
]

SCRIPT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MODEL_PATH = SCRIPT_ROOT / "model" / "modelo_ventas_productos.joblib"


def package_version(name):
    try:
        return metadata.version(name)
    except metadata.PackageNotFoundError:
        return None


def resolve_model_path():
    raw_path = os.getenv("MODEL_PATH")
    if not raw_path:
        return DEFAULT_MODEL_PATH

    configured_path = Path(raw_path)
    if configured_path.is_absolute():
        return configured_path
    return SCRIPT_ROOT / configured_path


def final_estimator(model):
    steps = getattr(model, "steps", None)
    if steps:
        return steps[-1][1]
    return model


def main():
    model_path = resolve_model_path()
    if not model_path.exists():
        raise SystemExit(f"No existe el modelo: {model_path}")

    model = joblib.load(model_path)
    estimator = final_estimator(model)

    sample = pd.DataFrame(
        [
            {
                "producto": "Producto de prueba",
                "ventas_mes_anterior": 10,
                "promedio_movil_ventas_3_meses": 9.5,
                "promedio_movil_ventas_6_meses": 8.75,
                "promedio_movil_ventas_12_meses": 7.25,
                "vistas_producto_mes_anterior": 40,
                "promedio_movil_vistas_3_meses": 37.5,
            }
        ],
        columns=FEATURE_COLUMNS,
    )

    try:
        prediction = float(model.predict(sample)[0])
        prediction_error = None
    except Exception as error:
        prediction = None
        prediction_error = f"{type(error).__name__}: {error}"

    steps = getattr(model, "steps", None)
    expected_features = None
    if hasattr(model, "feature_names_in_"):
        expected_features = list(model.feature_names_in_)
    elif hasattr(estimator, "feature_names_in_"):
        expected_features = list(estimator.feature_names_in_)

    report = {
        "modelPath": str(model_path),
        "fileSizeBytes": model_path.stat().st_size,
        "objectType": type(model).__name__,
        "pipelineSteps": [name for name, _step in steps] if steps else None,
        "finalEstimator": type(estimator).__name__,
        "expectedFeatures": expected_features,
        "pythonVersion": sys.version.split()[0],
        "packages": {
            "scikit-learn": package_version("scikit-learn"),
            "joblib": package_version("joblib"),
            "pandas": package_version("pandas"),
            "numpy": package_version("numpy"),
            "scipy": package_version("scipy"),
            "xgboost": package_version("xgboost"),
        },
        "nJobs": getattr(estimator, "n_jobs", None),
        "testPrediction": prediction,
        "testPredictionError": prediction_error,
    }

    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
