-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "InstallerTier" AS ENUM ('COMMERCIAL', 'DOMESTIC', 'BOTH', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "InstallerSource" AS ENUM ('GOOGLE_PLACES', 'FACEBOOK_LEAD', 'MANUAL');

-- CreateEnum
CREATE TYPE "InstallerStatus" AS ENUM ('NEW', 'INVITED', 'REGISTERED', 'ATTENDED', 'FIRST_ORDER', 'NOT_INTERESTED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('INVITED', 'REGISTERED', 'ATTENDED', 'DECLINED');

-- CreateEnum
CREATE TYPE "EnrichmentStatus" AS ENUM ('NONE', 'PENDING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firebaseUid" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Installer" (
    "id" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'TT',
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "website" TEXT,
    "facebookUrl" TEXT,
    "address" TEXT,
    "area" TEXT,
    "tier" "InstallerTier" NOT NULL DEFAULT 'UNKNOWN',
    "brands" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source" "InstallerSource" NOT NULL DEFAULT 'MANUAL',
    "googlePlaceId" TEXT,
    "fbLeadId" TEXT,
    "status" "InstallerStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "optOut" BOOLEAN NOT NULL DEFAULT false,
    "registeredBusiness" BOOLEAN NOT NULL DEFAULT false,
    "businessRegNo" TEXT,
    "dahuaPartner" BOOLEAN NOT NULL DEFAULT false,
    "enrichmentStatus" "EnrichmentStatus" NOT NULL DEFAULT 'NONE',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "serverUpdatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Installer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingSession" (
    "id" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'TT',
    "title" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "serverUpdatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TrainingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "installerId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'INVITED',
    "checkInCode" TEXT NOT NULL,
    "invitedAt" TIMESTAMP(3),
    "registeredAt" TIMESTAMP(3),
    "attendedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "serverUpdatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "serverUpdatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoSend" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "installerId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "serverUpdatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PromoSend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Distributor" (
    "id" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "serverUpdatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Distributor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_firebaseUid_key" ON "User"("firebaseUid");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Installer_googlePlaceId_key" ON "Installer"("googlePlaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Installer_fbLeadId_key" ON "Installer"("fbLeadId");

-- CreateIndex
CREATE INDEX "Installer_serverUpdatedAt_idx" ON "Installer"("serverUpdatedAt");

-- CreateIndex
CREATE INDEX "Installer_country_idx" ON "Installer"("country");

-- CreateIndex
CREATE INDEX "Installer_phone_idx" ON "Installer"("phone");

-- CreateIndex
CREATE INDEX "Installer_status_idx" ON "Installer"("status");

-- CreateIndex
CREATE INDEX "TrainingSession_serverUpdatedAt_idx" ON "TrainingSession"("serverUpdatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_checkInCode_key" ON "Invitation"("checkInCode");

-- CreateIndex
CREATE INDEX "Invitation_serverUpdatedAt_idx" ON "Invitation"("serverUpdatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_installerId_sessionId_key" ON "Invitation"("installerId", "sessionId");

-- CreateIndex
CREATE INDEX "Promotion_serverUpdatedAt_idx" ON "Promotion"("serverUpdatedAt");

-- CreateIndex
CREATE INDEX "Promotion_country_idx" ON "Promotion"("country");

-- CreateIndex
CREATE INDEX "PromoSend_serverUpdatedAt_idx" ON "PromoSend"("serverUpdatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PromoSend_promotionId_installerId_key" ON "PromoSend"("promotionId", "installerId");

-- CreateIndex
CREATE INDEX "Distributor_serverUpdatedAt_idx" ON "Distributor"("serverUpdatedAt");

-- CreateIndex
CREATE INDEX "Distributor_country_idx" ON "Distributor"("country");

-- AddForeignKey
ALTER TABLE "Installer" ADD CONSTRAINT "Installer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_installerId_fkey" FOREIGN KEY ("installerId") REFERENCES "Installer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrainingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoSend" ADD CONSTRAINT "PromoSend_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoSend" ADD CONSTRAINT "PromoSend_installerId_fkey" FOREIGN KEY ("installerId") REFERENCES "Installer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
