import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

import db from "../config/db.js";
import { encryptFile } from "../utils/encryption.js";
import setRlsUser from "../utils/rlsContext.js";

const uploadDocument = async (req, res) => {
    let storagePath = null;

    try {
        const { caseId, documentType } = req.body;

        // Check file
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Document file is required"
            });
        }

        // Check caseId
        if (!caseId) {
            return res.status(400).json({
                success: false,
                message: "Case ID is required"
            });
        }

        // Encrypt uploaded file
        const { encrypted, iv, authTag } = encryptFile(req.file.buffer);

        // Create random file name
        const fileName = `${crypto.randomUUID()}.enc`;

        const uploadDir = path.join(process.cwd(), "uploads");

        // Make sure uploads directory exists
        await fs.mkdir(uploadDir, { recursive: true });

        storagePath = path.join(uploadDir, fileName);

        // Store IV + Auth Tag + encrypted content
        const encryptedFile = Buffer.concat([
            iv,
            authTag,
            encrypted
        ]);

        await fs.writeFile(storagePath, encryptedFile);

        // Database operations with RLS
        const document = await db.transaction(async (tx) => {

            // Set current logged-in user for PostgreSQL RLS
            await setRlsUser(tx, db, req.user.id);

            // Find case
            const caseData = await tx.orm.public.Case
                .where((c) => c.id.eq(Number(caseId)))
                .first();

            if (!caseData) {
                throw new Error("CASE_NOT_FOUND");
            }

            // Check case ownership
            if (caseData.userId !== req.user.id) {
                throw new Error("ACCESS_DENIED");
            }

            // Save document metadata
            const newDocument = await tx.orm.public.Document.create({
                caseId: Number(caseId),
                fileName,
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
                fileSize: req.file.size,
                storagePath,
                documentType: documentType || null,
                uploadedBy: req.user.id
            });

            return newDocument;
        });

        // Success response
        res.status(201).json({
            success: true,
            message: "Document uploaded and encrypted successfully",
            document: {
                id: document.id,
                originalName: document.originalName,
                documentType: document.documentType,
                fileSize: document.fileSize,
                mimeType: document.mimeType,
                createdAt: document.createdAt
            }
        });

    } catch (error) {
        console.log(error);

        // Delete encrypted file if database operation fails
        if (storagePath) {
            try {
                await fs.unlink(storagePath);
            } catch (fileError) {
                console.log(
                    "Encrypted file cleanup failed:",
                    fileError
                );
            }
        }

        if (error.message === "CASE_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Case not found"
            });
        }

        if (error.message === "ACCESS_DENIED") {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        res.status(500).json({
            success: false,
            message: "Document upload failed"
        });
    }
};

export default uploadDocument;