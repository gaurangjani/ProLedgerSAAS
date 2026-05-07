const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Organization = require('../models/Organization');

const PLAN_PRICE_IDS = {
  pro: process.env.STRIPE_PRICE_ID_PRO,
  enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE
};

const PLAN_LIMITS = {
  free:       { maxUsers: 3,    maxInvoices: 50,       maxProjects: 5        },
  pro:        { maxUsers: 50,   maxInvoices: 10000,    maxProjects: 500      },
  enterprise: { maxUsers: 9999, maxInvoices: 999999,   maxProjects: 99999    }
};

exports.createCheckoutSession = async (req, res, next) => {
  try {
    const { plan = 'pro' } = req.body;
    const priceId = PLAN_PRICE_IDS[plan];
    if (!priceId) return res.status(400).json({ success: false, message: 'Invalid plan or STRIPE_PRICE_ID not configured' });

    const org = req.org;
    let customerId = org.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name:  org.name,
        metadata: { orgId: org._id.toString() }
      });
      customerId = customer.id;
      org.stripeCustomerId = customerId;
      await org.save();
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.APP_URL}/settings?billing=success`,
      cancel_url:  `${process.env.APP_URL}/settings?billing=cancelled`,
      metadata: { orgId: org._id.toString(), plan }
    });

    res.json({ success: true, data: { url: session.url } });
  } catch (err) { next(err); }
};

exports.createPortalSession = async (req, res, next) => {
  try {
    const org = req.org;
    if (!org.stripeCustomerId)
      return res.status(400).json({ success: false, message: 'No billing account found. Please upgrade first.' });

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: `${process.env.APP_URL}/settings`
    });
    res.json({ success: true, data: { url: session.url } });
  } catch (err) { next(err); }
};

// Raw body needed — mount BEFORE express.json()
exports.handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const data = event.data.object;

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const { orgId, plan } = data.metadata || {};
        if (orgId && plan) {
          await Organization.findByIdAndUpdate(orgId, {
            plan,
            planLimits: PLAN_LIMITS[plan],
            stripeSubscriptionId: data.subscription,
            billingCycleEnd: data.expires_at ? new Date(data.expires_at * 1000) : undefined
          });
        }
        break;
      }
      case 'customer.subscription.updated': {
        const org = await Organization.findOne({ stripeCustomerId: data.customer });
        if (org) {
          const plan = data.items?.data?.[0]?.price?.metadata?.plan || org.plan;
          org.plan = plan;
          org.planLimits = PLAN_LIMITS[plan] || org.planLimits;
          org.stripeSubscriptionId = data.id;
          org.billingCycleEnd = new Date(data.current_period_end * 1000);
          await org.save();
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const org = await Organization.findOne({ stripeCustomerId: data.customer });
        if (org) {
          org.plan = 'free';
          org.planLimits = PLAN_LIMITS.free;
          org.stripeSubscriptionId = null;
          org.billingCycleEnd = null;
          await org.save();
        }
        break;
      }
      case 'invoice.payment_failed': {
        // Could email the org owner here
        console.warn('Payment failed for customer:', data.customer);
        break;
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

exports.getStatus = async (req, res) => {
  const org = req.org;
  const Membership = require('../models/Membership');
  const { Invoice, Project } = require('../models/accounting');
  const [memberCount, invoiceCount, projectCount] = await Promise.all([
    Membership.countDocuments({ organization: org._id }),
    Invoice.countDocuments({ org: org._id }),
    Project.countDocuments({ org: org._id })
  ]);
  res.json({
    success: true,
    data: {
      plan: org.plan,
      limits: org.planLimits,
      usage: { members: memberCount, invoices: invoiceCount, projects: projectCount },
      billingCycleEnd: org.billingCycleEnd,
      hasStripe: !!org.stripeCustomerId
    }
  });
};
