import mongoose, { Schema, Document } from 'mongoose';

export type NotificationType =
  | 'shift_assigned'
  | 'shift_updated'
  | 'shift_cancelled'
  | 'exchange_requested'
  | 'exchange_accepted'
  | 'exchange_rejected'
  | 'exchange_approved'
  | 'leave_approved'
  | 'leave_rejected'
  | 'session_approved'
  | 'session_rejected'
  | 'availability_approved'
  | 'availability_rejected'
  | 'general';

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  link?: string;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'shift_assigned', 'shift_updated', 'shift_cancelled',
        'exchange_requested', 'exchange_accepted', 'exchange_rejected', 'exchange_approved',
        'leave_approved', 'leave_rejected',
        'session_approved', 'session_rejected',
        'availability_approved', 'availability_rejected',
        'general',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 100,
    },
    body: {
      type: String,
      required: true,
      maxlength: 500,
    },
    read: {
      type: Boolean,
      default: false,
    },
    link: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, read: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);