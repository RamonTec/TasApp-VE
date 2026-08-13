import('undici').then(async (undici) => {
  const url = 'https://www.bcv.org.ve/estadisticas/tipo-cambio-de-referencia-smc';
  
  console.log('Approach A: Agent constructor with connect.tls.rejectUnauthorized');
  try {
    const dispatcher = new undici.Agent({ connect: { rejectUnauthorized: false } });
    const r = await undici.fetch(url, { dispatcher, headers: { 'User-Agent': 'Mozilla/5.0' } });
    console.log('  Status:', r.status);
    const t = await r.text();
    console.log('  Length:', t.length);
  } catch (e) {
    console.error('  ERR:', e.cause?.message || e.message);
  }

  console.log('Approach B: Agent with connect.tls.rejectUnauthorized');
  try {
    const dispatcher = new undici.Agent({ connect: { tls: { rejectUnauthorized: false } } });
    const r = await undici.fetch(url, { dispatcher, headers: { 'User-Agent': 'Mozilla/5.0' } });
    console.log('  Status:', r.status);
    const t = await r.text();
    console.log('  Length:', t.length);
  } catch (e) {
    console.error('  ERR:', e.cause?.message || e.message);
  }
});
