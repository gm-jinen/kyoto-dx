// server.js
const express = require('express');
const path = require('path');
const multer = require('multer');
const { BigQuery } = require('@google-cloud/bigquery');

const app = express();
const dist = path.join(__dirname, 'dist', 'gm-jinen', 'browser');

// ====== BigQuery 設定 ======
const bigquery = new BigQuery();
const DATASET_ID = process.env.BQ_DATASET || 'gmjinen';
const TABLE_ID = process.env.BQ_TABLE || 'csv_data';

// 選択可能なテーブルidのリスト
// 注意: 機密データを扱う場合、ここにテーブルIDを追加しないこと
// （APIで直接テーブル名を指定できるため、悪意あるユーザが任意のテーブルを参照できてしまう）
const ALLOWED_TABLES = [TABLE_ID, 'icu', 'icu_by_secondary_areas'];
const DEFAULT_LIMIT = 100000;
const MAX_LIMIT = 200000;

async function ensureBigQueryTable() {
  const [datasets] = await bigquery.getDatasets();
  const hasDataset = datasets.some(d => d.id === DATASET_ID);
  if (!hasDataset) {
    await bigquery.createDataset(DATASET_ID, { location: 'asia-northeast1' }).catch(() => {});
  }
  const dataset = bigquery.dataset(DATASET_ID);
  const [tables] = await dataset.getTables().catch(() => [[]]);
  const hasTable = tables?.some(t => t.id === TABLE_ID);
  if (!hasTable) {
    await dataset.createTable(TABLE_ID, {
      schema: {
        fields: [
          { name: 'row', type: 'STRING', mode: 'REQUIRED' },
        ],
      },
      timePartitioning: { type: 'DAY' },
    }).catch(() => {});
  }
}

// CSV 簡易パーサ（RFC完全準拠ではないが一般的なケースを想定）
function splitCsvLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === ',') {
        result.push(cur);
        cur = '';
      } else if (ch === '"') {
        inQuotes = true;
      } else {
        cur += ch;
      }
    }
  }
  result.push(cur);
  return result;
}

function parseCsv(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.length > 0);
  if (lines.length === 0) return { header: [], rows: [] };
  const header = splitCsvLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    if (cols.length === 1 && cols[0] === '') continue;
    const obj = {};
    for (let j = 0; j < header.length; j++) obj[header[j]] = cols[j] ?? '';
    rows.push(obj);
  }
  return { header, rows };
}

// ====== API ======
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    await ensureBigQueryTable();

    if (!req.file) return res.status(400).json({ error: 'file がありません' });
    const text = req.file.buffer.toString('utf8');
    const { rows } = parseCsv(text);

    // 全カラムをJSON文字列として保存（互換性重視）
    const prepared = rows.map(r => ({ row: JSON.stringify(r) }));

    if (prepared.length === 0) {
      return res.status(400).json({ error: '有効な行がありません' });
    }

    // 既存データをクリア（毎回上書きする運用）: TRUNCATEで安定化
    const dataset = bigquery.dataset(DATASET_ID);
    const table = dataset.table(TABLE_ID);
    const truncateQuery = `TRUNCATE TABLE \`${bigquery.projectId}.${DATASET_ID}.${TABLE_ID}\``;
    try {
      const [job] = await bigquery.createQueryJob({ query: truncateQuery, location: 'asia-northeast1' });
      await job.getQueryResults();
    } catch (_) {
      // テーブルが無い等は ensure で後続が対処するため無視
    }

    // 挿入（バッチ）: 部分失敗も集計
    const batchSize = 1000;
    let inserted = 0;
    const errors = [];
    for (let i = 0; i < prepared.length; i += batchSize) {
      const chunk = prepared.slice(i, i + batchSize);
      try {
        await table.insert(chunk);
        inserted += chunk.length;
      } catch (e) {
        // PartialFailureError の場合は e.errors に詳細あり
        if (Array.isArray(e?.errors)) {
          errors.push(...e.errors.map(err => ({ message: err.message, reason: err.reason, row: err.row }))); 
          // 挿入できた分を加算（エラーから成功件数を厳密に推定できないため、ここでは未加算）
        } else {
          errors.push({ message: String(e?.message ?? e), reason: 'unknown' });
        }
      }
    }

    return res.json({ inserted, total: prepared.length, errors });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'アップロード処理でエラーが発生しました' });
  }
});

app.get('/api/data', async (req, res) => {
  try {
    const tableId = req.query.tableId !== undefined ? String(req.query.tableId) : TABLE_ID;
    if (!ALLOWED_TABLES.includes(tableId)) {
      return res.status(400).json({ error: '無効なテーブルIDです' });
    }
    // limitが無効な値の場合は0件、未指定の場合はDEFAULT_LIMIT、MAX_LIMITを超える場合はMAX_LIMITに制限
    const rawLimit = parseInt(req.query.limit === undefined ? DEFAULT_LIMIT : req.query.limit, 10);
    const limit = Math.min(Math.max(0, isNaN(rawLimit) ? 0 : rawLimit), MAX_LIMIT);
    if (limit === 0) {
      return res.json({ rows: [] });
    }

    const dataset = bigquery.dataset(DATASET_ID);
    const table = dataset.table(tableId);
    const [exists] = await table.exists().catch(() => [false]);
    if (!exists) {
      return res.json({ rows: [] });
    }
    const query = `
      SELECT
        *
      FROM \`${bigquery.projectId}.${DATASET_ID}.${tableId}\`
      LIMIT ${limit}
    `;
    const [job] = await bigquery.createQueryJob({ query, location: 'asia-northeast1' });
    const [rows] = await job.getQueryResults();
    return res.json({ rows: rows });
  } catch (err) {
    console.error({
      message: err.message,
      code: err.code,
      errors: err.errors,
      stack: err.stack,
    });
    return res.status(500).json({ error: 'データ取得でエラーが発生しました' });
  }
});

// すべての元データ（各行のJSON）を返すエンドポイント
app.get('/api/rows', async (req, res) => {
  try {
    await ensureBigQueryTable();
    const dataset = bigquery.dataset(DATASET_ID);
    const table = dataset.table(TABLE_ID);
    const [exists] = await table.exists().catch(() => [false]);
    if (!exists) {
      return res.json({ rows: [] });
    }

    const limit = Math.max(0, Math.min(Number(req.query.limit ?? 0) || 0, 200000));
    const limitClause = limit > 0 ? `LIMIT ${limit}` : '';
    const query = `
      SELECT row
      FROM \`${bigquery.projectId}.${DATASET_ID}.${TABLE_ID}\`
      ${limitClause}
    `;
    const [job] = await bigquery.createQueryJob({ query, location: 'asia-northeast1' });
    const [rows] = await job.getQueryResults();
    // row は STRING。サーバ側でJSON.parseし、パース失敗はスキップ
    const parsed = [];
    for (const r of rows) {
      try {
        parsed.push(JSON.parse(r.row));
      } catch (_) {
        // skip invalid json
      }
    }
    return res.json({ rows: parsed });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: '元データ取得でエラーが発生しました' });
  }
});

// ====== 静的配信 ======
app.use(express.static(dist, { maxAge: '1y', immutable: true }));

// SPA Fallback (Express 5 対応): /api と拡張子付きを除外し、それ以外を index.html
app.get(/^(?!\/api)(?!.*\.).*$/, (req, res) => {
  res.set('Cache-Control', 'no-store, max-age=0');
  res.sendFile(path.join(dist, 'index.html'));
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`App listening on ${port}`));
