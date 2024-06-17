import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import duckdb_wasm_eh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import eh_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';
import { type DuckDBBundles, selectBundle, ConsoleLogger, AsyncDuckDB } from '@duckdb/duckdb-wasm';

export class DuckDbService {
  static MANUAL_BUNDLES: DuckDBBundles = {
    mvp: {
      mainModule: duckdb_wasm,
      mainWorker: mvp_worker,
    },
    eh: {
      mainModule: duckdb_wasm_eh,
      mainWorker: eh_worker,
    },
  };


  constructor() { }

  async init() {
    // Select a bundle based on browser checks
    const bundle = await selectBundle(DuckDbService.MANUAL_BUNDLES)

    // Instantiate the asynchronus version of DuckDB-wasm
    const worker = new Worker(bundle.mainWorker!);
    const logger = new ConsoleLogger();
    const duckDb = new AsyncDuckDB(logger, worker);
    await duckDb.instantiate(bundle.mainModule, bundle.pthreadWorker);

    return duckDb
  }
}
