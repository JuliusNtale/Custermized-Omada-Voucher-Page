-- Remove the SMS feature: the captive portal auto-authenticates the client
-- after a verified payment and shows the voucher code on-screen, so there is
-- no "voucher ready" SMS. Safe: SmsMessage only ever held runtime data.

-- DropForeignKey
ALTER TABLE "SmsMessage" DROP CONSTRAINT IF EXISTS "SmsMessage_paymentId_fkey";

-- DropTable
DROP TABLE IF EXISTS "SmsMessage";

-- DropEnum
DROP TYPE IF EXISTS "SmsStatus";
