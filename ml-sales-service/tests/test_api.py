import pytest

from app import ModelLoadError, create_app


class FakeModel:
    def predict(self, frame):
        return [float(index + 2) for index in range(len(frame))]


class NegativePredictionModel:
    def predict(self, frame):
        return [-4.25 for _index in range(len(frame))]


def client_for(monkeypatch, model=None):
    monkeypatch.setenv("ML_API_KEY", "test-key")
    app = create_app(model=model or FakeModel(), load_model_on_start=False)
    app.config.update(TESTING=True)
    return app.test_client()


def valid_record(product_id=15, producto="Creatina Monohidratada 300 g"):
    return {
        "productId": product_id,
        "producto": producto,
        "ventas_mes_anterior": 18,
        "promedio_movil_ventas_3_meses": 17.33,
        "promedio_movil_ventas_6_meses": 16.5,
        "promedio_movil_ventas_12_meses": 15.75,
        "vistas_producto_mes_anterior": 90,
        "promedio_movil_vistas_3_meses": 82.67,
    }


def predict(client, payload, key="test-key"):
    return client.post("/predict", json=payload, headers={"X-ML-API-Key": key})


def test_health(monkeypatch):
    client = client_for(monkeypatch)
    response = client.get("/health")

    assert response.status_code == 200
    data = response.get_json()
    assert data["ok"] is True
    assert data["service"] == "titanium-sales-ml"
    assert data["modelLoaded"] is True


def test_predict_valid_request(monkeypatch):
    client = client_for(monkeypatch)
    response = predict(client, {"records": [valid_record()]})

    assert response.status_code == 200
    data = response.get_json()
    assert data["predictions"][0]["productId"] == 15
    assert data["predictions"][0]["producto"] == "Creatina Monohidratada 300 g"
    assert data["predictions"][0]["unidadesEstimadas"] == 2


def test_predict_rejects_wrong_key(monkeypatch):
    client = client_for(monkeypatch)
    response = predict(client, {"records": [valid_record()]}, key="wrong")

    assert response.status_code == 401


def test_predict_rejects_missing_key(monkeypatch):
    client = client_for(monkeypatch)
    response = client.post("/predict", json={"records": [valid_record()]})

    assert response.status_code == 401


def test_predict_rejects_empty_list(monkeypatch):
    client = client_for(monkeypatch)
    response = predict(client, {"records": []})

    assert response.status_code == 400


def test_predict_rejects_missing_variable(monkeypatch):
    client = client_for(monkeypatch)
    record = valid_record()
    del record["promedio_movil_ventas_12_meses"]

    response = predict(client, {"records": [record]})

    assert response.status_code == 400
    assert "Variable faltante" in response.get_json()["error"]


def test_predict_rejects_negative_value(monkeypatch):
    client = client_for(monkeypatch)
    record = valid_record()
    record["ventas_mes_anterior"] = -1

    response = predict(client, {"records": [record]})

    assert response.status_code == 400


def test_predict_allows_unknown_product_name(monkeypatch):
    client = client_for(monkeypatch)
    response = predict(client, {"records": [valid_record(999, "Producto no entrenado")]})

    assert response.status_code == 200
    assert response.get_json()["predictions"][0]["productId"] == 999


def test_predict_accepts_multiple_products(monkeypatch):
    client = client_for(monkeypatch)
    response = predict(
        client,
        {
            "records": [
                valid_record(15, "Creatina Monohidratada 300 g"),
                valid_record(16, "Shaker Titanium 700 ml"),
            ]
        },
    )

    assert response.status_code == 200
    predictions = response.get_json()["predictions"]
    assert len(predictions) == 2
    assert predictions[1]["unidadesEstimadas"] == 3


def test_prediction_is_non_negative(monkeypatch):
    client = client_for(monkeypatch, model=NegativePredictionModel())
    response = predict(client, {"records": [valid_record()]})

    assert response.status_code == 200
    prediction = response.get_json()["predictions"][0]
    assert prediction["prediccionDecimal"] == 0
    assert prediction["unidadesEstimadas"] == 0


def test_missing_model_fails_on_start(monkeypatch, tmp_path):
    monkeypatch.setenv("ML_API_KEY", "test-key")

    with pytest.raises(ModelLoadError):
        create_app(model_path=tmp_path / "missing.joblib", load_model_on_start=True)


def test_unloadable_model_fails_on_start(monkeypatch, tmp_path):
    monkeypatch.setenv("ML_API_KEY", "test-key")
    broken_model = tmp_path / "broken.joblib"
    broken_model.write_text("not a joblib model", encoding="utf8")

    with pytest.raises(ModelLoadError):
        create_app(model_path=broken_model, load_model_on_start=True)
