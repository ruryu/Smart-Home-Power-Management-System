CREATE TABLE IF NOT EXISTS home_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    power_limit INTEGER NOT NULL CHECK (power_limit > 0),
    indoor_temperature REAL NOT NULL,
    comfort_threshold REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS appliances (
    id INTEGER PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
    name TEXT NOT NUll,
    rated_power INTEGER NOT NULL CHECK (rated_power > 0),
    reduced_power INTEGER CHECK (reduced_power > 0 AND reduced_power < rated_power),
    adjustment TEXT NOT NULL CHECK (adjustment IN ('none', 'delay', 'reduce')),
    adjustment_order INTEGER UNIQUE,
    requested_on INTEGER NOT NULL DEFAULT 0 CHECK (requested_on IN (0, 1)),
    state TEXT NOT NULL DEFAULT 'off'
        CHECK (state IN ('off', 'on', 'delayed', 'reduced', 'faulted')),
    priority_order INTEGER UNIQUE CHECK (priority_order > 0),
    CHECK ((adjustment = 'none') = (adjustment_order IS NULL)),
    CHECK ((adjustment = 'reduce') = (reduced_power IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS decisions (
    id INTEGER PRIMARY KEY,
    created_at TEXT NOT NULL,
    rule TEXT NOT NULL CHECK (rule IN ('B1', 'B2', 'B3', 'B4', 'B5')),
    appliance_id INTEGER REFERENCES appliances(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    reason TEXT NOT NULL
);