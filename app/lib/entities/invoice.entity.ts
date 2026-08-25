import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Customer } from './customer.entity';

@Entity('invoices')
@Unique(['customerId', 'date', 'amount'])
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  // RESTRICT: invoices are financial records and must never be silently
  // cascade-deleted or orphaned. No code path deletes customers today;
  // if one is added later, it must handle a customer's invoices explicitly.
  @ManyToOne(() => Customer, (customer) => customer.invoices, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer!: Customer;

  @Column({ type: 'int' })
  amount!: number;

  @Column({ type: 'varchar', length: 255 })
  status!: string;

  @Column({ type: 'date' })
  date!: string;
}