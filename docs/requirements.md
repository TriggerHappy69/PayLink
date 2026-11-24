# PAYLINK BILL-PAYMENT & DIGITAL WALLET BACKEND
**Phase 1 Deliverable**

## 1. Problem Summary

PayLink is an electronic bill-payment and digital wallet backend platform operating in Egypt (comparable to Fawry or Vodafone Cash). It enables end customers (via a mobile application) and retail agents (via point-of-sale terminals) to inquire about and pay utility bills-covering electricity, water, mobile top-up, and internet services-directly from a digital wallet funded in Egyptian Pounds (EGP).

The core engineering challenge lies in guaranteeing strict financial accuracy and system resilience under high concurrency and unreliable external networks. Rather than mutating account balances directly, every monetary movement must be recorded as an immutable ledger entry using exact decimal types, separating available funds from held funds during payment execution. Furthermore, the architecture must seamlessly integrate with heterogeneous utility billers (synchronous REST/JSON, legacy SOAP XML, asynchronous callbacks, and daily batch CSV files) while isolating external protocol upgrades (such as ElectroCo API v2), preventing duplicate charges via idempotency keys, enforcing fraud and velocity limits, and reconciling transactions nightly against biller settlement files.

## 2. Stakeholders & Their Concerns

| Stakeholder | Role / Description |
| :--- | :--- |
| Customers | End users paying personal utility bills via the PayLink mobile application. |
| Agents | Small shop owners operating PayLink terminals to pay bills on behalf of walk-in customers. |
| Billers (Utility Companies) | External service providers (ElectroCo, AquaCo, TopUpNet, NetCo) issuing bills and receiving funds. |
| Customer Support Employees | Internal staff handling customer inquiries, disputes, and account security actions. |
| System Administrators | Internal operations and business managers configuring platform rules and monitoring revenue. |
| Management & Regulators | PayLink executive leadership and Egyptian financial regulatory authorities. |

## 3. Functional Requirements (28 User Stories Across 8 Modules)

All functional requirements from Section 3.2 are organized into all 8 system modules defined in Section 3.1 (6 core modules + 2 extra modules), prioritized using MOSCOW (Must, Should, Could), and specified with verifiable BDD acceptance criteria (Given / When / Then).

### 3.1 Module 1: Accounts and Wallet

**US-01 (FR-1) Customer Registration [MUST]**
User Story: As a new customer, I want to register an account so that I can obtain a digital wallet with a basic verification level.
Given an unregistered user provides valid registration details (phone number, full name, national ID),
When they submit the registration request,
Then the system creates a customer profile with verification level BASIC, initializes an EGP wallet with 0.00 available balance and 0.00 held balance, and records an audit log entry.

**US-02 (FR-2) Verification Level Upgrade [SHOULD]**
User Story: As a customer, I want my account verification level upgraded to VERIFIED so that my daily payment limit increases.
Given a customer currently holds a BASIC verification level (5,000.00 EGP daily limit),
When their identity verification is approved and upgraded to VERIFIED,
Then their account status updates to VERIFIED, their daily payment limit increases to 30,000.00 EGP, and an audit entry is logged.

**US-03 (FR-3) View Wallet Balance & Transaction History [MUST]**
User Story: As a customer, I want to view my available balance, held balance, and transaction history so that I can track my funds.
Given a customer has completed top-ups and bill payments (including pending Unknown payments),
When they request their wallet summary,
Then the system returns the exact available_balance and held_balance computed from the ledger along with a chronological list of transactions.

**US-04 (FR-4) Wallet Top-Up [MUST]**
User Story: As a customer, I want to top up my wallet via simulated card or agent cash so that I have funds to pay bills.
Given an active customer account exists,
When a valid top-up of 500.00 EGP is confirmed via simulated card or agent cash,
Then a credit ledger entry of +500.00 EGP is appended, the available balance increases by 500.00 EGP, and an audit log is written.

**US-05 (FR-5) Immutable Ledger-Based Balance Calculation [MUST]**
User Story: As the system, I must record every balance movement as an immutable ledger entry so that balances are derived accurately without overwriting values.
Given any money movement occurs (top-up, hold, capture/charge, release/refund, fee, or commission),
When the transaction is persisted,
Then an immutable exact-decimal ledger entry is created, the wallet balance equals the exact algebraic sum of its ledger entries, and direct balance overwrites are prohibited.

