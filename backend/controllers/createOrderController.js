import db from "../config/db.js";
import { Temporal } from "@js-temporal/polyfill";

const createOrder = async (req, res) => {
    try {
        const {
            proceedingId,
            orderType,
            orderDate,
            amount,
            description
        } = req.body;

        if (!proceedingId) {
            return res.status(400).json({
                success: false,
                message: "Proceeding ID is required"
            });
        }

        const proceeding = await db.orm.public.Proceeding
            .where((p) => p.id.eq(Number(proceedingId)))
            .first();

        if (!proceeding) {
            return res.status(404).json({
                success: false,
                message: "Proceeding not found"
            });
        }

        const caseData = await db.orm.public.Case
            .where((c) => c.id.eq(proceeding.caseId))
            .first();

        if (!caseData || caseData.userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        const order = await db.orm.public.Order.create({
            proceedingId: Number(proceedingId),
            orderType: orderType || null,
            orderDate: orderDate
                ? Temporal.Instant.from(`${orderDate}T00:00:00Z`)
                : null,
            amount: amount ? Number(amount) : null,
            description: description || null
        });

        res.status(201).json({
            success: true,
            message: "Order created successfully",
            order
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: "Order creation failed"
        });
    }
};

export default createOrder;