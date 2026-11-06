import type { Db } from './database.module.js';

// 第一次啟動時寫入資料
export function seedIfEmpty(db: Db) {
    const row = db.prepare('SELECT COUNT(*) AS count FROM home_state').get() as {
        count: number;
    };
    if (row.count === 0) {
        seedIfEmpty(db);
    }
}
 
// 清空資料庫後重新寫入資料
function resetDatabase(db: Db) {
    db.transaction(() => {
        db.exec(`
            DELETE FROM decisions;
            DELETE FROM appliances;
            DELETE FROM rooms;
            DELETE FROM home_state;
        `);
        seed(db);
    }) ();
}

// 固定的初始資料
function seed(db: Db) {
    db.transaction(() => {
        db.prepare(
            `INSERT INTO home_state (id, power_limit, indoor_temperature, comfort_threshold)
            VALUES (1, 5000, 26, 28)`,    
        ).run();

        const insertRoom = db.prepare(`INSERT INTO rooms (id, name) VALUES (?, ?)`);
        [
            [1, 'Living Room A'],
            [2, 'Living Room B'],
            [3, 'Bedroom A'],
            [4, 'Bedroom B'],
            [5, 'Kitchen'],
            [6, 'Bathroom'],
        ].forEach(([id, name]) => insertRoom.run(id, name));

        const insertAppliance = db.prepare(`
            INSERT INTO appliances (
            id, room_id, name, rated_power, reduced_power,
            adjustment, adjustment_order, requested_on, state
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        [
          [1, 5, 'Refrigerator', 200, null, 'none', null, 1, 'running'],
          [2, 1, 'Lights', 100, null, 'none', null, 1, 'running'],
          [3, 1, 'Air Conditioner', 1300, 800, 'reduce', 4, 1, 'running'],
          [4, 6, 'Water Heater', 3000, null, 'delay', 3, 0, 'off'],
          [5, 5, 'Oven', 2000, null, 'delay', 2, 0, 'off'],
          [6, 6, 'Washing Machine', 500, null, 'delay', 1, 0, 'off'],
        ].forEach((values) => insertAppliance.run(...values));
    }) ();
}

