-- AlterTable
ALTER TABLE "gas_contract_details" ALTER COLUMN "top_threshold_pct" SET DATA TYPE DECIMAL(10,6),
ALTER COLUMN "overtake_threshold_pct" SET DATA TYPE DECIMAL(10,6),
ALTER COLUMN "monthly_flex_pct" SET DATA TYPE DECIMAL(10,6),
ALTER COLUMN "monthly_cap_pct" SET DATA TYPE DECIMAL(10,6),
ALTER COLUMN "max_reduction_pct_year1_2" SET DATA TYPE DECIMAL(10,6),
ALTER COLUMN "max_reduction_pct_after" SET DATA TYPE DECIMAL(10,6),
ALTER COLUMN "price_escalation_pct" SET DATA TYPE DECIMAL(10,6);
