import { Controller, Logger, ParseUUIDPipe } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { ChangeOrderStatusDto } from './dto';

@Controller()
export class OrdersController {
	private logger = new Logger('OrdersController');

	constructor(private readonly ordersService: OrdersService) {}

	@MessagePattern({ cmd: 'getOrders' })
	getOrders(@Payload() orderPaginationDto: OrderPaginationDto) {
		this.logger.log(`Retrieving orders with ${JSON.stringify(orderPaginationDto)}`);
		return this.ordersService.getOrders(orderPaginationDto);
	}

	@MessagePattern({ cmd: 'getOrder' })
	getOrder(@Payload('id', ParseUUIDPipe) id: string) {
		this.logger.log(`Retrieving order with id ${id}`);
		return this.ordersService.getOrder(id);
	}

	@MessagePattern({ cmd: 'createOrder' })
	createOrder(@Payload() createOrderDto: CreateOrderDto) {
		this.logger.log(`Creating order`);
		return this.ordersService.createOrder(createOrderDto);
	}

	@MessagePattern({ cmd: 'updateOrder' })
	updateOrder(@Payload() updateOrderDto: UpdateOrderDto) {
		this.logger.log(`Updating order with id ${updateOrderDto.id}`);
		return this.ordersService.updateOrder(updateOrderDto.id, updateOrderDto);
	}

	@MessagePattern({ cmd: 'deleteOrder' })
	deleteOrder(@Payload('id', ParseUUIDPipe) id: string) {
		this.logger.log(`Deleting order with id ${id}`);
		return this.ordersService.deleteOrder(id);
	}

	@MessagePattern({ cmd: 'changeOrderStatus' })
	changeOrderStatus(@Payload() changeOrderStatusDto: ChangeOrderStatusDto) {
		this.logger.log(`Changing order status with id ${changeOrderStatusDto.id}`);
		return this.ordersService.changeOrderStatus(changeOrderStatusDto);
	}
}
