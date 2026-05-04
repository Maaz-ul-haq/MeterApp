import * as SQLite from "expo-sqlite";

const DB_NAME = "meter_readings.db";

let db = null;
let initPromise = null;

export const initDatabase = async () => {
  if (db) return db;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync(`PRAGMA journal_mode = WAL;`);
      await db.execAsync(`PRAGMA foreign_keys = ON;`);
      await createTables();
      console.log("Database ready");
      return db;
    } catch (error) {
      initPromise = null;
      db = null;
      console.error("Error initializing database:", error);
      throw error;
    }
  })();

  return initPromise;
};

const createTables = async () => {
  try {
    // await dropTables();
    await db.execAsync(`
      
      -- 🔹 Meters Table (Enroll Meter)
      CREATE TABLE IF NOT EXISTS meters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        meter_name TEXT NOT NULL,
        meter_number TEXT,
        location TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- 🔹 Meter Readings Table
      CREATE TABLE IF NOT EXISTS meter_readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        meter_id INTEGER NOT NULL,
        image_uri TEXT NOT NULL,
        meter_reading REAL NOT NULL,
        timestamp TEXT NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (meter_id) REFERENCES meters(id)
      );

      -- 🔹 Rates Table
        CREATE TABLE IF NOT EXISTS rates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        label TEXT NOT NULL,
        price_per_unit REAL NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

    `);
    console.log("Tables created successfully");
  } catch (error) {
    console.error("Error creating tables:", error);
    throw error;
  }
};

const dropTables = async () => {
  try {
    await db.execAsync(`DROP TABLE IF EXISTS meters;
      DROP TABLE IF EXISTS meter_readings
      DROP TABLE IF EXISTS rates`);
    console.log("Tables Drop successfully");
  } catch (error) {
    console.error("Error Droping tables:", error);
    throw error;
  }
};

export const getDatabase = () => {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
};

//#region   METERS — Insert / Read / Update / Delete

export const addMeter = async ({
  meter_name,
  meter_number = "",
  location = "",
  is_active = 1,
}) => {
  const database = getDatabase();
  const result = await database.runAsync(
    `INSERT INTO meters (meter_name, meter_number, location, is_active)
     VALUES (?, ?, ?, ?)`,
    [meter_name, meter_number, location, is_active],
  );
  return result.lastInsertRowId;
};

export const getMeters = async () => {
  const database = getDatabase();
  return database.getAllAsync("SELECT * FROM meters ORDER BY created_at DESC");
};

export const getMeterById = async (id) => {
  const database = getDatabase();
  return database.getFirstAsync("SELECT * FROM meters WHERE id = ?", [id]);
};

export const updateMeter = async (
  id,
  { meter_name, meter_number, location, is_active },
) => {
  const database = getDatabase();
  await database.runAsync(
    `UPDATE meters
     SET meter_name = ?, meter_number = ?, location = ?, is_active = ?
     WHERE id = ?`,
    [meter_name, meter_number, location, is_active, id],
  );
};

export const toggleMeterActive = async (id) => {
  console.log("Meter Id From toggle", id);
  const database = getDatabase();
  await database.runAsync(
    "UPDATE meters SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?",
    [id],
  );
};

export const deleteMeter = async (id) => {
  const database = getDatabase();
  // Delete child readings first to respect FK integrity
  await database.runAsync("DELETE FROM meter_readings WHERE meter_id = ?", [
    id,
  ]);
  await database.runAsync("DELETE FROM meters WHERE id = ?", [id]);
};
//#endregion

//#region  Meter Readings CRUD Operations
export const saveMeterReading = async (
  meter_id,
  imageUri,
  meterReading,
  timestamp,
  notes = "",
) => {
  try {
    const database = getDatabase();
    const result = await database.runAsync(
      "INSERT INTO meter_readings (meter_id, image_uri, meter_reading, timestamp, notes) VALUES (?, ?, ?, ?, ?)",
      [meter_id, imageUri, meterReading, timestamp, notes],
    );
    console.log("Meter reading saved:", result.lastInsertRowId);
    return result.lastInsertRowId;
  } catch (error) {
    console.error("Error saving meter reading:", error);
    throw error;
  }
};

export const getMeterReadings = async () => {
  try {
    const database = getDatabase();
    const allRows = await database.getAllAsync(
      "SELECT * FROM meter_readings ORDER BY created_at DESC",
    );
    return allRows;
  } catch (error) {
    console.error("Error fetching meter readings:", error);
    throw error;
  }
};

export const getMeterReadingsByMeterId = async (meter_id) => {
  try {
    const database = getDatabase();
    const readings = await database.getAllAsync(
      "SELECT * FROM meter_readings WHERE meter_id = ? ORDER BY created_at DESC",
      [meter_id],
    );
    return readings;
  } catch (error) {
    console.error("Error fetching meter readings for meter:", error);
    throw error;
  }
};

export const getLatestMeterReading = async (meter_id) => {
  try {
    const database = getDatabase();
    const reading = await database.getFirstAsync(
      "SELECT * FROM meter_readings WHERE meter_id = ? ORDER BY created_at DESC LIMIT 1",
      [meter_id],
    );
    return reading;
  } catch (error) {
    console.error("Error fetching latest meter reading:", error);
    throw error;
  }
};

