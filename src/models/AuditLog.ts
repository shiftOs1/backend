import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  actor: mongoose.Types.ObjectId;
  action: string;
  entity: string;
  entityId?: mongoose.Types.ObjectId;
  diff?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    entity: {
      type: String,
      required: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    diff: {
      type: Schema.Types.Mixed,
      default: null,
    },
    ipAddress: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

auditLogSchema.index({ actor: 1 });
auditLogSchema.index({ entity: 1, entityId: 1 });
auditLogSchema.index({ createdAt: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);