import { createServer } from "vite";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { readdir, writeFile } from "node:fs/promises";

const root = fileURLToPath(new URL("../", import.meta.url));
const server = await createServer({ root, configFile: false, envFile: false,
  plugins: [(await import("@vitejs/plugin-react")).default()],
  server: { host: "127.0.0.1", port: 5198, strictPort: true },
  define: { "import.meta.env.VITE_API_URL": JSON.stringify("http://127.0.0.1:5198/api") },
});
try {
  await server.listen();
  const code = await new Promise((done, reject) => {
    const child = spawn(process.execPath, [resolve(root, "node_modules/@playwright/test/cli.js"), "test", "--config=playwright.delivery-design.config.ts", ...process.argv.slice(2)],
      { cwd: root, stdio: "inherit", windowsHide: true });
    child.once("error", reject); child.once("exit", done);
  });
  process.exitCode = code ?? 1;
  if (code === 0) {
    const folder = resolve(root, "test-results/delivery-design");
    const screenshots = (await readdir(resolve(folder, "screenshots"))).filter((file) => file.endsWith(".png")).sort();
    await writeFile(resolve(folder, "gallery.html"), `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Titanium - capturas de entregas</title>
      <style>body{margin:0;background:#f7f4ee;color:#17191d;font:15px system-ui}header{background:#17191d;color:white;padding:32px;border-top:5px solid #b91c1c}h1{margin:0 0 8px}select{padding:12px;border:1px solid #bbb;border-radius:8px;font:inherit}main{padding:24px;display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px}article{border:1px solid #ddd;border-radius:12px;background:white;padding:16px}img{display:block;width:100%;height:330px;object-fit:cover;object-position:top;border:1px solid #eee}a{color:#991b1b}label{display:block;margin:24px}article[hidden]{display:none}</style>
      <header><h1>Titanium / Entregas</h1><p>35 capturas con datos sint&eacute;ticos. APIs simuladas; sin pagos ni conexiones a bases de datos.</p></header>
      <label>Filtrar por ancho <select id="width"><option value="">Todos</option>${[1440,1024,768,390,320].map((width) => `<option>${width}</option>`).join("")}</select></label>
      <main>${screenshots.map((file) => `<article data-width="${file.match(/-(\d+)\.png$/)[1]}"><h2>${file.replace(".png", "")}</h2><a href="screenshots/${file}" target="_blank" rel="noopener"><img loading="lazy" src="screenshots/${file}" alt="${file}"><p>Abrir captura completa</p></a></article>`).join("")}</main>
      <script>document.querySelector('#width').addEventListener('change',e=>document.querySelectorAll('article').forEach(card=>card.hidden=!!e.target.value&&card.dataset.width!==e.target.value));</script></html>`, "utf8");
  }
} finally { await server.close(); }
