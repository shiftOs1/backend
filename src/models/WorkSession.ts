import mongoose, { Schema, Document } from 'mongoose';

export interface IWorkSession extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  shift?: mongoose.Types.ObjectId;
  clockIn: Date;
  clockOut?: Date;
  breakMinutes: number;
  durationMinutes?: number;
  isOvertime: boolean;
  overtimeMinutes: number;
  status: 'active' | 'pending_approval' | 'approved' | 'rejected';
  adminComment?: string;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const workSessionSchema = new Schema<IWorkSession>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    shift: {
      type: Schema.Types.ObjectId,
      ref: 'Shift',
      default: null,
    },
    clockIn: {
      type: Date,
      required: [true, 'Clock-in time is required'],
    },
    clockOut: {
      type: Date,
      default: null,
    },
    breakMinutes: {
      type: Number,
      default: 0,
      min: [0, 'Break minutes cannot be negative'],
    },
    durationMinutes: {
      type: Number,
      default: null,
    },
    isOvertime: {
      type: Boolean,
      default: false,
    },
    overtimeMinutes: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'pending_approval', 'approved', 'rejected'],
      default: 'active',
    },
    adminComment: {
      type: String,
      maxlength: [500, 'Comment cannot exceed 500 characters'],
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

workSessionSchema.index({ user: 1, status: 1 });
workSessionSchema.index({ clockIn: 1 });
workSessionSchema.index({ status: 1 });

export const WorkSession = mongoose.model<IWorkSession>('WorkSession', workSessionSchema);