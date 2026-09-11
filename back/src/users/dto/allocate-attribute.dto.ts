import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, Min } from 'class-validator';
import { AttributeType } from '../../../generated/client';

export class AllocateAttributeDto {
  @ApiProperty({ enum: AttributeType, example: AttributeType.STRENGTH })
  @IsEnum(AttributeType)
  attribute!: AttributeType;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  amount!: number;
}
