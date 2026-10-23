const fs = require('fs'); const real = Date.now.bind(Date); let off = 0;
const rd = () => { try { off = +fs.readFileSync(process.env.TS_FILE, 'utf8') || 0; } catch (e) {} }; rd(); setInterval(rd, 100).unref();
Date.now = () => real() + off;
