import { Catch, ArgumentsHost, ExceptionFilter, Logger, HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

@Catch(RpcException)
export class RpcExceptionFilterImpl implements ExceptionFilter {
	private logger = new Logger('RpcExceptionFilterImpl');

	catch(exception: RpcException, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse();
		const rpcError = exception.getError();

		if (typeof rpcError === 'object' && 'status' in rpcError && 'message' in rpcError) {
			this.logger.error(rpcError.message);
			const status = isNaN(+rpcError.status) ? HttpStatus.BAD_REQUEST : +rpcError.status;
			return response.status(status).json(rpcError);
		}
		this.logger.error(rpcError);
		response.status(HttpStatus.BAD_REQUEST).json({
			status: HttpStatus.BAD_REQUEST,
			message: rpcError,
		});
	}
}
