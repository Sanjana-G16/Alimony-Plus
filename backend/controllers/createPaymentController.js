import db from "../config/db.js";
import { Temporal } from "@js-temporal/polyfill";

const createPayment = async (req, res) => {
    try {
        const {
            orderId,
            amount,
            paymentDate,
            status,
            reference,
            notes
        } = req.body;

        if (!orderId || amount === undefined || !paymentDate) {
            return res.status(400).json({
                success: false,
                message: "Order ID, amount and payment date are required"
            });
        }

        const order = await db.orm.public.Order
            .where((o) => o.id.eq(Number(orderId)))
            .first();

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        const proceeding = await db.orm.public.Proceeding
            .where((p) => p.id.eq(order.proceedingId))
            .first();

        const caseData = await db.orm.public.Case
            .where((c) => c.id.eq(proceeding.caseId))
            .first();

        if (!caseData || caseData.userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        const payment = await db.orm.public.Payment.create({
            orderId: Number(orderId),
            amount: Number(amount),
            paymentDate: Temporal.Instant.from(
                `${paymentDate}T00:00:00Z`
            ),
            status: status || "RECEIVED",
            reference: reference || null,
            notes: notes || null
        });

        res.status(201).json({
            success: true,
            message: "Payment created successfully",
            payment
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: "Payment creation failed"
        });
    }
};

export default createPayment;