### 3.2 Module 2: Biller Catalog

**US-06 (FR-6) Admin Management of Billers and Services [MUST]**
User Story: As an admin, I want to add, edit, and disable billers and services so that I can control which utilities are available to users.
Given an authenticated admin user is logged in,
When the admin disables an active biller (e.g., AquaCo) or adds a new service configuration,
Then the catalog updates immediately, subsequent payment attempts to a disabled biller are rejected, and an admin audit log is recorded.

**US-07 (FR-7) View Active Billers & Required Input Fields [MUST]**
User Story: As a customer, I want to view the list of active billers and their required input fields so that I know what information to enter.
Given multiple billers exist in the catalog (some active, some disabled),
When a customer queries the biller catalog,
Then only active billers are returned alongside their required input schema (e.g., meter_number for ElectroCo, phone_number for TopUpNet) and min/max payment limits (5.00 EGP to 10,000.00 EGP).

**US-08 (FR-24) - Dynamic Configuration of Fees and Limits [SHOULD]**
User Story: As an admin, I want to edit service fee rules, daily limits, and promotional periods without redeploying the application.
Given fee rules, limits, and promotion dates are stored in externalized configuration/database tables,
When an admin updates the promotion window for ElectroCo to active today,
Then subsequent bill inquiries and payments calculate a 0.00 EGP service fee immediately without restarting the service, and an audit log is saved.

### 3.3 Module 3: Payment Processing

**US-09 (FR-8) Bill Inquiry with Fee Breakdown [MUST]**
User Story: As a customer, I want to run a bill inquiry before paying so that I can see the bill amount, service fee, and total cost.
Given Sara enters a valid meter number for ElectroCo with an unpaid bill of 350.00 EGP,
When she submits a bill inquiry,
Then the system queries ElectroCo, invokes the Fees module to obtain the 2.50 EGP fixed electricity fee, and displays: Bill Amount = 350.00 EGP, Fee = 2.50 EGP, Total = 352.50 EGP.

**US-10 (FR-9) - Pay Bill from Digital Wallet [MUST]**
User Story: As a customer, I want to pay a utility bill from my wallet balance so that my bill is settled electronically.
Given a customer has 500.00 EGP available balance, passes fraud checks, and initiates a 352.50 EGP total payment to ElectroCo,
When ElectroCo responds with immediate confirmation,
Then the payment transitions to Completed, 352.50 EGP is permanently deducted (leaving 147.50 EGP available and 0.00 EGP held), PayLink credits 2.50 EGP fee income, and notifications are triggered.

**US-11 (FR-10) - Idempotent Payment Requests [MUST]**
User Story: As a mobile app client, I want repeated payment requests carrying the same idempotency key to return the original result so that network retries never double-charge the customer.
Given a payment request with Idempotency-Key: key-123 has already been processed (or is currently in progress),
When a second identical request arrives with Idempotency-Key: key-123,
Then the system does not create a new payment or place a second hold, and returns the exact state and response of the original payment.

**US-12 (FR-11) Strict Payment State Machine Enforcement [MUST]**
User Story: As the system, I must enforce the exact payment lifecycle state transitions so that no payment enters an invalid state or prematurely refunds an uncertain payment.
Given a payment is in state Unknown (awaiting biller confirmation),
When an attempt is made to transition it directly to Refunded (bypassing Failed),
Then the state machine rejects the transition, keeping the funds held until explicit refusal or reconciliation confirms Failed.

**US-13 (FR-12) Fund Hold Before Biller Call & Release on Failure [MUST]**
User Story: As the system, I must reserve funds in a held balance before contacting the external biller and release them if the biller refuses so that money is never lost or overspent.
Given a customer has 400.00 EGP available and initiates a 352.50 EGP payment to AquaCo,
When fraud checks pass (moving 352.50 EGP to held_balance, leaving 47.50 EGP available) and AquaCo subsequently refuses the payment with an error code,
Then the payment transitions SentToBiller -> Failed -> Refunded, releasing 352.50 EGP back to available_balance (400.00 EGP available, 0.00 EGP held).

