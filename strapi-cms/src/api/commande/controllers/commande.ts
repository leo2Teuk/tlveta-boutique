import { factories } from '@strapi/strapi';

const orderUid = 'api::commande.commande';
const cartUid = 'api::panier.panier';
const lineUid = 'api::ligne-panier.ligne-panier';
const userUid = 'plugin::users-permissions.user';
const shippingAmountCents = 400;
const simulationDurationMs = 10_000;

type CartProduct = {
  id: number;
  documentId: string;
  title: string;
  price: number | string | null;
};

type CartLine = {
  qte: number;
  produit: CartProduct | null;
};

type Cart = {
  id: number;
  lignes: CartLine[];
};

type CustomerOrder = {
  id: number;
  documentId: string;
  total: number | string;
  status: string;
  paymentSimulationStartedAt?: string | Date | null;
  trackingEvents?: unknown;
};

function validAddressField(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 120;
}

function optionalAddressField(value: unknown): value is string | undefined {
  return value === undefined || (typeof value === 'string' && value.length <= 120);
}

function validProfileText(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.length <= maxLength;
}

function validAvatarUrl(value: unknown): value is string {
  if (!validProfileText(value, 2048)) return false;
  const url = value.trim();
  if (url.length === 0) return true;
  try {
    const parsed = new URL(url);
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      parsed.hostname.length > 0
    );
  } catch (error) {
    if (error instanceof TypeError) return false;
    throw error;
  }
}

