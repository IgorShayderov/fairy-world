import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, Min, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SellManyItemDto {
  @ApiProperty({ description: 'Item ID', example: 1 })
  @IsInt()
  @Min(1)
  itemId!: number;

  @ApiProperty({ description: 'Quantity', example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class SellManyDto {
  @ApiProperty({ type: [SellManyItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SellManyItemDto)
  items!: SellManyItemDto[];
}
