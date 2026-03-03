-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATOR', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "UtilityType" AS ENUM ('GAS', 'POWER', 'WATER', 'DISTRICT_COOLING');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'TERMINATED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ContractAmendmentType" AS ENUM ('QUANTITY_CHANGE', 'PRICE_CHANGE', 'TERM_EXTENSION', 'TERMINATION', 'OTHER');

-- CreateEnum
CREATE TYPE "MeterType" AS ENUM ('GAS', 'POWER', 'WATER', 'COOLING', 'SUB_METER');

-- CreateEnum
CREATE TYPE "DataQualityFlag" AS ENUM ('GOOD', 'BAD', 'SUSPECT', 'ESTIMATED', 'MANUAL');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'DISPUTED', 'CANCELLED', 'VOID');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "WorkflowType" AS ENUM ('CONTRACT_APPROVAL', 'CONSUMPTION_PROFILE_UPDATE', 'BILLING_DISPUTE', 'SERVICE_ACTIVATION', 'SERVICE_DEACTIVATION', 'TARIFF_CHANGE_APPROVAL', 'INVOICE_APPROVAL');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'SENT_BACK', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WorkflowActionType" AS ENUM ('SUBMIT', 'APPROVE', 'REJECT', 'SEND_BACK', 'ESCALATE', 'CANCEL');

-- CreateEnum
CREATE TYPE "ServiceRequestType" AS ENUM ('ACTIVATION', 'DEACTIVATION', 'TECHNICAL_ISSUE', 'METER_VERIFICATION', 'OTHER');

-- CreateEnum
CREATE TYPE "ServiceRequestStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BILLING_ALERT', 'PAYMENT_DUE', 'CONSUMPTION_ANOMALY', 'CONTRACT_EXPIRY', 'WORKFLOW_ACTION_REQUIRED', 'SYSTEM_ALERT', 'OTP');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'IN_APP', 'PUSH');

-- CreateEnum
CREATE TYPE "TariffType" AS ENUM ('VOLUME_BASED', 'TIME_OF_USE', 'DYNAMIC', 'MULTI_TIER', 'DUAL_STRUCTURE');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'APPROVE', 'REJECT', 'EXPORT');

