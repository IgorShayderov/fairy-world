import { IsInt, Max, Min } from 'class-validator';

export class DepositTreasuryDto {
  @IsInt()
  @Min(0)
  @Max(2147483647)
  gold!: number;

  @IsInt()
  @Min(0)
  @Max(2147483647)
  gems!: number;
}
