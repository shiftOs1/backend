import { Router } from 'express';
import { verifyToken, adminOnly } from '../middleware/auth.middleware';
import {
  getAllUsers, getUserById, updateUser,
  deleteUser, toggleUserStatus,
} from '../controllers/user.controller';

const router = Router();

router.use(verifyToken);

router.get('/', adminOnly, getAllUsers);
router.get('/:id', getUserById);
router.patch('/:id', adminOnly, updateUser);
router.delete('/:id', adminOnly, deleteUser);
router.patch('/:id/toggle-status', adminOnly, toggleUserStatus);

export default router;
