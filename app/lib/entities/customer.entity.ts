import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ name: 'image_url', type: 'varchar', length: 255 })
  imageUrl!: string;

  //test for synchronize:false
  //@Column({type:'varchar',nullable:true})
  //testField!: string;

  @OneToMany('Invoice', 'customer')
  invoices!: any[];
}