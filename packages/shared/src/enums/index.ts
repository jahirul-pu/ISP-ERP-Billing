// ─── Customer ───────────────────────────────
export enum CustomerType {
  HOME = 'HOME',
  CORPORATE = 'CORPORATE',
  SHARED = 'SHARED',
  VIP = 'VIP',
  TEMPORARY = 'TEMPORARY',
  FRANCHISE = 'FRANCHISE',
}

export enum CustomerStatus {
  ACTIVE = 'ACTIVE',
  DUE_WARNING = 'DUE_WARNING',
  GRACE_PERIOD = 'GRACE_PERIOD',
  SUSPENDED = 'SUSPENDED',
  TEMPORARY_DISCONNECT = 'TEMPORARY_DISCONNECT',
  LEFT_CUSTOMER = 'LEFT_CUSTOMER',
  DEAD_CONNECTION = 'DEAD_CONNECTION',
  MIGRATED = 'MIGRATED',
}

// ─── Billing ────────────────────────────────
export enum InvoiceStatus {
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  WAIVED = 'WAIVED',
  CANCELLED = 'CANCELLED',
}

export enum BillingCycle {
  MONTHLY = 'MONTHLY',
  CUSTOM = 'CUSTOM',
  ANNIVERSARY = 'ANNIVERSARY',
}

export enum BillComponentType {
  INTERNET_PACKAGE = 'INTERNET_PACKAGE',
  INSTALLATION_FEE = 'INSTALLATION_FEE',
  ONU_INSTALLMENT = 'ONU_INSTALLMENT',
  MAINTENANCE = 'MAINTENANCE',
  VAT_TAX = 'VAT_TAX',
  DISCOUNT = 'DISCOUNT',
  PENALTY = 'PENALTY',
  WAIVER = 'WAIVER',
  ONE_TIME = 'ONE_TIME',
}

// ─── Tickets ────────────────────────────────
export enum TicketStatus {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum TicketType {
  TECHNICAL = 'TECHNICAL',
  BILLING = 'BILLING',
  SERVICE_REQUEST = 'SERVICE_REQUEST',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

// ─── Collection ─────────────────────────────
export enum CollectionStatus {
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  FLAGGED = 'FLAGGED',
  REJECTED = 'REJECTED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  BKASH = 'BKASH',
  NAGAD = 'NAGAD',
  ONLINE = 'ONLINE',
  OTHER = 'OTHER',
}

// ─── Accounting ─────────────────────────────
export enum LedgerType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE',
}

export enum ExpenseCategory {
  BANDWIDTH = 'BANDWIDTH',
  ELECTRICITY = 'ELECTRICITY',
  SALARY = 'SALARY',
  TRANSPORT = 'TRANSPORT',
  MAINTENANCE = 'MAINTENANCE',
  FUEL = 'FUEL',
  EQUIPMENT = 'EQUIPMENT',
  OFFICE_RENT = 'OFFICE_RENT',
  OTHER = 'OTHER',
}

// ─── HR ─────────────────────────────────────
export enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  TERMINATED = 'TERMINATED',
  ON_LEAVE = 'ON_LEAVE',
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  HALF_DAY = 'HALF_DAY',
  ON_FIELD = 'ON_FIELD',
}

// ─── Inventory ──────────────────────────────
export enum AssetType {
  ROUTER = 'ROUTER',
  SWITCH = 'SWITCH',
  ONU = 'ONU',
  CABLE = 'CABLE',
  SPLICE_BOX = 'SPLICE_BOX',
  BATTERY = 'BATTERY',
  OTHER = 'OTHER',
}

export enum AssetCondition {
  NEW = 'NEW',
  GOOD = 'GOOD',
  DAMAGED = 'DAMAGED',
  REPAIR = 'REPAIR',
  DISPOSED = 'DISPOSED',
}

export enum StockMovementType {
  STOCK_IN = 'STOCK_IN',
  STOCK_OUT = 'STOCK_OUT',
  ASSIGNED = 'ASSIGNED',
  RETURNED = 'RETURNED',
  DAMAGED = 'DAMAGED',
  REPAIRED = 'REPAIRED',
}

// ─── Notifications ──────────────────────────
export enum NotificationChannel {
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
}

export enum NotificationType {
  DUE_REMINDER = 'DUE_REMINDER',
  PAYMENT_CONFIRMATION = 'PAYMENT_CONFIRMATION',
  OVERDUE_WARNING = 'OVERDUE_WARNING',
  COMPLAINT_UPDATE = 'COMPLAINT_UPDATE',
  SALARY_NOTIFICATION = 'SALARY_NOTIFICATION',
}

// ─── MikroTik ───────────────────────────────
export enum SyncStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL',
  IN_PROGRESS = 'IN_PROGRESS',
}

export enum SyncFrequency {
  MANUAL = 'MANUAL',
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
}

// ─── Audit ──────────────────────────────────
export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  STATUS_CHANGE = 'STATUS_CHANGE',
  PAYMENT = 'PAYMENT',
  BILL_GENERATE = 'BILL_GENERATE',
  SYNC = 'SYNC',
}

// ─── User Roles ─────────────────────────────
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  ACCOUNTANT = 'ACCOUNTANT',
  COLLECTOR = 'COLLECTOR',
  TECHNICIAN = 'TECHNICIAN',
  VIEWER = 'VIEWER',
}
