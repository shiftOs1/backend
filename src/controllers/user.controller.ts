import { Response } from 'express';
import { User } from '../models/User';
import { AuthRequest } from '../types';
import { NotFoundError } from '../utils/errors';
import { param } from '../utils/helpers';

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const search = req.query.search as string | undefined;
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const [data, total] = await Promise.all([
    User.find(filter)
      .select('-password -refreshToken -emailVerificationToken -passwordResetToken')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    message: 'Users retrieved',
    data: { data, total, page, limit, totalPages: Math.ceil(total / limit) },
  });
};

export const getUserById = async (req: AuthRequest, res: Response) => {
  const user = await User.findById(param(req.params.id))
    .select('-password -refreshToken -emailVerificationToken -passwordResetToken');
  if (!user) throw new NotFoundError('User not found');
  res.status(200).json({ success: true, message: 'User retrieved', data: { user } });
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  const { name, role, isActive, timezone } = req.body;
  const user = await User.findByIdAndUpdate(
    param(req.params.id),
    { name, role, isActive, timezone },
    { new: true, runValidators: true }
  ).select('-password -refreshToken');
  if (!user) throw new NotFoundError('User not found');
  res.status(200).json({ success: true, message: 'User updated', data: { user } });
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  const user = await User.findByIdAndDelete(param(req.params.id));
  if (!user) throw new NotFoundError('User not found');
  res.status(200).json({ success: true, message: 'User deleted' });
};

export const toggleUserStatus = async (req: AuthRequest, res: Response) => {
  const user = await User.findById(param(req.params.id));
  if (!user) throw new NotFoundError('User not found');
  user.isActive = !user.isActive;
  await user.save();
  res.status(200).json({
    success: true,
    message: `User ${user.isActive ? 'activated' : 'deactivated'}`,
    data: { user },
  });
};
