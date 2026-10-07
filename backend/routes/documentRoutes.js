import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";
import uploadDocument from "../controllers/uploadDocumentController.js";
import downloadDocument from "../controllers/downloadDocumentController.js";

const router = express.Router();

router.post(
    "/upload",
    authMiddleware,
    authorizeRoles("OWNER"),
    upload.single("document"),
    uploadDocument
);

router.get(
    "/:id/download",
    authMiddleware,
    authorizeRoles("OWNER"),
    downloadDocument
);

export default router;