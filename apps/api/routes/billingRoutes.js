import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { createCheckoutSession, createPortalSession } from '../controllers/billingController.js';

const router = Router();

router.post('/billing/checkout', requireAuth, createCheckoutSession);
router.post('/billing/portal', requireAuth, createPortalSession);

export default router;
