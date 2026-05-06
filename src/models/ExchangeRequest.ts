import mongoose, { Schema, Document } from 'mongoose';

export interface IExchangeRequest extends Document {
  _id: mongoose.Types.ObjectId;
  initiator: mongoose.Types.ObjectId;
  targetUser: mongoose.Types.ObjectId;
  shiftFrom: mongoose.Types.ObjectId;
  shiftTo?: mongoose.Types.ObjectId;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'approved' | 'cancelled';
  targetResponse?: 'accepted' | 'rejected';
  adminComment?: string;
  resolvedBy?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const exchangeRequestSchema = new Schema<IExchangeRequest>(
  {
    initiator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    targetUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    shiftFrom: {
      type: Schema.Types.ObjectId,
      ref: 'Shift',
      required: true,
    },
    shiftTo: {
      type: Schema.Types.ObjectId,
      ref: 'Shift',
      default: null,
    },
    message: {
      type: String,
      maxlength: [500, 'Message cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'approved', 'cancelled'],
      default: 'pending',
    },
    targetResponse: {
      type: String,
      enum: ['accepted', 'rejected'],
      default: null,
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

exchangeRequestSchema.index({ initiator: 1 });
exchangeRequestSchema.index({ targetUser: 1 });
exchangeRequestSchema.index({ status: 1 });

export const ExchangeRequest = mongoose.model<IExchangeRequest>('ExchangeRequest', exchangeRequestSchema);