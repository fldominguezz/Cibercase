-- AlterTable
ALTER TABLE "event_raw" ADD COLUMN     "fortisiem_incident_id" TEXT,
ADD COLUMN     "fortisiem_rule_name" TEXT,
ADD COLUMN     "fortisiem_severity" TEXT,
ADD COLUMN     "fortisiem_src_ip" TEXT;