### 3.4 Module 4: Biller Integration

**US-14 (FR-15) Multi-Protocol Biller Adapters [MUST]**
User Story: As the system, I must integrate with ElectroCo (REST/JSON), AquaCo (SOAP XML), and TopUpNet (Async REST) through isolated adapters so that core payment logic remains protocol-agnostic.
Given a payment request is routed to AquaCo (SOAP XML) or ElectroCo (REST/JSON),
When the payment processor invokes the unified biller interface,
Then the respective adapter translates the internal domain request into the biller's exact wire format, handles biller-specific error codes, and maps the response back to a unified domain result.

**US-15 (FR-13) Biller Timeout Handling & Scheduled Re-Queries [MUST]**
User Story: As the system, I must transition timed-out live biller requests to Unknown and re-query them automatically so that delayed payments are resolved without duplicate charges.
Given a payment is sent to ElectroCo (SentToBiller) and no response is received within 10 seconds,
When the timeout expires,
Then the payment transitions to Unknown, funds remain held, the customer is notified that the payment is processing, and the system schedules up to 3 status re-queries at 1 minute, 5 minutes, and 15 minutes before deferring to nightly reconciliation.

**US-16 (FR-14) - Asynchronous Biller Callback & Duplicate Filtering [MUST]**
User Story: As the system, I must process asynchronous callbacks from TopUpNet and ignore duplicate notifications so that async payments complete exactly once.
Given a TopUpNet payment is in SentToBiller (or Unknown) after an initial 'accepted' response,
When TopUpNet invokes the callback URL with 'success' for the first time, and later sends a duplicate 'success' callback for the same reference,
Then the first callback transitions the payment to Completed and captures the held funds; the duplicate callback is logged and ignored without double-charging.

### 3.5 Module 5: Fees and Commissions

**US-17 (FR-16) Multi-Rule Service Fee Calculation & Promotions [MUST]**
User Story: As the system, I must calculate service fees according to biller category rules and active promotions so that customers are billed accurately.
Given no active promotion applies to the selected biller,
When calculating fees for: (a) Electricity/Water = 350.00 EGP, (b) Mobile top-up = 50.00 EGP, (c) Mobile top-up = 200.00 EGP, (d) Internet = 200.00 EGP, (e) Internet = 201.00 EGP,
Then the fees computed are: (a) 2.50 EGP (fixed), (b) 1.00 EGP (1.5% is 0.75, enforced minimum 1.00 EGP), (c) 3.00 EGP (1.5%), (d) 2.00 EGP (tier <= 200), and (e) 4.00 EGP (tier > 200). During an active promotion period for that biller, the fee is 0.00 EGP.

**US-18 (FR-17) - Agent-Assisted Payment & Commission Crediting [SHOULD]**
User Story: As an agent, I want to pay a bill on behalf of a customer using my agent wallet so that I earn a 40% commission on the service fee.
Given an agent initiates an electricity payment with a 2.50 EGP service fee,
When the payment reaches the Completed state,
Then 40% of the service fee (1.00 EGP) is calculated by the Fees & Commissions module, credited via a ledger entry to the agent's wallet, and recorded in the audit log.

### 3.6 Module 6: Notifications

**US-19 (FR-22) - Payment Completion & Failure Notifications [MUST]**
User Story: As a customer, I want to receive an SMS and push notification when my payment completes or fails so that I have immediate confirmation.
Given a payment transitions to Completed or Failed,
When the state change event is emitted,
Then the notification module dispatches both an SMS and a push notification containing the payment reference, amount, biller name, and outcome (or failure reason).

**US-20 (FR-23) Notification Retry & Dead-Letter Marking [SHOULD]**
User Story: As the system, I must retry failed SMS/email deliveries up to 3 times without rolling back the payment so that transient provider outages do not disrupt financial transactions.
Given a payment has reached Completed and the external SMS provider returns an error,
When the notification service attempts delivery,
Then the payment remains Completed, and the notification is retried up to 3 times before being marked UNDELIVERED in the notification log.

