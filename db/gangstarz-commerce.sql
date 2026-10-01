CREATE TABLE IF NOT EXISTS commerce_checkouts (
 id uuid PRIMARY KEY REFERENCES orders(id),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 mode text NOT NULL CHECK(mode IN ('test','live')),
 idempotency_key text NOT NULL,
 request_hash text NOT NULL,
 capability_hash text NOT NULL,
 amount integer NOT NULL CHECK(amount >= 50),
 currency text NOT NULL CHECK(currency='usd'),
 state text NOT NULL DEFAULT 'awaiting_gateway' CHECK(state IN ('awaiting_gateway','pending','paid','failed','expired','refunded','partially_refunded')),
 payment_id uuid UNIQUE,
 checkout_url text,
 gateway_lease_until timestamptz,
 amount_refunded integer NOT NULL DEFAULT 0 CHECK(amount_refunded >= 0 AND amount_refunded <= amount),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,mode,idempotency_key)
);
CREATE TABLE IF NOT EXISTS commerce_reservations (
 id uuid PRIMARY KEY,
 checkout_id uuid NOT NULL REFERENCES commerce_checkouts(id),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 kind text NOT NULL CHECK(kind IN ('ticket','product')),
 resource_id uuid NOT NULL,
 product_id uuid,
 event_id uuid,
 quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 99),
 state text NOT NULL DEFAULT 'reserved' CHECK(state IN ('reserved','consumed','released')),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(checkout_id,kind,resource_id)
);
CREATE INDEX IF NOT EXISTS commerce_reserved_resource_idx ON commerce_reservations(tenant_id,kind,resource_id,state);
CREATE TABLE IF NOT EXISTS commerce_notifications (
 notification_id text PRIMARY KEY,
 checkout_id uuid NOT NULL REFERENCES commerce_checkouts(id),
 payment_id uuid NOT NULL,
 processed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS commerce_merchants (
 tenant_id uuid NOT NULL REFERENCES tenants(id),mode text NOT NULL CHECK(mode IN ('test','live')),
 credentials_ciphertext text NOT NULL,updated_by text NOT NULL,verified_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,mode)
);
CREATE TABLE IF NOT EXISTS commerce_returns (
 tenant_id uuid NOT NULL REFERENCES tenants(id),order_item_id uuid NOT NULL REFERENCES order_items(id),
 idempotency_key text NOT NULL,quantity integer NOT NULL CHECK(quantity>0),actor_id text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(tenant_id,idempotency_key)
);
CREATE TABLE IF NOT EXISTS commerce_refund_requests (
 tenant_id uuid NOT NULL REFERENCES tenants(id),checkout_id uuid NOT NULL REFERENCES commerce_checkouts(id),
 idempotency_key text NOT NULL,amount integer NOT NULL CHECK(amount>0),
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','confirmed')),provider_refund_id uuid,
 created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(tenant_id,checkout_id,idempotency_key)
);
