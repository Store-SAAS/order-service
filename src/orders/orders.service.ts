import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OrderStatus, PrismaClient } from '@prisma/client';

import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { RpcException } from '@nestjs/microservices';
import { ChangeOrderStatusDto } from './dto';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {
	private readonly logger = new Logger('OrdersService');

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
		});

		if (!order) {
			throw new RpcException({
				status: HttpStatus.NOT_FOUND,
				message: `Order with id ${id} not found`,
			});
		}

		return order;
	}

	async createOrder(createOrderDto: CreateOrderDto) {
		return this.order.create({
			data: createOrderDto,
		});
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
