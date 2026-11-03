import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";
import * as React from "react";
import * as jsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import * as router from "react-router-dom";
import axios from "axios";
import ts from "typescript";

// Render real TSX and exercise the real API adapter without a browser, .env,
// HTTP requests or provider calls. Effects and user interactions need E2E tests.
async function fixture({ storedCart = "[]" } = {}) {
  const requests = [];
  const context = vm.createContext({ console, Date, Intl, localStorage: { getItem: () => "test-account" },
    window: { localStorage: { getItem: () => storedCart } } });
  const cache = new Map();
  function synthetic(key, exports) {
    if (!cache.has(key)) cache.set(key, new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
    }, { context }));
    return cache.get(key);
  }
  async function load(url) {
    for (const suffix of ["", ".ts", ".tsx"]) {
      const resolved = new URL(url.href + suffix);
      if (cache.has(resolved.href)) return cache.get(resolved.href);
      let source;
      try { source = await readFile(resolved, "utf8"); }
      catch (error) { if (error.code === "ENOENT") continue; throw error; }
      const compiled = ts.transpileModule(source, { fileName: resolved.pathname,
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
      const module = new vm.SourceTextModule(compiled, { context, identifier: resolved.href });
      cache.set(resolved.href, module);
      return module;
    }
    throw new Error("Missing frontend import: " + url.href);
  }
  const external = { react: React, "react/jsx-runtime": jsx, "react-router-dom": router, axios: { default: axios } };
  const link = (specifier, parent) => {
    if (external[specifier]) return synthetic(specifier, external[specifier]);
    if (specifier.endsWith(".css")) return synthetic("css", {});
    if (specifier.endsWith("/api/api")) return synthetic("api", { API: {
      post: async (path, payload) => { requests.push({ path, payload }); return { data: { checkoutUrl: "https://example.invalid/test" } }; },
    } });
    if (specifier.endsWith("/membershipService")) return synthetic("memberships", { getMembershipPlans: () => { throw new Error("No HTTP in render tests"); } });
    assert.ok(specifier.startsWith("."), "Unexpected dependency " + specifier);
    return load(new URL(specifier, parent.identifier));
  };
  async function module(path) {
    const entry = await load(new URL("../src/" + path, import.meta.url));
    if (entry.status === "unlinked") await entry.link(link);
    if (entry.status === "linked") await entry.evaluate();
    return entry.namespace;
  }
  return { module, requests };
}

test("pickup contact fields do not require a shipping address", async () => {
  const f = await fixture();
  const Fields = (await f.module("components/cart/AddressFields.tsx")).default;
  const { emptyAddress } = await f.module("services/deliveryService.ts");
  const html = renderToStaticMarkup(React.createElement(Fields, { value: emptyAddress, onChange() {}, contactOnly: true }));
  assert.match(html, /name="recipientName"/); assert.match(html, /name="phone"/);
  assert.doesNotMatch(html, /postalCode|street|exteriorNumber/);
});

test("shipping fields require the complete address and keep the interior number optional", async () => {
  const f = await fixture();
  const Fields = (await f.module("components/cart/AddressFields.tsx")).default;
  const { emptyAddress } = await f.module("services/deliveryService.ts");
  const html = renderToStaticMarkup(React.createElement(Fields, { value: emptyAddress, onChange() {} }));
  assert.equal((html.match(/required=""/g) || []).length, 9);
  const inputs = html.match(/<input\b[^>]*>/g);
  assert.match(inputs.find((input) => input.includes('name="postalCode"')), /pattern="\[0-9\]\{5\}"/);
  assert.doesNotMatch(inputs.find((input) => input.includes('name="interiorNumber"')), /required/);
});

test("membership checkout renders without address or delivery controls", async () => {
  const f = await fixture();
  const PaymentPage = (await f.module("pages/PaymentPage.tsx")).default;
  const html = renderToStaticMarkup(React.createElement(router.MemoryRouter, null, React.createElement(PaymentPage)));
  assert.match(html, /membresia/);
  assert.doesNotMatch(html, /name="(?:postalCode|street|deliveryMethod|recipientName)"|Dirección de entrega/);
});

test("membership and product API calls keep their respective checkout routes", async () => {
  const f = await fixture();
  const { createMercadoPagoCheckout } = await f.module("services/checkoutService.ts");
  const membership = { idempotencyKey: "membership-attempt", membershipPlanId: "plan" };
  const products = { idempotencyKey: "product-attempt", items: [{ productId: 101, quantity: 1 }], fulfillment: { method: "pickup", recipientName: "Test", phone: "5555555555" }, quoteToken: "test" };
  await createMercadoPagoCheckout(membership); await createMercadoPagoCheckout(products);
  assert.equal(f.requests[0].path, "/checkout/mercadopago"); assert.equal(f.requests[0].payload, membership);
  assert.equal(f.requests[1].path, "/checkout/products/mercadopago"); assert.equal(f.requests[1].payload, products);
  assert.equal(f.requests[0].payload.fulfillment, undefined);
});

test("historical orders render without inventing delivery status", async () => {
  const f = await fixture();
  const Details = (await f.module("components/cart/OrderDetails.tsx")).default;
  const html = renderToStaticMarkup(React.createElement(Details, { order: { orderNumber: "ORD-TEST", status: "paid", createdAt: "2026-11-02T12:00:00Z", paidAt: null,
    subtotal: "200.00", discountTotal: "0.00", shippingTotal: "0.00", taxTotal: "0.00", total: "200.00", items: [], payments: [], fulfillment: null } }));
  assert.match(html, /no tiene seguimiento de entrega registrado/);
  assert.doesNotMatch(html, /Entregado|Recogido/);
});

test("cart is available on the initial render after a reload", async () => {
  const f = await fixture({ storedCart: JSON.stringify([{ id: 101, name: "Synthetic product", price: 100, quantity: 2, image: "" }]) });
  const { CartProvider } = await f.module("context/CartContext.tsx");
  const { CartContext } = await f.module("context/cartContextCore.ts");
  function Content() { const cart = React.useContext(CartContext); return React.createElement("p", null, `${cart.itemCount}:${cart.subtotal}`); }
  assert.equal(renderToStaticMarkup(React.createElement(CartProvider, null, React.createElement(Content))), "<p>2:200</p>");
});

test("malformed saved cart cannot crash the initial render", async () => {
  for (const storedCart of ["invalid-json", '{"unexpected":true}']) {
    const f = await fixture({ storedCart });
    const { CartProvider } = await f.module("context/CartContext.tsx");
    const { CartContext } = await f.module("context/cartContextCore.ts");
    function Content() { return React.createElement("p", null, React.useContext(CartContext).itemCount); }
    assert.equal(renderToStaticMarkup(React.createElement(CartProvider, null, React.createElement(Content))), "<p>0</p>");
  }
});
