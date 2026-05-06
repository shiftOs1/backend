import mongoose, { Schema, Document } from 'mongoose';

export interface IShift extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  assignedUser?: mongoose.Types.ObjectId;
  date: Date;
  startTime: string; // "09:00"
  endTime: string;   // "17:00"
  location?: string;
  notes?: string;
  status: 'open' | 'assigned' | 'completed' | 'cancelled';
  isRecurring: boolean;
  recurrenceRule?: string; // e.g. "FREQ=WEEKLY;BYDAY=MO,WE,FR"
  recurrenceGroupId?: string; // links recurring shift instances
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const shiftSchema = new Schema<IShift>(
  {
    title: {
      type: String,
      required: [true, 'Shift title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    assignedUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    date: {
      type: Date,
      required: [true, 'Shift date is required'],
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
    location: {
      type: String,
      trim: true,
      maxlength: [200, 'Location cannot exceed 200 characters'],
    },
    notes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    status: {
      type: String,
      enum: ['open', 'assigned', 'completed', 'cancelled'],
      default: 'open',
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurrenceRule: {
      type: String,
      default: null,
    },
    recurrenceGroupId: {
      type: String,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
shiftSchema.index({ date: 1 });
shiftSchema.index({ assignedUser: 1 });
shiftSchema.index({ status: 1 });
shiftSchema.index({ recurrenceGroupId: 1 });
shiftSchema.index({ date: 1, assignedUser: 1 });

export const Shift = mongoose.model<IShift>('Shift', shiftSchema);