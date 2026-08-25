import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('revenue')
export class Revenue {
  @PrimaryColumn({ type: 'varchar', length: 4 })
  month!: string;

  @Column({ type: 'int' })
  revenue!: number;
}