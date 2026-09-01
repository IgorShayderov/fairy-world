import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Определяем статус ошибки
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    // Достаем сообщение
    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : exception instanceof Error
          ? exception.message
          : 'Internal Server Error';

    // Проверяем окружение (убедись, что на сервере задан NODE_ENV=production)
    const isDev = process.env.NODE_ENV !== 'production';

    // Формируем детальный ответ
    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      // Выводим стек трейс только для разработки
      stack: isDev && exception instanceof Error ? exception.stack : undefined,
    });
  }
}
