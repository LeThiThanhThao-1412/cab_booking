import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  CreateDateColumn 
} from 'typeorm';
import { SagaStepStatus } from '../enums/payment.enum';

@Entity('saga_logs')
export class SagaLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sagaId: string;

  @Column()
  transactionId: string;

  @Column()
  stepName: string;

  @Column({ type: 'enum', enum: SagaStepStatus, default: SagaStepStatus.PENDING })
  status: SagaStepStatus;

  @Column('json', { nullable: true })
  payload: any;

  @Column('json', { nullable: true })
  compensationData: any;

  @Column({ nullable: true })
  errorMessage: string;

  @CreateDateColumn()
  executedAt: Date;
}