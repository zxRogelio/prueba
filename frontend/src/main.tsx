import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import App from "./App";
import { AuthProvider } from "./context/AuthProvider";
import { CartProvider } from "./context/CartContext";
import "./styles/layout.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <App />
          <Toaster
            closeButton
            position="top-right"
            theme="dark"
            toastOptions={{
              style: {
                background: "#10131a",
                color: "#f8fafc",
                border: "1px solid rgba(239, 68, 68, 0.18)",
                boxShadow: "0 18px 38px rgba(3, 7, 18, 0.28)",
              },
            }}
          />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
