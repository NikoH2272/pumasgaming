// npm run build:inicio — conserva los CSS editables y publica una sola hoja minificada.
const fs = require('node:fs');
const path = require('node:path');
const { transformSync } = require('esbuild');
const root = path.resolve(__dirname, '..');
const sources = [
    'fonts/inicio-fonts.css',
    'portal-kit/vendor/normalize-8.0.1.min.css',
    'style.css',
    'portal-kit/latam.css',
    'inicio.css'
];
const css = sources.map(file => {
    let source = fs.readFileSync(path.join(root, file), 'utf8');
    if (file.startsWith('fonts/')) source = source.replace(/url\(([^)]+)\)/g, 'url(fonts/$1)');
    return source;
}).join('\n');
const result = transformSync(css, { loader: 'css', minify: true, legalComments: 'inline', target: ['chrome100', 'safari15'] });
const output = '/* Generado por npm run build:inicio. Editar los CSS originales. */\n' + result.code;
const target = path.join(root, 'inicio.min.css');
if (process.argv.includes('--check')) {
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== output) {
        console.error('inicio.min.css está desactualizado. Ejecuta npm run build:inicio.');
        process.exitCode = 1;
    }
} else {
    fs.writeFileSync(target, output);
    console.log(`inicio.min.css: ${Buffer.byteLength(output)} bytes`);
}
