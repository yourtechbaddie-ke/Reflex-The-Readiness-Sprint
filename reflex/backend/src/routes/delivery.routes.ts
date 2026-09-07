import { Router } from "express";

import {
  create,
  list,
  getOne,
  assign,
  updateStatus,
} from "../controller/delivery.controller.js";

import { validate } from "../middleware/validate.middleware.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
import {
  createDeliverySchema,
  assignDeliverySchema,
  updateDeliveryStatusSchema,
} from "../schemas/delivery.schema.js";

const router = Router();

router.post(
  "/",
  authenticate,
  requireRole("RETAILER"),
  validate(createDeliverySchema),
  create
);

// Public read access powers the no-login Control Room. When a Bearer token is
// present, the controller applies role-scoped filtering for retailer/rider views.
router.get("/", list);

router.get("/:id", authenticate, getOne);

router.patch(
  "/:id/assign",
  authenticate,
  requireRole("DISPATCHER"),
  validate(assignDeliverySchema),
  assign
);

router.patch(
  "/:id/status",
  authenticate,
  requireRole("RIDER"),
  validate(updateDeliveryStatusSchema),
  updateStatus
);

export default router;
