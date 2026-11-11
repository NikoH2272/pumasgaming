// Servidor estático local, sin dependencias. Ctrl+C para cerrar.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const port = Number(process.env.PUMAS_PREVIEW_PORT || 5175);
const tipos = {'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json'};
http.createServer((req,res)=>{
  let file;
  try {file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));}
  catch {res.writeHead(400);return res.end('Ruta no válida');}
  if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403);return res.end();}
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  fs.readFile(file,(error,data)=>{
    if(error){res.writeHead(404);return res.end('No encontrado');}
    res.writeHead(200,{'Content-Type':tipos[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
    res.end(data);
  });
}).listen(port,'127.0.0.1',()=>console.log(`Vista local: http://127.0.0.1:${port}/pruebas/diseno-resultados.html`));
