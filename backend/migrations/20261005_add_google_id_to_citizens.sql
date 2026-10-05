ALTER TABLE citizens
  ADD COLUMN google_id VARCHAR(255) NULL,
  ADD UNIQUE KEY uq_citizens_google_id (google_id);
