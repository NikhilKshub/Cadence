// Cadence — SQLite database migrations
// Embeds the SQL schema directly into the binary using include_str! macro so it works in production

pub const SCHEMA_SQL: &str = include_str!("schema.sql");