export default factories.createCoreController(
  'api::commande.commande',
  ({ strapi }) => ({
    async updateProfile(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized();

      const body = ctx.request.body;
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return ctx.badRequest('A valid customer profile is required.');
      }
      const profile = body as Record<string, unknown>;
      const allowedFields = [
        'firstName',
        'lastName',
        'phoneNumber',
        'avatarUrl',
      ];
      if (
        Object.keys(profile).some((field) => !allowedFields.includes(field)) ||
        !validProfileText(profile.firstName, 80) ||
        !validProfileText(profile.lastName, 80) ||
        !validProfileText(profile.phoneNumber, 32) ||
        !validAvatarUrl(profile.avatarUrl)
      ) {
        return ctx.badRequest('A valid customer profile is required.');
      }

      const updatedProfile = await strapi.db.query(userUid).update({
        where: { id: user.id },
        data: {
          firstName: profile.firstName.trim(),
          lastName: profile.lastName.trim(),
          phoneNumber: profile.phoneNumber.trim(),
          avatarUrl: profile.avatarUrl.trim(),
        },
        select: [
          'id',
          'username',
          'email',
          'firstName',
          'lastName',
          'phoneNumber',
          'avatarUrl',
        ],
      });
      if (!updatedProfile) return ctx.notFound('Customer profile not found.');
      ctx.body = { data: updatedProfile };
    },

    async checkout(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized();

      const cart: Cart | null = await strapi.db.query(cartUid).findOne({
        where: { user: { id: user.id } },
        populate: {
          lignes: {
            populate: { produit: true },
          },
        },
      });
      if (!cart || cart.lignes.length === 0) {
        return ctx.badRequest('Your cart is empty.');
      }
      if (cart.lignes.some((line) => !line.produit)) {
        return ctx.badRequest('A cart product is no longer available.');
      }

      const lineItems = cart.lignes.map((line) => {
        const product = line.produit!;
        const price = Number(product.price);
        if (
          !Number.isFinite(price) ||
          price <= 0 ||
          !Number.isInteger(line.qte) ||
          line.qte < 1
        ) {
          return null;
        }
        return {
          productDocumentId: product.documentId,
          title: product.title,
          unitAmount: Math.round(price * 100),
          quantity: line.qte,
        };
      });
      if (lineItems.some((line) => line === null)) {
        return ctx.badRequest(
          'Every product in your cart must have a valid price and quantity.',
        );
      }

      const pricedItems = lineItems.filter(
        (line): line is NonNullable<typeof line> => line !== null,
      );
      const subtotalCents = pricedItems.reduce(
        (subtotal, line) => subtotal + line.unitAmount * line.quantity,
        0,
      );
      const totalCents = subtotalCents + shippingAmountCents;
      const createdAt = new Date().toISOString();
      const order = (await strapi.db.query(orderUid).create({
        data: {
          status: 'pending',
          trackingStatus: 'awaiting_payment',
          trackingUpdatedAt: createdAt,
          trackingEvents: [
            { status: 'awaiting_payment', happenedAt: createdAt },
          ],
          currency: 'eur',
          subtotal: subtotalCents / 100,
          shippingAmount: shippingAmountCents / 100,
          total: totalCents / 100,
          lineItems: pricedItems.map((line) => ({
            productDocumentId: line.productDocumentId,
            title: line.title,
            unitPrice: line.unitAmount / 100,
            quantity: line.quantity,
          })),
          customerEmail: user.email,
          user: user.id,
        },
        select: ['id', 'documentId', 'total', 'status'],
      })) as CustomerOrder;

      ctx.body = {
        data: {
          orderId: order.documentId,
          total: Number(order.total),
          status: order.status,
        },
      };
    },

    async startSimulation(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized();

      const order: CustomerOrder | null = await strapi.db
        .query(orderUid)
        .findOne({
          where: {
            documentId: ctx.params.documentId,
            user: { id: user.id },
          },
          select: ['id', 'documentId', 'status', 'paymentSimulationStartedAt'],
        });
      if (!order) return ctx.notFound('Order not found.');
      if (order.status !== 'pending') {
        return ctx.badRequest('Only pending orders can be simulated.');
      }

      let startedAt = order.paymentSimulationStartedAt;
      if (startedAt == null) {
        startedAt = new Date();
        await strapi.db.query(orderUid).update({
          where: { id: order.id },
          data: { paymentSimulationStartedAt: startedAt },
        });
      }
      const startedAtMs = new Date(startedAt).getTime();
      if (!Number.isFinite(startedAtMs)) {
        throw new Error('The order has an invalid payment simulation timestamp.');
      }

      ctx.body = {
        data: {
          readyAt: new Date(startedAtMs + simulationDurationMs).toISOString(),
        },
      };
    },

    async confirmSimulation(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized();

      const order: CustomerOrder | null = await strapi.db
        .query(orderUid)
        .findOne({
          where: {
            documentId: ctx.params.documentId,
            user: { id: user.id },
          },
          select: [
            'id',
            'documentId',
            'total',
            'status',
            'paymentSimulationStartedAt',
            'trackingEvents',
          ],
        });
      if (!order) return ctx.notFound('Order not found.');
      if (order.status === 'paid') {
        ctx.body = {
          data: {
            documentId: order.documentId,
            status: order.status,
            total: Number(order.total),
          },
        };
        return;
      }
      if (order.status !== 'pending' || !order.paymentSimulationStartedAt) {
        return ctx.badRequest('Start the payment simulation first.');
      }

      const startedAtMs = new Date(order.paymentSimulationStartedAt).getTime();
      if (!Number.isFinite(startedAtMs)) {
        throw new Error('The order has an invalid payment simulation timestamp.');
      }
      if (Date.now() - startedAtMs < simulationDurationMs) {
        return ctx.badRequest('The payment simulation is not complete yet.');
      }

      await strapi.db.transaction(async () => {
        const paidAt = new Date().toISOString();
        const trackingEvents = Array.isArray(order.trackingEvents)
          ? order.trackingEvents
          : [];
        await strapi.db.query(orderUid).update({
          where: { id: order.id },
          data: {
            status: 'paid',
            trackingStatus: 'payment_confirmed',
            paidAt,
            trackingUpdatedAt: paidAt,
            trackingEvents: [
              ...trackingEvents,
              { status: 'payment_confirmed', happenedAt: paidAt },
            ],
          },
        });

        const cart = await strapi.db.query(cartUid).findOne({
          where: { user: { id: user.id } },
          select: ['id'],
        });
        if (cart) {
          await strapi.db.query(lineUid).deleteMany({
            where: { panier: { id: cart.id } },
          });
          await strapi.db.query(cartUid).update({
            where: { id: cart.id },
            data: { qte: 0 },
          });
        }
      });

      ctx.body = {
        data: {
          documentId: order.documentId,
          status: 'paid',
          total: Number(order.total),
        },
      };
    },

    async saveShippingAddress(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized();

      const body = ctx.request.body as Record<string, unknown> | undefined;
      const requiredFields = ['fullName', 'line1', 'postalCode', 'city', 'country'];
      if (
        !body ||
        !requiredFields.every((field) => validAddressField(body[field])) ||
        !optionalAddressField(body.line2) ||
        !optionalAddressField(body.phone)
      ) {
        return ctx.badRequest('A valid shipping address is required.');
      }

      const order: CustomerOrder | null = await strapi.db
        .query(orderUid)
        .findOne({
          where: {
            documentId: ctx.params.documentId,
            user: { id: user.id },
          },
          select: ['id', 'documentId', 'status'],
        });
      if (!order) return ctx.notFound('Order not found.');
      if (order.status !== 'paid') {
        return ctx.badRequest('Shipping details require a paid order.');
      }

      const address = Object.fromEntries(
        ['fullName', 'line1', 'line2', 'postalCode', 'city', 'country', 'phone']
          .filter((field) => typeof body[field] === 'string')
          .map((field) => [field, (body[field] as string).trim()]),
      );
      await strapi.db.query(orderUid).update({
        where: { id: order.id },
        data: { shippingAddress: address },
      });

      ctx.body = { data: { documentId: order.documentId, shippingAddress: address } };
    },

    async findOneMine(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized();

      const order = await strapi.db.query(orderUid).findOne({
        where: {
          documentId: ctx.params.documentId,
          user: { id: user.id },
        },
        select: [
          'documentId',
          'status',
          'total',
          'createdAt',
          'trackingStatus',
          'trackingCarrier',
          'trackingNumber',
          'trackingEvents',
          'paidAt',
          'shippedAt',
          'deliveredAt',
          'trackingUpdatedAt',
        ],
      });
      if (!order) return ctx.notFound('Order not found.');
      ctx.body = { data: order };
    },

    async mine(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized();
      const orders = await strapi.db.query(orderUid).findMany({
        where: { user: { id: user.id } },
        orderBy: { createdAt: 'desc' },
        select: [
          'documentId',
          'status',
          'currency',
          'subtotal',
          'shippingAmount',
          'total',
          'lineItems',
          'createdAt',
          'trackingStatus',
          'trackingCarrier',
          'trackingNumber',
          'trackingEvents',
          'paidAt',
          'shippedAt',
          'deliveredAt',
          'trackingUpdatedAt',
        ],
      });
      ctx.body = { data: orders };
    },
  }),
);
