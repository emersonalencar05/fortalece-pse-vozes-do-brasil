import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('./docs/',import.meta.url)));
const port=Number(process.env.PORT||3000);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.json':'application/json'};
const server=http.createServer(async(req,res)=>{
  try {
    const method=req.method||'GET';
    if(method!=='GET'&&method!=='HEAD'){res.writeHead(405,{'Allow':'GET, HEAD'});return res.end();}
    let urlPath=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(urlPath==='/')urlPath='/index.html';
    const abs=resolve(root,'.'+urlPath);
    if(!abs.startsWith(root+sep)&&abs!==root)throw Object.assign(new Error('Forbidden'),{code:'EACCES'});
    if(!(await stat(abs)).isFile())throw Object.assign(new Error('Not found'),{code:'ENOENT'});
    const body=await readFile(abs);
    res.writeHead(200,{'Content-Type':mime[extname(abs)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(method==='HEAD'?undefined:body);
  }catch(e){res.writeHead(e.code==='ENOENT'?404:403,{'Content-Type':'text/plain; charset=utf-8'});res.end(e.code==='ENOENT'?'Arquivo não encontrado':'Acesso negado');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Mostra PSE — ambiente local: http://localhost:${port}/`));
