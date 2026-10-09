-- Members owns this shared table. Apply before deploying any consumer admission gates.
CREATE TABLE IF NOT EXISTS security_request_limits (
 service text NOT NULL,
 bucket text NOT NULL,
 count integer NOT NULL CHECK (count > 0),
 expires_at timestamptz NOT NULL,
 PRIMARY KEY (service,bucket)
);
CREATE INDEX IF NOT EXISTS security_request_limits_expiry_idx ON security_request_limits(expires_at);
-- Every admission removes up to 20 rows expired for at least one hour.
-- Optional scheduler maintenance: DELETE FROM security_request_limits WHERE expires_at < now();
