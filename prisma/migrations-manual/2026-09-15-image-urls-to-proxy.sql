-- Rewrites User.image values that point directly at S3 to use the new
-- /api/files/public/<key> proxy route instead, so storage can move from
-- AWS S3 to Cloudflare R2 with no further data changes.
--
-- Preview affected rows before running the UPDATE below:
-- SELECT count(*) FROM users WHERE image LIKE 'https://%' AND image LIKE '%.amazonaws.com/%';

UPDATE users
SET image = '/api/files/public/' || regexp_replace(image, '^.*/', '')
WHERE image LIKE 'https://%'
  AND image LIKE '%.amazonaws.com/%';