-- CreateEnum
CREATE TYPE "AdapterSyncStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'PARTIAL');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OPERATOR',
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "department" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "user_agent" TEXT,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_codes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "code" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "customer_code" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "trade_license_no" TEXT,
    "vat_registration_no" TEXT,
    "industry" TEXT,
    "address" JSONB,
    "crm_external_id" TEXT,
    "crm_sync_status" "AdapterSyncStatus" NOT NULL DEFAULT 'PENDING',
    "crm_synced_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_contacts" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_documents" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "contract_number" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "utility_type" "UtilityType" NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "site_address" TEXT,
    "site_coordinates" JSONB,
    "notes" TEXT,
    "regulatory_ref" TEXT,
    "regulatory_status" TEXT,
    "erp_customer_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_versions" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot_data" JSONB NOT NULL,
    "changed_fields" JSONB,
    "changed_by" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_amendments" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "amendment_type" "ContractAmendmentType" NOT NULL,
    "requested_by" TEXT NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_date" TIMESTAMP(3) NOT NULL,
    "notice_date_sent" TIMESTAMP(3),
    "changes" JSONB NOT NULL,
    "reason" TEXT,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),

    CONSTRAINT "contract_amendments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gas_contract_details" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "dcq" DECIMAL(18,6) NOT NULL,
    "acq" DECIMAL(18,6) NOT NULL,
    "top_threshold_pct" DECIMAL(8,6) NOT NULL DEFAULT 95.000000,
    "overtake_threshold_pct" DECIMAL(8,6) NOT NULL DEFAULT 105.000000,
    "base_price" DECIMAL(18,6) NOT NULL,
    "service_charge" DECIMAL(18,6) NOT NULL,
    "overtake_surcharge" DECIMAL(18,6) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "monthly_flex_pct" DECIMAL(8,6) NOT NULL DEFAULT 10.000000,
    "monthly_cap_pct" DECIMAL(8,6) NOT NULL DEFAULT 105.000000,
    "notice_required_days" INTEGER NOT NULL DEFAULT 140,
    "wash_up_enabled" BOOLEAN NOT NULL DEFAULT true,
    "wash_down_enabled" BOOLEAN NOT NULL DEFAULT true,
    "contract_year" INTEGER NOT NULL,
    "max_reduction_pct_year1_2" DECIMAL(8,6) NOT NULL DEFAULT 25.000000,
    "max_reduction_pct_after" DECIMAL(8,6) NOT NULL DEFAULT 15.000000,
    "price_escalation_pct" DECIMAL(8,6) NOT NULL DEFAULT 0.000000,
    "escalation_frequency" TEXT,

    CONSTRAINT "gas_contract_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nominated_quantities" (
    "id" TEXT NOT NULL,
    "gas_detail_id" TEXT NOT NULL,
    "period_year" INTEGER NOT NULL,
    "period_month" INTEGER NOT NULL,
    "nominated_qty" DECIMAL(18,6) NOT NULL,
    "original_dcq" DECIMAL(18,6) NOT NULL,
    "change_reason" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_by" TEXT NOT NULL,
    "notice_date_sent" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "approved_by" TEXT,

    CONSTRAINT "nominated_quantities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "top_shortfalls" (
    "id" TEXT NOT NULL,
    "gas_detail_id" TEXT NOT NULL,
    "period_year" INTEGER NOT NULL,
    "actual_qty" DECIMAL(18,6) NOT NULL,
    "acq_qty" DECIMAL(18,6) NOT NULL,
    "shortfall_qty" DECIMAL(18,6) NOT NULL,
    "shortfall_amt" DECIMAL(18,6) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "invoice_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "top_shortfalls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overtake_records" (
    "id" TEXT NOT NULL,
    "gas_detail_id" TEXT NOT NULL,
    "period_date" TIMESTAMP(3) NOT NULL,
    "dcq_qty" DECIMAL(18,6) NOT NULL,
    "actual_qty" DECIMAL(18,6) NOT NULL,
    "overtake_qty" DECIMAL(18,6) NOT NULL,
    "surcharge_amt" DECIMAL(18,6) NOT NULL,
    "invoice_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "overtake_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "year_end_reconciliations" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "period_year" INTEGER NOT NULL,
    "acq_qty" DECIMAL(18,6) NOT NULL,
    "actual_qty" DECIMAL(18,6) NOT NULL,
    "top_threshold_qty" DECIMAL(18,6) NOT NULL,
    "shortfall_qty" DECIMAL(18,6) NOT NULL,
    "wash_up_amt" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "wash_down_amt" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "net_payable_amt" DECIMAL(18,6) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "invoice_id" TEXT,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),

    CONSTRAINT "year_end_reconciliations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "power_contract_details" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "contracted_kw" DECIMAL(18,6) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "tou_enabled" BOOLEAN NOT NULL DEFAULT true,
    "peak_hours_start" TEXT,
    "peak_hours_end" TEXT,

    CONSTRAINT "power_contract_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "water_contract_details" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "contracted_m3" DECIMAL(18,6) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "tiered_rates" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "water_contract_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cooling_contract_details" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "contracted_rt" DECIMAL(18,6) NOT NULL,
    "contracted_ton_hours" DECIMAL(18,6) NOT NULL,
    "capacity_charge_per_rt" DECIMAL(18,6) NOT NULL,
    "consumption_charge_per_th" DECIMAL(18,6) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AED',

    CONSTRAINT "cooling_contract_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumption_profiles" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "period_year" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "monthly_forecasts" JSONB NOT NULL,
    "submitted_by" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,

    CONSTRAINT "consumption_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meters" (
    "id" TEXT NOT NULL,
    "meter_code" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "meter_type" "MeterType" NOT NULL,
    "serial_number" TEXT,
    "manufacturer" TEXT,
    "model" TEXT,
    "install_date" TIMESTAMP(3),
    "location" TEXT,
    "is_sub_meter" BOOLEAN NOT NULL DEFAULT false,
    "parent_meter_id" TEXT,
    "scada_node_id" TEXT,
    "modbus_register" INTEGER,
    "data_source" TEXT,
    "polling_interval" INTEGER DEFAULT 900,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meter_data_points" (
    "id" TEXT NOT NULL,
    "meter_id" TEXT NOT NULL,
    "period_start_utc" TIMESTAMP(3) NOT NULL,
    "period_end_utc" TIMESTAMP(3) NOT NULL,
    "raw_value" DECIMAL(18,6) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'MMBTU',
    "quality_flag" "DataQualityFlag" NOT NULL DEFAULT 'GOOD',
    "is_interpolated" BOOLEAN NOT NULL DEFAULT false,
    "is_manual" BOOLEAN NOT NULL DEFAULT false,
    "checksum" TEXT,
    "source_system" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meter_data_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meter_readings" (
    "id" TEXT NOT NULL,
    "meter_id" TEXT NOT NULL,
    "reading_date" TIMESTAMP(3) NOT NULL,
    "reading" DECIMAL(18,6) NOT NULL,
    "unit" TEXT NOT NULL,
    "read_by" TEXT NOT NULL,
    "notes" TEXT,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meter_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tariffs" (
    "id" TEXT NOT NULL,
    "utility_type" "UtilityType" NOT NULL,
    "tariff_type" "TariffType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_to" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tariffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tariff_rates" (
    "id" TEXT NOT NULL,
    "tariff_id" TEXT NOT NULL,
    "rate_key" TEXT NOT NULL,
    "rate" DECIMAL(18,6) NOT NULL,
    "unit" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "tariff_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tariff_tiers" (
    "id" TEXT NOT NULL,
    "tariff_id" TEXT NOT NULL,
    "tier_number" INTEGER NOT NULL,
    "from_qty" DECIMAL(18,6) NOT NULL,
    "to_qty" DECIMAL(18,6),
    "rate" DECIMAL(18,6) NOT NULL,
    "unit" TEXT NOT NULL,

    CONSTRAINT "tariff_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tou_periods" (
    "id" TEXT NOT NULL,
    "tariff_id" TEXT NOT NULL,
    "period_name" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "days_of_week" INTEGER[],
    "rate" DECIMAL(18,6) NOT NULL,
    "unit" TEXT NOT NULL,

    CONSTRAINT "tou_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_runs" (
    "id" TEXT NOT NULL,
    "run_code" TEXT NOT NULL,
    "period_from" TIMESTAMP(3) NOT NULL,
    "period_to" TIMESTAMP(3) NOT NULL,
    "utility_types" "UtilityType"[],
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "total_invoices" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "triggered_by" TEXT NOT NULL,
    "error_log" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "billing_run_id" TEXT,
    "utility_type" "UtilityType" NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "period_from" TIMESTAMP(3) NOT NULL,
    "period_to" TIMESTAMP(3) NOT NULL,
    "issue_date" TIMESTAMP(3),
    "due_date" TIMESTAMP(3),
    "subtotal" DECIMAL(18,6) NOT NULL,
    "vat_pct" DECIMAL(8,6) NOT NULL DEFAULT 5.000000,
    "vat_amount" DECIMAL(18,6) NOT NULL,
    "total_amount" DECIMAL(18,6) NOT NULL,
    "paid_amount" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "outstanding_amount" DECIMAL(18,6) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "is_prorated" BOOLEAN NOT NULL DEFAULT false,
    "is_rerating" BOOLEAN NOT NULL DEFAULT false,
    "pdf_url" TEXT,
    "erp_invoice_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_line_items" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "tariff_id" TEXT,
    "description" TEXT NOT NULL,
    "line_type" TEXT NOT NULL,
    "quantity" DECIMAL(18,6) NOT NULL,
    "unit" TEXT NOT NULL,
    "rate" DECIMAL(18,6) NOT NULL,
    "amount" DECIMAL(18,6) NOT NULL,
    "period_from" TIMESTAMP(3),
    "period_to" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "payment_ref" TEXT NOT NULL,
    "amount" DECIMAL(18,6) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "method" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "gateway_ref" TEXT,
    "gateway_response" JSONB,
    "paid_at" TIMESTAMP(3),
    "allocated_at" TIMESTAMP(3),
    "is_unapplied" BOOLEAN NOT NULL DEFAULT false,
    "erp_payment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_adjustments" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "adjusted_by" TEXT NOT NULL,
    "adjusted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(18,6) NOT NULL,
    "reason" TEXT NOT NULL,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),

    CONSTRAINT "billing_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_notes" (
    "id" TEXT NOT NULL,
    "credit_note_no" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "amount" DECIMAL(18,6) NOT NULL,
    "reason" TEXT NOT NULL,
    "issued_by" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_at" TIMESTAMP(3),

    CONSTRAINT "credit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_definitions" (
    "id" TEXT NOT NULL,
    "workflow_type" "WorkflowType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "max_levels" INTEGER NOT NULL DEFAULT 5,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL,

    CONSTRAINT "workflow_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_steps" (
    "id" TEXT NOT NULL,
    "workflow_definition_id" TEXT NOT NULL,
    "step_number" INTEGER NOT NULL,
    "step_name" TEXT NOT NULL,
    "required_role" "UserRole" NOT NULL,
    "is_final_step" BOOLEAN NOT NULL DEFAULT false,
    "timeout_hours" INTEGER,
    "notify_on_assign" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "workflow_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_instances" (
    "id" TEXT NOT NULL,
    "workflow_type" "WorkflowType" NOT NULL,
    "workflow_definition_id" TEXT NOT NULL,
    "contract_id" TEXT,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "current_step" INTEGER NOT NULL DEFAULT 1,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'PENDING',
    "submitted_by" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "notes" TEXT,
    "metadata" JSONB,

    CONSTRAINT "workflow_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_actions" (
    "id" TEXT NOT NULL,
    "workflow_instance_id" TEXT NOT NULL,
    "step_number" INTEGER NOT NULL,
    "action_type" "WorkflowActionType" NOT NULL,
    "acted_by" TEXT NOT NULL,
    "acted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comments" TEXT,
    "previous_status" "WorkflowStatus" NOT NULL,
    "new_status" "WorkflowStatus" NOT NULL,

    CONSTRAINT "workflow_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_requests" (
    "id" TEXT NOT NULL,
    "request_number" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "request_type" "ServiceRequestType" NOT NULL,
    "status" "ServiceRequestStatus" NOT NULL DEFAULT 'OPEN',
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "attachments" JSONB,
    "assigned_to" TEXT,
    "resolved_at" TIMESTAMP(3),
    "resolution_note" TEXT,
    "sla_deadline" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_disputes" (
    "id" TEXT NOT NULL,
    "dispute_number" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "raised_by" TEXT NOT NULL,
    "raised_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "disputed_amount" DECIMAL(18,6) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolved_by" TEXT,
    "resolved_at" TIMESTAMP(3),
    "resolution" TEXT,
    "credit_note_id" TEXT,

    CONSTRAINT "billing_disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" "AuditAction" NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "description" TEXT,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mock_scada_datapoints" (
    "id" TEXT NOT NULL,
    "node_id" TEXT NOT NULL,
    "system_name" TEXT NOT NULL,
    "value" DECIMAL(18,6) NOT NULL,
    "unit" TEXT NOT NULL,
    "quality" TEXT NOT NULL DEFAULT 'Good',
    "timestamp" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mock_scada_datapoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mock_bms_datapoints" (
    "id" TEXT NOT NULL,
    "register" INTEGER NOT NULL,
    "system_name" TEXT NOT NULL,
    "value" DECIMAL(18,6) NOT NULL,
    "unit" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mock_bms_datapoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_snapshots" (
    "id" TEXT NOT NULL,
    "report_type" TEXT NOT NULL,
    "parameters" JSONB NOT NULL,
    "generated_by" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" JSONB NOT NULL,
    "export_url" TEXT,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "report_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "otp_codes_email_idx" ON "otp_codes"("email");

-- CreateIndex
CREATE INDEX "otp_codes_phone_idx" ON "otp_codes"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "customers_user_id_key" ON "customers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_customer_code_key" ON "customers"("customer_code");

-- CreateIndex
CREATE INDEX "customers_customer_code_idx" ON "customers"("customer_code");

-- CreateIndex
CREATE INDEX "customers_crm_external_id_idx" ON "customers"("crm_external_id");

-- CreateIndex
CREATE INDEX "customers_deleted_at_idx" ON "customers"("deleted_at");

-- CreateIndex
CREATE INDEX "customer_contacts_customer_id_idx" ON "customer_contacts"("customer_id");

-- CreateIndex
CREATE INDEX "customer_documents_customer_id_idx" ON "customer_documents"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_contract_number_key" ON "contracts"("contract_number");

-- CreateIndex
CREATE INDEX "contracts_customer_id_idx" ON "contracts"("customer_id");

-- CreateIndex
CREATE INDEX "contracts_contract_number_idx" ON "contracts"("contract_number");

-- CreateIndex
CREATE INDEX "contracts_utility_type_idx" ON "contracts"("utility_type");

-- CreateIndex
CREATE INDEX "contracts_status_idx" ON "contracts"("status");

-- CreateIndex
CREATE INDEX "contracts_deleted_at_idx" ON "contracts"("deleted_at");

-- CreateIndex
CREATE INDEX "contract_versions_contract_id_idx" ON "contract_versions"("contract_id");

-- CreateIndex
CREATE UNIQUE INDEX "contract_versions_contract_id_version_key" ON "contract_versions"("contract_id", "version");

-- CreateIndex
CREATE INDEX "contract_amendments_contract_id_idx" ON "contract_amendments"("contract_id");

-- CreateIndex
CREATE UNIQUE INDEX "gas_contract_details_contract_id_key" ON "gas_contract_details"("contract_id");

-- CreateIndex
CREATE UNIQUE INDEX "nominated_quantities_gas_detail_id_period_year_period_month_key" ON "nominated_quantities"("gas_detail_id", "period_year", "period_month");

-- CreateIndex
CREATE INDEX "top_shortfalls_gas_detail_id_idx" ON "top_shortfalls"("gas_detail_id");

-- CreateIndex
CREATE INDEX "overtake_records_gas_detail_id_idx" ON "overtake_records"("gas_detail_id");

-- CreateIndex
CREATE UNIQUE INDEX "year_end_reconciliations_contract_id_period_year_key" ON "year_end_reconciliations"("contract_id", "period_year");

-- CreateIndex
CREATE UNIQUE INDEX "power_contract_details_contract_id_key" ON "power_contract_details"("contract_id");

-- CreateIndex
CREATE UNIQUE INDEX "water_contract_details_contract_id_key" ON "water_contract_details"("contract_id");

-- CreateIndex
CREATE UNIQUE INDEX "cooling_contract_details_contract_id_key" ON "cooling_contract_details"("contract_id");

-- CreateIndex
CREATE INDEX "consumption_profiles_contract_id_idx" ON "consumption_profiles"("contract_id");

-- CreateIndex
CREATE UNIQUE INDEX "meters_meter_code_key" ON "meters"("meter_code");

-- CreateIndex
CREATE INDEX "meters_contract_id_idx" ON "meters"("contract_id");

-- CreateIndex
CREATE INDEX "meters_meter_code_idx" ON "meters"("meter_code");

-- CreateIndex
CREATE INDEX "meter_data_points_meter_id_idx" ON "meter_data_points"("meter_id");

-- CreateIndex
CREATE INDEX "meter_data_points_period_end_utc_idx" ON "meter_data_points"("period_end_utc");

-- CreateIndex
CREATE INDEX "meter_data_points_quality_flag_idx" ON "meter_data_points"("quality_flag");

-- CreateIndex
CREATE UNIQUE INDEX "meter_data_points_meter_id_period_end_utc_checksum_key" ON "meter_data_points"("meter_id", "period_end_utc", "checksum");

-- CreateIndex
CREATE INDEX "meter_readings_meter_id_idx" ON "meter_readings"("meter_id");

-- CreateIndex
CREATE INDEX "tariffs_utility_type_idx" ON "tariffs"("utility_type");

-- CreateIndex
CREATE INDEX "tariffs_effective_from_effective_to_idx" ON "tariffs"("effective_from", "effective_to");

-- CreateIndex
CREATE INDEX "tariffs_deleted_at_idx" ON "tariffs"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "tariff_rates_tariff_id_rate_key_key" ON "tariff_rates"("tariff_id", "rate_key");

-- CreateIndex
CREATE UNIQUE INDEX "tariff_tiers_tariff_id_tier_number_key" ON "tariff_tiers"("tariff_id", "tier_number");

-- CreateIndex
CREATE UNIQUE INDEX "billing_runs_run_code_key" ON "billing_runs"("run_code");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "invoices_contract_id_idx" ON "invoices"("contract_id");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_due_date_idx" ON "invoices"("due_date");

-- CreateIndex
CREATE INDEX "invoices_deleted_at_idx" ON "invoices"("deleted_at");

-- CreateIndex
CREATE INDEX "invoice_line_items_invoice_id_idx" ON "invoice_line_items"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_payment_ref_key" ON "payments"("payment_ref");

-- CreateIndex
CREATE INDEX "payments_invoice_id_idx" ON "payments"("invoice_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "billing_adjustments_invoice_id_idx" ON "billing_adjustments"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "credit_notes_credit_note_no_key" ON "credit_notes"("credit_note_no");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_definitions_workflow_type_key" ON "workflow_definitions"("workflow_type");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_steps_workflow_definition_id_step_number_key" ON "workflow_steps"("workflow_definition_id", "step_number");

-- CreateIndex
CREATE INDEX "workflow_instances_entity_type_entity_id_idx" ON "workflow_instances"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "workflow_instances_status_idx" ON "workflow_instances"("status");

-- CreateIndex
CREATE INDEX "workflow_actions_workflow_instance_id_idx" ON "workflow_actions"("workflow_instance_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_requests_request_number_key" ON "service_requests"("request_number");

-- CreateIndex
CREATE INDEX "service_requests_customer_id_idx" ON "service_requests"("customer_id");

-- CreateIndex
CREATE INDEX "service_requests_status_idx" ON "service_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "billing_disputes_dispute_number_key" ON "billing_disputes"("dispute_number");

-- CreateIndex
CREATE INDEX "billing_disputes_invoice_id_idx" ON "billing_disputes"("invoice_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_is_read_idx" ON "notifications"("is_read");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "mock_scada_datapoints_node_id_idx" ON "mock_scada_datapoints"("node_id");

-- CreateIndex
CREATE INDEX "mock_scada_datapoints_timestamp_idx" ON "mock_scada_datapoints"("timestamp");

-- CreateIndex
CREATE INDEX "mock_bms_datapoints_register_idx" ON "mock_bms_datapoints"("register");

-- CreateIndex
CREATE INDEX "mock_bms_datapoints_timestamp_idx" ON "mock_bms_datapoints"("timestamp");

-- CreateIndex
CREATE INDEX "report_snapshots_report_type_idx" ON "report_snapshots"("report_type");

-- CreateIndex
CREATE INDEX "report_snapshots_generated_by_idx" ON "report_snapshots"("generated_by");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_codes" ADD CONSTRAINT "otp_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_contacts" ADD CONSTRAINT "customer_contacts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_documents" ADD CONSTRAINT "customer_documents_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_versions" ADD CONSTRAINT "contract_versions_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_amendments" ADD CONSTRAINT "contract_amendments_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gas_contract_details" ADD CONSTRAINT "gas_contract_details_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nominated_quantities" ADD CONSTRAINT "nominated_quantities_gas_detail_id_fkey" FOREIGN KEY ("gas_detail_id") REFERENCES "gas_contract_details"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "top_shortfalls" ADD CONSTRAINT "top_shortfalls_gas_detail_id_fkey" FOREIGN KEY ("gas_detail_id") REFERENCES "gas_contract_details"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtake_records" ADD CONSTRAINT "overtake_records_gas_detail_id_fkey" FOREIGN KEY ("gas_detail_id") REFERENCES "gas_contract_details"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "year_end_reconciliations" ADD CONSTRAINT "year_end_reconciliations_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "power_contract_details" ADD CONSTRAINT "power_contract_details_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_contract_details" ADD CONSTRAINT "water_contract_details_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cooling_contract_details" ADD CONSTRAINT "cooling_contract_details_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumption_profiles" ADD CONSTRAINT "consumption_profiles_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meters" ADD CONSTRAINT "meters_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meters" ADD CONSTRAINT "meters_parent_meter_id_fkey" FOREIGN KEY ("parent_meter_id") REFERENCES "meters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meter_data_points" ADD CONSTRAINT "meter_data_points_meter_id_fkey" FOREIGN KEY ("meter_id") REFERENCES "meters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_meter_id_fkey" FOREIGN KEY ("meter_id") REFERENCES "meters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tariff_rates" ADD CONSTRAINT "tariff_rates_tariff_id_fkey" FOREIGN KEY ("tariff_id") REFERENCES "tariffs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tariff_tiers" ADD CONSTRAINT "tariff_tiers_tariff_id_fkey" FOREIGN KEY ("tariff_id") REFERENCES "tariffs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tou_periods" ADD CONSTRAINT "tou_periods_tariff_id_fkey" FOREIGN KEY ("tariff_id") REFERENCES "tariffs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_billing_run_id_fkey" FOREIGN KEY ("billing_run_id") REFERENCES "billing_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_tariff_id_fkey" FOREIGN KEY ("tariff_id") REFERENCES "tariffs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_adjustments" ADD CONSTRAINT "billing_adjustments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_workflow_definition_id_fkey" FOREIGN KEY ("workflow_definition_id") REFERENCES "workflow_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_workflow_definition_id_fkey" FOREIGN KEY ("workflow_definition_id") REFERENCES "workflow_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_actions" ADD CONSTRAINT "workflow_actions_workflow_instance_id_fkey" FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_actions" ADD CONSTRAINT "workflow_actions_acted_by_fkey" FOREIGN KEY ("acted_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_disputes" ADD CONSTRAINT "billing_disputes_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