### 3.7 Module 7: Fraud Checks (Extra)

**US-21 (FR-18) - Single-Transaction and Daily Limit Enforcement [MUST]**
User Story: As the system, I must reject payments that violate single-transaction bounds or daily account limits so that regulatory and risk thresholds are enforced.
Given a BASIC customer (daily limit 5,000.00 EGP) has already paid 4,800.00 EGP today,
When they attempt a payment of 4.00 EGP (below 5.00 EGP minimum), 10,500.00 EGP (above 10,000.00 EGP single max), or 300.00 EGP (exceeds remaining 200.00 EGP daily limit),
Then the fraud check chain immediately rejects the payment (Initiated -> Rejected) with a descriptive error reason, and no funds are held.

**US-22 (FR-19) - Velocity Rule & Temporary Account Lock [SHOULD]**
User Story: As the system, I must block accounts that exceed 5 payment attempts within 60 seconds for 10 minutes so that automated fraud or looping bugs are halted.
Given an account has initiated 5 payments within the last 60 seconds,
When a 6th payment attempt arrives within that same 60-second window,
Then the payment is Rejected, the account is automatically blocked for 10 minutes, and an audit entry is recorded.

**US-23 (FR-21) - Support Employee Account Block & Unblock [SHOULD]**
User Story: As a support employee, I want to manually block and unblock customer or agent accounts so that I can respond to fraud alerts or resolve lockouts.
Given an authenticated support employee selects an account and provides a reason,
When they execute a BLOCK action,
Then the account status becomes BLOCKED, any new payment attempts fail the fraud check (Rejected), and the support employee's ID, timestamp, and reason are recorded in the audit log.

### 3.8 Module 8: Reconciliation, Support & Audit (Extra)

**US-24 (FR-20) Search Payment by Reference & View Full History [MUST]**
User Story: As a support employee, I want to search any payment by its unique reference and view its full lifecycle history so that I can investigate customer issues.
Given a payment reference PAY-2026-9981 exists in the system,
When a support employee queries by that reference,
Then the system returns the payment details, current state, timestamps of every state transition, ledger entries, biller responses, and notification delivery statuses.

**US-25 (FR-25) - Immutable Audit Logging [MUST]**
User Story: As a compliance auditor, I want every money movement and administrative/support action written to an audit log so that all system changes are traceable.
Given any ledger entry is created or any admin/support action occurs (biller edit, limit change, account block, refund approval),
When the operation completes,
Then an immutable audit record is persisted containing actor_id (who), timestamp (when), action_type, entity_id, and reason/diff (why).

**US-26 (FR-26) - Nightly Settlement Reconciliation Report [SHOULD]**
User Story: As an operations/support employee, I want the system to compare PayLink's daily payment records against each biller's nightly settlement file so that discrepancies are flagged for review.
Given a biller's daily settlement file lists Payment A as PAID, while PayLink's database records Payment A as Failed (or Unknown),
When the nightly reconciliation job processes the settlement file,
Then any Unknown payment confirmed in the file transitions to Completed, while any mismatch (such as Failed locally vs. PAID at biller, or missing records) is flagged in a generated Reconciliation Difference Report.

**US-27 (FR-27) Customer Refund Request & Support Approval [COULD]**
User Story: As a customer, I want to request a refund for a completed payment (e.g., paid to a wrong meter number) so that a support employee can review and approve returning the funds.
Given a payment is in Completed state,
When the customer submits a refund request and an authorized support employee approves it,
Then a compensating credit ledger entry returns the principal bill amount to the customer's available wallet balance, and an audit log entry is recorded.

**US-28 (FR-28) Admin Daily Financial & Operational Dashboard Totals [COULD]**
User Story: As an admin, I want to view daily aggregated totals of payments, earned fees, paid commissions, and failures per biller so that I can monitor business performance.
Given transactions have occurred on a specific date,
When an admin requests the daily summary report for that date,
Then the system returns exact decimal totals for completed payment volume, total service fees earned, total agent commissions paid, and failure counts grouped by biller.

## 4. Measurable Non-Functional Requirements

