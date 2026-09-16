-- Rewrites User.image values that point directly at S3 to use the new
-- /api/files/public/<key> proxy route instead, so storage can move from
-- AWS S3 to Cloudflare R2 with no further data changes.
--
-- Preview affected rows before running the UPDATE below:
-- SELECT count(*) FROM users WHERE image LIKE 'https://%' AND image LIKE '%.amazonaws.com/%';
--
-- Rows that will be skipped (image key doesn't match the expected upload key format):
-- SELECT id, image FROM users WHERE image LIKE '%.amazonaws.com/%' AND regexp_replace(image,'^.*/','') !~ '^[A-Za-z0-9_-]{1,64}\.(jpe?g|png)$';

BEGIN;

CREATE TABLE IF NOT EXISTS users_image_backup_20260915 AS
SELECT id, image FROM users WHERE image LIKE '%.amazonaws.com/%';

UPDATE users
SET image = '/api/files/public/' || regexp_replace(image, '^.*/', '')
WHERE image LIKE 'https://%'
  AND image LIKE '%.amazonaws.com/%'
  AND regexp_replace(image, '^.*/', '') ~ '^[A-Za-z0-9_-]{1,64}\.(jpe?g|png)$';

INSERT INTO user_uploads (key, user_id, created_at)
SELECT regexp_replace(image, '^.*/', ''), id, now()
FROM users
WHERE image LIKE '/api/files/public/%'
ON CONFLICT (key) DO NOTHING;

COMMIT;
