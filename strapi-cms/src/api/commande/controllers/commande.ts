import { factories } from '@strapi/strapi';

const orderUid = 'api::commande.commande';
const cartUid = 'api::panier.panier';
const lineUid = 'api::ligne-panier.ligne-panier';
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
};

function validAddressField(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 120;
}

function optionalAddressField(value: unknown): value is string | undefined {
  return value === undefined || (typeof value === 'string' && value.length <= 120);
}

export default factories.createCoreController(
  'api::commande.commande',
  ({ strapi }) => ({
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
      const order = (await strapi.db.query(orderUid).create({
        data: {
          status: 'pending',
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
        await strapi.db.query(orderUid).update({
          where: { id: order.id },
          data: { status: 'paid' },
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
        select: ['documentId', 'status', 'total', 'createdAt'],
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
        ],
      });
      ctx.body = { data: orders };
    },
  }),
);
