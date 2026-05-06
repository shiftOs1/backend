import mongoose, { Schema, Document } from 'mongoose';

export interface ILeaveRequest extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  type: 'vacation' | 'sick' | 'personal' | 'unpaid' | 'other';
  startDate: Date;
  endDate: Date;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  adminComment?: string;
  resolvedBy?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const leaveRequestSchema = new Schema<ILeaveRequest>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['vacation', 'sick', 'personal', 'unpaid', 'other'],
      required: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    reason: {
      type: String,
      maxlength: [1000, 'Reason cannot exceed 1000 characters'],
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    adminComment: {
      type: String,
      maxlength: [500, 'Comment cannot exceed 500 characters'],
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

leaveRequestSchema.index({ user: 1 });
leaveRequestSchema.index({ status: 1 });
leaveRequestSchema.index({ startDate: 1, endDate: 1 });

export const LeaveRequest = mongoose.model<ILeaveRequest>('LeaveRequest', leaveRequestSchema);