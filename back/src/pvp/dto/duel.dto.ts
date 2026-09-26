import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DuelDto {
  @ApiProperty({ description: 'ID выбранного соперника', example: 'opp-easy-123' })
  @IsString()
  @IsNotEmpty()
  opponentId!: string;
}
