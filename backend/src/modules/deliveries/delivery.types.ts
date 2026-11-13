export type DeliveryStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'ARRIVED'
  | 'DELIVERED'
  | 'FAILED'
  | 'CANCELLED';

export interface DeliveryStatusHistoryItem {
  status: DeliveryStatus;
  timestamp: Date;
  notes?: string;
  location?: string;
  recordedBy?: string;
}

export interface DeliveryRecord {
  id: string;
  subOrderId: string;
  subOrderNumber: string;
  status: DeliveryStatus;
  trackingCode: string;
  pickupAddress: {
    province: string;
    city: string;
    address: string;
  };
  dropoffAddress: {
    province: string;
    city: string;
    address: string;
    recipientName: string;
    recipientPhone: string;
  };
  assignedCourierName?: string;
  assignedCourierPhone?: string;
  estimatedDeliveryDate?: Date;
  statusHistory: DeliveryStatusHistoryItem[];
  createdAt: Date;
  updatedAt: Date;
}

