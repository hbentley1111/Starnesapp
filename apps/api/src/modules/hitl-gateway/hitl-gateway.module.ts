import { Module } from '@nestjs/common';
import { DispatchTokenService } from './dispatch-token.service';
import { HitlGatewayService } from './hitl-gateway.service';
import { HitlController } from './hitl.controller';

@Module({
  controllers: [HitlController],
  providers: [DispatchTokenService, HitlGatewayService],
  exports: [HitlGatewayService],
})
export class HitlGatewayModule {}
