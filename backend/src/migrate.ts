import fs from 'fs'
import path from 'path'
import { pool } from './db'

async function migrate() {
  const dir = path.join(__dirname, 'migrations')
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()
  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8')
    await pool.query(sql)
    console.log(`Ran: ${file}`)
  }
  await pool.end()
}

migrate().catch(err => { console.error(err); process.exit(1) })
