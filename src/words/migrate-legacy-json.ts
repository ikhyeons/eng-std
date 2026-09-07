import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';

const logger = new Logger('LegacyJsonMigration');

function asDateString(value: unknown): string {
  if (value instanceof Date) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(
      value,
    );
  }
  return String(value).slice(0, 10);
}

function asRows(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value as Record<string, unknown>[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? (parsed as Record<string, unknown>[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

async function tableNames(ds: DataSource): Promise<string[]> {
  const rows = (await ds.query('SHOW TABLES')) as Record<string, string>[];
  return rows.map((row) => String(Object.values(row)[0]));
}

async function columnNames(
  ds: DataSource,
  table: string,
): Promise<string[]> {
  const rows = (await ds.query(`SHOW COLUMNS FROM \`${table}\``)) as Array<{
    Field: string;
  }>;
  return rows.map((row) => row.Field);
}

async function ensureParentTable(ds: DataSource) {
  await ds.query(`
    CREATE TABLE IF NOT EXISTS daily_situations (
      id INT NOT NULL AUTO_INCREMENT,
      date DATE NOT NULL,
      title VARCHAR(200) NOT NULL,
      description TEXT NOT NULL,
      created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      PRIMARY KEY (id),
      UNIQUE KEY UQ_daily_situations_date (date)
    ) DEFAULT CHARSET=utf8mb4
  `);
}

async function ensureChildTables(ds: DataSource) {
  await ds.query(`
    CREATE TABLE IF NOT EXISTS daily_words (
      id INT NOT NULL AUTO_INCREMENT,
      situation_id INT NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      english VARCHAR(255) NOT NULL,
      korean VARCHAR(255) NOT NULL,
      category VARCHAR(20) NOT NULL,
      example TEXT NOT NULL,
      example_ko TEXT NOT NULL,
      PRIMARY KEY (id),
      INDEX IDX_daily_words_situation_id (situation_id)
    ) DEFAULT CHARSET=utf8mb4
  `);

  await ds.query(`
    CREATE TABLE IF NOT EXISTS daily_phrases (
      id INT NOT NULL AUTO_INCREMENT,
      situation_id INT NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      english TEXT NOT NULL,
      korean TEXT NOT NULL,
      example TEXT NOT NULL,
      example_ko TEXT NOT NULL,
      PRIMARY KEY (id),
      INDEX IDX_daily_phrases_situation_id (situation_id)
    ) DEFAULT CHARSET=utf8mb4
  `);
}

async function restoreParentsFromChildDates(ds: DataSource) {
  const tables = await tableNames(ds);
  const childTables = ['daily_words', 'daily_phrases'].filter((name) =>
    tables.includes(name),
  );

  for (const table of childTables) {
    const columns = await columnNames(ds, table);
    if (!columns.includes('situation_date')) continue;
    await ds.query(
      `INSERT IGNORE INTO daily_situations (date, title, description)
       SELECT DISTINCT child.situation_date, '복구된 상황', ''
       FROM \`${table}\` child
       LEFT JOIN daily_situations parent ON parent.date = child.situation_date
       WHERE parent.id IS NULL AND child.situation_date IS NOT NULL`,
    );
  }
}

export async function migrateLegacySituationJson(ds: DataSource) {
  const tables = await tableNames(ds);
  if (!tables.includes('daily_situations')) return;

  const columns = await columnNames(ds, 'daily_situations');
  const hasWordsJson = columns.includes('words');
  const hasPhrasesJson = columns.includes('phrases');
  if (!hasWordsJson && !hasPhrasesJson) return;

  logger.log('기존 JSON 컬럼을 daily_words / daily_phrases 테이블로 옮깁니다.');
  await ensureParentId(ds);
  await ensureChildTables(ds);

  const selectCols = ['id', 'date', 'title', 'description'];
  if (hasWordsJson) selectCols.push('words');
  if (hasPhrasesJson) selectCols.push('phrases');

  const rows = (await ds.query(
    `SELECT ${selectCols.join(', ')} FROM daily_situations`,
  )) as Array<Record<string, unknown>>;

  for (const row of rows) {
    const situationId = Number(row.id);
    if (!situationId) continue;

    const [{ count: wordCount }] = (await ds.query(
      'SELECT COUNT(*) AS count FROM daily_words WHERE situation_id = ?',
      [situationId],
    )) as Array<{ count: number | string }>;
    if (Number(wordCount) === 0 && hasWordsJson) {
      const words = asRows(row.words);
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        await ds.query(
          `INSERT INTO daily_words
            (situation_id, sort_order, english, korean, category, example, example_ko)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            situationId,
            i,
            asText(word.english) || asText(word.word),
            asText(word.korean) || asText(word.meaning),
            asText(word.category) || '명사',
            asText(word.example),
            asText(word.exampleKo) || asText(word.example_ko),
          ],
        );
      }
    }

    const [{ count: phraseCount }] = (await ds.query(
      'SELECT COUNT(*) AS count FROM daily_phrases WHERE situation_id = ?',
      [situationId],
    )) as Array<{ count: number | string }>;
    if (Number(phraseCount) === 0 && hasPhrasesJson) {
      const phrases = asRows(row.phrases);
      for (let i = 0; i < phrases.length; i++) {
        const phrase = phrases[i];
        await ds.query(
          `INSERT INTO daily_phrases
            (situation_id, sort_order, english, korean, example, example_ko)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            situationId,
            i,
            asText(phrase.english) || asText(phrase.phrase),
            asText(phrase.korean) || asText(phrase.meaning),
            asText(phrase.example),
            asText(phrase.exampleKo) || asText(phrase.example_ko),
          ],
        );
      }
    }
  }

  if (hasWordsJson) {
    await ds.query('ALTER TABLE daily_situations DROP COLUMN words');
  }
  if (hasPhrasesJson) {
    await ds.query('ALTER TABLE daily_situations DROP COLUMN phrases');
  }

  logger.log('JSON 컬럼 이전 및 삭제를 완료했습니다.');
}

async function dropForeignKeys(ds: DataSource, table: string) {
  const rows = (await ds.query(
    `SELECT CONSTRAINT_NAME AS name
     FROM information_schema.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
    [table],
  )) as Array<{ name: string }>;

  for (const row of rows) {
    await ds.query(
      `ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${row.name}\``,
    );
  }
}

async function hasForeignKey(
  ds: DataSource,
  table: string,
  column: string,
  refTable: string,
): Promise<boolean> {
  const rows = (await ds.query(
    `SELECT CONSTRAINT_NAME AS name
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
       AND REFERENCED_TABLE_NAME = ?`,
    [table, column, refTable],
  )) as Array<{ name: string }>;
  return rows.length > 0;
}

async function primaryKeyColumns(
  ds: DataSource,
  table: string,
): Promise<string[]> {
  const rows = (await ds.query(
    `SHOW KEYS FROM \`${table}\` WHERE Key_name = 'PRIMARY'`,
  )) as Array<{ Column_name: string }>;
  return rows.map((row) => row.Column_name);
}

async function ensureDateUnique(ds: DataSource) {
  const indexes = (await ds.query(
    'SHOW INDEX FROM daily_situations',
  )) as Array<{ Key_name: string; Column_name: string; Non_unique: number }>;
  const hasUniqueDate = indexes.some(
    (idx) => idx.Column_name === 'date' && Number(idx.Non_unique) === 0,
  );
  if (!hasUniqueDate) {
    await ds.query(
      'ALTER TABLE daily_situations ADD UNIQUE KEY UQ_daily_situations_date (`date`)',
    );
  }
}

async function ensureParentId(ds: DataSource) {
  const columns = await columnNames(ds, 'daily_situations');
  const pk = await primaryKeyColumns(ds, 'daily_situations');

  if (!columns.includes('id')) {
    await dropForeignKeys(ds, 'daily_words');
    await dropForeignKeys(ds, 'daily_phrases');
    if (pk.includes('date')) {
      await ds.query('ALTER TABLE daily_situations DROP PRIMARY KEY');
    }
    await ds.query(
      'ALTER TABLE daily_situations ADD COLUMN id INT NOT NULL AUTO_INCREMENT FIRST, ADD PRIMARY KEY (id)',
    );
    return;
  }

  if (!pk.includes('id')) {
    await dropForeignKeys(ds, 'daily_words');
    await dropForeignKeys(ds, 'daily_phrases');
    if (pk.length > 0) {
      await ds.query('ALTER TABLE daily_situations DROP PRIMARY KEY');
    }
    await ds.query(
      'ALTER TABLE daily_situations MODIFY COLUMN id INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (id)',
    );
  }
}

async function migrateChildToSituationId(ds: DataSource, table: string) {
  const tables = await tableNames(ds);
  if (!tables.includes(table)) return;

  const columns = await columnNames(ds, table);
  if (!columns.includes('situation_id')) {
    await ds.query(
      `ALTER TABLE \`${table}\` ADD COLUMN situation_id INT NULL`,
    );
  }

  const refreshed = await columnNames(ds, table);
  if (refreshed.includes('situation_date')) {
    await ds.query(
      `UPDATE \`${table}\` child
       INNER JOIN daily_situations parent ON parent.date = child.situation_date
       SET child.situation_id = parent.id
       WHERE child.situation_id IS NULL`,
    );
    await ds.query(`DELETE FROM \`${table}\` WHERE situation_id IS NULL`);
    await ds.query(
      `ALTER TABLE \`${table}\` DROP COLUMN situation_date`,
    );
  }

  await ds.query(
    `ALTER TABLE \`${table}\` MODIFY COLUMN situation_id INT NOT NULL`,
  );

  if (!(await hasForeignKey(ds, table, 'situation_id', 'daily_situations'))) {
    await ds.query(
      `ALTER TABLE \`${table}\`
       ADD CONSTRAINT \`FK_${table}_situation\`
       FOREIGN KEY (situation_id) REFERENCES daily_situations (id)
       ON DELETE CASCADE
       ON UPDATE CASCADE`,
    );
  }
}

/** 메인 상황(주) → 단어/구문(종) FK가 실제로 걸리도록 맞춘다. */
export async function ensureSituationMasterDetail(ds: DataSource) {
  logger.log('메인 상황 → 단어/구문 주종 관계를 맞춥니다.');
  await ensureParentTable(ds);
  await restoreParentsFromChildDates(ds);
  await ensureParentId(ds);
  await ensureDateUnique(ds);
  await migrateChildToSituationId(ds, 'daily_words');
  await migrateChildToSituationId(ds, 'daily_phrases');
  await ensureChildTables(ds);
  await migrateChildToSituationId(ds, 'daily_words');
  await migrateChildToSituationId(ds, 'daily_phrases');
  logger.log('주종 관계(situation_id FK, ON DELETE CASCADE)를 적용했습니다.');
}
