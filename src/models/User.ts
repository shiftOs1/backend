import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { UserRole } from '../types';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  refreshToken?: string;
  avatarUrl?: string;
  timezone: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  createEmailVerificationToken(): string;
  createPasswordResetToken(): string;
  toSafeObject(): Partial<IUser>;
}

interface IUserModel extends Model<IUser> {
  findByEmail(email: string): Promise<IUser | null>;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [80, 'Name cannot exceed 80 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // never returned by default
    },
    role: {
      type: String,
      enum: ['admin', 'user'],
      default: 'user',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ emailVerificationToken: 1 }, { sparse: true });
userSchema.index({ passwordResetToken: 1 }, { sparse: true });

// ── Pre-save hook: hash password ──────────────────────────────────────────────
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return ;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  
});

// ── Instance methods ──────────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.createEmailVerificationToken = function (): string {
  const rawToken = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(rawToken)
    .digest('hex');
  this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  return rawToken;
};

userSchema.methods.createPasswordResetToken = function (): string {
  const rawToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(rawToken)
    .digest('hex');
  this.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  return rawToken;
};

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  delete obj.emailVerificationToken;
  delete obj.emailVerificationExpires;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  return obj;
};

// ── Static methods ────────────────────────────────────────────────────────────
userSchema.statics.findByEmail = function (email: string) {
  return this.findOne({ email: email.toLowerCase() }).select('+password');
};

export const User = mongoose.model<IUser, IUserModel>('User', userSchema);
