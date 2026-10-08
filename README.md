# TasApp VE

App SvelteKit, sin publicidad, para consultar la tasa oficial del BCV y el USDT de Binance P2P en Venezuela.

- **¿A qué tasa te están cobrando?** Precio en $ + monto en Bs → tasa implícita, comparación contra BCV/USDT y si conviene pagar en Bs o en divisas.
- **Lista de compras con presupuesto:** suma productos en cualquier moneda y te dice si te alcanza (o cuánto falta) con cada tasa.
- **Conversor** entre USD, EUR, USDT y VES.
- Acepta montos al estilo venezolano (`1.234,56`).

## Stack

- **SvelteKit 2** (Svelte 5 runes) + TypeScript estricto
- **TailwindCSS 4** con paleta propia "Caribbean Premium" (teal + amber + rose)
- **cheerio** para scraping tolerante del BCV
- **Binance P2P** (endpoint público) como fuente principal del USDT
- **ve.dolarapi.com** como fuente primaria del BCV y respaldo del USDT
- **localStorage** para tasa personalizada + lista de items
- **Vitest** para tests unitarios

## Arquitectura Multi-Fuente (Resiliencia)

Las tasas se obtienen con **cascada de fallback** para tolerar caídas de cualquier fuente individual:

| Prioridad | Fuente | Tipo | Notas |
|---|---|---|---|
| 1° | `ve.dolarapi.com` | API comunitaria | BCV oficial (USD + EUR). Respaldo del USDT (paralelo promedio) |
| 2° | `bcv.org.ve` (scraping) | HTML + cheerio | Dos URLs candidatas (página dedicada `/estadisticas/...` + home) |
| USDT | `Binance P2P` | JSON POST `adv/search` | **Fuente principal del USDT.** Mediana de los 10 mejores anuncios de cada lado (compra/venta) |
| 4° | Tasa manual del usuario | UI | Persistida en localStorage |

**Cada `TasaCard` muestra el origen real** del dato (badge "Fuente: ...") y un indicador "·fallback" si vino de una fuente secundaria.

### Nota sobre el cert del BCV

El sitio `bcv.org.ve` usa un **certificado autofirmado** que la cadena estándar de CAs no puede verificar. `httpGet` soporta una política TLS opcional (`politicaTls: 'insegura'`) limitada por **whitelist explícita de hosts** (`hostsInseguros: ['bcv.org.ve']`). Solo aplica TLS bypass a esos hosts; el resto del mundo sigue con verificación estricta. La implementación usa `undici.Agent({ connect: { rejectUnauthorized: false } })`.

### Estructura de capas

```
src/lib/
├── domain/              # Reglas de negocio PURAS
│   ├── entities/        # tipos: Tasa, Item, Moneda + fuenteUsada
│   └── usecases/        # conversión, totales, diferencia
├── data/repositories/   # TasaRepository (interface), ItemRepository
├── infrastructure/      # HTTP client tipado, LocalStorage adapter
├── server/              # ⚠️ server-only — NO se bundlea en cliente
│   ├── sources/         # VeDolarApi, BCVScraper, BinanceP2PClient
│   ├── repositories/    # TasaRepositoryLocal (usa MultiFuente), MultiFuenteTasaRepository
│   └── contenedor.server.ts
├── presentation/        # Svelte UI
│   ├── stores/          # tasas, items, theme
│   ├── components/      # TasaCard (con badge fuente), ManualTasaForm, etc.
│   └── contexto.ts
└── shared/format.ts     # formateo es-VE
```

- **Repository pattern** para tasas.
- **Strategy implícito** vía `SelectorTasa` (BCV / USDT / Personalizada).
- **DI manual** vía `setContext` (sin librería externa).
- **Server/client isolate**: ningún recurso server está expuesto al cliente.

## Comandos

```bash
pnpm install         # instalar dependencias
pnpm dev             # http://localhost:5173
pnpm test            # Vitest (72 tests)
pnpm check           # svelte-check (typecheck)
pnpm format          # Prettier
pnpm build           # build de producción (adapter-node)
pnpm preview         # servir build
```

## API endpoints

- `GET /api/tasas`     — combinación BCV + USDT + diferencia (multi-fuente, 10min cache)
- `GET /api/tasas/bcv` — solo BCV (multi-fuente, 1h cache)
- `GET /api/tasas/usdt` — solo USDT (multi-fuente, 1h cache)

Cada endpoint prueba el `MultiFuenteTasaRepository` que ejecuta la cascada.

## UI

- **Light/Dark** toggle con persistencia.
- **TasaCard** muestra fuente: "ve.dolarapi.com", "bcv.org.ve", "Binance P2P", "Manual".
- **ManualTasaForm** prominente (warning color) solo aparece cuando **ambas** fuentes automáticas fallan.
- **Tipografía**: Inter Variable (UI) + JetBrains Mono (números tabulares).
- **Paleta**: teal primario, amber USDT, rose danger, success green, info blue.

## Tests

```bash
pnpm test
```

93 tests cubren:
- Creación de items con validación
- Conversiones (pares + cruzadas)
- Diferencia % entre fuentes
- Totales por moneda con selector de tasa activa
- Formateo es-VE
- Storage adapter (mock de localStorage)
- **HttpTasaRepository** (cliente)
- **VeDolarApi** (parsing JSON con tolerancia a variaciones, match por `fuente`)
- **MultiFuenteTasaRepository** (cascada, timeouts, fallback, fuentesUsada)
- **BCVScraper** (parsing del HTML real guardado en `fixtures/bcv-home.html` con USD=757.5406, EUR=875.2169568)
- **httpGet TLS whitelist** (hostPermitidoInseguro) con casos para hosts exactos, subdominios, hosts fuera de whitelist, política no especificada
