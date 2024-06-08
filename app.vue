<template>
  <UContainer>
    <UCard class="mt-0">
      <div class="flex justify-between items-center">
        <h1 class="text-primary-500 font-bold text-2xl">CSV to SQLite</h1>
        <ColorScheme><USelect v-model="$colorMode.preference" :options="['system', 'light', 'dark']" /></ColorScheme>
        </div>
        <template #footer>
          <ul>
            <li>💻 100% local</li>
            <li>🚫 No data sent to server</li>
            <li>👤 Private and anonymous</li>
            <li>👁️ No tracking</li>
          </ul>
      </template>
    </UCard>

    <div class="mt-20 flex justify-centers">
    <input v-if="!exportedUrl" type="file" accept=".csv" class="mx-auto px-6 py-4 rounded-md border-4 border-primary-500 text-primary-500" @input="handleFileInput" />
    <UButton
      v-else
      icon="i-heroicons-arrow-down-tray"
      size="xl"
      :to="exportedUrl"
      class="mx-auto"
      color="primary"
      variant="solid"
      prefecth
      label="Download your SQLite database"
      :trailing="false"
      download="export.sqlite"
    />
    </div>
    <div  class="overflow-auto mt-10">
      <!-- <h3 class="text-2xl font-black text-center mb-4 tracking-wide">Preview</h3> -->
      <UTable :rows="tableData" :loading="isLoading" />
    </div>

  </UContainer>
</template>


<script setup lang="ts">
import { csvToArray } from './lib/csvToArray';
import initSqlite from "sql.js";
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url'

const exportedUrl = ref<string>()
const tableData = ref<unknown[]>()
const isLoading = ref(false);

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
        const reader = new FileReader();

        reader.onload = (e) => {
            const content = e.target?.result as string;
          resolve(content);
          handleRawCsv(content);
        };

        reader.onerror = (e) => {
            console.error('Error reading file:', e);
            reject(e);
        };

        console.log('Starting to read file...');
    reader.readAsText(file);
            isLoading.value = true;

  }).finally(() => {
                  isLoading.value = false;

    });
}


async function handleRawCsv(csvData: string) {
  const [headers, ...rows] = csvToArray(csvData);
  const SQL = await initSqlite({
    locateFile() {
      return sqlWasmUrl
    },
  });

  const db = new SQL.Database();

  const columns = headers.map(header => `${toSnakeCase(header)} TEXT`).join(', ');
  const createTableSql = `CREATE TABLE IF NOT EXISTS ${MY_TABLE_NAME} (${columns})`;
  db.run(createTableSql)

  rows.forEach(row => {
    const values = row.map(v => `'${v}'`).join(", ")
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
}


function createDownloadLink(rawDatabase: Uint8Array) {
  const file = new Blob([rawDatabase], {type: "application/octet-stream"},);
  const url = URL.createObjectURL(file);
  exportedUrl.value = url;
}
</script>