The table below defines seven measurable non-functional requirements with clear numeric targets, verification criteria

| ID | Quality Attribute | Priority | Requirement & Measurable Target |
| :--- | :--- | :--- | :--- |
| NFR-1 | Correctness & Concurrency Safety | Must | The system shall guarantee 0 double charges on duplicate idempotency keys and 0 negative wallet balances under concurrent payment requests, verified by passing 100% of automated concurrency and idempotency tests. |
| NFR-2 | Financial Precision | Must | All monetary amounts, fees, commissions, and ledger entries shall use exact decimal arithmetic (DECIMAL(12,2)) with 0 floating-point rounding discrepancies across 100% of calculations. |
| NFR-3 | Throughput & Latency | Must | When deployed locally via Docker Compose against mock billers, the backend shall sustain >= 100 payment requests per second for 1 minute with p95 internal processing latency <= 150 ms (excluding external biller network wait time). |
| NFR-4 | Resilience & Fault Isolation | Must | A complete outage or > 10 s timeout of one external biller or the SMS/email notification service shall cause 0% failure impact on payments to other healthy billers and 0 rollbacks of already Completed payments. |
| NFR-5 | Modifiability & Extensibility | Should | Adding a new biller or upgrading an existing biller protocol (e.g., ElectroCo v1 to v2) shall require modifying 0 files outside the Biller Integration module and external configuration files. |
| NFR-6 | Auditability & Traceability | Must | 100% of wallet ledger movements and administrative or support mutations (biller updates, limit edits, account blocks, refund approvals) shall produce an immutable audit log entry recording who, when, and why. |
| NFR-7 | Testability & Code Coverage | Should | Automated unit and integration tests executed in the CI pipeline shall achieve and enforce >= 70% line coverage across all core domain logic modules. |

## 5. Ambiguities Found & Engineering Decisions Made

During requirements elicitation and AI-assisted specification review, the following six ambiguities were uncovered in the problem statement and resolved with explicit domain rules before architectural modeling:

| # | Ambiguity / Question Identified | Engineering Decision Made |
| :--- | :--- | :--- |
| 1 | Does the service fee count toward the customer's daily payment limit (5,000 / 30,000 EGP) and single-payment limit (5 - 10,000 EGP)? | Single-payment limits (5.00 - 10,000.00 EGP) apply to the principal bill amount; daily spending limits (5,000.00 / 30,000.00 EGP) apply to the total debited amount (bill_amount + fee_amount) representing total daily wallet outflow. |
| 2 | In agent-assisted payments (FR-17), whose wallet is debited-the customer's wallet or the agent's wallet? | When an agent initiates a payment via terminal, the agent's wallet is debited for (bill_amount + fee_amount), and upon COMPLETED status, the agent's wallet is credited with 40% of the service fee as commission (COMMISSION ledger entry). |
| 3 | If a customer requests a manual refund on a COMPLETED payment (FR-27), is the PayLink service fee refunded or only the principal bill amount? | For failed payments (FAILED -> REFUNDED), the entire held amount (bill_amount + fee_amount) is released via HOLD_RELEASE. For manual post-completion refunds (FR-27), only the principal bill_amount is refunded via a REFUND ledger entry while fee_amount remains earned revenue and Payment.status remains COMPLETED. |
| 4 | What happens to a payment in UNKNOWN state if all 3 scheduled retries (at 1, 5, and 15 minutes) still time out? | After the 3rd retry fails, the payment remains in UNKNOWN with funds held until the nightly reconciliation job processes the biller's SettlementFile (COMPLETED if matched, FAILED -> REFUNDED if absent). |
| 5 | How should ElectroCo v2 conversion from EGP to piasters handle decimal rounding? | All internal monetary columns use exact DECIMAL(14,2) types, and conversion in ElectroCo adapter uses exact decimal arithmetic (amount * 100) rounded to integer piasters using HALF_UP. |
| 6 | What constitutes a 'payment attempt' for the velocity rule (> 5 payments in 60 seconds)? | All payment initiation attempts reaching FraudChain (whether INITIATED -> FUNDS_HELD or REJECTED for insufficient funds) count toward the 60-second sliding window per User. |