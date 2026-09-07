-- Add persistent rider availability/service area and stable public delivery reference codes.
CREATE TYPE "RiderAvailability" AS ENUM ('AVAILABLE', 'ASSIGNED', 'UNAVAILABLE');

ALTER TABLE "User"
  ADD COLUMN "availability" "RiderAvailability" NOT NULL DEFAULT 'AVAILABLE',
  ADD COLUMN "serviceArea" TEXT;

ALTER TABLE "Delivery"
  ADD COLUMN "referenceCode" TEXT;

-- Preserve the existing demo delivery under the approved operational reference.
UPDATE "Delivery"
SET "referenceCode" = 'RX-1048'
WHERE "referenceCode" IS NULL
  AND "itemDescription" = 'Demo delivery for Bob Rider';

-- Give any other legacy rows deterministic references without overwriting data.
WITH legacy AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS rn
  FROM "Delivery"
  WHERE "referenceCode" IS NULL
)
UPDATE "Delivery" d
SET "referenceCode" = 'LEGACY-' || legacy.rn::text
FROM legacy
WHERE d."id" = legacy."id";

ALTER TABLE "Delivery"
  ALTER COLUMN "referenceCode" SET NOT NULL;

CREATE UNIQUE INDEX "Delivery_referenceCode_key" ON "Delivery"("referenceCode");
