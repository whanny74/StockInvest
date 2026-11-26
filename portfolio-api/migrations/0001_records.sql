CREATE TABLE people (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    name_key TEXT NOT NULL UNIQUE
);

CREATE TABLE records (
    id TEXT PRIMARY KEY NOT NULL,
    person_id TEXT NOT NULL REFERENCES people(id),
    record_date TEXT NOT NULL,
    week INTEGER NOT NULL CHECK (week BETWEEN 1 AND 8),
    cash INTEGER NOT NULL CHECK (cash >= 0),
    holdings TEXT NOT NULL CHECK (json_valid(holdings)),
    note TEXT NOT NULL,
    revision INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL
);

CREATE INDEX records_by_person_date ON records (person_id, record_date DESC, updated_at DESC);
