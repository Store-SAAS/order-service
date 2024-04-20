import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

import { AppModule } from './app.module';
import { envs } from './config';
import { RpcExceptionFilterImpl } from './common';

async function bootstrap() {
	const logger = new Logger('Main');

	const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
		transport: Transport.NATS,
		options: {
			servers: envs.natsServers,
		},
	});

	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
		}),
	);
	app.useGlobalFilters(new RpcExceptionFilterImpl());

	await app.listen();

	logger.log(`Order Service running on port ${envs.port}`);
}
bootstrap();
