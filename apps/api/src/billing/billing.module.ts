import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { MapFeeService } from './map-fee.service';

@Module({
  imports: [PaymentsModule],
  controllers: [BillingController],
  providers: [BillingService, MapFeeService],
  exports: [BillingService, MapFeeService],
})
export class BillingModule {}
