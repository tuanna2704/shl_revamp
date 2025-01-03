-- CreateTable
CREATE TABLE "shlink" (
    "id" VARCHAR(43) NOT NULL,
    "passcode_failures_remaining" INTEGER NOT NULL DEFAULT 5,
    "config_passcode" TEXT,
    "config_exp" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "management_token" VARCHAR(43) NOT NULL,

    CONSTRAINT "shlink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shlink_file" (
    "id" SERIAL NOT NULL,
    "content_type" TEXT NOT NULL DEFAULT 'application/json',
    "content_hash" TEXT NOT NULL,
    "shlinkId" VARCHAR(43) NOT NULL,

    CONSTRAINT "shlink_file_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cas_item" (
    "hash" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "ref_count" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "shlink_endpoint" (
    "id" VARCHAR(43) NOT NULL,
    "endpoint_url" TEXT NOT NULL,
    "config_key" TEXT NOT NULL,
    "config_client_id" TEXT NOT NULL,
    "config_client_secret" TEXT,
    "config_token_endpoint" TEXT NOT NULL,
    "config_refresh_token" TEXT NOT NULL,
    "refresh_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "access_token_response" TEXT NOT NULL,
    "shlinkId" VARCHAR(43) NOT NULL,

    CONSTRAINT "shlink_endpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shlink_access" (
    "shlink" VARCHAR(43) NOT NULL,
    "recipient" TEXT NOT NULL,
    "access_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shlink_access_pkey" PRIMARY KEY ("shlink","recipient")
);

-- CreateIndex
CREATE UNIQUE INDEX "cas_item_hash_key" ON "cas_item"("hash");

-- AddForeignKey
ALTER TABLE "shlink_file" ADD CONSTRAINT "shlink_file_shlinkId_fkey" FOREIGN KEY ("shlinkId") REFERENCES "shlink"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shlink_file" ADD CONSTRAINT "shlink_file_content_hash_fkey" FOREIGN KEY ("content_hash") REFERENCES "cas_item"("hash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shlink_endpoint" ADD CONSTRAINT "shlink_endpoint_shlinkId_fkey" FOREIGN KEY ("shlinkId") REFERENCES "shlink"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shlink_access" ADD CONSTRAINT "shlink_access_shlink_fkey" FOREIGN KEY ("shlink") REFERENCES "shlink"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
