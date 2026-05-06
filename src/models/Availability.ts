import mongoose, { Schema, Document } from 'mongoose';

export interface IAvailability extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  date: Date;
  startTime: string;
  endTime: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  adminComment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const availabilitySchema = new Schema<IAvailability>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Use HH:MM format'],
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Use HH:MM format'],
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    adminComment: {
      type: String,
      maxlength: [500, 'Comment cannot exceed 500 characters'],
    },
  },
  { timestamps: true }
);

availabilitySchema.index({ user: 1, date: 1 });
availabilitySchema.index({ status: 1 });
availabilitySchema.index({ date: 1 });

export const Availability = mongoose.model<IAvailability>('Availability', availabilitySchema);