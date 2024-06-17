<template>
  <UContainer>

    <Head>
      <title>CSV to SQLite</title>
      <meta value="description" content="Turn your CSV file into a database" />
    </Head>


    <UCard class="mt-0">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-primary-500 font-bold text-2xl">CSV to SQLite</h1>
          <h2 class="italic">Turn your CSV file into a database</h2>
        </div>
        <ColorScheme>
          <USelect v-model="$colorMode.preference" :options="['system', 'light', 'dark']" />
        </ColorScheme>
      </div>
      <template #footer>
        <ul>
          <li>💻 &nbsp;100% local</li>
          <li>🚫 &nbsp;No data sent to server</li>
          <li>👤 &nbsp;Private and anonymous</li>
          <li>👁️ &nbsp;No tracking</li>
        </ul>
      </template>
    </UCard>

    <div class="mt-20 flex justify-centers">
      <input v-if="!exportedUrl" type="file" accept=".csv"
        class="mx-auto px-6 py-4 rounded-md border-4 border-primary-500 text-primary-500" @input="handleFileInput" />
      <UButton v-else icon="i-heroicons-arrow-down-tray" size="xl" :to="exportedUrl" class="mx-auto" color="primary"
        variant="solid" prefecth label="Download your SQLite database" :trailing="false" download="export.sqlite" />
    </div>


    <div v-if="queryBuilderReady" class="flex mt-8">
      <UTextarea class="grow" v-model="directDbQuery">
      </UTextarea>
      <UButton @click="queryDb(directDbQuery)">Query database</UButton>
    </div>


    <div class="overflow-auto mt-10">
      <UTable :columns="tableHeaders" :rows="paginatedRows" :loading="isLoading" />
      <div v-if="tableData && tableData.length > currentPageSize"
        class="flex justify-end px-3 py-3.5 border-t border-gray-200 dark:border-gray-700">
        <UPagination v-model="currentPage" :page-count="currentPageSize" :total="tableData?.length ?? 0" />
      </div>
    </div>

  </UContainer>
</template>


<script setup lang="ts">
import initSqlite from "sql.js";
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import Papa from "papaparse"
import { useOffsetPagination } from '@vueuse/core'
import { DuckDbService } from "./lib/DuckDbService";
import type { AsyncDuckDBConnection } from "@duckdb/duckdb-wasm";

const exportedUrl = ref<string>()
const tableData = ref<unknown[]>()
const tableHeaders = ref<Array<{ key: string, label: string, sortable: true }>>([])
const isLoading = ref(false);
const paginatedRows = computed(() => {
  return tableData.value?.slice((currentPage.value - 1) * currentPageSize.value, (currentPage.value) * currentPageSize.value)
})

const MY_TABLE_NAME = "imported"

function toSnakeCase(str: string): string {
  return str
    .replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
    .replace(/^_/, '')
    .replace(/[^a-z0-9_]/g, '');
}

function handleFileInput(event: Event): Promise<string> {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) {
    console.error('No files were selected.');
    throw new Error('No files were selected.');
  }

  const file = input.files[0];
  console.log(`Selected file: ${file.name}`);

  return new Promise((resolve, reject) => {
    isLoading.value = true;

    Papa.parse(file, {
      worker: true,
      complete(results) {
        resolve(results)
        handleRawCsv(results.data)
      },
    });

  }).finally(() => {
    isLoading.value = false;
  });
}

function sanitizeValue(value: string): string {
  return value.replace(/'/g, "''");
}


const queryBuilderReady = ref(false);
const directDbQuery = ref(`SELECT * FROM ${MY_TABLE_NAME}`);
const queryUI = ref<AsyncDuckDBConnection>()

async function handleRawCsv(rawCsvData: unknown[][]) {
  const [headers, ...rows] = rawCsvData;
  tableHeaders.value = headers.map(key => ({ key, label: key, sortable: true }))
  const SQL = await initSqlite({
    locateFile() {
      return sqlWasmUrl
    },
  });


  const duckDBInit = new DuckDbService().init();
  const db = new SQL.Database();

  const columns = headers.map(header => `'${toSnakeCase(header)}' TEXT`).join(', ');
  const createTableSql = `CREATE TABLE IF NOT EXISTS ${MY_TABLE_NAME} (${columns})`;
  db.run(createTableSql)

  rows.forEach(row => {
    if (row.length < 2) {
      return;
    }

    const values = row.map(v => `'${sanitizeValue(v)}'`).join(", ")
    const placeholder = headers.map(h => `'${toSnakeCase(h)}'`).join(', ')
    const insertSql = `INSERT INTO ${MY_TABLE_NAME} (${placeholder}) VALUES (${values})`;

    db.run(insertSql)
  })

  const binaryArray = db.export();
  createDownloadLink(binaryArray);

  tableData.value = rows.map(row => {
    return row.reduce((acc, value, index) => {
      return {
        ...acc,
        [headers[index]]: value,
      }
    }, {})
  })

  duckDBInit.then(async duckDb => {
    const duckQuery = await duckDb.connect();
    await duckDb.registerFileText(`${MY_TABLE_NAME}.json`, JSON.stringify(tableData.value))
    await duckQuery.insertJSONFromPath(`${MY_TABLE_NAME}.json`, { name: MY_TABLE_NAME });
    queryBuilderReady.value = true;
    queryUI.value = duckQuery;
  })
}


async function queryDb(query: string) {
  const queryResult = await queryUI.value?.query(query)
  const result = queryResult.toArray().map((row) => row.toJSON());
  tableData.value = result;
}


function createDownloadLink(rawDatabase: Uint8Array) {
  const file = new Blob([rawDatabase], { type: "application/octet-stream" },);
  const url = URL.createObjectURL(file);
  exportedUrl.value = url;
}

const currentPage = ref(1);
const currentPageSize = ref(20);
</script>