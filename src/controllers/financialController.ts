import { Response, NextFunction } from 'express';
import { PaymentTransaction } from '../models/PaymentTransaction';
import { PaymentPlan } from '../models/PaymentPlan';
import { AuthRequest } from '../middleware/auth';

export async function getFinancialRecords(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = req.user?.role === 'admin' ? {} : { user: req.user!.id };

    if (req.query.status) filter.status = req.query.status;
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from as string);
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to as string);
    }

    const [records, total] = await Promise.all([
      PaymentTransaction.find(filter)
        .populate('plan', 'name slug price currency')
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      PaymentTransaction.countDocuments(filter),
    ]);

    const totalRevenue = await PaymentTransaction.aggregate([
      { $match: { ...filter, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    res.status(200).json({
      data: records,
      total,
      page,
      limit,
      totalRevenue: totalRevenue[0]?.total ?? 0,
    });
  } catch (err) {
    next(err);
  }
}

export async function getFinancialReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const filter: Record<string, any> = req.user?.role === 'admin' ? { status: 'completed' } : { user: req.user!.id, status: 'completed' };

    // Revenue by month (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const [revenueByMonth, revenueByPlan, totals, pendingCount, failedCount] = await Promise.all([
      PaymentTransaction.aggregate([
        { $match: { ...filter, createdAt: { $gte: twelveMonthsAgo } } },
        {
          $group: {
            _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
            revenue: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),

      PaymentTransaction.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$plan',
            revenue: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: 'paymentplans',
            localField: '_id',
            foreignField: '_id',
            as: 'planInfo',
          },
        },
        { $unwind: { path: '$planInfo', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            planName: { $ifNull: ['$planInfo.name', 'Unknown'] },
            revenue: 1,
            count: 1,
          },
        },
        { $sort: { revenue: -1 } },
      ]),

      PaymentTransaction.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$amount' },
            totalTransactions: { $sum: 1 },
            avgTransactionValue: { $avg: '$amount' },
          },
        },
      ]),

      PaymentTransaction.countDocuments({ ...(req.user?.role === 'admin' ? {} : { user: req.user!.id }), status: 'pending' }),
      PaymentTransaction.countDocuments({ ...(req.user?.role === 'admin' ? {} : { user: req.user!.id }), status: 'failed' }),
    ]);

    // Format monthly data filling gaps
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyMap = new Map(
      revenueByMonth.map((r) => [`${r._id.year}-${r._id.month}`, r])
    );

    const monthlyRevenue = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(twelveMonthsAgo);
      d.setMonth(d.getMonth() + i);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const entry = monthlyMap.get(key);
      return {
        month: MONTHS[d.getMonth()],
        year: d.getFullYear(),
        revenue: entry?.revenue ?? 0,
        transactions: entry?.count ?? 0,
      };
    });

    const summary = totals[0] ?? { totalRevenue: 0, totalTransactions: 0, avgTransactionValue: 0 };

    // Month-over-month growth
    const lastMonth = monthlyRevenue[monthlyRevenue.length - 1]?.revenue ?? 0;
    const prevMonth = monthlyRevenue[monthlyRevenue.length - 2]?.revenue ?? 0;
    const growth = prevMonth > 0 ? ((lastMonth - prevMonth) / prevMonth) * 100 : 0;

    res.status(200).json({
      summary: {
        totalRevenue: summary.totalRevenue,
        totalTransactions: summary.totalTransactions,
        avgTransactionValue: Math.round(summary.avgTransactionValue ?? 0),
        pendingTransactions: pendingCount,
        failedTransactions: failedCount,
        monthOverMonthGrowth: parseFloat(growth.toFixed(1)),
        currentMonthRevenue: lastMonth,
      },
      monthlyRevenue,
      revenueByPlan,
    });
  } catch (err) {
    next(err);
  }
}
