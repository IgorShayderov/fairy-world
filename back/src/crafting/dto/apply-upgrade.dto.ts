import { IsInt, Min } from 'class-validator';

export class ApplyUpgradeDto {
  @IsInt()
  @Min(1)
  upgradeInventoryItemId!: number;

  @IsInt()
  @Min(1)
  inventoryItemId!: number;
}
