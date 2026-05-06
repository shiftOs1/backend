import { Notification, NotificationType } from '../models/Notification';
import { logger } from '../utils/logger';

interface CreateNotificationInput {
  recipient: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}

export class NotificationService {
  async create(input: CreateNotificationInput) {
    const notification = await Notification.create(input);
    return notification;
  }

  async getForUser(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total, unreadCount] = await Promise.all([
      Notification.find({ recipient: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments({ recipient: userId }),
      Notification.countDocuments({ recipient: userId, read: false }),
    ]);
    return { data, total, unreadCount, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async markAllRead(userId: string) {
    await Notification.updateMany({ recipient: userId, read: false }, { read: true });
  }

  async markOneRead(notificationId: string, userId: string) {
    await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { read: true }
    );
  }

  async deleteOld(daysOld = 30) {
    const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    const result = await Notification.deleteMany({ createdAt: { $lt: cutoff }, read: true });
    logger.info(`Deleted ${result.deletedCount} old notifications`);
  }
}

export const notificationService = new NotificationService();