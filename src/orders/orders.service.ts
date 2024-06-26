import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OrderStatus, PrismaClient } from '@prisma/client';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

import { ChangeOrderStatusDto, OrderPaginationDto, CreateOrderDto, UpdateOrderDto } from './dto';
import { NATS_SERVICE } from 'src/config/services';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {
	private readonly logger = new Logger('OrdersService');

	constructor(@Inject(NATS_SERVICE) private readonly productsClient: ClientProxy) {
		super();
	}

	onModuleInit() {
		this.$connect();
		this.logger.log('Database connected');
	}

	async getOrders(orderPaginationDto: OrderPaginationDto) {
		const totalPages = await this.order.count({
			where: {
				status: orderPaginationDto.status,
			},
		});

		const currentPage = orderPaginationDto.page;
		const perPage = orderPaginationDto.limit;

		return {
			data: await this.order.findMany({
				skip: (currentPage - 1) * perPage,
				take: perPage,
				where: {
					status: orderPaginationDto.status,
				},
			}),
			meta: {
				total: totalPages,
				page: currentPage,
				lastPage: Math.ceil(totalPages / perPage),
			},
		};
	}

	async getOrder(id: string) {
		const order = await this.order.findFirst({
			where: { id },
			include: {
				OrderItems: {
					select: {
						productId: true,
						quantity: true,
						price: true,
					},
				},
			},
		});

		if (!order) {
			throw new RpcException({
				status: HttpStatus.NOT_FOUND,
				message: `Order with id ${id} not found`,
			});
		}

		const productIds = order.OrderItems.map((orderItem) => orderItem.productId);
		const products: any[] = await firstValueFrom(
			this.productsClient.send({ cmd: 'validateProducts' }, productIds),
		);

		return {
			...order,
			OrderItems: order.OrderItems.map((orderItem) => ({
				...orderItem,
				name: products.find((product) => product.id === orderItem.productId).name,
			})),
		};
	}

	async createOrder(createOrderDto: CreateOrderDto) {
		try {
			//1 Confirmar los ids de los productos
			const productIds = createOrderDto.items.map((item) => item.productId);

			const products: any[] = await firstValueFrom(
				this.productsClient.send({ cmd: 'validateProducts' }, productIds),
			);

			//2. Cálculos de los valores
			const totalAmount = createOrderDto.items.reduce((acc, orderItem) => {
				const product = products.find((product) => product.id === orderItem.productId);
				return product.price * orderItem.quantity;
			}, 0);

			const totalItems = createOrderDto.items.reduce((acc, orderItem) => {
				return acc + orderItem.quantity;
			}, 0);

			//3. Crear una transacción de base de datos
			const order = await this.order.create({
				data: {
					totalAmount: totalAmount,
					totalItems: totalItems,
					OrderItems: {
						createMany: {
							data: createOrderDto.items.map((orderItem) => ({
								price: products.find(
									(product) => product.id === orderItem.productId,
								).price,
								productId: orderItem.productId,
								quantity: orderItem.quantity,
							})),
						},
					},
				},
				include: {
					OrderItems: {
						select: {
							productId: true,
							price: true,
							quantity: true,
						},
					},
				},
			});

			return {
				...order,
				OrderItems: order.OrderItems.map((orderItem) => ({
					...orderItem,
					name: products.find((product) => product.id === orderItem.productId).name,
				})),
			};
		} catch (error) {
			throw new RpcException({
				status: error.status,
				message: error.message,
			});
		}
	}

	async updateOrder(id: string, updateOrderDto: UpdateOrderDto) {
		const { id: __, ...data } = updateOrderDto;

		await this.getOrder(id);

		return await this.order.update({
			where: { id },
			data: data,
		});
	}

	async deleteOrder(id: string) {
		await this.getOrder(id);

		return await this.order.update({
			where: { id },
			data: {
				status: OrderStatus.CANCELLED,
			},
		});
	}

	async changeOrderStatus(changeOrderStatusDto: ChangeOrderStatusDto) {
		const { id, status } = changeOrderStatusDto;

		const order = await this.getOrder(id);
		if (order.status === status) {
			return order;
		}

		return this.order.update({
			where: { id },
			data: { status: status },
		});
	}
}
