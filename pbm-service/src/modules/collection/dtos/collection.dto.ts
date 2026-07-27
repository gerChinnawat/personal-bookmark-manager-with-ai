import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class CreateCollectionDto {
  @ApiProperty({ example: 'Recipes', minLength: 1, maxLength: 100 })
  @IsString()
  @Length(1, 100)
  name: string;
}

export class UpdateCollectionDto extends PartialType(CreateCollectionDto) {}