export const deleteMeterReading = async (id) => {
  try {
    const database = getDatabase();
    await database.runAsync("DELETE FROM meter_readings WHERE id = ?", [id]);
    console.log("Meter reading deleted:", id);
  } catch (error) {
    console.error("Error deleting meter reading:", error);
    throw error;
  }
};

export const updateMeterReading = async (id, { meter_reading, notes }) => {
  try {
    const database = getDatabase();
    await database.runAsync(
      "UPDATE meter_readings SET meter_reading = ?, notes = ? WHERE id = ?",
      [meter_reading, notes, id],
    );
  } catch (error) {
    console.error("Error updating meter reading:", error);
    throw error;
  }
};

export const getMeterReadingById = async (id) => {
  try {
    const database = getDatabase();
    return await database.getFirstAsync(
      "SELECT * FROM meter_readings WHERE id = ?",
      [id],
    );
  } catch (error) {
    console.error("Error fetching meter reading:", error);
    throw error;
  }
};
//#endregion

//#region  Analytics & Statistics
export const getMeterStats = async (meter_id) => {
  try {
    const database = getDatabase();
    const stats = await database.getFirstAsync(
      `
      SELECT 
        COUNT(*) as total_readings,
        MAX(meter_reading) as max_reading,
        MIN(meter_reading) as min_reading,
        AVG(meter_reading) as avg_reading
      FROM meter_readings 
      WHERE meter_id = ?
    `,
      [meter_id],
    );
    return stats;
  } catch (error) {
    console.error("Error fetching meter stats:", error);
    throw error;
  }
};

export const getAllStats = async () => {
  try {
    const database = getDatabase();
    const stats = await database.getFirstAsync(`
      SELECT 
        COUNT(DISTINCT meter_id) as total_meters,
        COUNT(*) as total_readings,
        MAX(meter_reading) as max_reading
      FROM meter_readings
    `);
    return stats;
  } catch (error) {
    console.error("Error fetching all stats:", error);
    throw error;
  }
};

export const getUsageByMeter = async (meter_id) => {
  try {
    const database = getDatabase();
    const readings = await database.getAllAsync(
      `
      SELECT id, meter_reading, timestamp, created_at 
      FROM meter_readings 
      WHERE meter_id = ? 
      ORDER BY created_at ASC
    `,
      [meter_id],
    );

    if (!readings || readings.length < 2) {
      return null;
    }

    const latest = readings[readings.length - 1];
    const oldest = readings[0];
    const usage =
      parseFloat(latest.meter_reading) - parseFloat(oldest.meter_reading);

    return {
      start_reading: oldest.meter_reading,
      end_reading: latest.meter_reading,
      usage: usage.toFixed(2),
      days: Math.floor(
        (new Date(latest.created_at) - new Date(oldest.created_at)) /
          (1000 * 60 * 60 * 24),
      ),
    };
  } catch (error) {
    console.error("Error calculating usage:", error);
    throw error;
  }
};
//#endregion

//#region  RATES Management

export const addRate = async ({ label, price_per_unit }) => {
  try {
    const database = getDatabase();
    const result = await database.runAsync(
      "INSERT INTO rates (label, price_per_unit, is_active) VALUES (?, ?, ?)",
      [label, parseFloat(price_per_unit), 1],
    );
    return result.lastInsertRowId;
  } catch (error) {
    console.error("Error adding rate:", error);
    throw error;
  }
};

export const getRates = async () => {
  try {
    const database = getDatabase();
    return await database.getAllAsync(
      "SELECT id, label, price_per_unit, is_active, created_at FROM rates ORDER BY created_at DESC",
    );
  } catch (error) {
    console.error("Error fetching rates:", error);
    throw error;
  }
};

export const getRateById = async (id) => {
  try {
    const database = getDatabase();
    return await database.getFirstAsync("SELECT * FROM rates WHERE id = ?", [
      id,
    ]);
  } catch (error) {
    console.error("Error fetching rate:", error);
    throw error;
  }
};

export const updateRate = async (id, { label, price_per_unit, is_active }) => {
  try {
    const database = getDatabase();
    await database.runAsync(
      "UPDATE rates SET label = ?, price_per_unit = ?, is_active = ? WHERE id = ?",
      [label, parseFloat(price_per_unit), is_active, id],
    );
  } catch (error) {
    console.error("Error updating rate:", error);
    throw error;
  }
};

export const deleteRate = async (id) => {
  try {
    const database = getDatabase();
    await database.runAsync("DELETE FROM rates WHERE id = ?", [id]);
  } catch (error) {
    console.error("Error deleting rate:", error);
    throw error;
  }
};
//#endregion

//#region Joins
export const getMeterReadingsWithMeterDetails = async () => {
  try {
    const database = getDatabase();

    const allRows = await database.getAllAsync(`
      SELECT 
        mr.*,
        m.meter_name,
        m.meter_number
      FROM meter_readings mr
      LEFT JOIN meters m ON mr.meter_id = m.id
      ORDER BY mr.created_at DESC
    `);

    return allRows;
  } catch (error) {
    console.error("Error fetching meter readings:", error);
    throw error;
  }
};
//#endregion
